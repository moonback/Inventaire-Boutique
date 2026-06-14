import { useState, KeyboardEvent, useEffect, useRef, useCallback, ClipboardEvent } from 'react';
import { Scan } from 'lucide-react';

const SCANNER_AUTO_SUBMIT_DELAY_MS = 120;
const SCANNER_MAX_KEY_INTERVAL_MS = 80;
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
    <div className="relative w-full max-w-md mx-auto">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Scan className="h-5 w-5 text-gray-400" />
      </div>
      <input
        ref={inputRef}
        type="text"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg shadow-sm"
        placeholder="Saisissez ou scannez un code-barres..."
      />
    </div>
  )
}
