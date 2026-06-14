import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Sparkles, Check, X, Minus, Plus, Edit2, Camera, Trash2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { uploadProductImage } from '../lib/supabaseInventory';
import { CategoryItem } from '../types';
import { suggestCategory } from '../lib/autoCategorization';

interface ManualProductModalProps {
  barcode: string;
  categories: CategoryItem[];
  initialValues?: {
    name: string;
    brand?: string;
    category?: string;
    quantity: number;
    imageUrl?: string;
    purchasePrice?: number;
    salesPrice?: number;
  };
  onSave: (
    product: {
      name: string;
      brand?: string;
      category?: string;
      imageUrl?: string;
      purchasePrice?: number;
      salesPrice?: number;
    },
    quantity: number
  ) => void;
  onCancel: () => void;
}

export function ManualProductModal({ barcode, categories, initialValues, onSave, onCancel }: ManualProductModalProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [qty, setQty] = useState(String(initialValues?.quantity ?? '1'));
  const [brand, setBrand] = useState(initialValues?.brand ?? '');
  const [category, setCategory] = useState(initialValues?.category ?? '');
  const [imageUrl, setImageUrl] = useState(initialValues?.imageUrl ?? '');
  const [purchasePrice, setPurchasePrice] = useState(initialValues?.purchasePrice !== undefined ? String(initialValues.purchasePrice) : '');
  const [salesPrice, setSalesPrice] = useState(initialValues?.salesPrice !== undefined ? String(initialValues.salesPrice) : '');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!initialValues;

  // Auto-suggest category on name change
  useEffect(() => {
    if (name.trim()) {
      const suggestion = suggestCategory(name, undefined, categories);
      if (suggestion) {
        setCategory(suggestion);
      }
    }
  }, [name, categories]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const publicUrl = await uploadProductImage(barcode, file);
      setImageUrl(publicUrl);
    } catch (err) {
      console.error("Erreur de téléchargement d'image:", err);
      setUploadError(
        err instanceof Error
          ? err.message
          : "Impossible d'uploader la photo."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    const num = parseInt(qty, 10);
    if (name.trim() && !isNaN(num) && num >= 0) {
      const pPrice = purchasePrice.trim() !== '' ? parseFloat(purchasePrice) : undefined;
      const sPrice = salesPrice.trim() !== '' ? parseFloat(salesPrice) : undefined;
      onSave({
        name: name.trim(),
        brand: brand.trim() || undefined,
        category: category.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        purchasePrice: pPrice !== undefined && !isNaN(pPrice) ? pPrice : undefined,
        salesPrice: sPrice !== undefined && !isNaN(sPrice) ? sPrice : undefined,
      }, num);
    }
  };

  const adjustQty = (delta: number) => {
    const current = parseInt(qty, 10) || 0;
    const nextVal = Math.max(0, current + delta);
    setQty(String(nextVal));
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full sm:max-w-md bg-white border-t sm:border border-stone-200 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl shadow-stone-900/25 overflow-hidden pb-safe max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        {/* Header Drag Indicator for mobile */}
        <div className="flex justify-center py-3 sm:hidden sticky top-0 bg-white z-10">
          <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
        </div>

        <div className="p-6">
          <div className="absolute top-4 right-4 hidden sm:block">
            <button
              onClick={onCancel}
              className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
              {isEditing ? <Edit2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                {isEditing ? "Modifier le produit" : "Nouveau produit"}
              </h3>
              <p className="text-xs text-stone-500 font-medium font-mono tabular mt-0.5">Code: {barcode}</p>
            </div>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed mb-5">
            {isEditing
              ? "Modifiez les informations du produit ci-dessous. Les changements seront synchronisés."
              : "Ce produit n'a pas été trouvé automatiquement. Veuillez renseigner ses informations."}
          </p>

          <div className="space-y-4 mb-6">
            {/* Photo Upload / Capture Section */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Photo du produit</label>

              <div className="relative group">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  id="product-photo-upload"
                />

                {imageUrl ? (
                  <div className="relative h-28 w-full rounded-2xl border border-stone-200 overflow-hidden bg-stone-50 flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt="Aperçu du produit"
                      className="h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white/95 rounded-xl border border-stone-200 text-stone-700 hover:text-stone-900 transition active:scale-95 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Changer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="p-2 bg-white/95 rounded-xl border border-rose-200 text-rose-600 hover:text-rose-700 transition active:scale-95 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full h-28 rounded-2xl border border-dashed border-stone-300 hover:border-indigo-400 bg-stone-50 hover:bg-indigo-50/50 transition flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-stone-600 disabled:opacity-50 cursor-pointer"
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {isUploading ? "Téléchargement..." : "Prendre / Choisir une photo"}
                    </span>
                  </button>
                )}
              </div>

              {uploadError && (
                <p className="text-[10px] font-semibold text-rose-600">{uploadError}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Nom du produit *</label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && document.getElementById('brand-input')?.focus()}
                className="w-full h-11 px-4 glass-input rounded-xl text-sm font-semibold text-stone-900 outline-none transition"
                placeholder="Ex: Coca-Cola 33cl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Marque</label>
                <input
                  id="brand-input"
                  type="text"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('category-input')?.focus()}
                  className="w-full h-11 px-4 glass-input rounded-xl text-sm font-semibold text-stone-900 outline-none transition"
                  placeholder="Ex: Coca-Cola"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Catégorie</label>
                <select
                  id="category-input"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full h-11 px-4 glass-input rounded-xl text-sm font-semibold text-stone-900 outline-none transition cursor-pointer"
                >
                  <option value="">Non classé</option>
                  {categories.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">URL de l'image (Optionnel)</label>
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full h-11 px-4 glass-input rounded-xl text-sm font-semibold font-mono text-stone-900 outline-none transition"
                placeholder="Ex: https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Prix d'achat (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                  className="w-full h-11 px-4 glass-input rounded-xl text-sm font-semibold font-mono tabular text-stone-900 outline-none transition"
                  placeholder="Ex: 10.50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Prix de vente (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={salesPrice}
                  onChange={e => setSalesPrice(e.target.value)}
                  className="w-full h-11 px-4 glass-input rounded-xl text-sm font-semibold font-mono tabular text-stone-900 outline-none transition"
                  placeholder="Ex: 15.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Stock en rayon</label>
              <div className="relative flex items-center justify-between gap-4 bg-stone-50 border border-stone-200 rounded-2xl p-3">
                <button
                  type="button"
                  onClick={() => adjustQty(-1)}
                  className="w-10 h-10 flex items-center justify-center text-stone-700 bg-white hover:bg-stone-100 active:scale-95 border border-stone-200 shadow-sm rounded-lg transition"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="flex-1 text-center">
                  <input
                    id="qty-input"
                    type="number"
                    min="0"
                    max="99999"
                    value={qty}
                    onChange={e => {
                      if (e.target.value.length > 5) return;
                      setQty(e.target.value);
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    className="w-full bg-transparent text-stone-900 text-2xl font-bold font-mono tabular text-center outline-none border-none focus:ring-0 p-0"
                    placeholder="1"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => adjustQty(1)}
                  className="w-10 h-10 flex items-center justify-center text-stone-700 bg-white hover:bg-stone-100 active:scale-95 border border-stone-200 shadow-sm rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-4 text-sm font-semibold text-stone-500 bg-transparent border border-stone-200 hover:bg-stone-50 hover:text-stone-800 active:scale-95 rounded-2xl transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || qty.trim() === '' || isNaN(parseInt(qty, 10)) || parseInt(qty, 10) < 0 || isUploading}
              className="flex-1 py-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none rounded-2xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition"
            >
              <Check className="w-4 h-4" />
              Sauvegarder
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
