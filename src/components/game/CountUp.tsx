import { useEffect, useRef, useState } from 'react';
import { formatInt } from '@/lib/game/format';

/**
 * CountUp — tweens a number over 900 ms expo-out with mono tabular numerals
 * (design.md §9). Animates from the previous rendered value whenever `value`
 * changes (returning players see numbers climb from their session values).
 */

export interface CountUpProps {
  value: number;
  duration?: number; // ms, default 900
  className?: string;
  format?: (n: number) => string;
  /** start only when `when` is true (e.g. in-view flag); default true */
  when?: boolean;
}

export default function CountUp({ value, duration = 900, className, format = formatInt, when = true }: CountUpProps) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!when) return;
    const from = fromRef.current;
    if (from === value) {
      setShown(value);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = t >= 1 ? 1 : 1 - Math.pow(2, (-10 * t));
      const v = Math.round(from + (value - from) * eased);
      setShown(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, when]);

  return <span className={className}>{format(shown)}</span>;
}
