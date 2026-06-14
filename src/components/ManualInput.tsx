import { useState, KeyboardEvent, useEffect, useRef, useCallback } from "react";
import { Scan, CornerDownLeft, Zap } from "lucide-react";

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

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-inner shadow-slate-100">
      <label className="mb-2 flex items-center gap-2 px-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        <Zap className="h-3.5 w-3.5 text-blue-500" />
        Code-barres
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Scan className="h-5 w-5 text-blue-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="block h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-16 text-lg font-bold tracking-wide text-slate-950 shadow-sm outline-none transition placeholder:font-semibold placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 sm:text-xl"
          placeholder="Saisir ou scanner..."
          disabled={!isActive}
        />
        <button
          type="button"
          onClick={() => submitScan(value)}
          disabled={!value.trim() || !isActive}
          className="absolute right-2 top-2 grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          aria-label="Valider le code-barres"
        >
          <CornerDownLeft className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-3 px-2 text-xs font-medium leading-5 text-slate-500">
        Astuce : un lecteur physique valide automatiquement le code. Sur mobile,
        collez le code puis appuyez sur le bouton bleu.
      </p>
    </div>
  );
}
