import type React from "react";
import { Loader2, Search, Filter, Package, X, List, LayoutGrid, Tags, TrendingUp, SlidersHorizontal } from "lucide-react";
import { InventoryGrid } from "../InventoryGrid";
import { CategoryItem, InventoryItem } from "../../types";

type SortBy = "recent" | "name" | "quantityAsc" | "quantityDesc";
type StockFilter = "all" | "low" | "out" | "instock";

type CategoryOption = {
  name: string;
  count: number;
  label: string;
};

type FinancialStats = {
  totalPurchaseVal: number;
  totalSalesVal: number;
  potentialMargin: number;
};

type StockTabProps = {
  inventoryLength: number;
  filteredInventory: InventoryItem[];
  categories: string[];
  categoryOptions: CategoryOption[];
  dbCategories: CategoryItem[];
  financialStats: FinancialStats;
  searchTerm: string;
  selectedCategory: string | null;
  stockFilter: StockFilter;
  sortBy: SortBy;
  showFilters: boolean;
  isCompactView: boolean;
  hasActiveFilters: boolean;
  isInventoryLoading: boolean;
  onSearchTermChange: (term: string) => void;
  onSelectedCategoryChange: (category: string | null) => void;
  onStockFilterChange: (filter: StockFilter) => void;
  onSortByChange: (sort: SortBy) => void;
  onShowFiltersChange: (show: boolean) => void;
  onShowCategoryModal: () => void;
  onCompactViewChange: (isCompact: boolean) => void;
  onResetFilters: () => void;
  onUpdateQuantity: (barcode: string, delta: number) => void;
  onRemove: (barcode: string) => void;
  onEditQuantity: (item: InventoryItem) => void;
  onEditProduct: (item: InventoryItem) => void;
};

export function StockTab({
  inventoryLength,
  filteredInventory,
  categories,
  categoryOptions,
  dbCategories,
  financialStats,
  searchTerm,
  selectedCategory,
  stockFilter,
  sortBy,
  showFilters,
  isCompactView,
  hasActiveFilters,
  isInventoryLoading,
  onSearchTermChange,
  onSelectedCategoryChange,
  onStockFilterChange,
  onSortByChange,
  onShowFiltersChange,
  onShowCategoryModal,
  onCompactViewChange,
  onResetFilters,
  onUpdateQuantity,
  onRemove,
  onEditQuantity,
  onEditProduct,
}: StockTabProps) {
  return (
    <section className="glass-card mobile-card space-y-4">
      <div className="flex flex-col gap-3">
        <StockHero
          filteredCount={filteredInventory.length}
          hasActiveFilters={hasActiveFilters}
          isCompactView={isCompactView}
          showFilters={showFilters}
          onResetFilters={onResetFilters}
          onCompactViewChange={onCompactViewChange}
          onShowFiltersChange={onShowFiltersChange}
        />

        <FinancialSummary financialStats={financialStats} />

        <div className="sticky top-2 z-20 -mx-1 rounded-[1.75rem] border border-stone-200/80 bg-white/90 p-2 shadow-lg shadow-stone-900/5 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, marque..."
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              className="h-12 w-full rounded-2xl glass-input pl-10 pr-3 text-sm font-semibold text-stone-900 outline-none transition sm:h-10 sm:rounded-xl sm:text-xs"
            />
          </div>

          <MobileFilterShortcuts
            categories={categories}
            selectedCategory={selectedCategory}
            showFilters={showFilters}
            onShowCategoryModal={onShowCategoryModal}
            onShowFiltersChange={onShowFiltersChange}
          />
        </div>

        <CategoryPills
          inventoryLength={inventoryLength}
          categories={categories}
          categoryOptions={categoryOptions}
          selectedCategory={selectedCategory}
          onSelectedCategoryChange={onSelectedCategoryChange}
        />
      </div>

      {showFilters && (
        <FiltersDrawer
          sortBy={sortBy}
          stockFilter={stockFilter}
          onSortByChange={onSortByChange}
          onStockFilterChange={onStockFilterChange}
        />
      )}

      {isInventoryLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-stone-500 border border-dashed border-stone-300 rounded-2xl bg-stone-50/50">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold tracking-wider">Chargement de l’inventaire...</span>
        </div>
      ) : (
        <InventoryGrid
          items={filteredInventory}
          categories={dbCategories}
          isCompactView={isCompactView}
          searchTerm={searchTerm}
          onUpdateQuantity={onUpdateQuantity}
          onRemove={onRemove}
          onEditQuantity={onEditQuantity}
          onEditProduct={onEditProduct}
        />
      )}
    </section>
  );
}

type StockHeroProps = {
  filteredCount: number;
  hasActiveFilters: boolean;
  isCompactView: boolean;
  showFilters: boolean;
  onResetFilters: () => void;
  onCompactViewChange: (isCompact: boolean) => void;
  onShowFiltersChange: (show: boolean) => void;
};

function StockHero({ filteredCount, hasActiveFilters, isCompactView, showFilters, onResetFilters, onCompactViewChange, onShowFiltersChange }: StockHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-4 shadow-xl shadow-emerald-500/20 sm:p-6">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:h-14 sm:w-14">
            <Package className="h-5 w-5 text-white sm:h-7 sm:w-7" />
          </div>
          <div className="pt-0.5 sm:pt-1">
            <h2 className="text-xl font-bold text-white tracking-tight sm:text-2xl">Inventaire</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm sm:px-2.5 sm:text-xs">
                {filteredCount} article{filteredCount > 1 ? "s" : ""}
              </span>
              <span className="text-[11px] text-white/70 sm:text-xs">en stock</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
          {hasActiveFilters && (
            <button onClick={onResetFilters} className="col-span-2 flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/30 sm:col-span-1">
              <X className="h-3.5 w-3.5" />
              Effacer
            </button>
          )}

          <div className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 p-1 backdrop-blur-sm sm:col-span-1 sm:justify-start sm:p-1.5">
            <button onClick={() => onCompactViewChange(!isCompactView)} className={`grid h-9 flex-1 place-items-center rounded-lg transition sm:h-8 sm:w-8 sm:flex-none ${isCompactView ? "bg-white text-emerald-600 shadow-sm" : "text-white/70 hover:bg-white/10"}`} title={isCompactView ? "Affichage détaillé" : "Affichage compact"}>
              {isCompactView ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </button>
            <button onClick={() => onShowFiltersChange(!showFilters)} className={`grid h-9 flex-1 place-items-center rounded-lg transition sm:h-8 sm:w-8 sm:flex-none ${showFilters ? "bg-white text-emerald-600 shadow-sm" : "text-white/70 hover:bg-white/10"}`} title="Filtres">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialSummary({ financialStats }: { financialStats: FinancialStats }) {
  return (
    <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
      <StatCard label="Achat Total" value={`${financialStats.totalPurchaseVal.toFixed(2)} €`} tone="stone" icon={<span className="text-xs font-bold text-stone-600">€</span>} />
      <StatCard label="CA Potentiel" value={`${financialStats.totalSalesVal.toFixed(2)} €`} tone="indigo" icon={<TrendingUp className="h-3.5 w-3.5 text-indigo-600" />} />
      <StatCard label="Marge Brute" value={`${financialStats.potentialMargin.toFixed(2)} €`} tone="emerald" icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-600" />} />
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "stone" | "indigo" | "emerald" }) {
  const classes = {
    stone: "from-stone-50 to-stone-100 border-stone-200/60 text-stone-700 bg-stone-200/70",
    indigo: "from-indigo-50 to-indigo-100/50 border-indigo-200/60 text-indigo-700 bg-indigo-200/60",
    emerald: "from-emerald-50 to-emerald-100/50 border-emerald-200/60 text-emerald-700 bg-emerald-200/60",
  }[tone];

  return (
    <div className={`group relative min-w-[8.75rem] snap-start overflow-hidden rounded-2xl bg-gradient-to-br p-3 border transition-all duration-300 hover:shadow-lg sm:min-w-0 ${classes}`}>
      <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-current/10 blur-2xl transition-all group-hover:scale-150" />
      <div className="relative">
        <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-current/10">{icon}</div>
        <span className="block text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</span>
        <span className="mt-0.5 block font-mono text-sm font-bold tabular">{value}</span>
      </div>
    </div>
  );
}

function MobileFilterShortcuts({ categories, selectedCategory, showFilters, onShowCategoryModal, onShowFiltersChange }: {
  categories: string[];
  selectedCategory: string | null;
  showFilters: boolean;
  onShowCategoryModal: () => void;
  onShowFiltersChange: (show: boolean) => void;
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
      {categories.length > 0 && (
        <button onClick={onShowCategoryModal} className="flex min-h-11 items-center justify-between rounded-2xl border border-stone-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-stone-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Tags className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Catégorie</p>
              <p className="truncate text-xs font-semibold text-stone-900">{selectedCategory ?? "Toutes"}</p>
            </div>
          </div>
        </button>
      )}
      <button onClick={() => onShowFiltersChange(!showFilters)} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 shadow-sm transition hover:border-stone-300">
        <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
        Trier / état
      </button>
    </div>
  );
}

function CategoryPills({ inventoryLength, categories, categoryOptions, selectedCategory, onSelectedCategoryChange }: {
  inventoryLength: number;
  categories: string[];
  categoryOptions: CategoryOption[];
  selectedCategory: string | null;
  onSelectedCategoryChange: (category: string | null) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="hidden -mx-3 gap-2 overflow-x-auto no-scrollbar px-3 pb-1 sm:flex sm:-mx-4 sm:px-4">
      <button onClick={() => onSelectedCategoryChange(null)} className={`min-h-9 shrink-0 rounded-full border px-3 py-2 text-[10px] font-bold transition tap-active select-none ${selectedCategory === null ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20" : "bg-white border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-300"}`}>
        Tout ({inventoryLength})
      </button>
      {categoryOptions.map((category) => (
        <button key={category.name} onClick={() => onSelectedCategoryChange(selectedCategory === category.name ? null : category.name)} className={`min-h-9 shrink-0 rounded-full border px-3 py-2 text-[10px] font-bold transition tap-active select-none ${selectedCategory === category.name ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20" : "bg-white border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-300"}`}>
          {category.label} ({category.count})
        </button>
      ))}
    </div>
  );
}

function FiltersDrawer({ sortBy, stockFilter, onSortByChange, onStockFilterChange }: {
  sortBy: SortBy;
  stockFilter: StockFilter;
  onSortByChange: (sort: SortBy) => void;
  onStockFilterChange: (filter: StockFilter) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs">
      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
        <span className="font-semibold text-stone-500">Trier par</span>
        <select value={sortBy} onChange={(event) => onSortByChange(event.target.value as SortBy)} className="h-11 rounded-xl border border-stone-200 bg-white p-2 text-stone-900 outline-none transition focus:border-indigo-500">
          <option value="recent">Date d'ajout</option>
          <option value="name">Alphabétique (A-Z)</option>
          <option value="quantityAsc">Quantité croissante</option>
          <option value="quantityDesc">Quantité décroissante</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
        <span className="font-semibold text-stone-500">État du Stock</span>
        <select value={stockFilter} onChange={(event) => onStockFilterChange(event.target.value as StockFilter)} className="h-11 rounded-xl border border-stone-200 bg-white p-2 text-stone-900 outline-none transition focus:border-indigo-500">
          <option value="all">Tous les articles</option>
          <option value="instock">En stock (&gt; 5)</option>
          <option value="low">Stock faible (≤ 5)</option>
          <option value="out">Rupture de stock (0)</option>
        </select>
      </div>
    </div>
  );
}
