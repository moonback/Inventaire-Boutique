import { useMemo } from "react";
import { InventoryItem } from "../types";
import { Package, Plus, Minus, Trash2, AlertTriangle, Tag } from "lucide-react";

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
      <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-white shadow-sm">
          <Package className="h-8 w-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-black text-slate-950">Aucun produit</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
          Ajoutez votre premier article avec la saisie code-barres. La caméra a
          été retirée pour une expérience plus simple et plus rapide.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groupedItems.map((group) => (
        <div key={group.category} className="space-y-3">
          <h3 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-black uppercase tracking-[0.16em] text-slate-500">
            <Tag className="h-4 w-4 text-blue-500" />
            {group.category}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs tracking-normal text-slate-600">
              {group.items.length}
            </span>
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <article
                key={item.barcode}
                className="group overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
              >
                <div className="flex gap-3 p-3">
                  <div className="relative grid h-24 w-24 flex-shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100 sm:h-28 sm:w-28">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-slate-300" />
                    )}
                    {item.quantity <= 5 && (
                      <div className="absolute left-2 top-2 rounded-full bg-amber-100 p-1 text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 py-1 pr-1">
                    <p className="mb-1 truncate font-mono text-[11px] font-bold text-slate-400">
                      {item.barcode}
                    </p>
                    <h4
                      className="line-clamp-2 font-black leading-tight text-slate-950"
                      title={item.name}
                    >
                      {item.name}
                    </h4>
                    {item.brand && (
                      <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                        {item.brand}
                      </p>
                    )}
                    {item.quantity <= 5 && (
                      <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                        Stock faible
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-center rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
                    <button
                      onClick={() => onUpdateQuantity(item.barcode, -1)}
                      className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100"
                      aria-label="Diminuer la quantité"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div
                      className={`min-w-12 text-center text-lg font-black ${item.quantity <= 5 ? "text-amber-600" : "text-slate-950"}`}
                    >
                      {item.quantity}
                    </div>
                    <button
                      onClick={() => onUpdateQuantity(item.barcode, 1)}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700"
                      aria-label="Augmenter la quantité"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(item.barcode)}
                    className="grid h-11 w-11 place-items-center rounded-2xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
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
