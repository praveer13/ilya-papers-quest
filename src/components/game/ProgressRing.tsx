import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * ProgressRing — SVG ring for the 90% meter (design.md §12). Track-neutral
 * gold by default; center shows `n%` stat + `of what matters` micro label.
 * Sweeps from 0 to value (1 s expo-out, 200 ms delay) when it enters view.
 */

export interface ProgressRingProps {
  /** 0..1 */
  value: number;
  size?: number; // px, default 140
  stroke?: number; // px, default 8
  color?: string; // default xp gold
  className?: string;
  /** center content override; default is pct + "of what matters" */
  center?: React.ReactNode;
}

export default function ProgressRing({
  value,
  size = 140,
  stroke = 8,
  color = '#FBBF24',
  className,
  center,
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const t0 = performance.now() + 200; // 200 ms delay
          const tick = (now: number) => {
            const t = Math.min(1, Math.max(0, (now - t0) / 1000));
            const eased = 1 - Math.pow(2, -10 * t); // expo-out
            setShown(value * (t >= 1 ? 1 : eased));
            if (t < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  const pct = Math.round(value * 100);

  return (
    <div ref={ref} className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {center ?? (
          <>
            <span className="stat-numeral text-xp" style={{ fontSize: size * 0.24 }}>
              {pct}%
            </span>
            <span className="micro-label text-txt-faint">of what matters</span>
          </>
        )}
      </div>
    </div>
  );
}
