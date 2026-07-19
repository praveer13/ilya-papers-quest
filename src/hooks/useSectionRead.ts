import { useEffect, useRef } from 'react';
import { useSaveStore } from '@/lib/game/save';

/**
 * useSectionRead — marks a section as read when its end has been in view
 * for at least 1.5 seconds.
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
