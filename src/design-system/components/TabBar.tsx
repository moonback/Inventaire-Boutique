import React from "react";
import type { ReactNode } from "react";
import {
  Barcode,
  Package,
  Tag,
} from "lucide-react";

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
          ? "bg-indigo-50 border border-indigo-100"
          : "border border-transparent"
        : tab === "stock"
          ? isActive
            ? "bg-emerald-50 border border-emerald-100"
            : "border border-transparent"
          : isActive
            ? "bg-indigo-50 border border-indigo-100"
            : "border border-transparent";

    return (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={`flex flex-col items-center gap-1.5 transition select-none tap-active ${colorClass}`}
        aria-current={isActive ? "page" : undefined}
      >
        <div
          className={`p-1.5 rounded-xl transition ${bgClass} shadow-sm ${
            isActive ? "shadow-indigo-600/10" : "shadow-none"
          }`}
        >
          {icon}
        </div>
        <span className="text-[10px] font-bold tracking-wide">{label}</span>
      </button>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t pb-safe"
      aria-label="Navigation"
    >
      <div className="mx-auto max-w-lg flex justify-around py-3">
        {item(
          "scan",
          "Scanner",
          <Barcode className="h-5 w-5" strokeWidth={2.25} />,
        )}
        {item(
          "stock",
          "Stock",
          <Package className="h-5 w-5" strokeWidth={2.25} />,
        )}
        {item(
          "categories",
          "Catégories",
          <Tag className="h-5 w-5" strokeWidth={2.25} />,
        )}
      </div>
    </nav>
  );
}

