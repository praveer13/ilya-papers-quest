import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Tip — minimal on-theme tooltip: wraps a trigger (hover + keyboard focus)
 * and floats a mono label above it. Pure CSS (group / group-focus-within),
 * no JS positioning. Used for rank nodes, stat cards, heatmap cells.
 */
export default function Tip({
  label,
  children,
  className,
  side = 'top',
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  side?: 'top' | 'bottom';
}) {
  return (
    <div className={cn('group/tip relative inline-block', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface-2 px-2.5 py-1.5',
          'font-mono text-[11px] lowercase text-txt-dim opacity-0 shadow-lg transition-all duration-150 ease-expo-out',
          'group-hover/tip:opacity-100 group-focus-within/tip:opacity-100',
          side === 'top'
            ? 'bottom-[calc(100%+8px)] translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0'
            : 'top-[calc(100%+8px)] -translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0',
        )}
      >
        {label}
        <span
          aria-hidden
          className={cn(
            'absolute left-1/2 size-[7px] -translate-x-1/2 rotate-45 border-line bg-surface-2',
            side === 'top' ? '-bottom-[4px] border-b border-r' : '-top-[4px] border-l border-t',
          )}
        />
      </span>
    </div>
  );
}
