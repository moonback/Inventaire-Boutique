import { useState, useEffect, useCallback, useMemo } from "react";
import { ManualInput } from "./components/ManualInput";
import { InventoryGrid } from "./components/InventoryGrid";
import { ManualProductModal } from "./components/ManualProductModal";
import { QuantityModal } from "./components/QuantityModal";
import { ScanChoiceModal } from "./components/ScanChoiceModal";
import { Toast } from "./components/Toast";
import { InventoryItem, ProductLookupData } from "./types";
import {
  deleteInventoryItem,
  fetchInventoryItemByBarcode,
  fetchInventoryItems,
  isSupabaseConfigured,
  upsertInventoryItem,
} from "./lib/supabaseInventory";
import { getProductData } from "./api";
import {
  Store,
  Download,
  Loader2,
  Search,
  Filter,
  AlertTriangle,
  Sparkles,
  Scan,
  Package,
  X,
} from "lucide-react";
import { useHardwareScanner } from "./hooks/useHardwareScanner";

type ActionModalState =
  | {
      type: "quantity";
      product: InventoryItem | ({ barcode: string } & ProductLookupData);
      existingQty: number;
      isNew: boolean;
    }
  | { type: "manual"; barcode: string }
  | { type: "edit"; product: InventoryItem }
  | { type: "scan_choice"; product: InventoryItem }
  | null;

export default function App() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"scan" | "stock">("scan");
  const [actionModal, setActionModal] = useState<ActionModalState>(null);
  const [loadingBarcode, setLoadingBarcode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    id: number;
  } | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out" | "instock">("all");
  const [sortBy, setSortBy] = useState<
    "recent" | "name" | "quantityAsc" | "quantityDesc"
  >("recent");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInventory() {
      if (!isSupabaseConfigured) {
        setSyncError(
          "Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pour activer la synchronisation Supabase.",
        );
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
        console.error("Erreur de chargement Supabase:", error);
        if (isMounted) {
          setSyncError(
            error instanceof Error
              ? error.message
              : "Impossible de charger l’inventaire Supabase.",
          );
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
    setInventory((prev) => [
      savedItem,
      ...prev.filter((i) => i.barcode !== savedItem.barcode),
    ]);
    setSyncError(null);
  };

  const showToast = (text: string) => {
    const id = Date.now();
    setToastMessage({ text, id });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.id === id ? null : prev));
    }, 3000);
  };

  const handleScan = useCallback(
    async (barcode: string) => {
      if (!barcode || loadingBarcode || actionModal) return;

      setLoadingBarcode(barcode);

      // Check if already in local state: open choice modal
      const existingItem = inventory.find((i) => i.barcode === barcode);
      if (existingItem) {
        setActionModal({
          type: "scan_choice",
          product: existingItem,
        });
        setLoadingBarcode(null);
        return;
      }

      try {
        // Not in local state: check Supabase first, then OpenFoodFacts.
        const databaseItem = isSupabaseConfigured
          ? await fetchInventoryItemByBarcode(barcode)
          : null;
        if (databaseItem) {
          setActionModal({
            type: "scan_choice",
            product: databaseItem,
          });
          return;
        }

        const data = await getProductData(barcode);
        if (data) {
          setActionModal({
            type: "quantity",
            product: { barcode, ...data },
            existingQty: 0,
            isNew: true,
          });
        } else {
          // Not found, open manual creation modal
          setActionModal({
            type: "manual",
            barcode: barcode,
          });
        }
      } catch (error) {
        console.error("Erreur de recherche produit:", error);
        setSyncError(
          error instanceof Error
            ? error.message
            : "Impossible de rechercher ce produit.",
        );
        showToast("Erreur de recherche produit");
      } finally {
        setLoadingBarcode(null);
      }
    },
    [inventory, loadingBarcode, actionModal],
  );

  // Hook for physical hardware scanners globally
  useHardwareScanner(handleScan);

  const handleUpdateQuantity = async (barcode: string, delta: number) => {
    const existingItem = inventory.find((item) => item.barcode === barcode);
    if (!existingItem) return;

    const updatedItem = {
      ...existingItem,
      quantity: Math.max(0, existingItem.quantity + delta),
      lastUpdated: Date.now(),
    };

    setInventory((prev) =>
      prev.map((item) => (item.barcode === barcode ? updatedItem : item)),
    );

    try {
      await syncItem(updatedItem);
    } catch (error) {
      console.error("Erreur de synchronisation Supabase:", error);
      setInventory((prev) =>
        prev.map((item) => (item.barcode === barcode ? existingItem : item)),
      );
      setSyncError(
        error instanceof Error
          ? error.message
          : "Impossible de synchroniser la quantité.",
      );
      showToast("Erreur de synchronisation Supabase");
    }
  };

  const handleRemoveItem = async (barcode: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) {
      const previousInventory = inventory;
      setInventory((prev) => prev.filter((i) => i.barcode !== barcode));

      try {
        await deleteInventoryItem(barcode);
        setSyncError(null);
        showToast("Article supprimé");
      } catch (error) {
        console.error("Erreur de suppression Supabase:", error);
        setInventory(previousInventory);
        setSyncError(
          error instanceof Error
            ? error.message
            : "Impossible de supprimer cet article dans Supabase.",
        );
        showToast("Erreur de suppression Supabase");
      }
    }
  };

  const handleManualProductSave = async (
    product: ProductLookupData,
    quantity: number,
  ) => {
    if (actionModal?.type === "manual") {
      const item: InventoryItem = {
        barcode: actionModal.barcode,
        name: product.name,
        imageUrl: product.imageUrl,
        brand: product.brand,
        category: product.category,
        quantity,
        lastUpdated: Date.now(),
      };

      try {
        await syncItem(item);
        showToast(`Ajouté: ${product.name} (x${quantity})`);
        setActionModal(null);
        setActiveTab("stock");
      } catch (error) {
        console.error("Erreur de synchronisation Supabase:", error);
        setSyncError(
          error instanceof Error
            ? error.message
            : "Impossible d’ajouter cet article dans Supabase.",
        );
        showToast("Erreur de synchronisation Supabase");
      }
    }
  };

  const handleProductUpdateSave = async (
    product: ProductLookupData,
    quantity: number,
  ) => {
    if (actionModal?.type === "edit") {
      const item: InventoryItem = {
        barcode: actionModal.product.barcode,
        name: product.name,
        imageUrl: product.imageUrl,
        brand: product.brand,
        category: product.category,
        quantity,
        lastUpdated: Date.now(),
      };

      try {
        await syncItem(item);
        showToast(`Mis à jour : ${product.name}`);
        setActionModal(null);
      } catch (error) {
        console.error("Erreur de synchronisation Supabase:", error);
        setSyncError(
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour cet article.",
        );
        showToast("Erreur de synchronisation Supabase");
      }
    }
  };

  const handleQuantitySave = async (quantity: number, mode: "add" | "set") => {
    if (actionModal?.type === "quantity") {
      const { product, isNew } = actionModal;
      const existingItem = inventory.find(
        (item) => item.barcode === product.barcode,
      );

      const newQuantity = mode === "set"
        ? quantity
        : (existingItem?.quantity ?? 0) + quantity;

      const item: InventoryItem = {
        barcode: product.barcode,
        name: product.name,
        imageUrl: product.imageUrl,
        brand: product.brand,
        category: product.category,
        quantity: Math.max(0, newQuantity),
        lastUpdated: Date.now(),
      };

      try {
        await syncItem(item);
        showToast(
          mode === "set"
            ? `Stock défini à ${quantity} (${product.name})`
            : `+${quantity} ${product.name}`
        );
        setActionModal(null);
        setActiveTab("stock");
      } catch (error) {
        console.error("Erreur de synchronisation Supabase:", error);
        setSyncError(
          error instanceof Error
            ? error.message
            : "Impossible de synchroniser cet article.",
        );
        showToast("Erreur de synchronisation Supabase");
      }
    }
  };

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Code-barres,Nom,Marque,Catégorie,Quantité\n" +
      inventory
        .map(
          (i) =>
            `${i.barcode},"${i.name.replace(/"/g, '""')}","${i.brand || ""}","${i.category || ""}",${i.quantity}`,
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `inventaire_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = inventory.filter((item) => item.quantity <= 5).length;

  // Extract list of unique categories dynamically
  const categories = useMemo(() => {
    const cats = new Set<string>();
    inventory.forEach((item) => {
      if (item.category && item.category.trim()) {
        cats.add(item.category.trim());
      }
    });
    return Array.from(cats).sort();
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    let result = [...inventory];

    // Search filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(lower) ||
          i.barcode.includes(lower) ||
          (i.brand && i.brand.toLowerCase().includes(lower)) ||
          (i.category && i.category.toLowerCase().includes(lower)),
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter((i) => i.category?.trim() === selectedCategory);
    }

    // Stock state filter
    if (stockFilter === "low") {
      result = result.filter((i) => i.quantity <= 5 && i.quantity > 0);
    } else if (stockFilter === "out") {
      result = result.filter((i) => i.quantity === 0);
    } else if (stockFilter === "instock") {
      result = result.filter((i) => i.quantity > 5);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "quantityAsc") return a.quantity - b.quantity;
      if (sortBy === "quantityDesc") return b.quantity - a.quantity;
      return b.lastUpdated - a.lastUpdated;
    });

    return result;
  }, [inventory, searchTerm, selectedCategory, stockFilter, sortBy]);

  const hasActiveFilters = selectedCategory !== null || stockFilter !== "all" || searchTerm !== "";

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategory(null);
    setStockFilter("all");
    setSortBy("recent");
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans pb-32">
      {/* Header Panel */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 bg-[#070b13]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Boutique
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                Gestionnaire d'inventaire
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {inventory.length > 0 && (
              <button
                onClick={handleExport}
                className="flex items-center justify-center p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white tap-active transition"
                title="Exporter l'inventaire en CSV"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4 space-y-4">
        {/* Compact Stats Row */}
        <section className="flex items-center justify-between bg-slate-900/40 border border-slate-800/80 rounded-2xl p-2.5 px-4 text-[11px] font-semibold text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Réf : <strong className="text-white font-bold">{inventory.length}</strong></span>
          </div>
          <div className="h-3.5 w-px bg-slate-800/85" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Total : <strong className="text-white font-bold">{totalItems}</strong></span>
          </div>
          <div className="h-3.5 w-px bg-slate-800/85" />
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${lowStockCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-600'}`} />
            <span>Alerte : <strong className="text-white font-bold">{lowStockCount}</strong></span>
          </div>
        </section>

        {/* Sync error display */}
        {syncError && (
          <div className="flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        {/* Content Tabs */}
        {activeTab === "scan" ? (
          /* SCAN TAB */
          <section className="glass-card rounded-[2rem] p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-25">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                  Scanner
                </span>
                <h2 className="mt-2 text-base font-bold tracking-tight text-white">
                  Ajouter via Code-barres
                </h2>
              </div>
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  syncError 
                    ? "bg-red-500/10 border border-red-500/20 text-red-400" 
                    : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                }`}
              >
                <span className={`w-1 h-1 rounded-full ${syncError ? 'bg-red-400' : 'bg-emerald-400'}`} />
                {syncError ? "Supabase Off" : "Synchro On"}
              </div>
            </div>

            <div className="relative">
              {loadingBarcode && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-[#0f172a]/95 border border-slate-800 text-slate-200 backdrop-blur-xs">
                  <Loader2 className="mb-2 h-6 w-6 animate-spin text-indigo-400" />
                  <span className="text-xs font-semibold tracking-wider font-mono">
                    Recherche {loadingBarcode}...
                  </span>
                </div>
              )}
              <ManualInput
                onScan={handleScan}
                isActive={!loadingBarcode && !actionModal}
              />
            </div>
          </section>
        ) : (
          /* STOCK VIEW TAB */
          <section className="glass-card rounded-[2rem] p-5 space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    Inventaire
                  </span>
                  <h2 className="mt-2 text-base font-bold tracking-tight text-white">
                    Articles en Stock
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1.5 rounded-xl tap-active transition"
                    >
                      <X className="w-3 h-3" />
                      Effacer ({filteredInventory.length} restants)
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border transition tap-active ${
                      showFilters 
                        ? "border-indigo-500 bg-indigo-600 text-white" 
                        : "border-slate-850 bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                    title="Filtres"
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, marque..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-xl bg-slate-950/60 border border-slate-800 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition focus:border-indigo-500/50"
                />
              </div>

              {/* Dynamic scrollable Category Filter Pills */}
              {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition shrink-0 tap-active select-none ${
                      selectedCategory === null
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                        : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Tout ({inventory.length})
                  </button>
                  {categories.map((cat) => {
                    const count = inventory.filter((i) => i.category?.trim() === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition shrink-0 tap-active select-none ${
                          selectedCategory === cat
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                            : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Expanded Filters Drawer */}
            {showFilters && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-855 bg-slate-950/50 p-3 text-xs">
                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <span className="font-semibold text-slate-400">Trier par</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-200 outline-none focus:border-indigo-500/50"
                  >
                    <option value="recent">Date d'ajout</option>
                    <option value="name">Alphabétique (A-Z)</option>
                    <option value="quantityAsc">Quantité croissante</option>
                    <option value="quantityDesc">Quantité décroissante</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <span className="font-semibold text-slate-400">État du Stock</span>
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as any)}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-200 outline-none focus:border-indigo-500/50"
                  >
                    <option value="all">Tous les articles</option>
                    <option value="instock">En stock (&gt; 5)</option>
                    <option value="low">Stock faible (≤ 5)</option>
                    <option value="out">Rupture de stock (0)</option>
                  </select>
                </div>
              </div>
            )}

            {isInventoryLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400 border border-dashed border-slate-850 rounded-2xl bg-slate-950/20">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                <span className="text-xs font-semibold tracking-wider">
                  Chargement de l’inventaire...
                </span>
              </div>
            ) : (
              <InventoryGrid
                items={filteredInventory}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveItem}
                onEditQuantity={(item) => setActionModal({
                  type: "quantity",
                  product: item,
                  existingQty: item.quantity,
                  isNew: false,
                })}
                onEditProduct={(item) => setActionModal({
                  type: "edit",
                  product: item,
                })}
              />
            )}
          </section>
        )}
      </main>

      {/* Modern Fixed Bottom Tab Bar Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#070b13]/90 backdrop-blur-lg border-t border-slate-900/80 pb-safe">
        <div className="mx-auto max-w-lg flex justify-around py-3">
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex flex-col items-center gap-1.5 transition select-none tap-active ${
              activeTab === "scan" ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${activeTab === 'scan' ? 'bg-indigo-500/10' : ''}`}>
              <Scan className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold tracking-wide">Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab("stock")}
            className={`flex flex-col items-center gap-1.5 transition select-none tap-active ${
              activeTab === "stock" ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${activeTab === 'stock' ? 'bg-emerald-500/10' : ''}`}>
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold tracking-wide">Stock</span>
          </button>
        </div>
      </nav>

      {/* Modals & toast */}
      {actionModal?.type === "manual" && (
        <ManualProductModal
          barcode={actionModal.barcode}
          onSave={handleManualProductSave}
          onCancel={() => setActionModal(null)}
        />
      )}
      {actionModal?.type === "scan_choice" && (
        <ScanChoiceModal
          product={actionModal.product}
          onChooseStock={() =>
            setActionModal({
              type: "quantity",
              product: actionModal.product,
              existingQty: actionModal.product.quantity,
              isNew: false,
            })
          }
          onChooseEdit={() =>
            setActionModal({
              type: "edit",
              product: actionModal.product,
            })
          }
          onCancel={() => setActionModal(null)}
        />
      )}
      {actionModal?.type === "edit" && (
        <ManualProductModal
          barcode={actionModal.product.barcode}
          initialValues={actionModal.product}
          onSave={handleProductUpdateSave}
          onCancel={() => setActionModal(null)}
        />
      )}
      {actionModal?.type === "quantity" && (
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
