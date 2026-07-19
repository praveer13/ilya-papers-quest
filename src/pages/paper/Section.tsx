import { type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SectionShell — one of the 7 level sections (paper.md §3): mono index header,
 * read-state dot, scroll-margin for the sticky nav.
 */

export default function SectionShell({
  id,
  index,
  label,
  color,
  read,
  readRef,
  children,
  className,
}: {
  id: string;
  index: number;
  label: string;
  color: string;
  read: boolean;
  readRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={`sec-${id}`} ref={readRef} className={cn('scroll-mt-24', className)}>
      <header className="mb-5 flex items-center gap-3">
        <span className="font-mono text-[12px] font-bold tracking-wider" style={{ color }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="h-px w-8" style={{ backgroundColor: color, opacity: 0.5 }} />
        <h2 className="hud-label text-txt-dim">{label}</h2>
        <span
          className={cn(
            'ml-auto inline-flex items-center gap-1 font-mono text-[11px] lowercase transition-all',
            read ? 'text-success' : 'text-txt-faint/60',
          )}
        >
          {read ? (
            <>
              <Check className="size-3" />
              read +10
            </>
          ) : (
            'unread'
          )}
        </span>
      </header>
      {children}
    </section>
  );
}
