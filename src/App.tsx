import { useState, useEffect, useCallback, useMemo } from 'react';
import { Scanner } from './components/Scanner';
import { ManualInput } from './components/ManualInput';
import { InventoryGrid } from './components/InventoryGrid';
import { ManualProductModal } from './components/ManualProductModal';
import { QuantityModal } from './components/QuantityModal';
import { Toast } from './components/Toast';
import { InventoryItem, ProductLookupData } from './types';
import { deleteInventoryItem, fetchInventoryItemByBarcode, fetchInventoryItems, isSupabaseConfigured, upsertInventoryItem } from './lib/supabaseInventory';
import { getProductData } from './api';
import { ScanLine, Keyboard, Store, Download, RefreshCw, Loader2, Search, Filter } from 'lucide-react';
import { useHardwareScanner } from './hooks/useHardwareScanner';

type ActionModalState = 
  | { type: 'quantity'; product: InventoryItem | ({ barcode: string } & ProductLookupData); existingQty: number; isNew: boolean }
  | { type: 'manual'; barcode: string }
  | null;

export default function App() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const [scanningMode, setScanningMode] = useState<'manual' | 'camera'>('manual');
  const [actionModal, setActionModal] = useState<ActionModalState>(null);
  const [loadingBarcode, setLoadingBarcode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string, id: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'quantityAsc' | 'quantityDesc'>('recent');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInventory() {
      if (!isSupabaseConfigured) {
        setSyncError('Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pour activer la synchronisation Supabase.');
        setIsInventoryLoading(false);
        return;
      }

      try {
        const items = await fetchInventoryItems();
        if (isMounted) {
          setInventory(items);
          setSyncError(null);
        }
      } catch (error) {
        console.error('Erreur de chargement Supabase:', error);
        if (isMounted) {
          setSyncError(error instanceof Error ? error.message : 'Impossible de charger l’inventaire Supabase.');
        }
      } finally {
        if (isMounted) {
          setIsInventoryLoading(false);
        }
      }
    }

    loadInventory();

    return () => {
      isMounted = false;
    };
  }, []);

  const syncItem = async (item: InventoryItem) => {
    const savedItem = await upsertInventoryItem(item);
    setInventory(prev => [savedItem, ...prev.filter(i => i.barcode !== savedItem.barcode)]);
    setSyncError(null);
  };

  const showToast = (text: string) => {
    setToastMessage({ text, id: Date.now() });
    setTimeout(() => {
      setToastMessage(prev => prev?.id === prev?.id ? null : prev);
    }, 3000);
  };

  const addScannedProduct = useCallback(async (
    product: InventoryItem | ({ barcode: string } & ProductLookupData),
    quantityToAdd = 1,
  ) => {
    const existingItem = inventory.find(item => item.barcode === product.barcode);
    const databaseQuantity = 'quantity' in product ? product.quantity : 0;
    const currentQuantity = existingItem?.quantity ?? databaseQuantity;
    const item: InventoryItem = {
      barcode: product.barcode,
      name: product.name,
      imageUrl: product.imageUrl,
      brand: product.brand,
      category: product.category,
      quantity: currentQuantity + quantityToAdd,
      lastUpdated: Date.now()
    };

    await syncItem(item);
    showToast(`+${quantityToAdd} ${product.name}`);
  }, [inventory]);

  const handleScan = useCallback(async (barcode: string) => {
    if (!barcode || loadingBarcode || actionModal) return;
    
    setLoadingBarcode(barcode);

    // Check if already in inventory and validate the scan immediately with quantity 1.
    const existingItem = inventory.find(i => i.barcode === barcode);
    if (existingItem) {
      try {
        await addScannedProduct(existingItem);
      } catch (error) {
        console.error('Erreur de synchronisation Supabase:', error);
        setSyncError(error instanceof Error ? error.message : 'Impossible de synchroniser cet article.');
        showToast('Erreur de synchronisation Supabase');
      } finally {
        setLoadingBarcode(null);
      }
      return;
    }

    try {
      // Not in local state: check Supabase first, then enrich from OpenFoodFacts.
      const databaseItem = isSupabaseConfigured ? await fetchInventoryItemByBarcode(barcode) : null;
      if (databaseItem) {
        await addScannedProduct(databaseItem);
        return;
      }

      const data = await getProductData(barcode);
      if (data) {
        await addScannedProduct({ barcode, ...data });
      } else {
        // Not found, open manual creation modal
        setActionModal({
          type: 'manual',
          barcode: barcode
        });
      }
    } catch (error) {
      console.error('Erreur de recherche produit:', error);
      setSyncError(error instanceof Error ? error.message : 'Impossible de rechercher ce produit.');
      showToast('Erreur de recherche produit');
    } finally {
      setLoadingBarcode(null);
    }
  }, [inventory, loadingBarcode, actionModal, addScannedProduct]);

  // Hook for physical hardware scanners globally
  useHardwareScanner(handleScan);

  const handleUpdateQuantity = async (barcode: string, delta: number) => {
    const existingItem = inventory.find(item => item.barcode === barcode);
    if (!existingItem) return;

    const updatedItem = {
      ...existingItem,
      quantity: Math.max(0, existingItem.quantity + delta),
      lastUpdated: Date.now(),
    };

    setInventory(prev => prev.map(item => item.barcode === barcode ? updatedItem : item));

    try {
      await syncItem(updatedItem);
    } catch (error) {
      console.error('Erreur de synchronisation Supabase:', error);
      setInventory(prev => prev.map(item => item.barcode === barcode ? existingItem : item));
      setSyncError(error instanceof Error ? error.message : 'Impossible de synchroniser la quantité.');
      showToast('Erreur de synchronisation Supabase');
    }
  };

  const handleRemoveItem = async (barcode: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) {
      const previousInventory = inventory;
      setInventory(prev => prev.filter(i => i.barcode !== barcode));

      try {
        await deleteInventoryItem(barcode);
        setSyncError(null);
      } catch (error) {
        console.error('Erreur de suppression Supabase:', error);
        setInventory(previousInventory);
        setSyncError(error instanceof Error ? error.message : 'Impossible de supprimer cet article dans Supabase.');
        showToast('Erreur de suppression Supabase');
      }
    }
  };

  const handleManualProductSave = async (product: ProductLookupData, quantity: number) => {
    if (actionModal?.type === 'manual') {
      const item: InventoryItem = {
        barcode: actionModal.barcode,
        name: product.name,
        imageUrl: product.imageUrl,
        brand: product.brand,
        category: product.category,
        quantity,
        lastUpdated: Date.now()
      };

      try {
        await syncItem(item);
        showToast(`Ajouté: ${product.name} (x${quantity})`);
        setActionModal(null);
      } catch (error) {
        console.error('Erreur de synchronisation Supabase:', error);
        setSyncError(error instanceof Error ? error.message : 'Impossible d’ajouter cet article dans Supabase.');
        showToast('Erreur de synchronisation Supabase');
      }
    }
  };

  const handleQuantitySave = async (quantityToAdd: number) => {
    if (actionModal?.type === 'quantity') {
      const { product, isNew } = actionModal;
      const existingItem = inventory.find(item => item.barcode === product.barcode);
      const item: InventoryItem = isNew || !existingItem
        ? {
            barcode: product.barcode,
            name: product.name,
            imageUrl: product.imageUrl,
            brand: product.brand,
            category: product.category,
            quantity: quantityToAdd,
            lastUpdated: Date.now()
          }
        : {
            ...existingItem,
            quantity: existingItem.quantity + quantityToAdd,
            lastUpdated: Date.now()
          };

      try {
        await syncItem(item);
        showToast(`+${quantityToAdd} ${product.name}`);
        setActionModal(null);
      } catch (error) {
        console.error('Erreur de synchronisation Supabase:', error);
        setSyncError(error instanceof Error ? error.message : 'Impossible de synchroniser cet article.');
        showToast('Erreur de synchronisation Supabase');
      }
    }
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Code-barres,Nom,Marque,Quantité\n"
      + inventory.map(i => `${i.barcode},"${i.name.replace(/"/g, '""')}","${i.brand || ''}",${i.quantity}`).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventaire_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);

  const filteredInventory = useMemo(() => {
    let result = [...inventory];
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(i => 
        i.name.toLowerCase().includes(lower) || 
        i.barcode.includes(lower) || 
        (i.brand && i.brand.toLowerCase().includes(lower)) ||
        (i.category && i.category.toLowerCase().includes(lower))
      );
    }

    if (showLowStockOnly) {
      result = result.filter(i => i.quantity <= 5);
    }

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'quantityAsc') return a.quantity - b.quantity;
      if (sortBy === 'quantityDesc') return b.quantity - a.quantity;
      return b.lastUpdated - a.lastUpdated;
    });

    return result;
  }, [inventory, searchTerm, showLowStockOnly, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-inner">
              <Store className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Inventaire Boutique</h1>
              <p className="text-xs text-gray-500 font-medium">{inventory.length} références &bull; {totalItems} articles</p>
              <p className={`text-xs font-medium ${syncError ? 'text-red-500' : 'text-emerald-600'}`}>
                {syncError ? 'Supabase non synchronisé' : 'Synchronisé avec Supabase'}
              </p>
            </div>
          </div>
          {inventory.length > 0 && (
            <button
              onClick={handleExport}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors font-medium text-sm"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Scanner Section */}
        <section className="mb-12">
          <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm mb-6 flex max-w-sm mx-auto">
            <button
              onClick={() => setScanningMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                scanningMode === 'manual' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              Saisie Manuelle
            </button>
            <button
              onClick={() => setScanningMode('camera')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                scanningMode === 'camera' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ScanLine className="w-4 h-4" />
              Caméra
            </button>
          </div>

          <div className="relative">
             {loadingBarcode && (
               <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-blue-600">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span className="font-medium text-sm">Recherche {loadingBarcode}...</span>
               </div>
             )}
            
            {scanningMode === 'manual' ? (
              <ManualInput onScan={handleScan} isActive={!loadingBarcode && !actionModal} />
            ) : (
              <Scanner onScan={handleScan} isActive={!loadingBarcode && !actionModal} />
            )}
          </div>
        </section>

        {syncError && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {syncError}
          </div>
        )}

        {/* Inventory Section */}
        <section>
          <div className="flex flex-col gap-4 mb-6 border-b border-gray-200 pb-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Articles en stock</h2>
              <div className="flex w-full sm:w-auto items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un produit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center justify-center p-2 rounded-xl border transition-all ${
                    showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Filtres avancés"
                >
                  <Filter className="w-5 h-5" />
                </button>
                {inventory.length > 0 && (
                  <button
                    onClick={handleExport}
                    className="sm:hidden flex-shrink-0 flex items-center gap-2 p-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {showFilters && (
              <div className="flex flex-wrap items-center gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Trier par :</label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer"
                  >
                    <option value="recent">Date d'ajout</option>
                    <option value="name">Alphabétique (A-Z)</option>
                    <option value="quantityAsc">Quantité (Croissante)</option>
                    <option value="quantityDesc">Quantité (Décroissante)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showLowStockOnly}
                    onChange={e => setShowLowStockOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Stock faible uniquement (≤ 5)</span>
                </label>
              </div>
            )}
          </div>
          
          {isInventoryLoading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-12 text-blue-600">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="font-medium">Chargement de l’inventaire Supabase...</span>
            </div>
          ) : (
          <InventoryGrid 
            items={filteredInventory} 
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemoveItem}
          />
          )}
        </section>
      </main>

      {/* Modals & Toasts */}
      {actionModal?.type === 'manual' && (
        <ManualProductModal
          barcode={actionModal.barcode}
          onSave={handleManualProductSave}
          onCancel={() => setActionModal(null)}
        />
      )}
      
      {actionModal?.type === 'quantity' && (
        <QuantityModal
          product={actionModal.product}
          existingQty={actionModal.existingQty}
          isNew={actionModal.isNew}
          onSave={handleQuantitySave}
          onCancel={() => setActionModal(null)}
        />
      )}

      <Toast message={toastMessage?.text || null} visible={!!toastMessage} />
    </div>
  );
}
