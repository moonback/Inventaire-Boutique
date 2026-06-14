import React from "react";
import type { LucideIcon } from "lucide-react";

export function ErrorState({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[rgba(251,113,133,0.45)] bg-[rgba(251,113,133,0.06)] px-4 py-14 text-center">
      {Icon ? (
        <Icon className="mx-auto mb-3 h-8 w-8 text-rose-400" />
      ) : (
        <div className="mx-auto mb-3 h-8 w-8 rounded-xl bg-rose-100" />
      )}

      <h3 className="font-bold text-rose-700 text-sm">{title}</h3>

      {description ? (
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-rose-600/80">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
