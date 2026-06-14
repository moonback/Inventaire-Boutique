import { useState, KeyboardEvent, useEffect, useRef, useCallback } from "react";
import { CornerDownLeft } from "lucide-react";

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
    <div className="space-y-2">
      <label
        className="block text-xs font-bold uppercase tracking-wider text-slate-400"
        htmlFor="barcode-input"
      >
        Code-barres produit
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
          className="h-12 min-w-0 flex-1 rounded-xl glass-input px-4 text-base font-semibold font-mono text-white outline-none placeholder:text-slate-650 transition disabled:opacity-40 sm:h-11 sm:text-sm"
          placeholder="Saisir ou scanner..."
          disabled={!isActive}
        />
        <button
          type="button"
          onClick={() => submitScan(value)}
          disabled={!value.trim() || !isActive}
          className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 active:scale-95 disabled:pointer-events-none disabled:opacity-40 transition sm:h-11 sm:w-11"
          aria-label="Valider le code-barres"
        >
          <CornerDownLeft className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
        Entrée, Tab ou le lecteur physique valideront automatiquement le code.
      </p>
    </div>
  );
}
