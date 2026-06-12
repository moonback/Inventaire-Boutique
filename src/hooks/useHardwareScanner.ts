import { useEffect, useRef } from 'react';

export function useHardwareScanner(onScan: (barcode: string) => void) {
  const barcode = useRef('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if the user is typing in a specific input field (like the product name modal)
      // to avoid interpreting their typing as a scan.
      // We allow the ManualInput to handle its own events.
      if (e.target instanceof HTMLInputElement) {
        // If it's the ManualInput field, we can let the field's own onKeyDown handle it
        // Or if it's the modal input, we ignore it.
        return;
      }

      const now = performance.now();
      const timeDiff = now - lastKeyTime.current;

      // Hardware scanners typically simulate keystrokes very fast (10-30ms between keys)
      // If the delay is more than 50ms, it's likely a human typing, so we reset.
      if (timeDiff > 50) {
        barcode.current = '';
      }

      if (e.key === 'Enter') {
        // If we have a reasonable barcode length and receive 'Enter'
        if (barcode.current.length >= 8) {
          onScan(barcode.current);
          e.preventDefault();
        }
        barcode.current = '';
      } else if (e.key.length === 1) {
        barcode.current += e.key;
      }

      lastKeyTime.current = performance.now();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);
}
