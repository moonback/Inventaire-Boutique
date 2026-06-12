import { useState, useEffect, useCallback } from 'react';
import { Scanner } from './components/Scanner';
import { ManualInput } from './components/ManualInput';
import { InventoryGrid } from './components/InventoryGrid';
import { ManualProductModal } from './components/ManualProductModal';
import { Toast } from './components/Toast';
import { InventoryItem } from './types';
import { getProductData } from './api';
import { ScanLine, Keyboard, Store, Download, RefreshCw, Loader2 } from 'lucide-react';

export default function App() {
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('inventory');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [scanningMode, setScanningMode] = useState<'manual' | 'camera'>('manual');
  const [productToCreate, setProductToCreate] = useState<string | null>(null);
  const [loadingBarcode, setLoadingBarcode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string, id: number } | null>(null);

  useEffect(() => {
    localStorage.setItem('inventory', JSON.stringify(inventory));
  }, [inventory]);

  const showToast = (text: string) => {
    setToastMessage({ text, id: Date.now() });
    setTimeout(() => {
      setToastMessage(prev => prev?.id === prev?.id ? null : prev);
    }, 3000);
  };

  const handleScan = useCallback(async (barcode: string) => {
    if (!barcode || loadingBarcode) return;
    
    setLoadingBarcode(barcode);

    // Check if already in inventory
    const existingIndex = inventory.findIndex(i => i.barcode === barcode);
    if (existingIndex >= 0) {
      const newInventory = [...inventory];
      newInventory[existingIndex].quantity += 1;
      newInventory[existingIndex].lastUpdated = Date.now();
      setInventory(newInventory);
      showToast(`+1 ${newInventory[existingIndex].name}`);
      setLoadingBarcode(null);
      return;
    }

    // Not in inventory, fetch from API
    const data = await getProductData(barcode);
    if (data) {
      setInventory(prev => [{
        barcode,
        name: data.name,
        quantity: 1,
        imageUrl: data.imageUrl,
        brand: data.brand,
        category: data.category,
        lastUpdated: Date.now()
      }, ...prev]);
      showToast(`Ajouté: ${data.name}`);
    } else {
      // Not found, open manual creation modal
      setProductToCreate(barcode);
    }
    
    setLoadingBarcode(null);
  }, [inventory, loadingBarcode]);

  const handleUpdateQuantity = (barcode: string, delta: number) => {
    setInventory(prev => prev.map(item => {
      if (item.barcode === barcode) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty, lastUpdated: Date.now() };
      }
      return item;
    }));
  };

  const handleRemoveItem = (barcode: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) {
      setInventory(prev => prev.filter(i => i.barcode !== barcode));
    }
  };

  const handleManualProductSave = (name: string) => {
    if (productToCreate) {
      setInventory(prev => [{
        barcode: productToCreate,
        name,
        quantity: 1,
        lastUpdated: Date.now()
      }, ...prev]);
      showToast(`Ajouté: ${name}`);
    }
    setProductToCreate(null);
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
              <ManualInput onScan={handleScan} />
            ) : (
              <Scanner onScan={handleScan} />
            )}
          </div>
        </section>

        {/* Inventory Section */}
        <section>
          <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-4">
            <h2 className="text-lg font-bold text-gray-900">Articles en stock</h2>
            {inventory.length > 0 && (
              <button
                onClick={handleExport}
                className="sm:hidden flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            )}
          </div>
          
          <InventoryGrid 
            items={inventory} 
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemoveItem}
          />
        </section>
      </main>

      {/* Modals & Toasts */}
      {productToCreate && (
        <ManualProductModal
          barcode={productToCreate}
          onSave={handleManualProductSave}
          onCancel={() => setProductToCreate(null)}
        />
      )}

      <Toast message={toastMessage?.text || null} visible={!!toastMessage} />
    </div>
  );
}
