import { useEffect, useRef } from 'react';

/**
 * useTicker — setInterval-as-a-hook, paused when `delay` is null.
 * Ref-safe: stores the callback in a ref so the interval always
 * calls the latest closure without re-subscribing.
 */
export function useTicker(cb: () => void, delay: number | null) {
  const ref = useRef(cb);

  useEffect(() => {
    ref.current = cb;
  });

  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => ref.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
