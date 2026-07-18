import { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FLAME_COLORS, flameTier } from '@/lib/game/format';

/**
 * StreakFlame — lucide Flame tinted by tier + count in mono (design.md §12).
 * Pulses (scale 1→1.15, 400 ms) when the streak increments.
 */

export interface StreakFlameProps {
  count: number;
  size?: number; // icon px, default 18
  className?: string;
  showCount?: boolean;
}

export default function StreakFlame({ count, size = 18, className, showCount = true }: StreakFlameProps) {
  const tier = flameTier(count);
  const color = FLAME_COLORS[tier];
  const [pulsing, setPulsing] = useState(false);
  const prev = useRef(count);

  useEffect(() => {
    if (count > prev.current) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 850);
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count]);

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={`${count}-day streak · ${tier}`}>
      <Flame
        size={size}
        style={{ color }}
        className={cn(pulsing && 'animate-flame-pulse')}
        strokeWidth={2.2}
        fill={count > 0 ? color : 'none'}
        fillOpacity={count > 0 ? 0.25 : 0}
      />
      {showCount && (
        <span className="stat-numeral text-[13px]" style={{ color: count > 0 ? color : 'var(--txt-faint)' }}>
          {count}
        </span>
      )}
    </span>
  );
}
