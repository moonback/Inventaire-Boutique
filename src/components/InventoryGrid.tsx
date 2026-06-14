import { useMemo } from "react";
import { InventoryItem } from "../types";
import { Package, Plus, Minus, Trash2, AlertTriangle, Edit2 } from "lucide-react";

interface InventoryGridProps {
  items: InventoryItem[];
  onUpdateQuantity: (barcode: string, delta: number) => void;
  onRemove: (barcode: string) => void;
  onEditQuantity: (item: InventoryItem) => void;
  onEditProduct: (item: InventoryItem) => void;
}

export function InventoryGrid({
  items,
  onUpdateQuantity,
  onRemove,
  onEditQuantity,
  onEditProduct,
}: InventoryGridProps) {
  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    items.forEach((item) => {
      const cat = item.category ? item.category.trim() : "Non classé";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return Object.keys(groups)
      .sort((a, b) => {
        if (a === "Non classé") return 1;
        if (b === "Non classé") return -1;
        return a.localeCompare(b);
      })
      .map((category) => ({ category, items: groups[category] }));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/20 px-4 py-14 text-center">
        <Package className="mx-auto mb-3 h-8 w-8 text-slate-600" />
        <h3 className="font-bold text-white text-sm">Aucun produit en stock</h3>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
          Scannez un code-barres ou saisissez-le manuellement pour ajouter votre premier article.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedItems.map((group) => (
        <div key={group.category} className="space-y-3 product-grid-enter">
          {/* Category Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {group.category}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-full">
              {group.items.length}
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-3">
            {group.items.map((item) => (
              <article
                key={item.barcode}
                className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 transition-all hover:bg-slate-900/60 hover:border-slate-700/80 cursor-pointer select-none group"
                onClick={() => onEditProduct(item)}
              >
                <div className="flex gap-4">
                  {/* Image Container */}
                  <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-xl border border-slate-800 bg-slate-950/40 p-1.5">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-contain rounded-lg"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-slate-600" />
                    )}
                  </div>

                  {/* Info Column */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[9px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          {item.barcode}
                          <Edit2 className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <h4
                          className="mt-0.5 line-clamp-1 text-sm font-bold text-white leading-tight group-hover:text-indigo-300 transition-colors"
                          title={item.name}
                        >
                          {item.name}
                        </h4>
                      </div>
                      {item.quantity <= 5 && (
                        <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 animate-pulse">
                          <AlertTriangle className="h-3 w-3" />
                          Bas
                        </span>
                      )}
                    </div>
                    {item.brand && (
                      <p className="mt-1 truncate text-xs text-slate-400 font-medium">
                        {item.brand}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card footer / Actions */}
                <div 
                  className="mt-4 flex items-center justify-between border-t border-slate-850 pt-3"
                  onClick={(e) => e.stopPropagation()} // Prevent modal trigger on button clicks
                >
                  <div className="flex items-center rounded-xl bg-slate-950/60 border border-slate-800/85">
                    <button
                      onClick={() => onUpdateQuantity(item.barcode, -1)}
                      className="grid h-10 w-10 place-items-center text-slate-400 active:scale-90 hover:text-white transition"
                      aria-label="Diminuer la quantité"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    
                    {/* Clickable quantity to trigger modal directly */}
                    <button
                      onClick={() => onEditQuantity(item)}
                      className={`px-3 min-w-10 text-center text-xs font-bold font-mono transition active:scale-95 cursor-pointer select-none py-1 hover:text-indigo-400 ${
                        item.quantity <= 5 ? "text-amber-400" : "text-white"
                      }`}
                      title="Modifier directement le stock"
                    >
                      {item.quantity}
                    </button>
                    
                    <button
                      onClick={() => onUpdateQuantity(item.barcode, 1)}
                      className="grid h-10 w-10 place-items-center text-slate-400 active:scale-90 hover:text-white transition"
                      aria-label="Augmenter la quantité"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => onRemove(item.barcode)}
                    className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 active:scale-90 hover:bg-red-500/10 hover:text-red-400 transition"
                    title="Supprimer l'article"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
