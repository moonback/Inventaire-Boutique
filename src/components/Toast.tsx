import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

export function Toast({ message, visible }: { message: string | null; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && message && (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, y: 24, x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 260 }}
            className="fixed bottom-8 left-1/2 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 backdrop-blur-md flex items-center gap-2.5 z-55 pointer-events-none"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-bounce" />
          <span className="font-semibold text-xs whitespace-nowrap tracking-wide text-slate-100">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
