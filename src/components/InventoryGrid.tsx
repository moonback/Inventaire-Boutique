import { useMemo } from "react";
import { InventoryItem } from "../types";
import { Package, Plus, Minus, Trash2, AlertTriangle } from "lucide-react";

interface InventoryGridProps {
  items: InventoryItem[];
  onUpdateQuantity: (barcode: string, delta: number) => void;
  onRemove: (barcode: string) => void;
}

export function InventoryGrid({
  items,
  onUpdateQuantity,
  onRemove,
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
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center">
        <Package className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <h3 className="font-semibold text-slate-950">Aucun produit</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
          Ajoutez votre premier article avec un code-barres.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {groupedItems.map((group) => (
        <div key={group.category} className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-sm font-semibold text-slate-800">
              {group.category}
            </h3>
            <span className="text-xs text-slate-500">{group.items.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {group.items.map((item) => (
              <article
                key={item.barcode}
                className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300"
              >
                <div className="flex gap-3">
                  <div className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 p-2">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[11px] text-slate-400">
                          {item.barcode}
                        </p>
                        <h4
                          className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-950"
                          title={item.name}
                        >
                          {item.name}
                        </h4>
                      </div>
                      {item.quantity <= 5 && (
                        <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                          <AlertTriangle className="h-3 w-3" />
                          Bas
                        </span>
                      )}
                    </div>
                    {item.brand && (
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {item.brand}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center rounded-xl border border-slate-200 bg-white">
                    <button
                      onClick={() => onUpdateQuantity(item.barcode, -1)}
                      className="grid h-10 w-10 place-items-center text-slate-600 transition hover:bg-slate-50"
                      aria-label="Diminuer la quantité"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div
                      className={`min-w-10 text-center text-sm font-semibold ${item.quantity <= 5 ? "text-amber-700" : "text-slate-950"}`}
                    >
                      {item.quantity}
                    </div>
                    <button
                      onClick={() => onUpdateQuantity(item.barcode, 1)}
                      className="grid h-10 w-10 place-items-center text-slate-600 transition hover:bg-slate-50"
                      aria-label="Augmenter la quantité"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(item.barcode)}
                    className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
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
