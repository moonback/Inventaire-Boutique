import { Store, Download, LogOut, CloudOff, CloudUpload, RefreshCw, Check } from "lucide-react";

interface HeaderProps {
  email: string;
  inventoryLength: number;
  totalItems: number;
  lowStockCount: number;
  showExport: boolean;
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onExport: () => void;
  onLogout: () => void;
  onSyncNow?: () => void;
}

export function Header({
  email,
  inventoryLength,
  totalItems,
  lowStockCount,
  showExport,
  isOnline,
  pendingCount,
  isSyncing,
  onExport,
  onLogout,
  onSyncNow,
}: HeaderProps) {
  const canSync = isOnline && pendingCount > 0 && !!onSyncNow;

  const connectionLabel = !isOnline
    ? "Hors-ligne"
    : pendingCount > 0
      ? `${pendingCount} opération${pendingCount > 1 ? "s" : ""} en attente`
      : "Synchronisé";

  const connectionColor = !isOnline
    ? "text-rose-600 bg-rose-50 border-rose-200"
    : pendingCount > 0
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-emerald-600 bg-emerald-50 border-emerald-200";

  const connectionDot = !isOnline
    ? "bg-rose-500"
    : pendingCount > 0
      ? "bg-amber-500 animate-pulse"
      : "bg-emerald-500";

  return (
    <header className="sticky top-0 z-40 glass-panel border-b pt-safe">
      <div className="mx-auto w-full max-w-2xl px-4 pb-3 pt-3">
        {/* Identity row */}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25">
            <Store className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold tracking-tight text-stone-950">
              Superette Salengro
            </h1>
            {/* <p className="truncate text-[11px] font-medium text-stone-500">
              {email}
            </p> */}
          </div>

          {/* Action icons: always reachable with the thumb, never wrap, never crowd the title */}
          <div className="flex flex-shrink-0 items-center gap-1.5">
            {canSync && (
              <button
                onClick={onSyncNow}
                disabled={isSyncing}
                aria-label={isSyncing ? "Synchronisation en cours" : "Synchroniser les modifications en attente"}
                className="touch-target grid h-10 w-10 place-items-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 transition tap-active disabled:opacity-50"
              >
                {isSyncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="h-4 w-4" />
                )}
              </button>
            )}
            {showExport && (
              <button
                onClick={onExport}
                aria-label="Exporter l'inventaire en CSV"
                className="touch-target grid h-10 w-10 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-600 shadow-sm transition tap-active hover:border-stone-300 hover:text-stone-900"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onLogout}
              aria-label="Se déconnecter"
              className="touch-target grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 transition tap-active hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Single connection banner — tappable only when there's something to do */}
        <button
          type="button"
          onClick={canSync ? onSyncNow : undefined}
          disabled={!canSync}
          aria-label={`Statut réseau : ${connectionLabel}${canSync ? ", touchez pour synchroniser" : ""}`}
          className={`mt-2.5 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${connectionColor} ${canSync ? "tap-active cursor-pointer" : "cursor-default"}`}
        >
          {!isOnline ? (
            <CloudOff className="h-3.5 w-3.5 flex-shrink-0" />
          ) : pendingCount === 0 ? (
            <Check className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${connectionDot}`} />
          )}
          <span className="min-w-0 flex-1 truncate">{connectionLabel}</span>
          {canSync && (
            <span className="flex-shrink-0 text-[11px] font-bold underline-offset-2 opacity-80">
              {isSyncing ? "..." : "Synchroniser"}
            </span>
          )}
        </button>

        {/* Stats row */}
        <div className="mt-2.5 grid grid-cols-3 gap-2 text-[10px] font-semibold text-stone-500">
          <div className="rounded-xl border border-stone-200/80 bg-white/70 px-2 py-2 text-center shadow-sm">
            <span className="block uppercase tracking-wider text-stone-400">Réf.</span>
            <strong className="font-mono text-base font-extrabold tabular-nums text-stone-950">
              {inventoryLength}
            </strong>
          </div>
          <div className="rounded-xl border border-stone-200/80 bg-white/70 px-2 py-2 text-center shadow-sm">
            <span className="block uppercase tracking-wider text-stone-400">Total</span>
            <strong className="font-mono text-base font-extrabold tabular-nums text-emerald-700">
              {totalItems}
            </strong>
          </div>
          <div className="rounded-xl border border-stone-200/80 bg-white/70 px-2 py-2 text-center shadow-sm">
            <span className="block uppercase tracking-wider text-stone-400">Alerte</span>
            <strong
              className={`font-mono text-base font-extrabold tabular-nums ${
                lowStockCount > 0 ? "text-amber-600" : "text-stone-950"
              }`}
            >
              {lowStockCount}
            </strong>
          </div>
        </div>
      </div>
    </header>
  );
}