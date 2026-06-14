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

  const addScannedProduct = useCallback(
    async (
      product: InventoryItem | ({ barcode: string } & ProductLookupData),
      quantityToAdd = 1,
    ) => {
      const existingItem = inventory.find(
        (item) => item.barcode === product.barcode,
      );
      const databaseQuantity = "quantity" in product ? product.quantity : 0;
      const currentQuantity = existingItem?.quantity ?? databaseQuantity;
      const item: InventoryItem = {
        barcode: product.barcode,
        name: product.name,
        imageUrl: product.imageUrl,
        brand: product.brand,
        category: product.category,
        quantity: currentQuantity + quantityToAdd,
        lastUpdated: Date.now(),
      };

      await syncItem(item);
      showToast(`+${quantityToAdd} ${product.name}`);
    },
    [inventory],
  );

  const handleScan = useCallback(
    async (barcode: string) => {
      if (!barcode || loadingBarcode || actionModal) return;

      setLoadingBarcode(barcode);

      // Check if already in inventory and validate the scan immediately with quantity 1.
      const existingItem = inventory.find((i) => i.barcode === barcode);
      if (existingItem) {
        try {
          await addScannedProduct(existingItem);
        } catch (error) {
          console.error("Erreur de synchronisation Supabase:", error);
          setSyncError(
            error instanceof Error
              ? error.message
              : "Impossible de synchroniser cet article.",
          );
          showToast("Erreur de synchronisation Supabase");
        } finally {
          setLoadingBarcode(null);
        }
        return;
      }

      try {
        // Not in local state: check Supabase first, then enrich from OpenFoodFacts.
        const databaseItem = isSupabaseConfigured
          ? await fetchInventoryItemByBarcode(barcode)
          : null;
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
    [inventory, loadingBarcode, actionModal, addScannedProduct],
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

  const handleQuantitySave = async (quantityToAdd: number) => {
    if (actionModal?.type === "quantity") {
      const { product, isNew } = actionModal;
      const existingItem = inventory.find(
        (item) => item.barcode === product.barcode,
      );
      const item: InventoryItem =
        isNew || !existingItem
          ? {
              barcode: product.barcode,
              name: product.name,
              imageUrl: product.imageUrl,
              brand: product.brand,
              category: product.category,
              quantity: quantityToAdd,
              lastUpdated: Date.now(),
            }
          : {
              ...existingItem,
              quantity: existingItem.quantity + quantityToAdd,
              lastUpdated: Date.now(),
            };

      try {
        await syncItem(item);
        showToast(`+${quantityToAdd} ${product.name}`);
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
      "Code-barres,Nom,Marque,Quantité\n" +
      inventory
        .map(
          (i) =>
            `${i.barcode},"${i.name.replace(/"/g, '""')}","${i.brand || ""}",${i.quantity}`,
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
    <div className="min-h-screen bg-slate-50 text-slate-950 font-sans selection:bg-slate-200 pb-20">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-slate-200 bg-white">
              <Store className="h-5 w-5 text-slate-800" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                Inventaire Boutique
              </h1>
              <p className="text-xs text-slate-500">
                {inventory.length} références · {totalItems} articles
              </p>
            </div>
          </div>
          {inventory.length > 0 && (
            <button
              onClick={handleExport}
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:flex"
            >
              <Download className="h-4 w-4" />
              Exporter
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Saisie rapide
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                Ajouter un produit
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                Saisissez un code-barres ou utilisez un lecteur physique. La
                caméra a été retirée pour garder une interface simple, fiable et
                rapide sur mobile.
              </p>
            </div>
            <div
              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${syncError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
            >
              {syncError ? "Non synchronisé" : "Synchronisé"}
            </div>
          </div>
          <div className="relative">
            {loadingBarcode && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/80 text-slate-800 backdrop-blur-sm">
                <Loader2 className="mb-2 h-6 w-6 animate-spin" />
                <span className="text-sm font-medium">
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

        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Références</p>
            <p className="mt-1 text-2xl font-semibold">{inventory.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Articles</p>
            <p className="mt-1 text-2xl font-semibold">{totalItems}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-1">
            <p className="text-xs font-medium text-slate-500">Stock faible</p>
            <p className="mt-1 text-2xl font-semibold">
              {inventory.filter((item) => item.quantity <= 5).length}
            </p>
          </div>
        </section>

        {syncError && (
          <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Articles en stock
              </h2>
              <p className="text-sm text-slate-500">
                Gérez les quantités et les alertes de stock.
              </p>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border transition ${showFilters ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                title="Filtres avancés"
              >
                <Filter className="h-4 w-4" />
              </button>
              {inventory.length > 0 && (
                <button
                  onClick={handleExport}
                  className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 sm:hidden"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <label className="grid gap-2 text-sm font-medium text-slate-700 sm:grid-cols-[auto_1fr] sm:items-center">
                Trier par
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
                >
                  <option value="recent">Date d'ajout</option>
                  <option value="name">Alphabétique (A-Z)</option>
                  <option value="quantityAsc">Quantité croissante</option>
                  <option value="quantityDesc">Quantité décroissante</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showLowStockOnly}
                  onChange={(e) => setShowLowStockOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                Stock faible uniquement (≤ 5)
              </label>
            </div>
          )}

          {isInventoryLoading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 py-12 text-slate-700">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">
                Chargement de l’inventaire Supabase...
              </span>
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
