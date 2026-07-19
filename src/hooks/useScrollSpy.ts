import { useEffect, useState } from 'react';

/**
 * useScrollSpy — returns the ID of the section currently in the reading zone.
 */
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
