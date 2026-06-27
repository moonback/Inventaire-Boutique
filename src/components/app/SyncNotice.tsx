import { AlertTriangle } from "lucide-react";

type SyncNoticeProps = {
  syncError: string | null;
  inventorySource: "remote" | "cache";
  isOnline: boolean;
  pendingCount: number;
};

export function SyncNotice({ syncError, inventorySource, isOnline, pendingCount }: SyncNoticeProps) {
  if (syncError) {
    const isWarning = !isOnline || pendingCount > 0;
    return (
      <div className={`flex gap-3 rounded-2xl border px-4 py-3 text-xs ${
        isWarning
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-rose-200 bg-rose-50 text-rose-600"
      }`}>
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>{syncError}</span>
      </div>
    );
  }

  if (inventorySource === "cache" && !isOnline) {
    return (
      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>Mode hors-ligne — inventaire chargé depuis le cache local.</span>
      </div>
    );
  }

  return null;
}
