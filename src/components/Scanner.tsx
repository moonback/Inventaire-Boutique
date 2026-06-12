import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useEffect, useRef } from 'react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
}

export function Scanner({ onScan }: ScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerId = "reader";

  useEffect(() => {
    // Configuration to prefer EAN-13
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 150 },
      aspectRatio: 1.0,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE
      ]
    };

    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(containerId, config, false);
      scannerRef.current.render(
        (decodedText) => {
          onScan(decodedText);
          // Optional: we can pause here, but let's let the parent manage state.
        },
        () => {
          // ignore background scan errors
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => {
          console.error("Failed to clear scanner", err);
        });
        scannerRef.current = null;
      }
    };
  }, [onScan]);

  return (
    <div className="w-full max-w-md mx-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div id={containerId} className="w-full rounded-xl overflow-hidden [&_video]:border-none [&_video]:rounded-xl" />
    </div>
  );
}
