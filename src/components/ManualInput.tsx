import { useState, KeyboardEvent } from 'react';
import { Scan } from 'lucide-react';

export function ManualInput({ onScan }: { onScan: (code: string) => void }) {
  const [value, setValue] = useState('');
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim() !== '') {
      onScan(value.trim());
      setValue('');
    }
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Scan className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg shadow-sm"
        placeholder="Saisissez ou scannez un code-barres..."
      />
    </div>
  )
}
