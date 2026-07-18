import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '@/lib/game/format';

/**
 * Reveal — the standard scroll reveal (design.md §9): trigger at 20%
 * viewport, y +40→0 + opacity 0→1, 600 ms expo-out, one-shot. Children
 * stagger via the `delay` prop (0.07–0.1 s steps). Reduced motion → instant.
 * Local copy scoped to the achievements/about pages (same contract as home).
 */
export default function Reveal({
  children,
  delay = 0,
  className,
  y = 40,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ y, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
