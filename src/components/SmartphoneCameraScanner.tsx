import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Flashlight, FlashlightOff, Loader2, ScanLine, X } from "lucide-react";

const ZXING_CDN_URL = "https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js";
const SCAN_COOLDOWN_MS = 1600;

type ScannerEngine = "native" | "zxing";

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
    ZXing?: {
      BrowserMultiFormatReader: new () => {
        decodeFromVideoElementContinuously: (
          video: HTMLVideoElement,
          callback: (result: { getText: () => string } | null, error: unknown) => void,
        ) => void;
        reset: () => void;
      };
    };
  }
}

interface SmartphoneCameraScannerProps {
  onScan: (barcode: string) => void;
  isActive: boolean;
}

async function loadZxingFallback() {
  if (window.ZXing?.BrowserMultiFormatReader) return window.ZXing;

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${ZXING_CDN_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Impossible de charger la librairie de scan.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = ZXING_CDN_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger la librairie de scan."));
    document.head.appendChild(script);
  });

  if (!window.ZXing?.BrowserMultiFormatReader) {
    throw new Error("Librairie de scan indisponible.");
  }
  return window.ZXing;
}

export function SmartphoneCameraScanner({ onScan, isActive }: SmartphoneCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<InstanceType<NonNullable<typeof window.ZXing>["BrowserMultiFormatReader"]> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanRef = useRef({ code: "", at: 0 });

  const [isOpen, setIsOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [engine, setEngine] = useState<ScannerEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const emitScan = useCallback(
    (code: string) => {
      const trimmedCode = code.trim();
      if (!trimmedCode) return;

      const now = Date.now();
      if (
        lastScanRef.current.code === trimmedCode &&
        now - lastScanRef.current.at < SCAN_COOLDOWN_MS
      ) {
        return;
      }

      lastScanRef.current = { code: trimmedCode, at: now };
      onScan(trimmedCode);
    },
    [onScan],
  );

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    zxingReaderRef.current?.reset();
    zxingReaderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setTorchAvailable(false);
    setTorchEnabled(false);
    setEngine(null);
  }, []);

  const startNativeDetection = useCallback((detector: InstanceType<BarcodeDetectorConstructor>) => {
    const scanFrame = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      try {
        const barcodes = await detector.detect(video);
        const code = barcodes.find((barcode) => barcode.rawValue)?.rawValue;
        if (code) emitScan(code);
      } catch (nativeError) {
        console.warn("Erreur BarcodeDetector:", nativeError);
      } finally {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [emitScan]);

  const startCamera = useCallback(async () => {
    if (!isActive || isStarting) return;

    setIsStarting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;

      const [videoTrack] = stream.getVideoTracks();
      const capabilities = videoTrack?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
      setTorchAvailable(Boolean(capabilities?.torch));

      const video = videoRef.current;
      if (!video) throw new Error("Vue caméra indisponible.");
      video.srcObject = stream;
      await video.play();

      if (window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"],
        });
        setEngine("native");
        startNativeDetection(detector);
      } else {
        const zxing = await loadZxingFallback();
        const reader = new zxing.BrowserMultiFormatReader();
        zxingReaderRef.current = reader;
        setEngine("zxing");
        reader.decodeFromVideoElementContinuously(video, (result) => {
          if (result) emitScan(result.getText());
        });
      }
    } catch (cameraError) {
      stopCamera();
      setIsOpen(false);
      if (cameraError instanceof DOMException && cameraError.name === "NotAllowedError") {
        setError("Autorisez l’accès caméra pour scanner avec le smartphone.");
      } else {
        setError(cameraError instanceof Error ? cameraError.message : "Impossible de démarrer la caméra.");
      }
    } finally {
      setIsStarting(false);
    }
  }, [emitScan, isActive, isStarting, startNativeDetection, stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchAvailable) return;

    const nextTorchState = !torchEnabled;
    await track.applyConstraints({ advanced: [{ torch: nextTorchState } as MediaTrackConstraintSet] });
    setTorchEnabled(nextTorchState);
  };

  useEffect(() => {
    if (isOpen) void startCamera();
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  useEffect(() => {
    if (!isActive && isOpen) setIsOpen(false);
  }, [isActive, isOpen]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={!isActive || !navigator.mediaDevices?.getUserMedia}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
      >
        {isOpen ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
        {isOpen ? "Fermer la caméra" : "Scanner avec la caméra du smartphone"}
      </button>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600">
          {error}
        </p>
      )}

      {isOpen && (
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-stone-950 shadow-inner">
          <div className="relative aspect-[4/3] w-full">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />

            <div className="pointer-events-none absolute inset-0 grid place-items-center p-8">
              <div className="relative h-40 w-full max-w-xs rounded-3xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]">
                <span className="absolute left-4 right-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                <span className="absolute -top-1 left-8 right-8 flex items-center justify-center gap-2 rounded-full bg-stone-950/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  <ScanLine className="h-3 w-3 text-emerald-300" />
                  Alignez le code-barres
                </span>
              </div>
            </div>

            {isStarting && (
              <div className="absolute inset-0 grid place-items-center bg-stone-950/70 text-white">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Demande d’autorisation caméra...
                </div>
              </div>
            )}

            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
              <span className="rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">
                {engine === "native" ? "BarcodeDetector API" : engine === "zxing" ? "Fallback ZXing" : "Caméra"}
              </span>
              <div className="flex gap-2">
                {torchAvailable && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`grid h-10 w-10 place-items-center rounded-full backdrop-blur transition ${
                      torchEnabled ? "bg-amber-400 text-stone-950" : "bg-black/60 text-white"
                    }`}
                    aria-label={torchEnabled ? "Éteindre la torche" : "Activer la torche"}
                  >
                    {torchEnabled ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
                  aria-label="Fermer le scan caméra"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <p className="bg-white px-4 py-3 text-[11px] font-medium leading-relaxed text-stone-500">
            La caméra utilise BarcodeDetector quand le navigateur le permet, puis bascule sur la librairie ZXing si nécessaire. Un scan identique est ignoré quelques instants pour éviter les doublons.
          </p>
        </div>
      )}
    </div>
  );
}
