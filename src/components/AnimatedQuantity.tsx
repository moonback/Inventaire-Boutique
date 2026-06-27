import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

type AnimatedQuantityProps = {
  value: number;
  className?: string;
  durationMs?: number;
};

export function AnimatedQuantity({
  value,
  className,
  durationMs = 220,
}: AnimatedQuantityProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  const direction =
    value === previousValueRef.current
      ? 0
      : value > previousValueRef.current
        ? 1
        : -1;

  useEffect(() => {
    const from = previousValueRef.current;

    if (from === value) {
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(from + (value - from) * easedProgress);

      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
        previousValueRef.current = value;
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [durationMs, value]);

  return (
    <motion.span
      initial={false}
      animate={
        direction > 0
          ? { scale: [1, 1.18, 1], y: [0, -2, 0] }
          : direction < 0
            ? { scale: [1, 1.12, 1], y: [0, 2, 0] }
            : { scale: 1, y: 0 }
      }
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={className}
    >
      {displayValue}
    </motion.span>
  );
}
