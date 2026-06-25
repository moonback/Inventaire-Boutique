import { Store, Download, LogOut, CloudOff, CloudUpload, RefreshCw } from "lucide-react";

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
  const connectionLabel = !isOnline
    ? "Hors-ligne"
    : pendingCount > 0
      ? `${pendingCount} en attente`
      : "En ligne";

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
      <div className="mx-auto w-full max-w-2xl px-3 pb-2.5 pt-2.5 sm:px-4 sm:pt-3.5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="flex items-center gap-1.5 truncate text-lg font-extrabold tracking-tight text-stone-950">
                Boutique
                <span className={`flex h-2 w-2 rounded-full ${connectionDot}`} />
              </h1>
              <p className="max-w-[46vw] truncate text-[10px] font-semibold text-stone-500 sm:max-w-none">
                {email}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            {pendingCount > 0 && isOnline && onSyncNow && (
              <button
                onClick={onSyncNow}
                disabled={isSyncing}
                className="touch-target grid place-items-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 transition tap-active disabled:opacity-50"
                title="Synchroniser les modifications en attente"
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
                className="touch-target grid place-items-center rounded-2xl border border-stone-200 bg-white text-stone-600 shadow-sm transition tap-active hover:border-stone-300 hover:text-stone-900"
                title="Exporter l'inventaire en CSV"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onLogout}
              className="touch-target grid place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 transition tap-active hover:bg-rose-100"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-[9px] font-semibold text-stone-500 sm:gap-2 sm:text-[10px]">
          <div className="rounded-2xl border border-stone-200/80 bg-white/70 px-2 py-2 text-center shadow-sm">
            <span className="block uppercase tracking-wider text-stone-400">Réf.</span>
            <strong className="font-mono text-sm font-extrabold tabular text-stone-950">{inventoryLength}</strong>
          </div>
          <div className="rounded-2xl border border-stone-200/80 bg-white/70 px-2 py-2 text-center shadow-sm">
            <span className="block uppercase tracking-wider text-stone-400">Total</span>
            <strong className="font-mono text-sm font-extrabold tabular text-emerald-700">{totalItems}</strong>
          </div>
          <div className="rounded-2xl border border-stone-200/80 bg-white/70 px-2 py-2 text-center shadow-sm">
            <span className="block uppercase tracking-wider text-stone-400">Alerte</span>
            <strong className={`font-mono text-sm font-extrabold tabular ${lowStockCount > 0 ? 'text-amber-600' : 'text-stone-950'}`}>{lowStockCount}</strong>
          </div>
          <button
            type="button"
            onClick={pendingCount > 0 && isOnline ? onSyncNow : undefined}
            className={`rounded-2xl border px-2 py-2 text-center shadow-sm transition tap-active ${connectionColor} ${pendingCount > 0 && isOnline ? 'cursor-pointer' : 'cursor-default'}`}
            title={connectionLabel}
          >
            <span className="flex items-center justify-center gap-1 truncate">
              {!isOnline ? (
                <CloudOff className="h-3 w-3" />
              ) : (
                <span className={`h-1.5 w-1.5 rounded-full ${connectionDot}`} />
              )}
              <span className="truncate">{connectionLabel}</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
