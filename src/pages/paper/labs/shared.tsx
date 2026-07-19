import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared lab primitives — styled to the DemoFrame stage (dark, mono, track
 * color accents). Every lab receives { color, onComplete } and must call
 * onComplete() once its completion rule is met.
 */

export interface LabProps {
  color: string;
  onComplete: () => void;
}

export function LabBtn({
  children,
  onClick,
  color,
  active = false,
  disabled = false,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  color: string;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-md border px-3 py-1.5 font-mono text-[12px] uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'text-txt' : 'border-line bg-surface text-txt-dim hover:border-focus hover:text-txt',
        className,
      )}
      style={active ? { borderColor: color, backgroundColor: `${color}22`, color } : undefined}
    >
      {children}
    </button>
  );
}

export function LabSlider({
  label,
  min,
  max,
  step = 0.01,
  value,
  onChange,
  format,
  color,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  color: string;
}) {
  return (
    <label className="flex min-w-36 flex-1 flex-col gap-1">
      <span className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-wider text-txt-faint">
        {label}
        <span className="stat-numeral text-[12px] text-txt-dim">{format ? format(value) : value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-current"
        style={{ color }}
      />
    </label>
  );
}

/** tiny bar chart row (SVG) for log-scale or linear values */
export function MiniBars({
  values,
  color,
  height = 64,
  log = false,
  highlightLast = false,
}: {
  values: number[];
  color: string;
  height?: number;
  log?: boolean;
  highlightLast?: boolean;
}) {
  const n = values.length;
  const w = Math.max(2, Math.floor(240 / Math.max(1, n)) - 1);
  const norm = (v: number) => {
    if (log) {
      const lv = Math.log10(Math.max(1e-12, Math.abs(v)));
      return Math.min(1, Math.max(0, (lv + 12) / 24)); // 1e-12 .. 1e12 -> 0..1
    }
    const max = Math.max(...values.map((x) => Math.abs(x)), 1e-9);
    return Math.abs(v) / max;
  };
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${n * (w + 1)} ${height}`} preserveAspectRatio="none" className="block">
      {values.map((v, i) => {
        const h = Math.max(1, norm(v) * (height - 4));
        return (
          <rect
            key={i}
            x={i * (w + 1)}
            y={height - h}
            width={w}
            height={h}
            fill={highlightLast && i === n - 1 ? '#FBBF24' : color}
            opacity={highlightLast && i === n - 1 ? 1 : 0.75}
            rx={0.5}
          />
        );
      })}
    </svg>
  );
}

/** mono readout chip */
export function Readout({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2 py-1 font-mono text-[11px] text-txt-dim"
      style={color ? { borderColor: color } : undefined}
    >
      {children}
    </span>
  );
}
