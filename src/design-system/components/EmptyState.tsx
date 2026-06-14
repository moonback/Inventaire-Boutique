import React from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
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
    <div className="rounded-3xl border border-dashed border-[rgba(148,163,184,0.35)] bg-[rgba(255,255,255,0.35)] px-4 py-14 text-center">
      {Icon ? (
        <Icon className="mx-auto mb-3 h-8 w-8 text-stone-300" />
      ) : (
        <div className="mx-auto mb-3 h-8 w-8 rounded-xl bg-stone-100" />
      )}
      <h3 className="font-bold text-stone-900 text-sm">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-stone-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
