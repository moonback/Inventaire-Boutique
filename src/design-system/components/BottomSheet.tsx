import React, { useEffect } from "react";

export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="presentation"
      />

      <div
        className="absolute left-0 right-0 bottom-0 rounded-t-[24px] glass-panel border-t border-white/10 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={title || "Bottom sheet"}
      >
        <div className="px-4 pt-3 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-stone-200/70 mx-auto mb-2" />
          {title ? (
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-stone-900">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl border border-stone-200/70 bg-white/60"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
          ) : null}
        </div>

        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
