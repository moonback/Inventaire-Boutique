import { useState } from 'react';

interface ManualProductModalProps {
  barcode: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function ManualProductModal({ barcode, onSave, onCancel }: ManualProductModalProps) {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Produit Inconnu</h3>
          <p className="text-sm text-gray-500 mb-6">
            Le code-barres <span className="font-mono font-medium text-gray-700">{barcode}</span> n'a pas été trouvé. Veuillez saisir son nom pour l'ajouter à l'inventaire.
          </p>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="Nom du produit..."
          />
        </div>
        <div className="flex bg-gray-50 border-t border-gray-100 p-4 gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(name)}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-blue-400 rounded-xl font-medium transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
