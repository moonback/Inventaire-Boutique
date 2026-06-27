import { Header } from "./components/Header";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ManualInput } from "./components/ManualInput";
import { InventoryGrid } from "./components/InventoryGrid";
import { ManualProductModal } from "./components/ManualProductModal";
import { QuantityModal } from "./components/QuantityModal";
import { ScanChoiceModal } from "./components/ScanChoiceModal";
import { StockScanMode } from "./components/StockScanModeToggle";
import { AutomaticScanPanel } from "./components/AutomaticScanPanel";
import { CameraBarcodeScanner } from "./components/CameraBarcodeScanner";
import { ScannerInputMode, ScannerInputModeToggle } from "./components/ScannerInputModeToggle";
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
import { ExportPDFButton } from "./components/ExportPDFButton";
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
  Zap,
  TrendingUp,
  Check,
} from "lucide-react";
import { motion } from "motion/react";
import { useHardwareScanner } from "./hooks/useHardwareScanner";
import { useSupabaseRealtime } from "./hooks/useSupabaseRealtime";
import { useOfflineSync } from "./hooks/useOfflineSync";
import { triggerHaptic } from "./lib/haptics";


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

  const [activeTab, setActiveTab] = useState<"scan" | "autoScan" | "stock" | "categories">("scan");
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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [stockScanMode, setStockScanMode] = useState<StockScanMode>("add");
  const [scannerInputMode, setScannerInputMode] = useState<ScannerInputMode>("hardware");
  const [isCompactView, setIsCompactView] = useState(false
  
  );

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

      // Mode automatique : chaque scan ajoute ou retire 1 unité sans ouvrir de fenêtre.
      if (activeTab === "autoScan" && isBatchMode) {
        const movement = stockScanMode === "add" ? 1 : -1;
        const existingItem = inventory.find((i) => i.barcode === barcode);
        if (existingItem) {
          const nextQuantity = Math.max(0, existingItem.quantity + movement);
          const appliedMovement = nextQuantity - existingItem.quantity;
          if (stockScanMode === "remove" && appliedMovement === 0) {
            triggerHaptic("warning");
            showToast(`${existingItem.name} est déjà à 0`);
            setLoadingBarcode(null);
            return;
          }

          const updatedItem = {
            ...existingItem,
            quantity: nextQuantity,
            lastUpdated: Date.now(),
            lastMovement: appliedMovement,
          };
          try {
            await syncItem(updatedItem);
            triggerHaptic("success");
            showToast(
              `${appliedMovement > 0 ? "+" : ""}${appliedMovement} ${existingItem.name} (Total : ${updatedItem.quantity})`,
            );
          } catch (error) {
            console.error("Erreur de synchronisation Supabase (scan automatique):", error);
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
            const nextQuantity = Math.max(0, databaseItem.quantity + movement);
            const appliedMovement = nextQuantity - databaseItem.quantity;
            if (stockScanMode === "remove" && appliedMovement === 0) {
              triggerHaptic("warning");
              showToast(`${databaseItem.name} est déjà à 0`);
              setLoadingBarcode(null);
              return;
            }

            const updatedItem = {
              ...databaseItem,
              quantity: nextQuantity,
              lastUpdated: Date.now(),
              lastMovement: appliedMovement,
            };
            await syncItem(updatedItem);
            triggerHaptic("success");
            showToast(
              `${appliedMovement > 0 ? "+" : ""}${appliedMovement} ${databaseItem.name} (Total : ${updatedItem.quantity})`,
            );
            setLoadingBarcode(null);
            return;
          }

          if (stockScanMode === "remove") {
            triggerHaptic("warning");
            showToast("Produit introuvable : impossible de retirer du stock");
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
          console.error("Erreur de recherche/sync produit (scan automatique):", error);
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
    [inventory, loadingBarcode, actionModal, session, activeTab, isBatchMode, stockScanMode, dbCategories, showToast],
  );

  // Hook for physical hardware scanners globally
  useHardwareScanner(handleScan);

  // Real-time synchronization callbacks
  const shouldApplyRealtimeItem = (current: InventoryItem | undefined, incoming: InventoryItem) => {
    return !current || incoming.lastUpdated >= current.lastUpdated;
  };

  const handleRealtimeInsert = useCallback((item: InventoryItem) => {
    setInventory((prev) => {
      const existing = prev.find((i) => i.barcode === item.barcode);
      if (existing) {
        return shouldApplyRealtimeItem(existing, item)
          ? prev.map((i) => (i.barcode === item.barcode ? item : i))
          : prev;
      }
      return [item, ...prev];
    });
  }, []);

  const handleRealtimeUpdate = useCallback((item: InventoryItem) => {
    setInventory((prev) =>
      prev.map((i) => (
        i.barcode === item.barcode && shouldApplyRealtimeItem(i, item) ? item : i
      ))
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

  const categoryOptions = useMemo(() => {
    return categories.map((cat) => {
      const count = inventory.filter((item) => item.category?.trim() === cat).length;
      const categoryRecord = dbCategories.find(
        (entry) => entry.name.toLowerCase() === cat.toLowerCase(),
      );

      return {
        name: cat,
        count,
        label: categoryRecord?.icon ? `${categoryRecord.icon} ${cat}` : cat,
      };
    });
  }, [categories, dbCategories, inventory]);

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
    setShowCategoryModal(false);
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
    <div className="app-shell text-stone-800 font-sans">
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

      <main className="app-main space-y-3 sm:space-y-4">

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
          <section className="glass-card mobile-card relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-40">
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>

            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  Scanner
                </span>
                <h2 className="mt-2 text-base font-bold tracking-tight text-stone-900">
                  Ajouter un article
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

            <ScannerInputModeToggle
              mode={scannerInputMode}
              onModeChange={setScannerInputMode}
              disabled={!!loadingBarcode || !!actionModal}
            />

            <div className="relative mt-4">
              {loadingBarcode && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/95 border border-stone-200 text-stone-700 backdrop-blur-xs">
                  <Loader2 className="mb-2 h-6 w-6 animate-spin text-indigo-600" />
                  <span className="text-xs font-semibold tracking-wider font-mono">
                    Recherche {loadingBarcode}...
                  </span>
                </div>
              )}
              {scannerInputMode === "hardware" ? (
                <ManualInput
                  onScan={handleScan}
                  isActive={!loadingBarcode && !actionModal}
                />
              ) : (
                <CameraBarcodeScanner
                  enabled={!loadingBarcode && !actionModal}
                  isBusy={!!loadingBarcode}
                  onScan={handleScan}
                />
              )}
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
        ) : activeTab === "autoScan" ? (
          <AutomaticScanPanel
            enabled={isBatchMode}
            mode={stockScanMode}
            loadingBarcode={loadingBarcode}
            isOnline={isOnline}
            pendingCount={pendingCount}
            syncError={syncError}
            onEnabledChange={setIsBatchMode}
            onModeChange={setStockScanMode}
            scannerInputMode={scannerInputMode}
            onScannerInputModeChange={setScannerInputMode}
            onScan={handleScan}
          />
        ) : activeTab === "stock" ? (
          /* STOCK VIEW TAB */
          <section className="glass-card mobile-card space-y-4">
            <div className="flex flex-col gap-3">
              {/* Header Card Modern */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-4 shadow-xl shadow-emerald-500/20 sm:p-6">
                {/* Decorative circles */}
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:h-14 sm:w-14">
                      <Package className="h-5 w-5 text-white sm:h-7 sm:w-7" />
                    </div>
                    <div className="pt-0.5 sm:pt-1">
                      <h2 className="text-xl font-bold text-white tracking-tight sm:text-2xl">
                        Inventaire
                      </h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm sm:px-2.5 sm:text-xs">
                          {filteredInventory.length} article{filteredInventory.length > 1 ? 's' : ''}
                        </span>
                        <span className="text-[11px] text-white/70 sm:text-xs">
                          en stock
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/30"
                      >
                        <X className="h-3.5 w-3.5" />
                        Effacer
                      </button>
                    )}
                    
                    <div className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 p-1 backdrop-blur-sm sm:justify-start sm:p-1.5">
                      <button
                        onClick={() => setIsCompactView(!isCompactView)}
                        className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                          isCompactView
                            ? "bg-white text-emerald-600 shadow-sm"
                            : "text-white/70 hover:bg-white/10"
                        }`}
                        title={isCompactView ? "Affichage détaillé" : "Affichage compact"}
                      >
                        {isCompactView ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                          showFilters
                            ? "bg-white text-emerald-600 shadow-sm"
                            : "text-white/70 hover:bg-white/10"
                        }`}
                        title="Filtres"
                      >
                        <Filter className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="hidden h-6 w-px bg-white/20 sm:block" />

                    <ExportPDFButton
                      className="w-full sm:w-auto"
                      items={filteredInventory}
                      categories={dbCategories}
                    />
                  </div>
                </div>
              </div>

              {/* Financial Stats Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-50 to-stone-100 p-3 border border-stone-200/60 transition-all duration-300 hover:shadow-lg hover:border-stone-300">
                  <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-stone-200/50 blur-2xl transition-all group-hover:scale-150" />
                  <div className="relative">
                    <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-stone-200/70">
                      <span className="text-xs font-bold text-stone-600">€</span>
                    </div>
                    <span className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider">Achat Total</span>
                    <span className="mt-0.5 block font-mono text-sm font-bold text-stone-700">{financialStats.totalPurchaseVal.toFixed(2)} €</span>
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-3 border border-indigo-200/60 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-300">
                  <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-indigo-300/30 blur-2xl transition-all group-hover:scale-150" />
                  <div className="relative">
                    <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-200/60">
                      <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <span className="block text-[9px] font-bold text-indigo-400/80 uppercase tracking-wider">CA Potentiel</span>
                    <span className="mt-0.5 block font-mono text-sm font-bold text-indigo-700">{financialStats.totalSalesVal.toFixed(2)} €</span>
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-3 border border-emerald-200/60 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-300">
                  <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-emerald-300/30 blur-2xl transition-all group-hover:scale-150" />
                  <div className="relative">
                    <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-200/60">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span className="block text-[9px] font-bold text-emerald-500/80 uppercase tracking-wider">Marge Brute</span>
                    <span className="mt-0.5 block font-mono text-sm font-bold text-emerald-700">{financialStats.potentialMargin.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, marque..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 w-full rounded-2xl glass-input pl-10 pr-3 text-sm font-semibold text-stone-900 outline-none transition sm:h-10 sm:rounded-xl sm:text-xs"
                />
              </div>

              {categories.length > 0 && (
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="flex min-h-11 items-center justify-between rounded-2xl border border-stone-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-stone-300 sm:hidden"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Tags className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                        Catégorie
                      </p>
                      <p className="truncate text-sm font-semibold text-stone-900">
                        {selectedCategory ?? "Toutes les catégories"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-500">
                    {selectedCategory ? "1 active" : `${categories.length} choix`}
                  </span>
                </button>
              )}

              {/* Dynamic scrollable Category Filter Pills */}
              {categories.length > 0 && (
                <div className="hidden -mx-3 gap-2 overflow-x-auto no-scrollbar px-3 pb-1 sm:flex sm:-mx-4 sm:px-4">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`min-h-9 shrink-0 rounded-full border px-3 py-2 text-[10px] font-bold transition tap-active select-none ${
                      selectedCategory === null
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                        : "bg-white border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-300"
                    }`}
                  >
                    Tout ({inventory.length})
                  </button>
                  {categoryOptions.map((category) => {
                    return (
                      <button
                        key={category.name}
                        onClick={() =>
                          setSelectedCategory(
                            selectedCategory === category.name ? null : category.name,
                          )
                        }
                        className={`min-h-9 shrink-0 rounded-full border px-3 py-2 text-[10px] font-bold transition tap-active select-none ${
                          selectedCategory === category.name
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                            : "bg-white border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-300"
                        }`}
                      >
                        {category.label} ({category.count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Expanded Filters Drawer */}
            {showFilters && (
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs">
                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <span className="font-semibold text-stone-500">Trier par</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="h-11 rounded-xl border border-stone-200 bg-white p-2 text-stone-900 outline-none transition focus:border-indigo-500"
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
                    onChange={(e) => setStockFilter(e.target.value as any)}
                    className="h-11 rounded-xl border border-stone-200 bg-white p-2 text-stone-900 outline-none transition focus:border-indigo-500"
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-safe">
        <div className="glass-panel mx-auto flex max-w-md justify-around rounded-[1.75rem] border px-2 py-2 shadow-2xl shadow-stone-900/10">
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition select-none tap-active ${
              activeTab === "scan" ? "text-indigo-600" : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${activeTab === 'scan' ? 'bg-indigo-50' : ''}`}>
              <Scan className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold tracking-wide">Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab("autoScan")}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition select-none tap-active ${
              activeTab === "autoScan" ? "text-amber-600" : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${activeTab === 'autoScan' ? 'bg-amber-50' : ''}`}>
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold tracking-wide">Auto</span>
          </button>

          <button
            onClick={() => setActiveTab("stock")}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition select-none tap-active ${
              activeTab === "stock" ? "text-emerald-600" : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${activeTab === 'stock' ? 'bg-emerald-50' : ''}`}>
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold tracking-wide">Stock</span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition select-none tap-active ${
              activeTab === "categories" ? "text-indigo-600" : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${activeTab === 'categories' ? 'bg-indigo-50' : ''}`}>
              <Tags className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold tracking-wide">Catég.</span>
          </button>
        </div>
      </nav>

      {/* Category Selection Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-full sm:max-w-md bg-white border-t sm:border border-stone-200 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl shadow-stone-900/25 overflow-hidden pb-safe max-h-[92vh] overflow-y-auto no-scrollbar"
          >
            {/* Header Drag Indicator for mobile */}
            <div className="flex justify-center py-3 sm:hidden sticky top-0 bg-white z-10">
              <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
            </div>

            <div className="p-6">
              <div className="absolute top-4 right-4 hidden sm:block">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
                  <Tags className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Filtrer par catégorie
                  </h3>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    Sélectionnez une catégorie pour affiner votre inventaire
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {/* All Categories Option */}
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setShowCategoryModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
                    selectedCategory === null
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-stone-200 text-stone-900 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      selectedCategory === null ? 'bg-white/20' : 'bg-stone-50 border border-stone-200'
                    }`}>
                      <Package className={`w-4 h-4 ${selectedCategory === null ? 'text-white' : 'text-stone-400'}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">Toutes les catégories</p>
                      <p className="text-[10px] font-mono tabular opacity-80">
                        {inventory.length} articles
                      </p>
                    </div>
                  </div>
                  {selectedCategory === null && <Check className="w-5 h-5" />}
                </button>

                {/* Individual Category Options */}
                {categoryOptions.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => {
                      setSelectedCategory(
                        selectedCategory === category.name ? null : category.name,
                      );
                      setShowCategoryModal(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
                      selectedCategory === category.name
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-stone-200 text-stone-900 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                        selectedCategory === category.name ? 'bg-white/20' : 'bg-stone-50 border border-stone-200'
                      }`}>
                        {category.label.split(' ')[0] || '📦'}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">
                          {category.label.replace(/^[^\s]+\s/, '')}
                        </p>
                        <p className="text-[10px] font-mono tabular opacity-80">
                          {category.count} article{category.count > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    {selectedCategory === category.name && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-full py-4 text-sm font-semibold text-stone-500 bg-transparent border border-stone-200 hover:bg-stone-50 hover:text-stone-800 active:scale-95 rounded-2xl transition"
              >
                Annuler
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
