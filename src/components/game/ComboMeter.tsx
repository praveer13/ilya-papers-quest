import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * ComboMeter — horizontal 8-segment bar beside quiz progress (design.md §12):
 * each correct lights a segment (track color → gold at ×8); wrong answers
 * scatter the segments (handled by re-mounting with a shaking key).
 */

export interface ComboMeterProps {
  combo: number; // 0..8+
  color?: string; // track color, default xp gold
  className?: string;
  /** bump on wrong answer to trigger the scatter animation */
  breakKey?: number;
}

export default function ComboMeter({ combo, color = '#FBBF24', className, breakKey = 0 }: ComboMeterProps) {
  const lit = Math.min(8, combo);
  return (
    <div className={cn('flex items-center gap-1', className)} aria-label={`combo x${combo}`}>
      {Array.from({ length: 8 }, (_, i) => {
        const on = i < lit;
        const isGold = lit >= 8;
        return (
          <motion.span
            key={`${breakKey}-${i}`}
            initial={breakKey > 0 && on ? { x: 0, y: 0, rotate: 0, opacity: 1 } : false}
            animate={
              breakKey > 0 && on
                ? {
                    x: (i % 2 === 0 ? -1 : 1) * (6 + i * 2),
                    y: 8 + ((i * 7) % 5),
                    rotate: (i % 2 === 0 ? -1 : 1) * (20 + i * 5),
                    opacity: 0.2,
                  }
                : { x: 0, y: 0, rotate: 0, opacity: 1 }
            }
            transition={{ duration: 0.3 }}
            className="h-3 w-[6px] rounded-[2px]"
            style={{
              backgroundColor: on ? (isGold ? '#FBBF24' : color) : 'var(--line)',
              boxShadow: on ? `0 0 8px ${isGold ? '#FBBF24' : color}` : undefined,
            }}
          />
        );
      })}
      <span className="ml-2 font-mono text-[12px] text-txt-dim">×{Math.min(2, 1 + 0.25 * combo).toFixed(2)}</span>
    </div>
  );
}
