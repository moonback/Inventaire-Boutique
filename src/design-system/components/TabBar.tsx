import React from "react";
import type { ReactNode } from "react";

export type TabKey = "scan" | "stock" | "categories";

export function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const item = (
    tab: TabKey,
    label: string,
    icon: ReactNode,
  ) => {
    const isActive = active === tab;
    const colorClass =
      tab === "scan"
        ? isActive
          ? "text-indigo-600"
          : "text-stone-400 hover:text-stone-700"
        : tab === "stock"
          ? isActive
            ? "text-emerald-600"
            : "text-stone-400 hover:text-stone-700"
          : isActive
            ? "text-indigo-600"
            : "text-stone-400 hover:text-stone-700";

    const bgClass =
      tab === "scan"
        ? isActive
          ? "bg-indigo-50"
          : ""
        : tab === "stock"
          ? isActive
            ? "bg-emerald-50"
            : ""
          : isActive
            ? "bg-indigo-50"
            : "";

    return (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={`flex flex-col items-center gap-1.5 transition select-none tap-active ${colorClass}`}
        aria-current={isActive ? "page" : undefined}
      >
        <div className={`p-1.5 rounded-xl transition ${bgClass}`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold tracking-wide">{label}</span>
      </button>
    );
  };

  // Icons come from lucide-react in the caller via wrapper components.
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t pb-safe"
      aria-label="Navigation"
    >
      <div className="mx-auto max-w-lg flex justify-around py-3">
        {/* Caller will provide exact icons by composing TabBar; placeholders here */}
        {item("scan", "Scanner", <span className="h-5 w-5" />)}
        {item("stock", "Stock", <span className="h-5 w-5" />)}
        {item("categories", "Catégories", <span className="h-5 w-5" />)}
      </div>
    </nav>
  );
}
