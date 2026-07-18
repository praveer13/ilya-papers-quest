import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, Lock } from 'lucide-react';
import ProgressRing from '@/components/game/ProgressRing';
import CountUp from '@/components/game/CountUp';
import CornerPanel from '@/components/game/CornerPanel';
import { useReducedMotion } from '@/lib/game/format';

/**
 * MapHeader (map.md §1) — sticky-under-navbar strip: `quest map` title +
 * mono caption left; mini 90% ProgressRing (routes to /achievements), x/30
 * mastered counter, and a legend popover (outside-click / Esc to close).
 */

const LEGEND_ROWS: { glyph: React.ReactNode; label: string }[] = [
  {
    glyph: (
      <span className="relative inline-block size-[18px]">
        <span className="absolute inset-[3px] rounded-full border-2 border-t1 bg-surface" />
        <span className="absolute inset-[3px] rounded-full border border-t1 animate-node-pulse" />
      </span>
    ),
    label: 'pulsing — next objective',
  },
  {
    glyph: (
      <span
        className="inline-block size-[18px] rounded-full"
        style={{ background: 'conic-gradient(#22D3EE 210deg, var(--line) 0deg)' }}
      />
    ),
    label: 'ringed — in progress',
  },
  {
    glyph: (
      <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-success/80">
        <Check size={11} strokeWidth={3} className="text-white" />
      </span>
    ),
    label: 'filled — mastered',
  },
  {
    glyph: (
      <span className="inline-flex size-[18px] items-center justify-center rounded-full border border-line bg-surface opacity-60">
        <Lock size={10} className="text-txt-faint" />
      </span>
    ),
    label: 'dim — locked',
  },
  {
    glyph: (
      <svg width="18" height="18" viewBox="0 0 96 96" aria-hidden>
        <polygon points="28,6 68,6 92,48 68,90 28,90 4,48" fill="var(--surface)" stroke="#FB7185" strokeWidth={6} strokeLinejoin="round" />
      </svg>
    ),
    label: 'hex — boss',
  },
];

export default function MapHeader({ mastered, pct }: { mastered: number; pct: number }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [legendOpen, setLegendOpen] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);

  // close legend on outside click / Esc
  useEffect(() => {
    if (!legendOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (legendRef.current && !legendRef.current.contains(e.target as Node)) setLegendOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLegendOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [legendOpen]);

  return (
    <motion.div
      className="sticky top-16 z-40 border-b border-line bg-void/90 backdrop-blur-md"
      initial={reduced ? false : { y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex h-16 max-w-map items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="shrink-0 font-display text-[22px] font-semibold text-txt">quest map</h1>
          <span className="micro-label hidden truncate text-txt-faint sm:inline">
            {'// 5 worlds · 32 levels · 5 bosses'}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <span className="micro-label hidden text-txt-dim md:inline">
            <CountUp value={mastered} className="text-txt" />
            /30 mastered
          </span>
          <button
            type="button"
            onClick={() => navigate('/achievements')}
            className="rounded-full transition-transform duration-200 hover:scale-105"
            aria-label={`${pct}% of what matters — view badges`}
            title="view badges"
          >
            <ProgressRing
              value={pct / 100}
              size={40}
              stroke={4}
              center={<span className="stat-numeral text-[10px] text-xp">{pct}%</span>}
            />
          </button>
          <div className="relative" ref={legendRef}>
            <button
              type="button"
              onClick={() => setLegendOpen((o) => !o)}
              className="rounded-md p-1.5 text-txt-dim transition-colors hover:text-txt"
              aria-label="map legend"
              aria-expanded={legendOpen}
            >
              <Info size={17} />
            </button>
            <AnimatePresence>
              {legendOpen && (
                <motion.div
                  className="absolute right-0 top-full z-50 mt-2 w-64"
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  <CornerPanel raised cornerColor="#22D3EE" className="p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    <span className="micro-label text-[10px] text-txt-faint">legend</span>
                    <ul className="mt-2 flex flex-col gap-2.5">
                      {LEGEND_ROWS.map((row) => (
                        <li key={row.label} className="flex items-center gap-2.5">
                          <span className="flex w-[18px] shrink-0 justify-center">{row.glyph}</span>
                          <span className="font-mono text-[12px] lowercase text-txt-dim">{row.label}</span>
                        </li>
                      ))}
                    </ul>
                  </CornerPanel>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
