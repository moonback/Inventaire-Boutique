import { useState, useEffect, useCallback, useMemo } from "react";
import { ManualInput } from "./components/ManualInput";
import { InventoryGrid } from "./components/InventoryGrid";
import { ManualProductModal } from "./components/ManualProductModal";
import { QuantityModal } from "./components/QuantityModal";
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
  PackageCheck,
  PackageOpen,
  Sparkles,
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
  | null;

export default function App() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [actionModal, setActionModal] = useState<ActionModalState>(null);
  const [loadingBarcode, setLoadingBarcode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    id: number;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<
    "recent" | "name" | "quantityAsc" | "quantityDesc"
  >("recent");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

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

      // Check if already in local state: open quantity modal immediately
      const existingItem = inventory.find((i) => i.barcode === barcode);
      if (existingItem) {
        setActionModal({
          type: "quantity",
          product: existingItem,
          existingQty: existingItem.quantity,
          isNew: false,
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
            type: "quantity",
            product: databaseItem,
            existingQty: databaseItem.quantity,
            isNew: false,
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

  const filteredInventory = useMemo(() => {
    let result = [...inventory];

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

    if (showLowStockOnly) {
      result = result.filter((i) => i.quantity <= 5);
    }

    result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "quantityAsc") return a.quantity - b.quantity;
      if (sortBy === "quantityDesc") return b.quantity - a.quantity;
      return b.lastUpdated - a.lastUpdated;
    });

    return result;
  }, [inventory, searchTerm, showLowStockOnly, sortBy]);

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans pb-32">
      {/* Header Panel */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 bg-[#070b13]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Inventaire
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                {inventory.length} réf. · {totalItems} articles
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

      <main className="mx-auto max-w-lg px-4 py-5 space-y-5">
        {/* Quick Scan Input area */}
        <section className="glass-card rounded-[2rem] p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-25">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          
          <div className="mb-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                Saisie rapide
              </span>
              <h2 className="mt-2 text-lg font-bold tracking-tight text-white">
                Scanner / Ajouter
              </h2>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                syncError 
                  ? "bg-red-500/10 border border-red-500/20 text-red-400" 
                  : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-red-400' : 'bg-emerald-400'}`} />
              {syncError ? "Erreur Supabase" : "Synchronisé"}
            </div>
          </div>

          <div className="relative">
            {loadingBarcode && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-[#0f172a]/90 border border-slate-800 text-slate-200 backdrop-blur-xs">
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

        {/* Sync error display */}
        {syncError && (
          <div className="flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        {/* Fast Stats Row */}
        <section className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-2xl p-3.5 text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Références</p>
            <p className="mt-1 text-xl font-bold text-white">{inventory.length}</p>
          </div>
          <div className="glass-card rounded-2xl p-3.5 text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Quantité</p>
            <p className="mt-1 text-xl font-bold text-white">{totalItems}</p>
          </div>
          <div className="glass-card rounded-2xl p-3.5 text-center bg-amber-500/5 border border-amber-500/10">
            <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider">Stock Faible</p>
            <p className="mt-1 text-xl font-bold text-amber-400">
              {inventory.filter((item) => item.quantity <= 5).length}
            </p>
          </div>
        </section>

        {/* Products Search & List */}
        <section className="glass-card rounded-[2rem] p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                Articles en Stock
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Gérez les quantités et les catégories
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-xl bg-slate-900/60 border border-slate-800 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition focus:border-indigo-500/50"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border transition tap-active ${
                  showFilters 
                    ? "border-indigo-500 bg-indigo-600 text-white" 
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                }`}
                title="Filtres"
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Expanded Filters Drawer */}
          {showFilters && (
            <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
              <div className="flex flex-col gap-2">
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
              <label className="flex items-center gap-2 font-medium text-slate-300 select-none cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={showLowStockOnly}
                  onChange={(e) => setShowLowStockOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
                />
                Stock faible uniquement (≤ 5)
              </label>
            </div>
          )}

          {isInventoryLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
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
            />
          )}
        </section>
      </main>

      {actionModal?.type === "manual" && (
        <ManualProductModal
          barcode={actionModal.barcode}
          onSave={handleManualProductSave}
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
