import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { ToastVariant } from "../design-system/types";

const variantStyles: Record<
  ToastVariant,
  {
    icon: ReactNode;
    bg: string;
    fg: string;
    iconClass: string;
  }
> = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4 flex-shrink-0" />,
    bg: "bg-stone-900",
    fg: "text-white",
    iconClass: "text-emerald-400",
  },
  info: {
    icon: <Info className="w-4 h-4 flex-shrink-0" />,
    bg: "bg-stone-900",
    fg: "text-white",
    iconClass: "text-indigo-400",
  },
  error: {
    icon: <XCircle className="w-4 h-4 flex-shrink-0" />,
    bg: "bg-stone-900",
    fg: "text-white",
    iconClass: "text-rose-400",
  },
};

export function Toast({
  message,
  visible,
  variant = "success",
}: {
  message: string | null;
  visible: boolean;
  variant?: ToastVariant;
}) {
  const v = variantStyles[variant];

  return (
    <AnimatePresence>
      {visible && message && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, scale: 0.9, y: 24, x: "-50%" }}
          animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, scale: 0.9, y: 24, x: "-50%" }}
          transition={{ type: "spring", damping: 25, stiffness: 260 }}
          className={`fixed bottom-24 left-1/2 ${v.bg} ${v.fg} px-4 py-3 rounded-2xl shadow-xl shadow-stone-900/25 ring-1 ring-white/10 flex items-center gap-2.5 z-55 pointer-events-none`}
        >
          <span className={v.iconClass}>{v.icon}</span>
          <span className="font-semibold text-xs whitespace-nowrap tracking-wide text-stone-50">
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
