import { useState, KeyboardEvent, useEffect, useRef, useCallback, ClipboardEvent } from 'react';
import { ScanLine } from 'lucide-react';

const SCANNER_AUTO_SUBMIT_DELAY_MS = 120;
const SCANNER_MAX_KEY_INTERVAL_MS = 80;
const MIN_BARCODE_LENGTH = 8;

const SCANNER_AUTO_SUBMIT_DELAY_MS = 120;
const MIN_BARCODE_LENGTH = 8;

export function ManualInput({ onScan, isActive }: { onScan: (code: string) => void; isActive: boolean }) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSubmitTimeoutRef = useRef<number | null>(null);
  const fastKeyCountRef = useRef(0);
  const lastKeyTimeRef = useRef<number | null>(null);
  const pastedBarcodeRef = useRef(false);

  const resetScannerDetection = useCallback(() => {
    fastKeyCountRef.current = 0;
    lastKeyTimeRef.current = null;
    pastedBarcodeRef.current = false;
  }, []);

  const clearAutoSubmitTimeout = useCallback(() => {
    if (autoSubmitTimeoutRef.current) {
      window.clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
  }, []);

  const submitScan = useCallback((code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    clearAutoSubmitTimeout();
    onScan(trimmedCode);
    setValue('');
    resetScannerDetection();
  }, [clearAutoSubmitTimeout, onScan, resetScannerDetection]);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  useEffect(() => {
    clearAutoSubmitTimeout();

    const trimmedValue = value.trim();
    const looksLikeBarcode = /^\d+$/.test(trimmedValue) && trimmedValue.length >= MIN_BARCODE_LENGTH;
    const wasEnteredByScanner = fastKeyCountRef.current >= trimmedValue.length - 1 || pastedBarcodeRef.current;

    if (!isActive || !looksLikeBarcode || !wasEnteredByScanner) return;

    autoSubmitTimeoutRef.current = window.setTimeout(() => {
      submitScan(trimmedValue);
    }, SCANNER_AUTO_SUBMIT_DELAY_MS);

    return clearAutoSubmitTimeout;
  }, [clearAutoSubmitTimeout, isActive, submitScan, value]);

  useEffect(() => clearAutoSubmitTimeout, [clearAutoSubmitTimeout]);
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && value.trim() !== '') {
      e.preventDefault();
      submitScan(value);
      return;
    }

    if (e.key.length !== 1) return;

    const now = performance.now();
    if (lastKeyTimeRef.current && now - lastKeyTimeRef.current <= SCANNER_MAX_KEY_INTERVAL_MS) {
      fastKeyCountRef.current += 1;
    } else {
      fastKeyCountRef.current = 0;
    }
    lastKeyTimeRef.current = now;
    pastedBarcodeRef.current = false;
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text').trim();
    pastedBarcodeRef.current = /^\d+$/.test(pastedText) && pastedText.length >= MIN_BARCODE_LENGTH;
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white p-2 shadow-xl shadow-black/10">
      <label className="mb-2 flex items-center gap-2 px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <ScanLine className="h-4 w-4 text-blue-600" />
        Code-barres EAN
      </label>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center font-mono text-xl font-semibold tracking-widest text-slate-900 outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
        placeholder="Scannez ou saisissez le code"
      />
      <p className="px-3 pb-2 pt-2 text-center text-xs text-slate-500">
        Validation automatique avec scanner, Entrée ou Tab.
      </p>
    </div>
  )
}
