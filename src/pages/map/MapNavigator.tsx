import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { TRACKS } from '@/lib/game/tracks';
import { CANVAS_W, LANE_W, laneLeft } from './geometry';

/**
 * MapNavigator (map.md §2) — mini navigator pinned bottom-right: five lane
 * ticks (track colored) + a viewport window that tracks the horizontal pan.
 * Clicking a lane tick smooth-scrolls that lane into view.
 */
export default function MapNavigator({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const [view, setView] = useState({ left: 0, width: 0.75 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const cw = el.scrollWidth || 1;
      setView({ left: el.scrollLeft / cw, width: Math.min(1, el.clientWidth / cw) });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [scrollRef]);

  const jump = (laneIdx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, laneLeft(laneIdx) - 24), behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 hidden lg:block" aria-label="map navigator">
      <div className="panel relative h-10 w-40 px-2 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.45)]">
        <div className="relative h-full w-full">
          {TRACKS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => jump(i)}
              aria-label={`scroll to track ${t.num}: ${t.name}`}
              title={`T${t.num} · ${t.short}`}
              className="absolute top-[3px] bottom-[3px] rounded-[3px] opacity-70 transition-opacity hover:opacity-100"
              style={{
                left: `${(laneLeft(i) / CANVAS_W) * 100}%`,
                width: `${(LANE_W / CANVAS_W) * 100}%`,
                background: `color-mix(in srgb, ${t.color} 20%, transparent)`,
                border: `1px solid color-mix(in srgb, ${t.color} 45%, transparent)`,
              }}
            />
          ))}
          {/* viewport window */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 rounded-[3px] border border-txt-dim/80 bg-txt/5"
            style={{ left: `${view.left * 100}%`, width: `${view.width * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
