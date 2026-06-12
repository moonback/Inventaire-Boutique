import { useState, useEffect, useRef } from 'react';
import { Package } from 'lucide-react';

interface QuantityModalProps {
  product: {
    barcode: string;
    name: string;
    imageUrl?: string;
  };
  existingQty: number;
  isNew: boolean;
  onSave: (quantityToAdd: number) => void;
  onCancel: () => void;
}

export function QuantityModal({ product, existingQty, isNew, onSave, onCancel }: QuantityModalProps) {
  const [qty, setQty] = useState('1');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSave = () => {
    const num = parseInt(qty, 10);
    if (!isNaN(num) && num > 0) {
      onSave(num);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
             <div className="w-16 h-16 bg-gray-50 flex-shrink-0 border border-gray-100 rounded-xl flex items-center justify-center p-1">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                ) : (
                  <Package className="w-6 h-6 text-gray-300" />
                )}
             </div>
             <div>
                <h3 className="font-semibold text-gray-900 leading-tight line-clamp-2">{product.name}</h3>
                <p className="text-sm font-mono text-gray-500 mt-1">{product.barcode}</p>
                {!isNew && <p className="text-xs text-blue-600 font-medium mt-1">En stock: {existingQty}</p>}
             </div>
          </div>
          
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantité scannée</label>
          <input
            ref={inputRef}
            type="number"
            min="1"
            max="99999"
            value={qty}
            onChange={e => {
              if (e.target.value.length > 5) return;
              setQty(e.target.value);
            }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full px-4 py-3 text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center"
            placeholder="Ex: 5"
          />
        </div>
        <div className="flex bg-gray-50 border-t border-gray-100 p-4 gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!parseInt(qty, 10) || parseInt(qty, 10) <= 0}
            className="flex-1 px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-blue-400 rounded-xl font-medium transition-colors"
          >
            Ajouter {parseInt(qty, 10) ? `(+${parseInt(qty, 10)})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
