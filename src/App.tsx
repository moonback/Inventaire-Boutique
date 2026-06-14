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
  Keyboard,
  Store,
  Download,
  Loader2,
  Search,
  Filter,
  PackageCheck,
  Boxes,
  AlertTriangle,
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
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#dbeafe_0,transparent_34rem),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-950 font-sans selection:bg-blue-100 selection:text-blue-900 pb-24">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 shadow-sm shadow-slate-200/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-600">
                Tableau de bord
              </p>
              <h1 className="truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                Inventaire Boutique
              </h1>
            </div>
          </div>
          {inventory.length > 0 && (
            <button
              onClick={handleExport}
              className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 hover:shadow-md sm:flex"
            >
              <Download className="h-4 w-4" />
              Exporter
            </button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur sm:col-span-2">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Saisie rapide optimisée mobile
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Ajoutez vos produits sans caméra
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Utilisez un lecteur code-barres physique, collez un code ou
                  saisissez-le manuellement. Le champ reste au centre de
                  l'expérience pour accélérer les entrées en boutique.
                </p>
              </div>
              <div className="hidden rounded-2xl bg-slate-950 p-3 text-white shadow-lg sm:block">
                <Keyboard className="h-6 w-6" />
              </div>
            </div>
            <div className="relative">
              {loadingBarcode && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-white/70 text-blue-700 shadow-inner backdrop-blur-sm">
                  <Loader2 className="mb-2 h-8 w-8 animate-spin" />
                  <span className="text-sm font-bold">
                    Recherche {loadingBarcode}...
                  </span>
                </div>
              )}
              <ManualInput
                onScan={handleScan}
                isActive={!loadingBarcode && !actionModal}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:gap-4">
            <div className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-200/60">
              <PackageCheck className="mb-3 h-6 w-6 text-blue-600" />
              <p className="text-3xl font-black text-slate-950">
                {inventory.length}
              </p>
              <p className="text-sm font-semibold text-slate-500">références</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-200/60">
              <Boxes className="mb-3 h-6 w-6 text-indigo-600" />
              <p className="text-3xl font-black text-slate-950">{totalItems}</p>
              <p className="text-sm font-semibold text-slate-500">
                articles en stock
              </p>
            </div>
            <div
              className={`rounded-[1.5rem] border p-4 text-sm font-bold shadow-lg shadow-slate-200/60 ${syncError ? "border-red-100 bg-red-50 text-red-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}
            >
              {syncError
                ? "Supabase non synchronisé"
                : "Synchronisé avec Supabase"}
            </div>
          </div>
        </section>
        {syncError && (
          <div className="mb-6 flex gap-3 rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <span>{syncError}</span>
          </div>
        )}
        <section className="rounded-[1.75rem] border border-white/80 bg-white/80 p-4 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-6">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Catalogue
                </p>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Articles en stock
                </h2>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl border shadow-sm transition ${showFilters ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"}`}
                  title="Filtres avancés"
                >
                  <Filter className="h-5 w-5" />
                </button>
                {inventory.length > 0 && (
                  <button
                    onClick={handleExport}
                    className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:text-blue-700 sm:hidden"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
            {showFilters && (
              <div className="grid gap-3 rounded-3xl border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <label className="grid gap-2 text-sm font-bold text-slate-600 sm:grid-cols-[auto_1fr] sm:items-center">
                  Trier par
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="recent">Date d'ajout</option>
                    <option value="name">Alphabétique (A-Z)</option>
                    <option value="quantityAsc">Quantité croissante</option>
                    <option value="quantityDesc">Quantité décroissante</option>
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
                  <input
                    type="checkbox"
                    checked={showLowStockOnly}
                    onChange={(e) => setShowLowStockOnly(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Stock faible uniquement (≤ 5)
                </label>
              </div>
            )}
          </div>
          {isInventoryLoading ? (
            <div className="flex items-center justify-center gap-3 rounded-3xl border border-slate-100 bg-white py-14 text-blue-700 shadow-sm">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="font-bold">
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
