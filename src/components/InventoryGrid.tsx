import React, { useMemo, useState, useRef, TouchEvent } from "react";
import { InventoryItem, CategoryItem } from "../types";
import { Package, Plus, Minus, Trash2, AlertTriangle, Edit2, TrendingUp, TrendingDown } from "lucide-react";
import { AnimatedQuantity } from "./AnimatedQuantity";
import { isRecentTimestamp } from "../lib/utils";

interface SwipeableItemProps {
  children: React.ReactNode;
  key?: string;
  isCompact?: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}

function SwipeableItem({ children, isCompact = false, onSwipeRight, onSwipeLeft }: SwipeableItemProps) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping) return;
    const diffX = e.touches[0].clientX - startX;
    const limitedX = Math.max(-120, Math.min(120, diffX));
    setCurrentX(limitedX);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (currentX > 85) {
      onSwipeRight();
    } else if (currentX < -85) {
      onSwipeLeft();
    }
    setCurrentX(0);
  };

  const swipeClass = isSwiping ? "" : "transition-transform duration-200 ease-out";
  const roundedClass = isCompact ? "rounded-xl" : "rounded-2xl";

  let bgClass = "bg-transparent border-transparent";
  let iconLeft = false;
  let iconRight = false;
  if (currentX > 15) {
    bgClass = "bg-emerald-100 border-emerald-300";
    iconLeft = true;
  } else if (currentX < -15) {
    bgClass = "bg-rose-100 border-rose-300";
    iconRight = true;
  }

  return (
    <div className={`relative overflow-hidden w-full ${roundedClass}`}>
      <div className={`absolute inset-0 flex items-center justify-between px-6 transition-colors border ${roundedClass} ${bgClass}`}>
        <div className={`flex items-center gap-1.5 text-emerald-700 font-bold text-[10px] uppercase tracking-wider transition-opacity duration-150 ${iconLeft ? 'opacity-100' : 'opacity-0'}`}>
          <Plus className="w-4 h-4 animate-pulse" />
          <span>Ajouter +1</span>
        </div>
        <div className={`flex items-center gap-1.5 text-rose-600 font-bold text-[10px] uppercase tracking-wider transition-opacity duration-150 ${iconRight ? 'opacity-100' : 'opacity-0'}`}>
          <span>Supprimer</span>
          <Trash2 className="w-4 h-4 animate-pulse" />
        </div>
      </div>

      <div
        ref={itemRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${currentX}px)` }}
        className={`relative z-10 w-full ${swipeClass}`}
      >
        {children}
      </div>
    </div>
  );
}

interface InventoryGridProps {
  items: InventoryItem[];
  categories?: CategoryItem[];
  isCompactView?: boolean;
  searchTerm?: string;
  onUpdateQuantity: (barcode: string, delta: number) => void;
  onRemove: (barcode: string) => void;
  onEditQuantity: (item: InventoryItem) => void;
  onEditProduct: (item: InventoryItem) => void;
}

export function InventoryGrid({
  items,
  categories = [],
  isCompactView = false,
  searchTerm = "",
  onUpdateQuantity,
  onRemove,
  onEditQuantity,
  onEditProduct,
}: InventoryGridProps) {
  const searchTokens = useMemo(
    () =>
      searchTerm
        .trim()
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean),
    [searchTerm],
  );

  const renderHighlightedText = (text: string, highlightClassName: string) => {
    if (!text || searchTokens.length === 0) {
      return text;
    }

    const escapedTokens = searchTokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escapedTokens.join("|")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      escapedTokens.some((token) => new RegExp(`^${token}$`, "i").test(part)) ? (
        <mark key={`${part}-${index}`} className={highlightClassName}>
          {part}
        </mark>
      ) : (
        <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
      ),
    );
  };

  const renderNewBadge = (item: InventoryItem) => {
    if (!isRecentTimestamp(item.lastUpdated)) return null;

    return (
      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-bold text-sky-700">
        Nouveau
      </span>
    );
  };

  const renderTrendBadge = (item: InventoryItem) => {
    if (!item.lastMovement || item.lastMovement === 0) return null;

    const isRecent = isRecentTimestamp(item.lastUpdated);
    if (!isRecent) return null;

    if (item.lastMovement > 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
          <TrendingUp className="h-3 w-3" />
          +{item.lastMovement} réappro
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[9px] font-bold text-orange-600">
          <TrendingDown className="h-3 w-3" />
          {item.lastMovement} sortie
        </span>
      );
    }
  };

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
      <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50/50 px-4 py-14 text-center">
        <Package className="mx-auto mb-3 h-8 w-8 text-stone-300" />
        <h3 className="font-bold text-stone-900 text-sm">Aucun produit en stock</h3>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-stone-500">
          Scannez un code-barres ou saisissez-le manuellement pour ajouter votre premier article.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {groupedItems.map((group) => (
        <div key={group.category} className="space-y-3 product-grid-enter">
          {/* Category Header */}
          <div className="sticky top-[8.25rem] z-10 flex items-center justify-between rounded-2xl border border-stone-200 bg-white/85 px-3 py-2 shadow-sm backdrop-blur sm:static sm:border-x-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:shadow-none sm:backdrop-blur-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {(() => {
                const catObj = categories.find(c => c.name.toLowerCase() === group.category.toLowerCase());
                return catObj?.icon ? `${catObj.icon} ${group.category}` : group.category;
              })()}
            </h3>
            <span className="text-[10px] font-bold font-mono tabular px-2 py-0.5 bg-stone-100 border border-stone-200 text-stone-500 rounded-full">
              {group.items.length}
            </span>
          </div>

          {/* Cards Grid */}
          <div className={isCompactView ? "flex flex-col gap-2" : "grid grid-cols-1 gap-3"}>
            {group.items.map((item) => {
              if (isCompactView) {
                return (
                  <SwipeableItem
                    key={item.barcode}
                    isCompact={true}
                    onSwipeRight={() => onUpdateQuantity(item.barcode, 1)}
                    onSwipeLeft={() => onRemove(item.barcode)}
                  >
                    <article
                      className="relative flex cursor-pointer select-none items-center justify-between gap-3 overflow-hidden rounded-2xl border border-stone-200 bg-white px-3 py-3 shadow-sm transition-all hover:border-stone-300 hover:shadow-sm group"
                      onClick={() => onEditProduct(item)}
                    >
                      {/* Left Info Column */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4
                            className="line-clamp-1 text-xs font-bold text-stone-900 group-hover:text-indigo-600 transition-colors"
                            title={item.name}
                          >
                            {renderHighlightedText(item.name, "rounded bg-amber-100 px-0.5 text-stone-950")}
                          </h4>
                          {renderNewBadge(item)}
                          {item.brand && (
                            <span className="text-[10px] text-stone-500 font-medium truncate max-w-[80px]">
                              •{" "}
                              {renderHighlightedText(item.brand, "rounded bg-amber-100 px-0.5 text-stone-700")}
                            </span>
                          )}
                          {item.quantity <= 5 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                          )}
                          {renderTrendBadge(item)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-stone-400 font-medium">
                          <span className="font-mono tabular">{item.barcode}</span>
                          {item.salesPrice !== undefined && item.salesPrice !== null && (
                            <span>• <span className="text-indigo-600 font-semibold font-mono tabular">{item.salesPrice.toFixed(2)} €</span></span>
                          )}
                        </div>
                      </div>

                      {/* Right Action Column */}
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center rounded-lg bg-stone-50 border border-stone-200">
                          <button
                            onClick={() => onUpdateQuantity(item.barcode, -1)}
                            className="grid h-9 w-9 place-items-center text-stone-500 transition active:scale-90 hover:text-stone-900"
                            aria-label="Diminuer la quantité"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>

                          <button
                            onClick={() => onEditQuantity(item)}
                            className={`min-h-9 min-w-9 cursor-pointer select-none px-2 py-1 text-center font-mono text-xs font-bold tabular transition active:scale-95 hover:text-indigo-600 ${
                              item.quantity <= 5 ? "text-amber-600" : "text-stone-900"
                            }`}
                          >
                            <AnimatedQuantity value={item.quantity} />
                          </button>

                          <button
                            onClick={() => onUpdateQuantity(item.barcode, 1)}
                            className="grid h-9 w-9 place-items-center text-stone-500 transition active:scale-90 hover:text-stone-900"
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => onRemove(item.barcode)}
                          className="grid h-9 w-9 place-items-center rounded-xl text-stone-400 transition active:scale-90 hover:bg-rose-50 hover:text-rose-600"
                          title="Supprimer l'article"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  </SwipeableItem>
                );
              }

              return (
                <SwipeableItem
                  key={item.barcode}
                  isCompact={false}
                  onSwipeRight={() => onUpdateQuantity(item.barcode, 1)}
                  onSwipeLeft={() => onRemove(item.barcode)}
                >
                  <article
                    className="relative cursor-pointer select-none overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition-all hover:border-stone-300 hover:shadow-md group sm:p-4"
                    onClick={() => onEditProduct(item)}
                  >
                    <div className="flex gap-4">
                      {/* Image Container */}
                      <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-xl border border-stone-200 bg-stone-50 p-1.5 sm:h-16 sm:w-16">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-contain rounded-lg"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-stone-300" />
                        )}
                      </div>

                      {/* Info Column */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono tabular text-[9px] font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                              {item.barcode}
                              <Edit2 className="w-2.5 h-2.5 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            <h4
                              className="mt-0.5 line-clamp-1 text-sm font-bold text-stone-900 leading-tight group-hover:text-indigo-600 transition-colors"
                              title={item.name}
                            >
                              {renderHighlightedText(item.name, "rounded bg-amber-100 px-0.5 text-stone-950")}
                            </h4>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            {renderNewBadge(item)}
                            {item.quantity <= 5 && (
                              <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700 animate-pulse">
                                <AlertTriangle className="h-3 w-3" />
                                Bas
                              </span>
                            )}
                            {renderTrendBadge(item)}
                          </div>
                        </div>
                        {item.brand && (
                          <p className="mt-1 truncate text-xs text-stone-500 font-medium">
                            {renderHighlightedText(item.brand, "rounded bg-amber-100 px-0.5 text-stone-700")}
                          </p>
                        )}
                        {(item.purchasePrice !== undefined || item.salesPrice !== undefined) && (
                          <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-medium text-stone-500">
                            {item.purchasePrice !== undefined && item.purchasePrice !== null && (
                              <span className="bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200">
                                Achat: <span className="font-mono tabular font-bold text-stone-700">{item.purchasePrice.toFixed(2)} €</span>
                              </span>
                            )}
                            {item.salesPrice !== undefined && item.salesPrice !== null && (
                              <span className="bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200">
                                Vente: <span className="font-mono tabular font-bold text-indigo-600">{item.salesPrice.toFixed(2)} €</span>
                              </span>
                            )}
                            {item.purchasePrice !== undefined && item.salesPrice !== undefined && item.purchasePrice !== null && item.salesPrice !== null && (
                              <span className="bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-700">
                                Marge: <span className="font-mono tabular font-bold">{(item.salesPrice - item.purchasePrice).toFixed(2)} €</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card footer / Actions */}
                    <div
                      className="mt-4 flex items-center justify-between border-t border-stone-200 pt-3"
                      onClick={(e) => e.stopPropagation()} // Prevent modal trigger on button clicks
                    >
                      <div className="flex items-center rounded-xl bg-stone-50 border border-stone-200">
                        <button
                          onClick={() => onUpdateQuantity(item.barcode, -1)}
                          className="grid h-10 w-10 place-items-center text-stone-500 active:scale-90 hover:text-stone-900 transition"
                          aria-label="Diminuer la quantité"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>

                        {/* Clickable quantity to trigger modal directly */}
                        <button
                          onClick={() => onEditQuantity(item)}
                          className={`px-3 min-w-10 text-center text-xs font-bold font-mono tabular transition active:scale-95 cursor-pointer select-none py-1 hover:text-indigo-600 ${
                            item.quantity <= 5 ? "text-amber-600" : "text-stone-900"
                          }`}
                          title="Modifier directement le stock"
                        >
                          <AnimatedQuantity value={item.quantity} />
                        </button>

                        <button
                          onClick={() => onUpdateQuantity(item.barcode, 1)}
                          className="grid h-10 w-10 place-items-center text-stone-500 active:scale-90 hover:text-stone-900 transition"
                          aria-label="Augmenter la quantité"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemove(item.barcode)}
                        className="grid h-10 w-10 place-items-center rounded-xl text-stone-400 active:scale-90 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Supprimer l'article"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                </SwipeableItem>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
