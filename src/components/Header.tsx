import { Store, Download, LogOut } from "lucide-react";

interface HeaderProps {
  email: string;
  inventoryLength: number;
  totalItems: number;
  lowStockCount: number;
  showExport: boolean;
  onExport: () => void;
  onLogout: () => void;
}

export function Header({
  email,
  inventoryLength,
  totalItems,
  lowStockCount,
  showExport,
  onExport,
  onLogout,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 bg-[#070b13]/80 backdrop-blur-md">
      <div className="mx-auto max-w-lg px-4 pt-3.5 pb-2">
        {/* Main Title and Actions */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
                Boutique
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[140px] sm:max-w-none">
                {email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showExport && (
              <button
                onClick={onExport}
                className="flex items-center justify-center p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white tap-active transition"
                title="Exporter l'inventaire en CSV"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onLogout}
              className="flex items-center justify-center p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 tap-active transition"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Integrated Thin Stats Sub-Row */}
        <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 pb-0.5 text-[10px] font-semibold text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Réf : <strong className="text-white font-bold">{inventoryLength}</strong></span>
          </div>
          <div className="h-3 w-px bg-slate-800/80" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Total : <strong className="text-white font-bold">{totalItems}</strong></span>
          </div>
          <div className="h-3 w-px bg-slate-800/80" />
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${lowStockCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-600'}`} />
            <span>Alerte : <strong className="text-white font-bold">{lowStockCount}</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
}
