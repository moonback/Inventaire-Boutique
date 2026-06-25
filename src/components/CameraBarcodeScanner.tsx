import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, ChevronDown, Flashlight, FlashlightOff, Loader2, ScanLine, ShieldAlert, Video } from "lucide-react";

const BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "qr_code",
] as const;

const ZXING_CDN_URL = "https://esm.sh/@zxing/browser@0.1.5";

type BarcodeDetectorConstructor = new (options?: { formats?: readonly string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

type BrowserMultiFormatReader = {
  decodeFromVideoElement: (
    videoElement: HTMLVideoElement,
    callback: (result?: { getText: () => string }, error?: unknown) => void,
  ) => Promise<{ stop: () => void }>;
};

type ZxingBrowserModule = {
  BrowserMultiFormatReader: new () => BrowserMultiFormatReader;
};

type ScannerEngine = "native" | "zxing" | null;

interface CameraBarcodeScannerProps {
  enabled: boolean;
  isBusy: boolean;
  onScan: (barcode: string) => void;
}

function getNativeBarcodeDetector(): BarcodeDetectorConstructor | null {
  const detector = (window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  return detector ?? null;
}

async function loadZxingReader() {
  const zxing = (await import(/* @vite-ignore */ ZXING_CDN_URL)) as ZxingBrowserModule;
  return new zxing.BrowserMultiFormatReader();
}

export function CameraBarcodeScanner({ enabled, isBusy, onScan }: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const scanLockRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<ScannerEngine>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [showDevicePicker, setShowDevicePicker] = useState(false);

  const canScan = enabled && !isBusy;

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    scanLockRef.current = false;
    setIsOpen(false);
    setIsStarting(false);
    setTorchSupported(false);
    setTorchEnabled(false);
    setShowDevicePicker(false);
    setEngine(null);
  }, []);


  const refreshVideoDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    setVideoDevices(cameras);
    return cameras;
  }, []);

  const emitScan = useCallback(
    (rawCode?: string) => {
      const code = rawCode?.trim();
      if (!code || scanLockRef.current || isBusy) return;

      scanLockRef.current = true;
      setStatus(`Code détecté : ${code}`);
      onScan(code);
      window.setTimeout(() => {
        scanLockRef.current = false;
      }, 1200);
    },
    [isBusy, onScan],
  );

  const detectWithNativeApi = useCallback(
    (detector: InstanceType<BarcodeDetectorConstructor>) => {
      const tick = async () => {
        const video = videoRef.current;
        if (!video || !streamRef.current) return;

        if (!scanLockRef.current && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          try {
            const codes = await detector.detect(video);
            emitScan(codes[0]?.rawValue);
          } catch (detectError) {
            console.error("Erreur BarcodeDetector:", detectError);
          }
        }
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [emitScan],
  );

  const startCamera = useCallback(async (deviceId = selectedDeviceId, forceRestart = false) => {
    if (!canScan || isStarting || (isOpen && !forceRestart)) return;

    setIsStarting(true);
    setError(null);
    setStatus("Demande d’autorisation caméra...");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("La caméra n’est pas disponible sur ce navigateur.");
      }

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        ...(deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: "environment" } }),
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const cameras = await refreshVideoDevices();
      const [track] = stream.getVideoTracks();
      const activeDeviceId = track?.getSettings().deviceId;
      if (activeDeviceId) setSelectedDeviceId(activeDeviceId);
      if (cameras.length > 1) setStatus("Plusieurs caméras détectées : vous pouvez choisir celle à utiliser.");

      const capabilities = track?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      setTorchSupported(Boolean(capabilities?.torch));
      setIsOpen(true);

      const BarcodeDetector = getNativeBarcodeDetector();
      if (BarcodeDetector) {
        setEngine("native");
        setStatus("Scan caméra actif via BarcodeDetector.");
        detectWithNativeApi(new BarcodeDetector({ formats: BARCODE_FORMATS }));
      } else {
        setEngine("zxing");
        setStatus("BarcodeDetector indisponible : chargement du fallback ZXing...");
        const reader = await loadZxingReader();
        zxingControlsRef.current = await reader.decodeFromVideoElement(video, (result) => {
          emitScan(result?.getText());
        });
        setStatus("Scan caméra actif via fallback ZXing.");
      }
    } catch (startError) {
      console.error("Erreur d’accès caméra:", startError);
      stopCamera();
      setError(
        startError instanceof Error
          ? startError.message
          : "Impossible d’activer la caméra. Vérifiez les permissions du navigateur.",
      );
    } finally {
      setIsStarting(false);
    }
  }, [canScan, detectWithNativeApi, emitScan, isOpen, isStarting, refreshVideoDevices, selectedDeviceId, stopCamera]);


  const handleDeviceSelect = useCallback(
    async (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      setShowDevicePicker(false);

      if (!isOpen || isStarting) return;
      stopCamera();
      window.setTimeout(() => {
        void startCamera(deviceId, true);
      }, 0);
    },
    [isOpen, isStarting, startCamera, stopCamera],
  );

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;

    const nextTorchState = !torchEnabled;
    try {
      await track.applyConstraints({ advanced: [{ torch: nextTorchState } as MediaTrackConstraintSet] });
      setTorchEnabled(nextTorchState);
    } catch (torchError) {
      console.error("Erreur torche:", torchError);
      setError("La torche n’a pas pu être activée sur cet appareil.");
    }
  }, [torchEnabled, torchSupported]);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (!canScan && isOpen) stopCamera();
  }, [canScan, isOpen, stopCamera]);

  const selectedDeviceLabel = useMemo(() => {
    const selectedDevice = videoDevices.find((device) => device.deviceId === selectedDeviceId);
    return selectedDevice?.label || "Caméra automatique";
  }, [selectedDeviceId, videoDevices]);

  const engineLabel = useMemo(() => {
    if (engine === "native") return "BarcodeDetector";
    if (engine === "zxing") return "Fallback ZXing";
    return "Prêt";
  }, [engine]);

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-700">
            <Camera className="h-3 w-3" />
            Caméra mobile
          </span>
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-stone-500">
            Scannez sans douchette : autorisez la caméra, placez le code dans le guide et gardez le téléphone stable.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-stone-200 bg-white px-2 py-1 text-[10px] font-bold text-stone-500">
          {engineLabel}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-stone-900/10 bg-stone-950 aspect-video">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {!isOpen && (
          <div className="absolute inset-0 grid place-items-center bg-stone-900 text-center text-white">
            <div className="px-6">
              <ScanLine className="mx-auto mb-2 h-8 w-8 text-sky-300" />
              <p className="text-sm font-bold">Scan caméra smartphone</p>
              <p className="mt-1 text-[11px] text-stone-300">Aucune douchette physique requise.</p>
            </div>
          </div>
        )}
        {isOpen && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-8">
            <div className="relative h-28 w-full max-w-xs rounded-2xl border-2 border-sky-300/90 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]">
              <span className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-scan-line bg-gradient-to-r from-transparent via-sky-300 to-transparent" />
            </div>
          </div>
        )}
        {isStarting && (
          <div className="absolute inset-0 grid place-items-center bg-stone-950/70 text-white backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => (isOpen ? stopCamera() : void startCamera())}
          disabled={!canScan || isStarting}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 text-xs font-bold text-white shadow-md shadow-sky-600/20 transition hover:bg-sky-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        >
          {isOpen ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {isOpen ? "Arrêter" : "Scanner avec la caméra"}
        </button>
        <button
          type="button"
          onClick={toggleTorch}
          disabled={!isOpen || !torchSupported}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-600 transition hover:text-sky-700 disabled:pointer-events-none disabled:opacity-40"
          aria-label={torchEnabled ? "Désactiver la torche" : "Activer la torche"}
          title={torchSupported ? "Torche" : "Torche non prise en charge"}
        >
          {torchEnabled ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
        </button>
      </div>

      {videoDevices.length > 1 && (
        <div className="relative mt-2">
          <button
            type="button"
            onClick={() => setShowDevicePicker((visible) => !visible)}
            disabled={!canScan || isStarting}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-3 text-left text-xs font-bold text-stone-700 transition hover:border-sky-200 hover:text-sky-700 disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Video className="h-4 w-4 shrink-0 text-sky-600" />
              <span className="min-w-0 truncate">{selectedDeviceLabel}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider text-stone-400">
              Choisir caméra
              <ChevronDown className={`h-3.5 w-3.5 transition ${showDevicePicker ? "rotate-180" : ""}`} />
            </span>
          </button>

          {showDevicePicker && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1 shadow-xl shadow-stone-900/10">
              {videoDevices.map((device, index) => (
                <button
                  key={device.deviceId || index}
                  type="button"
                  onClick={() => void handleDeviceSelect(device.deviceId)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                    selectedDeviceId === device.deviceId
                      ? "bg-sky-50 text-sky-700"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  }`}
                >
                  <Camera className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 truncate">{device.label || `Caméra ${index + 1}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(status || error) && (
        <div className={`mt-3 flex gap-2 rounded-2xl border px-3 py-2 text-[11px] font-semibold ${error ? "border-rose-200 bg-rose-50 text-rose-600" : "border-sky-200 bg-sky-50 text-sky-700"}`}>
          {error && <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>{error || status}</span>
        </div>
      )}
    </div>
  );
}
