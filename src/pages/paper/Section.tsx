import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { useSaveStore } from '@/lib/game/save';
import { cn } from '@/lib/utils';

/**
 * SectionShell — one of the 7 level sections (paper.md §3): mono index header,
 * read-state dot, scroll-margin for the sticky nav, and IntersectionObserver
 * read detection (marks read when the section's end has been in view ≥1.5 s —
 * anti-skim, §4.1: "scroll-to-bottom per section").
 */

export function useSectionRead(slug: string, sectionId: string, index: number) {
  const ref = useRef<HTMLElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;
    let timer: number | null = null;
    const io = new IntersectionObserver(
      () => {
        const rect = el.getBoundingClientRect();
        const endInView = rect.bottom <= window.innerHeight + 8 && rect.bottom > 0;
        if (endInView && timer == null) {
          timer = window.setTimeout(() => {
            if (!fired.current) {
              fired.current = true;
              useSaveStore.getState().markSectionRead(slug, sectionId, index);
            }
          }, 1500);
        } else if (!endInView && timer != null) {
          window.clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0, 0.2, 0.5] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer != null) window.clearTimeout(timer);
    };
  }, [slug, sectionId, index]);

  return ref;
}

export function SectionShell({
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

/** scrollspy: which section id is currently in the reading zone */
export function useScrollSpy(ids: string[]): string {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    setActive(ids[0]);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id.replace('sec-', ''));
        }
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 },
    );
    for (const id of ids) {
      const el = document.getElementById(`sec-${id}`);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  return active;
}
