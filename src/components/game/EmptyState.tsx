import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * EmptyState — mono ASCII-ish glyph + message + CTA (design.md §12). Used
 * for locked achievements, empty activity logs, etc.
 */

export interface EmptyStateProps {
  glyph?: string; // mono glyph, default ">_"
  message: string;
  cta?: ReactNode;
  className?: string;
}

export default function EmptyState({ glyph = '>_', message, cta, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-10 text-center', className)}>
      <span className="font-mono text-3xl text-txt-faint">{glyph}</span>
      <p className="max-w-[40ch] font-mono text-[13px] lowercase leading-relaxed text-txt-dim">{message}</p>
      {cta}
    </div>
  );
}
