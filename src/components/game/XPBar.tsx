import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { formatInt } from '@/lib/game/format';

/**
 * XPBar — gold fill, 6px, animated width (600 ms expo-out), shine sweep on
 * gain (design.md §12). Shows `current / next` mono numerals when labeled.
 */

export interface XPBarProps {
  current: number; // xp into current rank
  needed: number; // xp span to next rank (0 => max rank, bar full)
  className?: string;
  labeled?: boolean;
}

export default function XPBar({ current, needed, className, labeled = true }: XPBarProps) {
  const pct = needed <= 0 ? 100 : Math.min(100, (current / needed) * 100);
  const fillRef = useRef<HTMLDivElement>(null);
  const prev = useRef(pct);

  useEffect(() => {
    // shine sweep only when the bar grows
    const el = fillRef.current;
    if (el && pct > prev.current) {
      el.classList.remove('xp-shine');
      void el.offsetWidth; // restart animation
      el.classList.add('xp-shine');
    }
    prev.current = pct;
  }, [pct]);

  return (
    <div className={cn('w-full', className)}>
      <div className="h-[6px] w-full overflow-hidden rounded-full bg-line">
        <div
          ref={fillRef}
          className="relative h-full rounded-full bg-xp transition-[width] duration-[600ms] ease-expo-out"
          style={{ width: `${pct}%` }}
        >
          <span className="xp-shine-sweep pointer-events-none absolute inset-0 overflow-hidden rounded-full" />
        </div>
      </div>
      {labeled && (
        <div className="mt-2 flex items-center justify-between font-mono text-[12px] text-txt-dim">
          <span className="stat-numeral text-xp">{formatInt(current)}</span>
          <span>{needed <= 0 ? 'max rank' : `/ ${formatInt(needed)} xp`}</span>
        </div>
      )}
      <style>{`
        .xp-shine .xp-shine-sweep::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.55) 50%, transparent 80%);
          transform: translateX(-100%);
          animation: xp-shine-sweep 700ms cubic-bezier(.22,1,.36,1) 1;
        }
        @keyframes xp-shine-sweep {
          to { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
