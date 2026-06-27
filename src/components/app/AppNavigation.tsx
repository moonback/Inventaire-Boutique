import type React from "react";
import { Package, Scan, Tags, Zap } from "lucide-react";

export type AppTab = "scan" | "autoScan" | "stock" | "categories";

type NavItem = {
  tab: AppTab;
  label: string;
  activeClass: string;
  activeBgClass: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { tab: "scan", label: "Scanner", activeClass: "text-indigo-600", activeBgClass: "bg-indigo-50", icon: Scan },
  { tab: "autoScan", label: "Auto", activeClass: "text-amber-600", activeBgClass: "bg-amber-50", icon: Zap },
  { tab: "stock", label: "Stock", activeClass: "text-emerald-600", activeBgClass: "bg-emerald-50", icon: Package },
  { tab: "categories", label: "Catég.", activeClass: "text-indigo-600", activeBgClass: "bg-indigo-50", icon: Tags },
];

type AppNavigationProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
};

export function AppNavigation({ activeTab, onTabChange }: AppNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-safe">
      <div className="glass-panel mx-auto flex max-w-md justify-around rounded-[1.75rem] border px-2 py-2 shadow-2xl shadow-stone-900/10">
        {navItems.map(({ tab, label, activeClass, activeBgClass, icon: Icon }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition select-none tap-active ${
                isActive ? activeClass : "text-stone-400 hover:text-stone-700"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition ${isActive ? activeBgClass : ""}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
