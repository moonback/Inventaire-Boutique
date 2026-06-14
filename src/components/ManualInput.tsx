import { useState, KeyboardEvent, useEffect, useRef, useCallback } from 'react';
import { Scan } from 'lucide-react';

const SCANNER_AUTO_SUBMIT_DELAY_MS = 120;
const MIN_BARCODE_LENGTH = 8;

export function ManualInput({ onScan, isActive }: { onScan: (code: string) => void; isActive: boolean }) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSubmitTimeoutRef = useRef<number | null>(null);

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
  }, [clearAutoSubmitTimeout, onScan]);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  useEffect(() => {
    clearAutoSubmitTimeout();

    const trimmedValue = value.trim();
    const looksLikeBarcode = /^\d+$/.test(trimmedValue) && trimmedValue.length >= MIN_BARCODE_LENGTH;

    if (!isActive || !looksLikeBarcode) return;

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
    }
  }

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
        className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg shadow-sm"
        placeholder="Saisissez ou scannez un code-barres..."
      />
    </div>
  )
}
