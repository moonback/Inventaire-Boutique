import { useState, useEffect, useRef } from 'react';
import { Package, Plus, Minus, Check, X } from 'lucide-react';
import { motion } from 'motion/react';

interface QuantityModalProps {
  product: {
    barcode: string;
    name: string;
    imageUrl?: string;
    brand?: string;
    category?: string;
    format?: string;
    nutriScore?: string;
  };
  existingQty: number;
  isNew: boolean;
  onSave: (quantity: number, mode: 'add' | 'set') => void;
  onCancel: () => void;
}

export function QuantityModal({ product, existingQty, isNew, onSave, onCancel }: QuantityModalProps) {
  // Mode can be 'set' (define total stock) or 'add' (add quantity)
  const [mode, setMode] = useState<'set' | 'add'>('set');
  const [qty, setQty] = useState(isNew ? '1' : String(existingQty));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [mode]);

  const handleSave = () => {
    const num = parseInt(qty, 10);
    if (!isNaN(num) && num >= 0) {
      onSave(num, mode);
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
        className="w-full sm:max-w-md bg-white border-t sm:border border-stone-200 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl shadow-stone-900/25 overflow-hidden pb-safe"
      >
        {/* Header Drag Indicator for mobile feel */}
        <div className="flex justify-center py-3 sm:hidden">
          <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
        </div>

        <div className="p-6">
          {/* Close button */}
          <div className="absolute top-4 right-4 hidden sm:block">
            <button
              onClick={onCancel}
              className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Product Details Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-center p-2 flex-shrink-0">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain rounded-lg" />
              ) : (
                <Package className="w-8 h-8 text-stone-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-1">
                {product.category || 'Général'}
              </span>
              <h3 className="font-bold text-stone-900 leading-snug truncate text-base">{product.name}</h3>
              <p className="text-xs font-mono tabular text-stone-400 mt-0.5">{product.barcode}</p>
              {product.brand && <p className="text-xs text-stone-500 mt-0.5">{product.brand}</p>}
              {(product.format || product.nutriScore) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {product.format && (
                    <span className="inline-flex items-center rounded-md bg-stone-100 border border-stone-200 px-1.5 py-0.5 text-[10px] font-bold font-mono tabular text-stone-600">
                      {product.format}
                    </span>
                  )}
                  {product.nutriScore && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      Nutri-Score {product.nutriScore.toUpperCase()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Current Stock Indicator */}
          {!isNew && (
            <div className="mb-5 flex justify-between items-center bg-stone-50 border border-stone-200 rounded-2xl p-3.5">
              <span className="text-sm text-stone-500">Stock actuel en rayon</span>
              <span className="text-lg font-bold font-mono tabular text-indigo-600">{existingQty} {existingQty > 1 ? 'unités' : 'unité'}</span>
            </div>
          )}

          {/* Toggle Modes: Set vs Add */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 border border-stone-200 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('set');
                setQty(isNew ? '1' : String(existingQty));
              }}
              className={`py-3 text-xs font-semibold rounded-xl transition ${
                mode === 'set'
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Définir le stock total
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('add');
                setQty('1');
              }}
              className={`py-3 text-xs font-semibold rounded-xl transition ${
                mode === 'add'
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Ajouter au stock
            </button>
          </div>

          {/* Input field with custom +/- buttons */}
          <div className="relative flex items-center justify-between gap-4 bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-6">
            <button
              type="button"
              onClick={() => adjustQty(-1)}
              className="w-12 h-12 flex items-center justify-center text-stone-700 bg-white hover:bg-stone-100 active:scale-95 border border-stone-200 shadow-sm rounded-xl transition"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="flex-1 text-center">
              <input
                ref={inputRef}
                type="number"
                min="0"
                max="99999"
                value={qty}
                onChange={e => {
                  if (e.target.value.length > 5) return;
                  setQty(e.target.value);
                }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full bg-transparent text-stone-900 text-3xl font-bold font-mono tabular text-center outline-none border-none focus:ring-0 p-0"
                placeholder="0"
              />
              <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mt-1">
                {mode === 'set' ? 'Nouveau stock absolu' : 'Quantité à ajouter'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => adjustQty(1)}
              className="w-12 h-12 flex items-center justify-center text-stone-700 bg-white hover:bg-stone-100 active:scale-95 border border-stone-200 shadow-sm rounded-xl transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Preset Buttons for rapid entry */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {(mode === 'add' ? [1, 5, 10, 25] : [0, 5, 10, 50]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  if (mode === 'add') {
                    setQty(String(preset));
                  } else {
                    setQty(String(preset));
                  }
                }}
                className="py-2.5 text-xs font-bold font-mono tabular text-stone-700 bg-stone-50 border border-stone-200 hover:bg-stone-100 hover:border-stone-300 active:scale-95 rounded-xl transition"
              >
                {mode === 'add' ? `+${preset}` : `${preset}`}
              </button>
            ))}
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
              disabled={qty.trim() === '' || isNaN(parseInt(qty, 10)) || parseInt(qty, 10) < 0}
              className="flex-1 py-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none rounded-2xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition"
            >
              <Check className="w-4 h-4" />
              {mode === 'set' ? 'Définir' : 'Ajouter'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
