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
    <div className="fixed inset-0 bg-[#070b13]/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full sm:max-w-md bg-[#111827] border-t sm:border border-slate-800 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden pb-safe"
      >
        {/* Header Drag Indicator for mobile feel */}
        <div className="flex justify-center py-3 sm:hidden">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        <div className="p-6">
          {/* Close button */}
          <div className="absolute top-4 right-4 hidden sm:block">
            <button 
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Product Details Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center p-2 flex-shrink-0">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain rounded-lg" />
              ) : (
                <Package className="w-8 h-8 text-slate-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full mb-1">
                {product.category || 'Général'}
              </span>
              <h3 className="font-semibold text-white leading-snug truncate text-base">{product.name}</h3>
              <p className="text-xs font-mono text-slate-400 mt-0.5">{product.barcode}</p>
              {product.brand && <p className="text-xs text-slate-400 mt-0.5">{product.brand}</p>}
            </div>
          </div>

          {/* Current Stock Indicator */}
          {!isNew && (
            <div className="mb-5 flex justify-between items-center bg-slate-900/50 border border-slate-800 rounded-2xl p-3.5">
              <span className="text-sm text-slate-400">Stock actuel en rayon</span>
              <span className="text-lg font-bold text-indigo-400">{existingQty} {existingQty > 1 ? 'unités' : 'unité'}</span>
            </div>
          )}

          {/* Toggle Modes: Set vs Add */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('set');
                setQty(isNew ? '1' : String(existingQty));
              }}
              className={`py-3 text-xs font-semibold rounded-xl transition ${
                mode === 'set' 
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                  : 'text-slate-400 hover:text-slate-200'
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
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ajouter au stock
            </button>
          </div>

          {/* Input field with custom +/- buttons */}
          <div className="relative flex items-center justify-between gap-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-4 mb-6">
            <button
              type="button"
              onClick={() => adjustQty(-1)}
              className="w-12 h-12 flex items-center justify-center text-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl transition"
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
                className="w-full bg-transparent text-white text-3xl font-bold font-mono text-center outline-none border-none focus:ring-0 p-0"
                placeholder="0"
              />
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">
                {mode === 'set' ? 'Nouveau stock absolu' : 'Quantité à ajouter'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => adjustQty(1)}
              className="w-12 h-12 flex items-center justify-center text-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl transition"
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
                className="py-2.5 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800/80 hover:bg-slate-800 active:scale-95 rounded-xl transition"
              >
                {mode === 'add' ? `+${preset}` : `${preset}`}
              </button>
            ))}
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
              disabled={qty.trim() === '' || isNaN(parseInt(qty, 10)) || parseInt(qty, 10) < 0}
              className="flex-1 py-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
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
