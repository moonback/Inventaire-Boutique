import { Package, Edit3, ClipboardList, X } from 'lucide-react';
import { motion } from 'motion/react';
import { InventoryItem } from '../types';

interface ScanChoiceModalProps {
  product: InventoryItem;
  onChooseStock: () => void;
  onChooseEdit: () => void;
  onCancel: () => void;
}

export function ScanChoiceModal({ product, onChooseStock, onChooseEdit, onCancel }: ScanChoiceModalProps) {
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

          <div className="text-center mb-6">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full mb-3">
              Produit trouvé
            </span>
            <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center p-2 mx-auto mb-3">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain rounded-lg" />
              ) : (
                <Package className="w-8 h-8 text-slate-650" />
              )}
            </div>
            <h3 className="font-bold text-white text-base leading-snug line-clamp-1">{product.name}</h3>
            <p className="text-xs font-mono text-slate-400 mt-1">{product.barcode}</p>
            {product.brand && <p className="text-xs text-slate-400 font-semibold">{product.brand}</p>}
            
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-300">
              Stock actuel : <strong className="text-indigo-400 font-bold">{product.quantity}</strong>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onChooseStock}
              className="w-full py-4 px-4 bg-indigo-650 hover:bg-indigo-600 active:scale-98 rounded-2xl text-white font-bold text-sm shadow-lg shadow-indigo-950/20 flex items-center justify-center gap-2.5 transition"
            >
              <ClipboardList className="w-4 h-4" />
              Modifier le stock (+ ou -)
            </button>

            <button
              onClick={onChooseEdit}
              className="w-full py-4 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 active:scale-98 rounded-2xl text-slate-200 font-bold text-sm flex items-center justify-center gap-2.5 transition"
            >
              <Edit3 className="w-4 h-4 text-slate-400" />
              Modifier la fiche produit
            </button>

            <button
              onClick={onCancel}
              className="w-full py-3 text-xs font-semibold text-slate-500 hover:text-slate-300 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
