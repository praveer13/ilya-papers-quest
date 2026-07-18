import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/game/format';

/**
 * Split — character / word split animation helpers for the about hero
 * (about.md §1): chars rise y 50→0 with 0.025s stagger (expo 700ms) for the
 * display headline; words fade with 0.008s stagger for the story paragraphs.
 * Reduced motion → plain text, no spans.
 */

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function SplitChars({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{text}</>;
  return (
    <span aria-label={text} className="inline-block">
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={`${text}-${i}`}
          aria-hidden
          className="inline-block will-change-transform"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: delay + i * 0.025, ease: EASE }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}
    </span>
  );
}

/**
 * Words of a plain string — fade + slight rise, 0.008s stagger starting at
 * `delay`. Compose across mixed content by chaining delays with wordCount().
 */
export function SplitWords({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{text}</>;
  const words = text.trim().split(/\s+/);
  return (
    <span aria-label={text} className="inline">
      {words.map((w, i) => (
        <motion.span
          key={`${text}-${i}`}
          aria-hidden
          className="inline-block will-change-transform"
          initial={{ y: 12, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45, delay: delay + i * 0.008, ease: EASE }}
        >
          {w}
          {i < words.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </span>
  );
}
