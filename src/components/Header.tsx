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
    ? "text-rose-600"
    : pendingCount > 0
      ? "text-amber-600"
      : "text-emerald-600";

  const connectionDot = !isOnline
    ? "bg-rose-500"
    : pendingCount > 0
      ? "bg-amber-500 animate-pulse"
      : "bg-emerald-500";

  return (
    <header className="sticky top-0 z-40 glass-panel border-b">
      <div className="mx-auto max-w-lg px-4 pt-3.5 pb-2">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight text-stone-900 flex items-center gap-1.5 truncate">
                Boutique
                <span className={`flex h-2 w-2 rounded-full ${connectionDot}`} />
              </h1>
              <p className="text-[10px] text-stone-500 font-semibold truncate max-w-[140px] sm:max-w-none">
                {email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && isOnline && onSyncNow && (
              <button
                onClick={onSyncNow}
                disabled={isSyncing}
                className="flex items-center justify-center p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 tap-active transition disabled:opacity-50"
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
                className="flex items-center justify-center p-2.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300 shadow-sm tap-active transition"
                title="Exporter l'inventaire en CSV"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onLogout}
              className="flex items-center justify-center p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 tap-active transition"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-stone-200/80 pt-2 pb-0.5 text-[10px] font-semibold text-stone-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Réf : <strong className="text-stone-900 font-bold font-mono tabular">{inventoryLength}</strong></span>
          </div>
          <div className="h-3 w-px bg-stone-200" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Total : <strong className="text-stone-900 font-bold font-mono tabular">{totalItems}</strong></span>
          </div>
          <div className="h-3 w-px bg-stone-200" />
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${lowStockCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-stone-300'}`} />
            <span>Alerte : <strong className="text-stone-900 font-bold font-mono tabular">{lowStockCount}</strong></span>
          </div>
          <div className="h-3 w-px bg-stone-200" />
          <button
            type="button"
            onClick={pendingCount > 0 && isOnline ? onSyncNow : undefined}
            className={`flex items-center gap-1.5 ${connectionColor} ${pendingCount > 0 && isOnline ? 'cursor-pointer' : 'cursor-default'}`}
            title={connectionLabel}
          >
            {!isOnline ? (
              <CloudOff className="h-3 w-3" />
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ${connectionDot}`} />
            )}
            <span className={connectionColor}>{connectionLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
