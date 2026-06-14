import React from "react";
import { ManualInput } from "../components/ManualInput";
import { InventoryItem } from "../types";
import { Loader2, Package, Minus, Plus } from "lucide-react";

export function ScanTabView({
  loadingBarcode,
  actionModal,
  recentlyScanned,
  onScan,
  onOpenEditFromRecent,
  onUpdateQuantityFromRecent,
  isBatchMode,
  onToggleBatchMode,
  isOnline,
  pendingCount,
  syncError,
}: {
  loadingBarcode: string | null;
  actionModal: any;
  recentlyScanned: InventoryItem[];
  onScan: (barcode: string) => void;
  onOpenEditFromRecent: (item: InventoryItem) => void;
  onUpdateQuantityFromRecent: (barcode: string, delta: number) => void;
  isBatchMode: boolean;
  onToggleBatchMode: () => void;
  isOnline: boolean;
  pendingCount: number;
  syncError: string | null;
}) {
  return (
    <section className="glass-card rounded-[2rem] p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-40">
        {/* sparkles */}
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
          <span
            className={`w-1 h-1 rounded-full ${
              !isOnline
                ? "bg-rose-500"
                : pendingCount > 0
                  ? "bg-amber-500 animate-pulse"
                  : syncError
                    ? "bg-rose-500"
                    : "bg-emerald-500"
            }`}
          />
          {!isOnline
            ? "Hors-ligne"
            : pendingCount > 0
              ? `${pendingCount} en attente`
              : syncError
                ? "Supabase Off"
                : "Synchro On"}
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
        <div>
          <h3 className="text-xs font-bold text-stone-900">Mode Scan en Lot</h3>
          <p className="text-[10px] text-stone-500 mt-0.5">
            Ajoute automatiquement +1 au stock sans ouvrir de fenêtres
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleBatchMode}
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
          onScan={onScan}
          isActive={!loadingBarcode && !actionModal}
        />
      </div>

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
                onClick={() => onOpenEditFromRecent(item)}
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
                >
                  <div className="flex items-center rounded-lg bg-stone-50 border border-stone-200">
                    <button
                      onClick={() => onUpdateQuantityFromRecent(item.barcode, -1)}
                      className="grid h-6 w-6 place-items-center text-stone-500 active:scale-90 hover:text-stone-900 transition cursor-pointer"
                      aria-label="Diminuer la quantité"
                    >
                      <Minus className="h-2 w-2" />
                    </button>

                    <button
                      onClick={() => onOpenEditFromRecent(item)}
                      className={`px-1.5 min-w-6 text-center text-[10px] font-bold font-mono tabular py-0.5 hover:text-indigo-600 cursor-pointer ${
                        item.quantity <= 5 ? "text-amber-600" : "text-stone-900"
                      }`}
                    >
                      {item.quantity}
                    </button>

                    <button
                      onClick={() => onUpdateQuantityFromRecent(item.barcode, 1)}
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
  );
}

