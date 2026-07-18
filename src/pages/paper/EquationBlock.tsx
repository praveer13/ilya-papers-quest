import { useState } from 'react';
import { BlockMath } from 'react-katex';
import { motion } from 'framer-motion';
import 'katex/dist/katex.min.css';
import { useReducedMotion } from '@/lib/game/format';
import { cn } from '@/lib/utils';

/**
 * EquationBlock — KaTeX display (blurred→sharp entry) + term-by-term legend
 * grid (paper.md §3/S4): each symbol as a mono chip mapped to plain-English
 * meaning; hovering a chip highlights it (and marks the equation as armed).
 */
export default function EquationBlock({
  latex,
  terms,
  color,
}: {
  latex: string;
  terms: { symbol: string; meaning: string }[];
  color: string;
}) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <motion.div
        initial={reduced ? false : { opacity: 0, filter: 'blur(8px)' }}
        whileInView={{ opacity: 1, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5 }}
        className="overflow-x-auto rounded-lg border border-line bg-[#0A0A14] px-4 py-5 text-center transition-colors"
        style={active != null ? { borderColor: color } : undefined}
      >
        <BlockMath math={latex} errorColor="#FB7185" />
      </motion.div>

      <div className="grid gap-2 sm:grid-cols-2">
        {terms.map((t, i) => (
          <motion.button
            key={t.symbol}
            type="button"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.35, delay: reduced ? 0 : i * 0.06 }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className={cn(
              'flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5 text-left transition-all',
              active === i && 'bg-surface-2',
            )}
            style={active === i ? { borderColor: color } : undefined}
          >
            <code
              className="mt-0.5 shrink-0 rounded border border-line bg-[#0A0A14] px-1.5 py-0.5 font-mono text-[12px] leading-none"
              style={{ color }}
            >
              {t.symbol}
            </code>
            <span className="text-[13.5px] leading-snug text-txt-dim">{t.meaning}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
