import { useState, useRef, useEffect } from 'react';
import { Sparkles, Check, X, Minus, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface ManualProductModalProps {
  barcode: string;
  onSave: (product: { name: string; brand?: string; category?: string }, quantity: number) => void;
  onCancel: () => void;
}

export function ManualProductModal({ barcode, onSave, onCancel }: ManualProductModalProps) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSave = () => {
    const num = parseInt(qty, 10);
    if (name.trim() && !isNaN(num) && num >= 0) {
      onSave({
        name: name.trim(),
        brand: brand.trim() || undefined,
        category: category.trim() || undefined,
      }, num);
    }
  };

  const adjustQty = (delta: number) => {
    const current = parseInt(qty, 10) || 0;
    const nextVal = Math.max(0, current + delta);
    setQty(String(nextVal));
  };

  return (
    <div className="fixed inset-0 bg-[#070b13]/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full sm:max-w-md bg-[#111827] border-t sm:border border-slate-800 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden pb-safe"
      >
        {/* Header Drag Indicator for mobile */}
        <div className="flex justify-center py-3 sm:hidden">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        <div className="p-6">
          <div className="absolute top-4 right-4 hidden sm:block">
            <button 
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Nouveau produit</h3>
              <p className="text-xs text-slate-400 font-medium font-mono mt-0.5">Code: {barcode}</p>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 leading-relaxed mb-5">
            Ce produit n'a pas été trouvé automatiquement. Veuillez renseigner ses informations pour l'ajouter à l'inventaire.
          </p>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nom du produit *</label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && document.getElementById('brand-input')?.focus()}
                className="w-full h-11 px-4 bg-slate-900 border border-slate-800 rounded-xl focus:border-indigo-500 text-sm font-semibold text-white outline-none transition"
                placeholder="Ex: Coca-Cola 33cl"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Marque</label>
                <input
                  id="brand-input"
                  type="text"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('category-input')?.focus()}
                  className="w-full h-11 px-4 bg-slate-900 border border-slate-800 rounded-xl focus:border-indigo-500 text-sm font-semibold text-white outline-none transition"
                  placeholder="Ex: Coca-Cola"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Catégorie</label>
                <input
                  id="category-input"
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-900 border border-slate-800 rounded-xl focus:border-indigo-500 text-sm font-semibold text-white outline-none transition"
                  placeholder="Ex: Boissons"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Quantité initiale en stock</label>
              <div className="relative flex items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
                <button
                  type="button"
                  onClick={() => adjustQty(-1)}
                  className="w-10 h-10 flex items-center justify-center text-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-lg transition"
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
                    className="w-full bg-transparent text-white text-2xl font-bold font-mono text-center outline-none border-none focus:ring-0 p-0"
                    placeholder="1"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => adjustQty(1)}
                  className="w-10 h-10 flex items-center justify-center text-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-lg transition"
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
              className="flex-1 py-4 text-sm font-semibold text-slate-400 bg-transparent border border-slate-800 hover:bg-slate-900 hover:text-slate-200 active:scale-95 rounded-2xl transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || qty.trim() === '' || isNaN(parseInt(qty, 10)) || parseInt(qty, 10) < 0}
              className="flex-1 py-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
            >
              <Check className="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
