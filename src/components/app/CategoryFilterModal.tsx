import type React from "react";
import { motion } from "motion/react";
import { Check, Package, Tags, X } from "lucide-react";

type CategoryOption = {
  name: string;
  count: number;
  label: string;
  icon?: string;
};

type CategoryFilterModalProps = {
  inventoryLength: number;
  selectedCategory: string | null;
  categoryOptions: CategoryOption[];
  onSelectCategory: (category: string | null) => void;
  onClose: () => void;
};

export function CategoryFilterModal({
  inventoryLength,
  selectedCategory,
  categoryOptions,
  onSelectCategory,
  onClose,
}: CategoryFilterModalProps) {
  const selectAndClose = (category: string | null) => {
    onSelectCategory(category);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="w-full sm:max-w-md bg-white border-t sm:border border-stone-200 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl shadow-stone-900/25 overflow-hidden pb-safe max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex justify-center py-3 sm:hidden sticky top-0 bg-white z-10">
          <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
        </div>

        <div className="p-6">
          <div className="absolute top-4 right-4 hidden sm:block">
            <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Filtrer par catégorie</h3>
              <p className="text-xs text-stone-500 font-medium mt-0.5">Sélectionnez une catégorie pour affiner votre inventaire</p>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <CategoryButton
              active={selectedCategory === null}
              title="Toutes les catégories"
              subtitle={`${inventoryLength} articles`}
              icon={<Package className={`w-4 h-4 ${selectedCategory === null ? "text-white" : "text-stone-400"}`} />}
              onClick={() => selectAndClose(null)}
            />

            {categoryOptions.map((category) => {
              const isActive = selectedCategory === category.name;
              return (
                <div key={category.name}>
                  <CategoryButton
                    active={isActive}
                    title={category.name}
                    subtitle={`${category.count} article${category.count > 1 ? "s" : ""}`}
                    icon={
                      category.icon ? (
                        <span className="text-base leading-none">{category.icon}</span>
                      ) : (
                        <Package className={`h-4 w-4 ${isActive ? "text-white" : "text-stone-400"}`} />
                      )
                    }
                    onClick={() => selectAndClose(isActive ? null : category.name)}
                  />
                </div>
              );
            })}
          </div>

          <button onClick={onClose} className="w-full py-4 text-sm font-semibold text-stone-500 bg-transparent border border-stone-200 hover:bg-stone-50 hover:text-stone-800 active:scale-95 rounded-2xl transition">
            Annuler
          </button>
        </div>
      </motion.div>
    </div>
  );
}

type CategoryButtonProps = {
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
};

function CategoryButton({ active, title, subtitle, icon, onClick }: CategoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
        active
          ? "bg-indigo-600 border-indigo-600 text-white"
          : "bg-white border-stone-200 text-stone-900 hover:border-indigo-300 hover:bg-indigo-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
          active ? "bg-white/20" : "bg-stone-50 border border-stone-200"
        }`}>
          {icon}
        </div>
        <div className="text-left">
          <p className="text-sm font-bold">{title}</p>
          <p className="text-[10px] font-mono tabular opacity-80">{subtitle}</p>
        </div>
      </div>
      {active && <Check className="w-5 h-5" />}
    </button>
  );
}
