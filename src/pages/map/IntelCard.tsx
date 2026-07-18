import { motion } from 'framer-motion';
import { ArrowRight, Skull } from 'lucide-react';
import type { Paper } from '@/lib/game/papers';
import { fileLabel } from '@/lib/game/papers';
import type { Track } from '@/lib/game/tracks';
import type { NodeState } from '@/lib/game/unlocks';
import { stars } from '@/lib/game/format';
import CornerPanel from '@/components/game/CornerPanel';
import TrackChip from '@/components/game/TrackChip';

/**
 * IntelCard — hover/focus tooltip (map.md §2): a CornerPanel appearing 8px
 * above the node, spring scale 0.9 → 1 (150 ms). Shows the mission brief:
 * title, authors·year, track chip, XP, difficulty, est. time, one-line hook,
 * live state line, and a mini CTA.
 *
 * Rendered `fixed` at the node's screen rect so it never clips inside the
 * horizontally-scrolling canvas and never covers neighboring nodes; the
 * parent clears it on any scroll.
 */

export interface IntelData {
  kind: 'paper' | 'boss';
  track: Track;
  /** node bounding rect in viewport coordinates */
  rect: { top: number; bottom: number; left: number; width: number };
  state: NodeState; // boss maps ready→available, cleared→mastered
  stateLine: string;
  paper?: Paper;
}

const CARD_W = 288;
const STATE_COLORS: Record<NodeState, string> = {
  locked: 'var(--txt-faint)',
  available: 'var(--txt)',
  'in-progress': 'var(--xp)',
  mastered: 'var(--success)',
};

export default function IntelCard({ data }: { data: IntelData }) {
  const { track, state, stateLine, paper, kind, rect } = data;
  const cx = rect.left + rect.width / 2;
  const vw = typeof window === 'undefined' ? 1200 : window.innerWidth;
  const left = Math.min(Math.max(cx - CARD_W / 2, 8), vw - CARD_W - 8);
  // prefer above the node; flip below when the sticky chrome leaves no room
  const flip = rect.top < 340;
  const openable = state !== 'locked';

  return (
    <div
      className="pointer-events-none fixed z-[60]"
      style={flip ? { left, top: rect.bottom + 8 } : { left, bottom: window.innerHeight - rect.top + 8 }}
      role="tooltip"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.4 }}
        style={{ width: CARD_W }}
      >
        <CornerPanel cornerColor={track.color} raised className="p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {kind === 'paper' && paper ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="micro-label text-[10px]" style={{ color: track.color }}>
                  {fileLabel(paper)}
                  {paper.bonus ? ' ★ bonus' : ''}
                </span>
                <span className="font-mono text-[12px] font-bold text-xp">+{paper.xp} xp</span>
              </div>
              <h3 className="mt-1.5 font-display text-[15px] font-semibold leading-snug text-txt">
                {paper.title}
              </h3>
              <p className="micro-label mt-1 normal-case text-txt-faint">
                {paper.authors} · {paper.year} · {paper.source}
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <TrackChip track={track} />
                <span className="font-mono text-[11px] text-xp" aria-label={`difficulty ${paper.stars} of 5`}>
                  {stars(paper.stars)}
                </span>
                <span className="micro-label text-[10px] text-txt-faint">~{paper.minutes} min</span>
              </div>
              <p className="mt-2.5 border-t border-line pt-2.5 text-[12px] leading-relaxed text-txt-dim">
                {paper.hook}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="micro-label text-[10px] text-danger">boss fight</span>
                <span className="font-mono text-[12px] font-bold text-xp">+300 xp</span>
              </div>
              <h3 className="mt-1.5 flex items-center gap-2 font-display text-[15px] font-semibold leading-snug text-txt">
                <Skull size={15} className="shrink-0 text-danger" />
                {track.bossName}
              </h3>
              <p className="micro-label mt-1 normal-case text-txt-faint">
                10 questions · 3 hearts · drawn from the whole track
              </p>
              <div className="mt-2.5">
                <TrackChip track={track} />
              </div>
            </>
          )}
          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
            <span className="font-mono text-[11px] lowercase" style={{ color: STATE_COLORS[state] }}>
              {stateLine}
            </span>
            {openable && (
              <span
                className="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em]"
                style={{ color: track.color }}
              >
                open <ArrowRight size={11} />
              </span>
            )}
          </div>
        </CornerPanel>
      </motion.div>
    </div>
  );
}
