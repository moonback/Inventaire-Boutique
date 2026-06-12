import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle } from 'lucide-react';

export function Toast({ message, visible }: { message: string | null; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && message && (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, y: 30, x: '-50%' }}
            className="fixed bottom-8 left-1/2 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-50 pointer-events-none"
        >
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span className="font-medium text-sm whitespace-nowrap">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
