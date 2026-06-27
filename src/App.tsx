import { Header } from "./components/Header";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ManualProductModal } from "./components/ManualProductModal";
import { QuantityModal } from "./components/QuantityModal";
import { ScanChoiceModal } from "./components/ScanChoiceModal";
import { StockScanMode } from "./components/StockScanModeToggle";
import { AutomaticScanPanel } from "./components/AutomaticScanPanel";
import { ScannerInputMode } from "./components/ScannerInputModeToggle";
import { AuthScreen } from "./components/AuthScreen";
import { Toast } from "./components/Toast";
import { ExportModal } from "./components/ExportModal";
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
import { Loader2 } from "lucide-react";
import { useHardwareScanner } from "./hooks/useHardwareScanner";
import { useSupabaseRealtime } from "./hooks/useSupabaseRealtime";
import { useOfflineSync } from "./hooks/useOfflineSync";
import { triggerHaptic } from "./lib/haptics";
import { AppNavigation, AppTab } from "./components/app/AppNavigation";
import { CategoryFilterModal } from "./components/app/CategoryFilterModal";
import { ScanTab } from "./components/app/ScanTab";
import { StockTab } from "./components/app/StockTab";
import { SyncNotice } from "./components/app/SyncNotice";


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

  const [activeTab, setActiveTab] = useState<AppTab>("scan");
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [stockScanMode, setStockScanMode] = useState<StockScanMode>("add");
  const [scannerInputMode, setScannerInputMode] = useState<ScannerInputMode>("hardware");
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

  const categoryOptions = useMemo(() => {
    const inventoryCounts = new Map<string, number>();
    inventory.forEach((item) => {
      const normalizedCategory = item.category?.trim().toLowerCase();
      if (!normalizedCategory) return;

      inventoryCounts.set(
        normalizedCategory,
        (inventoryCounts.get(normalizedCategory) ?? 0) + 1,
      );
    });

    return dbCategories
      .map((categoryRecord) => {
        const cat = categoryRecord.name.trim();
        const count = inventoryCounts.get(cat.toLowerCase()) ?? 0;

        return {
          name: cat,
          count,
          icon: categoryRecord.icon,
          label: categoryRecord.icon ? `${categoryRecord.icon} ${cat}` : cat,
        };
      })
      .filter((category) => category.count > 0);
  }, [dbCategories, inventory]);

  const categories = useMemo(() => {
    return categoryOptions.map((category) => category.name);
  }, [categoryOptions]);

  useEffect(() => {
    if (selectedCategory && !categories.includes(selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [categories, selectedCategory]);

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
        onExport={() => setShowExportModal(true)}
        onLogout={handleLogout}
        onSyncNow={() => void flushQueue()}
      />

      <main className="app-main space-y-3 sm:space-y-4">

        <SyncNotice
          syncError={syncError}
          inventorySource={inventorySource}
          isOnline={isOnline}
          pendingCount={pendingCount}
        />

        {/* Content Tabs */}
        {activeTab === "scan" ? (
          <ScanTab
            isOnline={isOnline}
            pendingCount={pendingCount}
            syncError={syncError}
            loadingBarcode={loadingBarcode}
            actionModal={actionModal}
            scannerInputMode={scannerInputMode}
            recentlyScanned={recentlyScanned}
            onScannerInputModeChange={setScannerInputMode}
            onScan={handleScan}
            onEditProduct={(item) => setActionModal({ type: "edit", product: item })}
            onEditQuantity={(item) =>
              setActionModal({
                type: "quantity",
                product: item,
                existingQty: item.quantity,
                isNew: false,
              })
            }
            onUpdateQuantity={handleUpdateQuantity}
          />
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
          <StockTab
            inventoryLength={inventory.length}
            filteredInventory={filteredInventory}
            categories={categories}
            categoryOptions={categoryOptions}
            dbCategories={dbCategories}
            financialStats={financialStats}
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            stockFilter={stockFilter}
            sortBy={sortBy}
            showFilters={showFilters}
            isCompactView={isCompactView}
            hasActiveFilters={hasActiveFilters}
            isInventoryLoading={isInventoryLoading}
            onSearchTermChange={setSearchTerm}
            onSelectedCategoryChange={setSelectedCategory}
            onStockFilterChange={setStockFilter}
            onSortByChange={setSortBy}
            onShowFiltersChange={setShowFilters}
            onShowCategoryModal={() => setShowCategoryModal(true)}
            onCompactViewChange={setIsCompactView}
            onResetFilters={resetFilters}
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

      <AppNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {showCategoryModal && (
        <CategoryFilterModal
          inventoryLength={inventory.length}
          selectedCategory={selectedCategory}
          categoryOptions={categoryOptions}
          onSelectCategory={setSelectedCategory}
          onClose={() => setShowCategoryModal(false)}
        />
      )}

      {showExportModal && (
        <ExportModal
          items={inventory}
          categories={dbCategories}
          onClose={() => setShowExportModal(false)}
        />
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
