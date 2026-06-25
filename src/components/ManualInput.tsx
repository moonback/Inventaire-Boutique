import { useState, KeyboardEvent, useEffect, useRef, useCallback } from "react";
import { CornerDownLeft, ScanLine, Keyboard } from "lucide-react";

const SCANNER_AUTO_SUBMIT_DELAY_MS = 120;
const MIN_BARCODE_LENGTH = 8;

export function ManualInput({
  onScan,
  isActive,
}: {
  onScan: (code: string) => void;
  isActive: boolean;
}) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSubmitTimeoutRef = useRef<number | null>(null);

  const clearAutoSubmitTimeout = useCallback(() => {
    if (autoSubmitTimeoutRef.current) {
      window.clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
  }, []);

  const submitScan = useCallback(
    (code: string) => {
      const trimmedCode = code.trim();
      if (!trimmedCode) return;

      clearAutoSubmitTimeout();
      onScan(trimmedCode);
      setValue("");
    },
    [clearAutoSubmitTimeout, onScan],
  );

  useEffect(() => {
    if (isActive && inputRef.current) inputRef.current.focus();
  }, [isActive]);

  useEffect(() => {
    clearAutoSubmitTimeout();
    const trimmedValue = value.trim();
    const looksLikeBarcode =
      /^\d+$/.test(trimmedValue) && trimmedValue.length >= MIN_BARCODE_LENGTH;
    if (!isActive || !looksLikeBarcode) return;

    autoSubmitTimeoutRef.current = window.setTimeout(
      () => submitScan(trimmedValue),
      SCANNER_AUTO_SUBMIT_DELAY_MS,
    );
    return clearAutoSubmitTimeout;
  }, [clearAutoSubmitTimeout, isActive, submitScan, value]);

  useEffect(() => clearAutoSubmitTimeout, [clearAutoSubmitTimeout]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === "Tab") && value.trim() !== "") {
      e.preventDefault();
      submitScan(value);
    }
  };

  const focusInput = () => inputRef.current?.focus();

  return (
    <div className="space-y-3">
      {/* Cible de scan visuelle */}
      <button
        type="button"
        onClick={focusInput}
        disabled={!isActive}
        aria-label="Activer le champ de scan"
        className={`group relative block w-full overflow-hidden rounded-2xl border-2 border-dashed p-4 text-left transition-all duration-300 sm:p-6 ${
          !isActive
            ? "border-stone-200 bg-stone-50 opacity-60"
            : isFocused
              ? "border-indigo-500 bg-indigo-50/60 shadow-lg shadow-indigo-600/10"
              : "border-stone-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
        }`}
      >
        {/* Ligne de scan animée */}
        {isActive && isFocused && (
          <span className="pointer-events-none absolute inset-x-6 top-0 h-px animate-scan-line bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
        )}

        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl transition-colors sm:h-14 sm:w-14 ${
              isActive && isFocused
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-stone-100 text-stone-400 group-hover:text-indigo-500"
            }`}
          >
            <ScanLine
              className={`h-6 w-6 sm:h-7 sm:w-7 ${isActive && isFocused ? "animate-pulse" : ""}`}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-stone-900">
              {!isActive
                ? "Recherche en cours..."
                : isFocused
                  ? "Prêt à scanner"
                  : "Scanner un code-barres"}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-stone-400">
              {isActive && isFocused
                ? "Visez le code ou saisissez-le ci-dessous"
                : "Touchez ici puis scannez avec le lecteur"}
            </p>
          </div>
          {isActive && (
            <span
              className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                isFocused
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-stone-100 text-stone-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isFocused ? "animate-pulse bg-emerald-500" : "bg-stone-300"
                }`}
              />
              {isFocused ? "Actif" : "En veille"}
            </span>
          )}
        </div>
      </button>

      {/* Champ de saisie */}
      <div className="space-y-2">
        <label
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500"
          htmlFor="barcode-input"
        >
          <Keyboard className="h-3 w-3" />
          Saisie manuelle
        </label>
        <div className="flex gap-2">
          <input
            id="barcode-input"
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="h-12 min-w-0 flex-1 rounded-2xl glass-input px-4 text-base font-semibold font-mono tabular text-stone-900 outline-none transition disabled:opacity-40 sm:h-11 sm:rounded-xl sm:text-sm"
            placeholder="Saisir ou scanner..."
            disabled={!isActive}
          />
          <button
            type="button"
            onClick={() => submitScan(value)}
            disabled={!value.trim() || !isActive}
            className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-95 disabled:pointer-events-none disabled:opacity-40 sm:h-11 sm:w-11 sm:rounded-xl"
            aria-label="Valider le code-barres"
          >
            <CornerDownLeft className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] leading-relaxed text-stone-400 font-medium">
          Entrée, Tab ou le lecteur physique valideront automatiquement le code.
        </p>
      </div>
    </div>
  );
}
