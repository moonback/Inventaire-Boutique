import { useState, FormEvent } from 'react';
import { Plus, Edit2, Trash2, FolderPlus, HelpCircle, RefreshCw, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CategoryItem, InventoryItem } from '../types';
import { upsertCategory, deleteCategory } from '../lib/supabaseCategories';
import { suggestCategory } from '../lib/autoCategorization';
import { upsertInventoryItem } from '../lib/supabaseInventory';
import { triggerHaptic } from '../lib/haptics';

interface CategoriesManagerProps {
  categories: CategoryItem[];
  inventory: InventoryItem[];
  onRefreshCategories: () => Promise<void>;
  onRefreshInventory: () => Promise<void>;
  showToast: (text: string) => void;
}

const COMMON_EMOJIS = [
  '🥛', '🍖', '🐟', '🥫', '🍝', '🍚', '🥦', '🍎', '🍪', '🍫', '🥤', '🧂', '🧊', '🧹', '🧻',
  '🍞', '🥐', '🥩', '🧀', '🥚', '🍯', '🍵', '🍷', '🍺', '🧴', '🧼', '💊', '🔋', '📦', '🏷️'
];

export function CategoriesManager({
  categories,
  inventory,
  onRefreshCategories,
  onRefreshInventory,
  showToast
}: CategoriesManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    triggerHaptic('light');

    try {
      const categoryToSave: CategoryItem = {
        name: name.trim(),
        icon: icon.trim() || undefined,
      };

      if (editingCategory) {
        categoryToSave.id = editingCategory.id;
      }

      await upsertCategory(categoryToSave);
      showToast(editingCategory ? 'Catégorie modifiée !' : 'Catégorie créée !');
      
      // Reset form
      setName('');
      setIcon('📦');
      setIsAdding(false);
      setEditingCategory(null);
      await onRefreshCategories();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la sauvegarde de la catégorie.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (category: CategoryItem) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon || '📦');
    setIsAdding(true);
  };

  const handleDelete = async (category: CategoryItem) => {
    if (!category.id) return;

    const itemCount = inventory.filter(
      (item) => item.category?.trim().toLowerCase() === category.name.trim().toLowerCase()
    ).length;

    const msg = itemCount > 0
      ? `Attention : ${itemCount} article(s) appartienne(nt) à cette catégorie. Si vous la supprimez, ils ne seront pas supprimés mais n'auront plus de catégorie. Confirmer la suppression ?`
      : `Voulez-vous vraiment supprimer la catégorie "${category.icon || ''} ${category.name}" ?`;

    if (confirm(msg)) {
      triggerHaptic('warning');
      try {
        await deleteCategory(category.id);
        showToast('Catégorie supprimée.');
        await onRefreshCategories();
      } catch (err) {
        console.error(err);
        showToast('Erreur lors de la suppression.');
      }
    }
  };

  const handleAutoCategorize = async () => {
    setIsAutoCategorizing(true);
    triggerHaptic('success');
    let updatedCount = 0;

    try {
      for (const item of inventory) {
        // If item doesn't have a category, or has an invalid/blank one
        const currentCat = item.category?.trim();
        const hasValidCat = currentCat && categories.some(
          (c) => c.name.toLowerCase() === currentCat.toLowerCase()
        );

        if (!hasValidCat) {
          const suggested = suggestCategory(item.name, item.category, categories);
          if (suggested && suggested !== currentCat) {
            const updatedItem: InventoryItem = {
              ...item,
              category: suggested,
              lastUpdated: Date.now()
            };
            await upsertInventoryItem(updatedItem);
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        showToast(`${updatedCount} produit(s) classé(s) automatiquement !`);
        await onRefreshInventory();
      } else {
        showToast('Aucun produit à classer automatiquement.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur lors du classement automatique.');
    } finally {
      setIsAutoCategorizing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Action Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
        <div>
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            Administration des Catégories
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Ajoutez, modifiez ou organisez les catégories de produits en base de données.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoCategorize}
            disabled={isAutoCategorizing || categories.length === 0}
            className="flex-1 sm:flex-none py-2 px-3 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAutoCategorizing ? 'animate-spin' : ''}`} />
            Classer automatiquement
          </button>
          
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingCategory(null);
              setName('');
              setIcon('📦');
            }}
            className="flex-1 sm:flex-none py-2 px-3 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle
          </button>
        </div>
      </div>

      {/* Add / Edit Category Dialog */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSave} className="p-4 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  {editingCategory ? 'Modifier la catégorie' : 'Créer une catégorie'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Icône</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full h-10 text-center glass-input rounded-xl text-lg outline-none transition"
                    placeholder="📦"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nom de la catégorie *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 glass-input rounded-xl text-xs font-semibold text-white outline-none transition"
                    placeholder="Ex: Épicerie, Boissons..."
                    required
                  />
                </div>
              </div>

              {/* Common Emojis Quick Picker */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Suggestions d'icônes</label>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-slate-950/20 rounded-xl border border-slate-800/40">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition hover:bg-slate-800/50 ${
                        icon === emoji ? 'bg-indigo-500/20 border border-indigo-500/40' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-2 text-[10px] font-bold text-slate-400 bg-transparent border border-slate-800 hover:bg-slate-900 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="px-3 py-2 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition flex items-center gap-1 shadow-md shadow-indigo-600/10 disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5" />
                  Sauvegarder
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories Grid List */}
      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500 border border-dashed border-slate-850 rounded-2xl bg-slate-950/10">
          <HelpCircle className="h-7 w-7 text-slate-600" />
          <span className="text-xs font-semibold">Aucune catégorie configurée</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map((category) => {
            const count = inventory.filter(
              (item) => item.category?.trim().toLowerCase() === category.name.trim().toLowerCase()
            ).length;

            return (
              <div
                key={category.id || category.name}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/10 hover:bg-slate-900/30 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-850 flex items-center justify-center text-lg shadow-sm border border-slate-800">
                    {category.icon || '📦'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{category.name}</h4>
                    <span className="text-[9px] font-bold text-slate-500">
                      {count} {count > 1 ? 'articles' : 'article'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Modifier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
                    className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-950/20 transition"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
