import { useState, FormEvent } from 'react';
import { Plus, Edit2, Trash2, HelpCircle, RefreshCw, X, Check, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CategoryItem, InventoryItem } from '../types';
import { upsertCategory, deleteCategory } from '../lib/supabaseCategories';
import { suggestCategory } from '../lib/autoCategorization';
import { syncInventoryItem } from '../lib/inventorySync';
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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);

  const closeCategoryModal = (force = false) => {
    if (isLoading && !force) return;
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setName('');
    setIcon('📦');
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setIcon('📦');
    setIsCategoryModalOpen(true);
  };

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

      const previousCategoryName = editingCategory?.name;

      await upsertCategory(categoryToSave);

      let renamedProductsCount = 0;
      if (previousCategoryName && previousCategoryName !== categoryToSave.name) {
        const previousNameLower = previousCategoryName.trim().toLowerCase();
        const productsToRename = inventory.filter(
          (item) => item.category?.trim().toLowerCase() === previousNameLower
        );

        for (const item of productsToRename) {
          await syncInventoryItem({
            ...item,
            category: categoryToSave.name,
            lastUpdated: Date.now(),
          });
          renamedProductsCount++;
        }
      }

      showToast(
        editingCategory
          ? renamedProductsCount > 0
            ? `Catégorie modifiée et ${renamedProductsCount} produit(s) déplacé(s) !`
            : 'Catégorie modifiée !'
          : 'Catégorie créée !'
      );
      if (previousCategoryName && selectedCategoryName === previousCategoryName) {
        setSelectedCategoryName(categoryToSave.name);
      }

      closeCategoryModal(true);
      await onRefreshCategories();
      if (renamedProductsCount > 0) {
        await onRefreshInventory();
      }
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
    setIsCategoryModalOpen(true);
  };

  const handleDelete = (category: CategoryItem) => {
    if (!category.id) return;
    setCategoryToDelete(category);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete?.id) return;

    setIsDeleting(true);
    triggerHaptic('warning');
    try {
      await deleteCategory(categoryToDelete.id);
      showToast('Catégorie supprimée.');
      if (selectedCategoryName === categoryToDelete.name) {
        setSelectedCategoryName(null);
      }
      setCategoryToDelete(null);
      await onRefreshCategories();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la suppression.');
    } finally {
      setIsDeleting(false);
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
            await syncInventoryItem(updatedItem);
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
    <section className="glass-card mobile-card space-y-4 sm:space-y-5">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
          Organisation
        </span>
        <h2 className="mt-2 text-base font-bold tracking-tight text-stone-900">
          Catégories
        </h2>
      </div>

      {/* Action Header Card */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 sm:flex-row sm:items-center sm:p-4">
        <div>
          <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
            Administration des Catégories
          </h3>
          <p className="text-[10px] text-stone-500 mt-0.5">
            Ajoutez, modifiez ou organisez les catégories de produits en base de données.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            onClick={handleAutoCategorize}
            disabled={isAutoCategorizing || categories.length === 0}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-[10px] font-bold text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-40 sm:flex-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAutoCategorizing ? 'animate-spin' : ''}`} />
            Classer automatiquement
          </button>

          <button
            onClick={openCreateModal}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 sm:flex-none"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle
          </button>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-stretch justify-center bg-stone-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={closeCategoryModal}
          >
            <motion.form
              onSubmit={handleSave}
              onMouseDown={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="flex h-full w-full max-w-lg flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl shadow-stone-950/20 sm:h-auto sm:max-h-[92vh] sm:rounded-3xl sm:border sm:border-white/70"
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 px-5 py-5 text-white">
                <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15" />
                <div className="absolute -bottom-14 left-8 h-28 w-28 rounded-full bg-white/10" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-100">
                      {editingCategory ? 'Édition' : 'Création'}
                    </span>
                    <h3 className="mt-1 text-lg font-black tracking-tight">
                      {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                    </h3>
                    <p className="mt-1 max-w-sm text-xs font-medium text-indigo-50/90">
                      Choisissez un nom clair et une icône pour retrouver vos produits plus rapidement.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCategoryModal}
                    disabled={isLoading}
                    className="rounded-2xl bg-white/15 p-2 text-white transition hover:bg-white/25 disabled:opacity-50"
                    aria-label="Fermer la fenêtre"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <div className="grid grid-cols-[5.5rem_1fr] gap-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">Icône</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 text-center text-2xl outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                      placeholder="📦"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">Nom de la catégorie *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm font-bold text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                      placeholder="Ex: Épicerie, Boissons..."
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-stone-500">Suggestions d'icônes</label>
                  <div className="grid max-h-36 grid-cols-8 gap-1.5 overflow-y-auto rounded-2xl border border-stone-200 bg-stone-50 p-2 sm:grid-cols-10">
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`grid h-9 w-full place-items-center rounded-xl text-base transition hover:bg-white hover:shadow-sm ${
                          icon === emoji ? 'bg-indigo-100 ring-2 ring-indigo-300' : 'bg-transparent'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-[11px] font-semibold leading-relaxed text-indigo-700">
                  {editingCategory
                    ? 'Si vous changez le nom, les produits associés seront automatiquement déplacés vers cette nouvelle catégorie.'
                    : 'La catégorie sera disponible immédiatement dans les fiches produit et le classement automatique.'}
                </div>
              </div>

              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-stone-100 bg-stone-50 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCategoryModal}
                  disabled={isLoading}
                  className="min-h-11 rounded-2xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-600 transition hover:bg-stone-100 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                  {isLoading ? 'Sauvegarde...' : editingCategory ? 'Enregistrer' : 'Créer la catégorie'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Category Modal */}
      <AnimatePresence>
        {categoryToDelete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-stretch justify-center bg-stone-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => !isDeleting && setCategoryToDelete(null)}
          >
            <motion.div
              onMouseDown={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="flex h-full w-full max-w-md flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl shadow-stone-950/20 sm:h-auto sm:max-h-[92vh] sm:rounded-3xl sm:border sm:border-white/70"
            >
              <div className="flex-1 overflow-y-auto p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-xl ring-1 ring-rose-100">
                      {categoryToDelete.icon || '📦'}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500">Suppression</span>
                      <h3 className="mt-0.5 text-base font-black text-stone-900">Supprimer la catégorie ?</h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(null)}
                    disabled={isDeleting}
                    className="rounded-2xl p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
                    aria-label="Fermer la fenêtre"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-sm font-semibold text-stone-700">
                  Vous êtes sur le point de supprimer <span className="font-black">{categoryToDelete.name}</span>.
                </p>
                <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[11px] font-semibold leading-relaxed text-rose-700">
                  {inventory.filter((item) => item.category?.trim().toLowerCase() === categoryToDelete.name.trim().toLowerCase()).length > 0
                    ? `${inventory.filter((item) => item.category?.trim().toLowerCase() === categoryToDelete.name.trim().toLowerCase()).length} produit(s) utilisent cette catégorie. Ils resteront dans l'inventaire, mais leur ancien nom de catégorie ne sera plus géré.`
                    : 'Aucun produit ne semble utiliser cette catégorie actuellement.'}
                </div>
              </div>

              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-stone-100 bg-stone-50 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(null)}
                  disabled={isDeleting}
                  className="min-h-11 rounded-2xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-600 transition hover:bg-stone-100 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-xs font-bold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories Grid List */}
      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-stone-400 border border-dashed border-stone-300 rounded-2xl bg-stone-50/50">
          <HelpCircle className="h-7 w-7 text-stone-300" />
          <span className="text-xs font-semibold">Aucune catégorie configurée</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {categories.map((category) => {
            const associatedProducts = inventory.filter(
              (item) => item.category?.trim().toLowerCase() === category.name.trim().toLowerCase()
            );
            const count = associatedProducts.length;
            const isSelected = selectedCategoryName === category.name;

            return (
              <div
                key={category.id || category.name}
                className={`relative rounded-xl border bg-white transition group ${
                  isSelected
                    ? 'border-indigo-300 shadow-sm ring-2 ring-indigo-100'
                    : 'border-stone-200 hover:border-stone-300 hover:shadow-sm'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategoryName(isSelected ? null : category.name)}
                  className="flex min-h-[4.25rem] w-full items-center justify-between p-3 pr-20 text-left"
                  aria-expanded={isSelected}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-stone-50 flex items-center justify-center text-lg border border-stone-200">
                      {category.icon || '📦'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-800">{category.name}</h4>
                      <span className="text-[9px] font-bold text-stone-400 font-mono tabular">
                        {count} {count > 1 ? 'articles' : 'article'}
                      </span>
                    </div>
                  </div>
                </button>

                <div className="absolute right-3 top-3 flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleEdit(category);
                    }}
                    className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition"
                    title="Modifier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(category);
                    }}
                    className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-stone-100 px-3 pb-3 pt-2">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                            Produits associés
                          </span>
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">
                            {associatedProducts.length}
                          </span>
                        </div>

                        {associatedProducts.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 px-3 py-4 text-center text-[10px] font-semibold text-stone-400">
                            Aucun produit dans cette catégorie.
                          </div>
                        ) : (
                          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                            {associatedProducts.map((item) => (
                              <div
                                key={item.barcode}
                                className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/70 p-2"
                              >
                                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-stone-200 bg-white p-1">
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className="h-full w-full rounded object-contain"
                                    />
                                  ) : (
                                    <Package className="h-4 w-4 text-stone-300" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h5 className="line-clamp-1 text-[11px] font-bold text-stone-800">
                                    {item.name}
                                  </h5>
                                  <p className="mt-0.5 truncate font-mono text-[9px] text-stone-400">
                                    {item.barcode}{item.brand ? ` • ${item.brand}` : ''}
                                  </p>
                                </div>
                                <span className="rounded-lg border border-stone-200 bg-white px-2 py-1 font-mono text-[10px] font-bold tabular text-indigo-600">
                                  x{item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
