import { InventoryItem } from '../types';
import { Package, Plus, Minus, Trash2 } from 'lucide-react';

interface InventoryGridProps {
  items: InventoryItem[];
  onUpdateQuantity: (barcode: string, delta: number) => void;
  onRemove: (barcode: string) => void;
}

export function InventoryGrid({ items, onUpdateQuantity, onRemove }: InventoryGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
        <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Aucun produit</h3>
        <p className="mt-1 text-gray-500">Scannez des produits pour commencer votre inventaire.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.barcode} className="bg-white flex rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 flex-shrink-0 border-r border-gray-100 flex items-center justify-center p-2">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
            ) : (
              <Package className="w-8 h-8 text-gray-300" />
            )}
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono text-gray-400 mb-1">{item.barcode}</div>
              <h4 className="font-semibold text-gray-900 leading-tight line-clamp-2" title={item.name}>
                {item.name}
              </h4>
              {item.brand && <p className="text-sm text-gray-500 mt-0.5 truncate">{item.brand}</p>}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => onUpdateQuantity(item.barcode, -1)}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-10 text-center font-medium text-gray-900">{item.quantity}</div>
                <button
                  onClick={() => onUpdateQuantity(item.barcode, 1)}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => onRemove(item.barcode)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer l'article"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
