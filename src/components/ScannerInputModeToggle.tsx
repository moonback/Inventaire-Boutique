import { Camera, ScanLine } from "lucide-react";

export type ScannerInputMode = "hardware" | "camera";

interface ScannerInputModeToggleProps {
  mode: ScannerInputMode;
  onModeChange: (mode: ScannerInputMode) => void;
  disabled?: boolean;
}

export function ScannerInputModeToggle({
  mode,
  onModeChange,
  disabled = false,
}: ScannerInputModeToggleProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-1">
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => onModeChange("hardware")}
          disabled={disabled}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${
            mode === "hardware"
              ? "bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100"
              : "text-stone-500 hover:bg-white/70 hover:text-stone-800"
          }`}
          aria-pressed={mode === "hardware"}
        >
          <ScanLine className="h-4 w-4" />
          Scanner physique
        </button>
        <button
          type="button"
          onClick={() => onModeChange("camera")}
          disabled={disabled}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${
            mode === "camera"
              ? "bg-white text-sky-600 shadow-sm ring-1 ring-sky-100"
              : "text-stone-500 hover:bg-white/70 hover:text-stone-800"
          }`}
          aria-pressed={mode === "camera"}
        >
          <Camera className="h-4 w-4" />
          Caméra
        </button>
      </div>
    </div>
  );
}
