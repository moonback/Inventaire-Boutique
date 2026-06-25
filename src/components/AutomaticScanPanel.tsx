import { Activity, Loader2, RotateCcw, ScanLine, Volume2, Zap } from "lucide-react";
import { ManualInput } from "./ManualInput";
import { CameraBarcodeScanner } from "./CameraBarcodeScanner";
import { StockScanModeToggle, StockScanMode } from "./StockScanModeToggle";
import { ScannerInputMode, ScannerInputModeToggle } from "./ScannerInputModeToggle";

export type AutoScanQuantity = 1 | 5 | -1;

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
  scanQuantity: AutoScanQuantity;
  onScanQuantityChange: (quantity: AutoScanQuantity) => void;
  sessionScanCount: number;
  onResetSessionCount: () => void;
  confirmationSoundEnabled: boolean;
  onConfirmationSoundEnabledChange: (enabled: boolean) => void;
  scanLockMs: number;
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
  scanQuantity,
  onScanQuantityChange,
  sessionScanCount,
  onResetSessionCount,
  confirmationSoundEnabled,
  onConfirmationSoundEnabledChange,
  scanLockMs,
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
            Choisissez la quantité, puis scannez : le stock est ajusté sans fenêtre de confirmation.
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

      <div className="grid gap-2 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-stone-900">Quantité par scan</h3>
              <p className="text-[10px] font-medium text-stone-500">Verrou anti double-scan : {scanLockMs / 1000}s par code.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-stone-200 bg-white p-1">
            {([1, 5, -1] as AutoScanQuantity[]).map((quantity) => (
              <button
                key={quantity}
                type="button"
                onClick={() => onScanQuantityChange(quantity)}
                disabled={!enabled}
                className={`min-h-9 rounded-lg text-[11px] font-black transition disabled:opacity-50 ${
                  scanQuantity === quantity
                    ? quantity < 0
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-emerald-600 text-white shadow-sm"
                    : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                }`}
              >
                {quantity > 0 ? `+${quantity}` : quantity}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Session</p>
                <p className="text-lg font-black leading-none text-stone-900">{sessionScanCount}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onResetSessionCount}
              className="grid h-8 w-8 place-items-center rounded-xl border border-indigo-200 bg-white text-indigo-600 transition hover:bg-indigo-100"
              title="Réinitialiser le compteur de session"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onConfirmationSoundEnabledChange(!confirmationSoundEnabled)}
            className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[10px] font-bold transition ${
              confirmationSoundEnabled
                ? "border-indigo-200 bg-white text-indigo-700"
                : "border-stone-200 bg-white/70 text-stone-500"
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" />
            Son {confirmationSoundEnabled ? "activé" : "désactivé"}
          </button>
        </div>
      </div>

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
