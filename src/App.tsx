import { Header } from "./components/Header";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ManualInput } from "./components/ManualInput";
import { ScanTabView } from "./views/ScanTabView";
import { InventoryGrid } from "./components/InventoryGrid";
import { ManualProductModal } from "./components/ManualProductModal";
import { QuantityModal } from "./components/QuantityModal";
import { ScanChoiceModal } from "./components/ScanChoiceModal";
import { AuthScreen } from "./components/AuthScreen";
import { Toast } from "./components/Toast";
import { InventoryItem, ProductLookupData, CategoryItem } from "./types";
import {
  isSupabaseConfigured,
} from "./lib/supabaseInventory";
import {
  loadInventoryItems,
  fetchInventoryItemWithFallback,
  syncInventoryItem,
  syncDeleteInventoryItem,
} from "./lib/inventorySync";
import { fetchCategories } from "./lib/supabaseCategories";
import { CategoriesManager } from "./components/CategoriesManager";
import { suggestCategory } from "./lib/autoCategorization";
import { getSession, signOut, UserSession } from "./lib/supabaseAuth";
import { getProductData } from "./api";
import {
  Loader2,
  Search,
  Filter,
  AlertTriangle,
  Sparkles,
  Scan,
  Package,
  X,
  List,
  LayoutGrid,
  Minus,
  Plus,
  Tags,
} from "lucide-react";
import { useHardwareScanner } from "./hooks/useHardwareScanner";
import { useSupabaseRealtime } from "./hooks/useSupabaseRealtime";
import { useOfflineSync } from "./hooks/useOfflineSync";
import { triggerHaptic } from "./lib/haptics";
import { TabBar, TabKey } from "./design-system/components/TabBar";
import { BottomSheet } from "./design-system/components/BottomSheet";


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
  const [session, setSession] = useState<UserSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [inventorySource, setInventorySource] = useState<"remote" | "cache">("remote");

  const [activeTab, setActiveTab] = useState<"scan" | "stock" | "categories">("scan");
  const [dbCategories, setDbCategories] = useState<CategoryItem[]>([]);
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
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);

  const showToast = useCallback((text: string) => {
    const id = Date.now();
    setToastMessage({ text, id });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.id === id ? null : prev));
    }, 3000);
  }, []);

  const handleOfflineFlushComplete = useCallback(
    async (result: { synced: number; failed: number; remaining: number }) => {
      if (result.synced > 0) {
        showToast(`${result.synced} modification(s) synchronisée(s)`);
        try {
          const { items, source } = await loadInventoryItems();
          setInventory(items);
          setInventorySource(source);
          setSyncError(null);
        } catch (error) {
          console.error("Erreur de rechargement après synchro:", error);
        }
      }
      if (result.failed > 0) {
        showToast(`${result.failed} modification(s) en échec`);
      }
    },
    [showToast],
  );

  const {
    isOnline,
    pendingCount,
    isSyncing,
    refreshPendingCount,
    flushQueue,
  } = useOfflineSync({
    enabled: !!session,
    onFlushComplete: handleOfflineFlushComplete,
  });

  // Check session on mount
  useEffect(() => {
    const activeSession = getSession();
    setSession(activeSession);
    setIsSessionLoading(false);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchCategories();
      setDbCategories(cats);
    } catch (error) {
      console.error("Erreur de chargement des catégories:", error);
    }
  }, []);

  const loadInventoryOnly = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSyncError(
        "Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pour activer la synchronisation Supabase.",
      );
      setIsInventoryLoading(false);
      return;
    }

    try {
      const { items, source } = await loadInventoryItems();
      setInventory(items);
      setInventorySource(source);
      setSyncError(
        source === "cache" && !isOnline
          ? "Mode hors-ligne — données locales affichées."
          : null,
      );
    } catch (error) {
      console.error("Erreur de chargement Supabase:", error);
      setSyncError(
        error instanceof Error
          ? error.message
          : "Impossible de charger l'inventaire Supabase.",
      );
    } finally {
      setIsInventoryLoading(false);
    }
  }, [isOnline]);

  // Fetch inventory once authenticated
  useEffect(() => {
    if (!session) return;

    let isMounted = true;
    setIsInventoryLoading(true);

    async function loadData() {
      if (!isSupabaseConfigured) {
        setSyncError(
          "Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pour activer la synchronisation Supabase.",
        );
        setIsInventoryLoading(false);
        return;
      }

      try {
        const [{ items, source }, cats] = await Promise.all([
          loadInventoryItems(),
          fetchCategories(),
        ]);
        if (isMounted) {
          setInventory(items);
          setInventorySource(source);
          setDbCategories(cats);
          setSyncError(
            source === "cache" && !navigator.onLine
              ? "Mode hors-ligne — données locales affichées."
              : null,
          );
        }
      } catch (error) {
        console.error("Erreur de chargement Supabase:", error);
        if (isMounted) {
          setSyncError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les données Supabase.",
          );
        }
      } finally {
        if (isMounted) {
          setIsInventoryLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [session]);

  const handleLogout = async () => {
    if (session) {
      setIsInventoryLoading(true);
      await signOut(session.accessToken);
      setSession(null);
      setInventory([]);
      showToast("Déconnecté avec succès");
    }
  };

  const syncItem = async (item: InventoryItem) => {
    const { item: savedItem, queued } = await syncInventoryItem(item);
    setInventory((prev) => [
      savedItem,
      ...prev.filter((i) => i.barcode !== savedItem.barcode),
    ]);
    if (queued) {
      setSyncError("Modifications en attente de synchronisation.");
    } else {
      setSyncError(null);
    }
    await refreshPendingCount();
    return queued;
  };

  const handleScan = useCallback(
    async (barcode: string) => {
      if (!barcode || loadingBarcode || actionModal || !session) return;

      setLoadingBarcode(barcode);

      // Check if already in local state: open choice modal (or increment immediately if in batch mode)
      if (isBatchMode) {
        const existingItem = inventory.find((i) => i.barcode === barcode);
        if (existingItem) {
          const updatedItem = {
            ...existingItem,
            quantity: existingItem.quantity + 1,
            lastUpdated: Date.now(),
            lastMovement: 1,
          };
          try {
            await syncItem(updatedItem);
            triggerHaptic("success");
            showToast(`+1 ${existingItem.name} (Total : ${updatedItem.quantity})`);
          } catch (error) {
            console.error("Erreur de synchronisation Supabase (Batch Mode):", error);
            showToast("Erreur de synchronisation");
          } finally {
            setLoadingBarcode(null);
          }
          return;
        }

        try {
          const databaseItem = isSupabaseConfigured
            ? await fetchInventoryItemWithFallback(barcode)
            : null;
          if (databaseItem) {
            const updatedItem = {
              ...databaseItem,
              quantity: databaseItem.quantity + 1,
              lastUpdated: Date.now(),
              lastMovement: 1,
            };
            await syncItem(updatedItem);
            triggerHaptic("success");
            showToast(`+1 ${databaseItem.name} (Total : ${updatedItem.quantity})`);
            setLoadingBarcode(null);
            return;
          }

          const data = await getProductData(barcode);
          if (data) {
            const suggested = suggestCategory(data.name, data.category, dbCategories);
            const item: InventoryItem = {
              barcode,
              name: data.name,
              imageUrl: data.imageUrl,
              brand: data.brand,
              category: suggested || data.category,
              quantity: 1,
              lastUpdated: Date.now(),
              lastMovement: 1,
            };
            await syncItem(item);
            triggerHaptic("success");
            showToast(`${data.name} ajouté (+1)`);
          } else {
            // Not found, open manual creation modal
            triggerHaptic("warning");
            setActionModal({
              type: "manual",
              barcode: barcode,
            });
          }
        } catch (error) {
          console.error("Erreur de recherche/sync produit (Batch Mode):", error);
          showToast("Erreur de recherche produit");
        } finally {
          setLoadingBarcode(null);
        }
        return;
      }

      const existingItem = inventory.find((i) => i.barcode === barcode);
      if (existingItem) {
        triggerHaptic("success");
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
          ? await fetchInventoryItemWithFallback(barcode)
          : null;
        if (databaseItem) {
          triggerHaptic("success");
          setActionModal({
            type: "scan_choice",
            product: databaseItem,
          });
          return;
        }

        const data = await getProductData(barcode);
        if (data) {
          const suggested = suggestCategory(data.name, data.category, dbCategories);
          triggerHaptic("success");
          setActionModal({
            type: "quantity",
            product: { barcode, ...data, category: suggested || data.category },
            existingQty: 0,
            isNew: true,
          });
        } else {
          // Not found, open manual creation modal
          triggerHaptic("warning");
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
    [inventory, loadingBarcode, actionModal, session, isBatchMode],
  );

  // Hook for physical hardware scanners globally
  useHardwareScanner(handleScan);

  // Real-time synchronization callbacks
  const handleRealtimeInsert = useCallback((item: InventoryItem) => {
    setInventory((prev) => {
      if (prev.some((i) => i.barcode === item.barcode)) {
        return prev.map((i) => (i.barcode === item.barcode ? item : i));
      }
      return [item, ...prev];
    });
  }, []);

  const handleRealtimeUpdate = useCallback((item: InventoryItem) => {
    setInventory((prev) =>
      prev.map((i) => (i.barcode === item.barcode ? item : i))
    );
  }, []);

  const handleRealtimeDelete = useCallback((barcode: string) => {
    setInventory((prev) => prev.filter((i) => i.barcode !== barcode));
  }, []);

  useSupabaseRealtime({
    enabled: !!session,
    onInsert: handleRealtimeInsert,
    onUpdate: handleRealtimeUpdate,
    onDelete: handleRealtimeDelete,
  });

  const handleUpdateQuantity = async (barcode: string, delta: number) => {
    triggerHaptic("light");
    const existingItem = inventory.find((item) => item.barcode === barcode);
    if (!existingItem) return;

    const updatedItem = {
      ...existingItem,
      quantity: Math.max(0, existingItem.quantity + delta),
      lastUpdated: Date.now(),
      lastMovement: delta,
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
      triggerHaptic("warning");
      const previousInventory = inventory;
      setInventory((prev) => prev.filter((i) => i.barcode !== barcode));

      try {
        const { queued } = await syncDeleteInventoryItem(barcode);
        setSyncError(null);
        showToast(queued ? "Suppression en attente de synchro" : "Article supprimé");
        await refreshPendingCount();
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
        purchasePrice: product.purchasePrice,
        salesPrice: product.salesPrice,
        lastMovement: quantity,
      };

      try {
        await syncItem(item);
        showToast(`Ajouté: ${product.name} (x${quantity})`);
        setActionModal(null);
        setActiveTab("scan");
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
      const delta = quantity - actionModal.product.quantity;
      const item: InventoryItem = {
        barcode: actionModal.product.barcode,
        name: product.name,
        imageUrl: product.imageUrl,
        brand: product.brand,
        category: product.category,
        quantity,
        lastUpdated: Date.now(),
        purchasePrice: product.purchasePrice,
        salesPrice: product.salesPrice,
        lastMovement: delta,
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

      const currentQty = existingItem?.quantity ?? 0;
      const newQuantity = mode === "set"
        ? quantity
        : currentQty + quantity;
      const delta = Math.max(0, newQuantity) - currentQty;

      const item: InventoryItem = {
        barcode: product.barcode,
        name: product.name,
        imageUrl: product.imageUrl,
        brand: product.brand,
        category: product.category,
        quantity: Math.max(0, newQuantity),
        lastUpdated: Date.now(),
        purchasePrice: product.purchasePrice,
        salesPrice: product.salesPrice,
        lastMovement: delta,
      };

      try {
        await syncItem(item);
        showToast(
          mode === "set"
            ? `Stock défini à ${quantity} (${product.name})`
            : `+${quantity} ${product.name}`
        );
        setActionModal(null);
        setActiveTab("scan");
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

  const recentlyScanned = useMemo(() => {
    return [...inventory].sort((a, b) => b.lastUpdated - a.lastUpdated).slice(0, 3);
  }, [inventory]);

  const financialStats = useMemo(() => {
    let totalPurchaseVal = 0;
    let totalSalesVal = 0;
    inventory.forEach((item) => {
      const qty = item.quantity;
      const purchase = item.purchasePrice ?? 0;
      const sales = item.salesPrice ?? 0;
      totalPurchaseVal += qty * purchase;
      totalSalesVal += qty * sales;
    });
    return {
      totalPurchaseVal,
      totalSalesVal,
      potentialMargin: totalSalesVal - totalPurchaseVal,
    };
  }, [inventory]);

  // Extract list of unique categories dynamically + counts per category (performance)
  const { categories, categoryCountsByLower } = useMemo(() => {
    const catsSet = new Set<string>();
    const counts = new Map<string, number>();

    for (const item of inventory) {
      const cat = item.category?.trim();
      if (!cat) continue;

      catsSet.add(cat);
      const key = cat.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return {
      categories: Array.from(catsSet).sort(),
      categoryCountsByLower: counts,
    };
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

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-stone-500">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        <span className="text-xs font-semibold tracking-wider font-mono">
          Vérification de la session...
        </span>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onAuthSuccess={(activeSession) => setSession(activeSession)} />;
  }

  return (
    <div className="min-h-screen text-stone-800 font-sans pb-32">
      <Header
        email={session.email}
        inventoryLength={inventory.length}
        totalItems={totalItems}
        lowStockCount={lowStockCount}
        showExport={inventory.length > 0}
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onExport={handleExport}
        onLogout={handleLogout}
        onSyncNow={() => void flushQueue()}
      />

      <main className="mx-auto max-w-lg px-4 py-4 space-y-4">

        {/* Sync error display */}
        {syncError && (
          <div className={`flex gap-3 rounded-2xl border px-4 py-3 text-xs ${
            !isOnline || pendingCount > 0
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-rose-200 bg-rose-50 text-rose-600"
          }`}>
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        {!syncError && inventorySource === "cache" && !isOnline && (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Mode hors-ligne — inventaire chargé depuis le cache local.</span>
          </div>
        )}

        {/* Content Tabs */}
        {activeTab === "scan" ? (
          /* SCAN TAB */
          <section className="glass-card rounded-[2rem] p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-40">
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  Scanner
                </span>
                <h2 className="mt-2 text-base font-bold tracking-tight text-stone-900">
                  Ajouter via Code-barres
                </h2>
              </div>
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  !isOnline
                    ? "bg-rose-50 border border-rose-200 text-rose-600"
                    : pendingCount > 0
                      ? "bg-amber-50 border border-amber-200 text-amber-700"
                      : syncError
                        ? "bg-rose-50 border border-rose-200 text-rose-600"
                        : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                }`}
              >
                <span className={`w-1 h-1 rounded-full ${
                  !isOnline
                    ? "bg-rose-500"
                    : pendingCount > 0
                      ? "bg-amber-500 animate-pulse"
                      : syncError
                        ? "bg-rose-500"
                        : "bg-emerald-500"
                }`} />
                {!isOnline
                  ? "Hors-ligne"
                  : pendingCount > 0
                    ? `${pendingCount} en attente`
                    : syncError
                      ? "Supabase Off"
                      : "Synchro On"}
              </div>
            </div>

            {/* Mode Scan en Lot (Batch Mode) */}
            <div className="mb-5 flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <div>
                <h3 className="text-xs font-bold text-stone-900">Mode Scan en Lot</h3>
                <p className="text-[10px] text-stone-500 mt-0.5">Ajoute automatiquement +1 au stock sans ouvrir de fenêtres</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchMode(!isBatchMode)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                  isBatchMode ? "bg-indigo-600" : "bg-stone-300"
                }`}
                role="switch"
                aria-checked={isBatchMode}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isBatchMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="relative">
              {loadingBarcode && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/95 border border-stone-200 text-stone-700 backdrop-blur-xs">
                  <Loader2 className="mb-2 h-6 w-6 animate-spin text-indigo-600" />
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

            {/* Recently Scanned Items List */}
            {recentlyScanned.length > 0 && (
              <div className="mt-6 pt-5 border-t border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Derniers articles scannés
                  </h3>
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Historique rapide
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {recentlyScanned.map((item) => (
                    <div
                      key={item.barcode}
                      onClick={() => setActionModal({ type: 'edit', product: item })}
                      className="relative overflow-hidden rounded-xl border border-stone-200 bg-white px-3 py-2 flex items-center justify-between gap-3 hover:border-stone-300 hover:shadow-sm cursor-pointer select-none transition group"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg border border-stone-200 bg-stone-50 p-1">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-contain rounded"
                            />
                          ) : (
                            <Package className="h-4.5 w-4.5 text-stone-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="line-clamp-1 text-xs font-bold text-stone-900 group-hover:text-indigo-600 transition-colors">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-stone-400 font-medium">
                            <span className="font-mono tabular">{item.barcode}</span>
                            {item.brand && <span>• {item.brand}</span>}
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center rounded-lg bg-stone-50 border border-stone-200">
                          <button
                            onClick={() => handleUpdateQuantity(item.barcode, -1)}
                            className="grid h-6 w-6 place-items-center text-stone-500 active:scale-90 hover:text-stone-900 transition cursor-pointer"
                            aria-label="Diminuer la quantité"
                          >
                            <Minus className="h-2 w-2" />
                          </button>

                          <button
                            onClick={() => setActionModal({
                              type: "quantity",
                              product: item,
                              existingQty: item.quantity,
                              isNew: false,
                            })}
                            className={`px-1.5 min-w-6 text-center text-[10px] font-bold font-mono tabular py-0.5 hover:text-indigo-600 cursor-pointer ${
                              item.quantity <= 5 ? "text-amber-600" : "text-stone-900"
                            }`}
                          >
                            {item.quantity}
                          </button>

                          <button
                            onClick={() => handleUpdateQuantity(item.barcode, 1)}
                            className="grid h-6 w-6 place-items-center text-stone-500 active:scale-90 hover:text-stone-900 transition cursor-pointer"
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="h-2 w-2" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : activeTab === "stock" ? (
          /* STOCK VIEW TAB */
          <section className="glass-card rounded-[2rem] p-5 space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Inventaire
                  </span>
                  <h2 className="mt-2 text-base font-bold tracking-tight text-stone-900">
                    Articles en Stock
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1.5 rounded-xl tap-active transition"
                    >
                      <X className="w-3 h-3" />
                      Effacer ({filteredInventory.length} restants)
                    </button>
                  )}
                  <button
                    onClick={() => setIsCompactView(!isCompactView)}
                    className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border transition tap-active ${
                      isCompactView
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:border-stone-300"
                    }`}
                    title={isCompactView ? "Affichage détaillé" : "Affichage compact"}
                  >
                    {isCompactView ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border transition tap-active ${
                      showFilters
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:border-stone-300"
                    }`}
                    title="Filtres"
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Financial Stats Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-stone-50 border border-stone-200 rounded-2xl">
                <div className="text-center">
                  <span className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider">Achat Total</span>
                  <span className="font-mono tabular text-xs font-bold text-stone-700">{financialStats.totalPurchaseVal.toFixed(2)} €</span>
                </div>
                <div className="text-center border-x border-stone-200">
                  <span className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider">CA Potentiel</span>
                  <span className="font-mono tabular text-xs font-bold text-indigo-600">{financialStats.totalSalesVal.toFixed(2)} €</span>
                </div>
                <div className="text-center">
                  <span className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider">Marge Brute</span>
                  <span className="font-mono tabular text-xs font-bold text-emerald-600">{financialStats.potentialMargin.toFixed(2)} €</span>
                </div>
              </div>

              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, marque..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-xl glass-input pl-9 pr-3 text-xs text-stone-900 outline-none transition"
                />
              </div>

              {/* Dynamic scrollable Category Filter Pills */}
              {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition shrink-0 tap-active select-none ${
                      selectedCategory === null
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                        : "bg-white border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-300"
                    }`}
                  >
                    Tout ({inventory.length})
                  </button>
                  {categories.map((cat) => {
                    const count = categoryCountsByLower.get(cat.toLowerCase()) ?? 0;
                    const catObj = dbCategories.find((c) => c.name.toLowerCase() === cat.toLowerCase());
                    const displayLabel = catObj?.icon ? `${catObj.icon} ${cat}` : cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition shrink-0 tap-active select-none ${
                          selectedCategory === cat
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                            : "bg-white border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-300"
                        }`}
                      >
                        {displayLabel} ({count})
                      </button>
                    );
                  })}

                </div>
              )}
            </div>

            {/* Expanded Filters Drawer */}
            <BottomSheet
              open={showFilters}
              title="Filtres"
              onClose={() => setShowFilters(false)}
            >
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs">
                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <span className="font-semibold text-stone-500">Trier par</span>
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy((e.target as HTMLSelectElement).value as any)
                    }
                    className="rounded-lg border border-stone-200 bg-white p-2 text-stone-900 outline-none focus:border-indigo-500 transition"
                  >
                    <option value="recent">Date d'ajout</option>
                    <option value="name">Alphabétique (A-Z)</option>
                    <option value="quantityAsc">Quantité croissante</option>
                    <option value="quantityDesc">Quantité décroissante</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <span className="font-semibold text-stone-500">État du Stock</span>
                  <select
                    value={stockFilter}
                    onChange={(e) =>
                      setStockFilter(
                        (e.target as HTMLSelectElement).value as any
                      )
                    }
                    className="rounded-lg border border-stone-200 bg-white p-2 text-stone-900 outline-none focus:border-indigo-500 transition"
                  >
                    <option value="all">Tous les articles</option>
                    <option value="instock">En stock (&gt; 5)</option>
                    <option value="low">Stock faible (≤ 5)</option>
                    <option value="out">Rupture de stock (0)</option>
                  </select>
            </div>
              </div>
            </BottomSheet>

            {isInventoryLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-stone-500 border border-dashed border-stone-300 rounded-2xl bg-stone-50/50">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold tracking-wider">
                  Chargement de l’inventaire...
                </span>
              </div>
            ) : (
              <InventoryGrid
                items={filteredInventory}
                categories={dbCategories}
                isCompactView={isCompactView}
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
        ) : (
          <CategoriesManager
            categories={dbCategories}
            inventory={inventory}
            onRefreshCategories={loadCategories}
            onRefreshInventory={loadInventoryOnly}
            showToast={showToast}
          />
        )}
      </main>

      {/* Modern Fixed Bottom Tab Bar Navigation */}
      <TabBar
        active={activeTab as TabKey}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* Modals & toast */}
      {actionModal?.type === "manual" && (
        <ManualProductModal
          barcode={actionModal.barcode}
          categories={dbCategories}
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
          categories={dbCategories}
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
