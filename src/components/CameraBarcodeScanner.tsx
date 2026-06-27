import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, Flashlight, FlashlightOff, Loader2, ScanLine, ShieldAlert, X } from "lucide-react";

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
  const startLockRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<ScannerEngine>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isCameraPickerOpen, setIsCameraPickerOpen] = useState(false);

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
    startLockRef.current = false;
    setIsOpen(false);
    setIsStarting(false);
    setTorchSupported(false);
    setTorchEnabled(false);
    setEngine(null);
    setIsCameraPickerOpen(false);
  }, []);


  const refreshVideoInputs = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    setVideoInputs(cameras);
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

  const startCamera = useCallback(async (cameraId = selectedCameraId, forceRestart = false) => {
    if (!canScan || startLockRef.current || (streamRef.current && !forceRestart)) return;

    if (forceRestart && streamRef.current) {
      stopCamera();
    }

    startLockRef.current = true;
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
        ...(cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: { ideal: "environment" } }),
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error("Élément vidéo indisponible pour démarrer le scan caméra.");
      }
      video.srcObject = stream;

      const [track] = stream.getVideoTracks();
      const activeCameraId = track?.getSettings().deviceId ?? cameraId ?? null;
      if (activeCameraId) setSelectedCameraId(activeCameraId);
      await refreshVideoInputs();

      const capabilities = track?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      setTorchSupported(Boolean(capabilities?.torch));
      setIsOpen(true);

      const BarcodeDetector = getNativeBarcodeDetector();
      if (BarcodeDetector) {
        await video.play();
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
      startLockRef.current = false;
      setIsStarting(false);
    }
  }, [canScan, detectWithNativeApi, emitScan, refreshVideoInputs, selectedCameraId, stopCamera]);


  const handleCameraSelection = useCallback(
    (cameraId: string) => {
      if (cameraId === selectedCameraId && isOpen) {
        setIsCameraPickerOpen(false);
        return;
      }

      setSelectedCameraId(cameraId);
      setIsCameraPickerOpen(false);
      if (isOpen) {
        stopCamera();
        void startCamera(cameraId, true);
      }
    },
    [isOpen, selectedCameraId, startCamera, stopCamera],
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

  const selectedCamera = useMemo(
    () => videoInputs.find((device) => device.deviceId === selectedCameraId),
    [selectedCameraId, videoInputs],
  );

  const selectedCameraLabel = selectedCamera?.label || "Caméra active";

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
          onClick={() => {
            if (isOpen) {
              stopCamera();
            } else {
              void startCamera();
            }
          }}
          disabled={!canScan || isStarting}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 text-xs font-bold text-white shadow-md shadow-sky-600/20 transition hover:bg-sky-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        >
          {isOpen ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {isOpen ? "Arrêter" : "Scanner avec la caméra"}
        </button>
        {videoInputs.length > 1 && (
          <button
            type="button"
            onClick={() => setIsCameraPickerOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-600 transition hover:text-sky-700"
            aria-label={`Choisir la caméra. Caméra actuelle : ${selectedCameraLabel}`}
            title={`Choisir caméra · ${selectedCameraLabel}`}
          >
            <Camera className="h-4 w-4" />
          </button>
        )}
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

      {(status || error) && (
        <div className={`mt-3 flex gap-2 rounded-2xl border px-3 py-2 text-[11px] font-semibold ${error ? "border-rose-200 bg-rose-50 text-rose-600" : "border-sky-200 bg-sky-50 text-sky-700"}`}>
          {error && <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>{error || status}</span>
        </div>
      )}

      {isCameraPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl border border-stone-200 bg-white p-4 shadow-2xl sm:rounded-3xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-stone-900">Choisir une caméra</p>
                <p className="mt-1 text-[11px] font-medium text-stone-500">Caméra actuelle : {selectedCameraLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCameraPickerOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
                aria-label="Fermer le choix de caméra"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {videoInputs.map((device, index) => (
                <button
                  key={device.deviceId || `camera-${index}`}
                  type="button"
                  onClick={() => handleCameraSelection(device.deviceId)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left text-xs font-bold transition ${
                    device.deviceId === selectedCameraId
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-stone-200 bg-white text-stone-700 hover:border-sky-200 hover:bg-sky-50/60 hover:text-sky-700"
                  }`}
                >
                  <span>{device.label || `Caméra ${index + 1}`}</span>
                  {device.deviceId === selectedCameraId && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] uppercase tracking-wide">Active</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
