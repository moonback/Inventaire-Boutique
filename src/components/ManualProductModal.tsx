import { useState, useRef, useEffect } from 'react';

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
    if (name.trim() && !isNaN(num) && num > 0) {
      onSave({
        name: name.trim(),
        brand: brand.trim() || undefined,
        category: category.trim() || undefined,
      }, num);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Produit Inconnu</h3>
          <p className="text-sm text-gray-500 mb-6">
            Le code-barres <span className="font-mono font-medium text-gray-700">{barcode}</span> n'a pas été trouvé. Veuillez saisir ses informations.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit</label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && document.getElementById('qty-input')?.focus()}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ex: Coca-Cola 33cl"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
              <input
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && document.getElementById('category-input')?.focus()}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ex: Coca-Cola"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <input
                id="category-input"
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && document.getElementById('qty-input')?.focus()}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ex: Boissons"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité (nouveau stock)</label>
              <input
                id="qty-input"
                type="number"
                min="1"
                max="99999"
                value={qty}
                onChange={e => {
                  if (e.target.value.length > 5) return;
                  setQty(e.target.value);
                }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center font-bold text-lg"
                placeholder="1"
              />
            </div>
          </div>
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
            disabled={!name.trim() || !parseInt(qty, 10) || parseInt(qty, 10) <= 0}
            className="flex-1 px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-blue-400 rounded-xl font-medium transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
