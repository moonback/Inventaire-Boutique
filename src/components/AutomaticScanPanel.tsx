import { Loader2, ScanLine, Zap } from "lucide-react";
import { ManualInput } from "./ManualInput";
import { CameraBarcodeScanner } from "./CameraBarcodeScanner";
import { StockScanModeToggle, StockScanMode } from "./StockScanModeToggle";
import { ScannerInputMode, ScannerInputModeToggle } from "./ScannerInputModeToggle";

interface AutomaticScanPanelProps {
  enabled: boolean;
  mode: StockScanMode;
  loadingBarcode: string | null;
  isOnline: boolean;
  pendingCount: number;
  syncError: string | null;
  onEnabledChange: (enabled: boolean) => void;
  onModeChange: (mode: StockScanMode) => void;
  scannerInputMode: ScannerInputMode;
  onScannerInputModeChange: (mode: ScannerInputMode) => void;
  onScan: (barcode: string) => void;
}

export function AutomaticScanPanel({
  enabled,
  mode,
  loadingBarcode,
  isOnline,
  pendingCount,
  syncError,
  onEnabledChange,
  onModeChange,
  scannerInputMode,
  onScannerInputModeChange,
  onScan,
}: AutomaticScanPanelProps) {
  return (
    <section className="glass-card mobile-card relative overflow-hidden space-y-4">
      <div className="absolute right-0 top-0 p-3 opacity-40">
        <Zap className="h-5 w-5 text-amber-500" />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <ScanLine className="h-3 w-3" />
            Scan auto
          </span>
          <h2 className="mt-2 text-base font-bold tracking-tight text-stone-900">
            Ajouter ou retirer vite
          </h2>
          <p className="mt-1 max-w-xs text-[11px] font-medium leading-relaxed text-stone-500">
            Choisissez le sens du mouvement puis scannez : chaque code applique automatiquement 1 unité.
          </p>
        </div>
        <div
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            !isOnline
              ? "border border-rose-200 bg-rose-50 text-rose-600"
              : pendingCount > 0
                ? "border border-amber-200 bg-amber-50 text-amber-700"
                : syncError
                  ? "border border-rose-200 bg-rose-50 text-rose-600"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <span
            className={`h-1 w-1 rounded-full ${
              !isOnline
                ? "bg-rose-500"
                : pendingCount > 0
                  ? "animate-pulse bg-amber-500"
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

      <StockScanModeToggle
        enabled={enabled}
        mode={mode}
        onEnabledChange={onEnabledChange}
        onModeChange={onModeChange}
      />

      {enabled && (
        <>
          <ScannerInputModeToggle
            mode={scannerInputMode}
            onModeChange={onScannerInputModeChange}
            disabled={!!loadingBarcode}
          />

          <div className="relative">
            {loadingBarcode && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white/95 text-stone-700 backdrop-blur-xs">
                <Loader2 className="mb-2 h-6 w-6 animate-spin text-indigo-600" />
                <span className="font-mono text-xs font-semibold tracking-wider">
                  Scan {loadingBarcode}...
                </span>
              </div>
            )}
            {scannerInputMode === "hardware" ? (
              <ManualInput onScan={onScan} isActive={!loadingBarcode} />
            ) : (
              <CameraBarcodeScanner
                enabled={!loadingBarcode}
                isBusy={!!loadingBarcode}
                onScan={onScan}
              />
            )}
          </div>
        </>
      )}

      {!enabled && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
          Activez le scan automatique pour appliquer les mouvements sans fenêtre de confirmation.
        </div>
      )}
    </section>
  );
}
