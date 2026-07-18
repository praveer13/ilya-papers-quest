import { memo, useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Lock, Play } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Paper } from '@/lib/game/papers';
import { fileLabel } from '@/lib/game/papers';
import type { Track } from '@/lib/game/tracks';
import type { NodeState } from '@/lib/game/unlocks';
import { useReducedMotion } from '@/lib/game/format';
import { NODE_D } from './geometry';
import { cn } from '@/lib/utils';

/**
 * MapNode — the 64px paper node (design.md §12 / map.md §2). Four states:
 * locked (dim, lock), available (track ring + breathing glow), in-progress
 * (conic progress ring, paper number), mastered (solid fill, white check).
 * The single next-objective node adds an expanding pulse ring + NEXT tag.
 * Locked clicks shake and float a damage-number style `locked` label.
 */

export interface NodeDiscProps {
  size: number;
  state: NodeState;
  color: string; // track color
  /** 0..1 in-progress fraction (conic ring) */
  frac?: number;
  /** paper number shown for in-progress */
  num?: number;
  breathing?: boolean;
}

/** The bare circle visual — shared by the desktop node and the mobile rows. */
export function NodeDisc({ size, state, color, frac = 0, num, breathing = true }: NodeDiscProps) {
  const reduced = useReducedMotion();
  const ring = state === 'in-progress';
  const style: CSSProperties = { width: size, height: size };
  if (state === 'locked') {
    style.background = 'var(--surface)';
    style.border = '1px solid var(--line)';
    style.color = 'var(--txt-faint)';
  } else if (state === 'available') {
    style.background = 'var(--surface)';
    style.border = `2px solid ${color}`;
    style.color = color;
    if (breathing && !reduced) {
      style.animation = 'np-breathe 2.4s ease-in-out infinite';
      (style as Record<string, string>)['--np-glow'] = `color-mix(in srgb, ${color} 30%, transparent)`;
    } else {
      style.boxShadow = `0 0 18px color-mix(in srgb, ${color} 25%, transparent)`;
    }
  } else if (state === 'in-progress') {
    style.background = 'var(--surface)';
    style.border = '1px solid var(--line)';
    style.color = 'var(--txt)';
  } else {
    // mastered — solid track fill, 15% darkened, permanent glow
    style.background = `color-mix(in srgb, ${color} 85%, black)`;
    style.border = `2px solid ${color}`;
    style.color = '#fff';
    style.boxShadow = `0 0 18px color-mix(in srgb, ${color} 25%, transparent)`;
  }

  const iconSize = Math.round(size * 0.34);
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      {ring && (
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            inset: -4,
            background: `conic-gradient(${color} ${Math.round(frac * 360)}deg, var(--line) 0deg)`,
          }}
        />
      )}
      <span
        className="absolute flex items-center justify-center rounded-full"
        style={{ ...style, inset: 0, width: size, height: size }}
      >
        {state === 'locked' && <Lock size={iconSize} />}
        {state === 'available' && <Play size={iconSize} className="translate-x-[1px]" />}
        {state === 'in-progress' && (
          <span className="stat-numeral" style={{ fontSize: Math.round(size * 0.26) }}>
            {String(num ?? 0).padStart(2, '0')}
          </span>
        )}
        {state === 'mastered' && <Check size={Math.round(size * 0.4)} strokeWidth={2.6} />}
      </span>
    </span>
  );
}

/** damage-number style floating mono text (map.md §2 locked click) */
export function FloatText({ text, color = 'var(--txt-faint)' }: { text: string; color?: string }) {
  return (
    <motion.span
      className="pointer-events-none absolute left-1/2 top-[-14px] z-30 font-mono text-[12px] font-bold lowercase"
      style={{ color }}
      initial={{ x: '-50%', y: 0, opacity: 1 }}
      animate={{ x: '-50%', y: -48, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      {text}
    </motion.span>
  );
}

export interface MapNodeProps {
  paper: Paper;
  track: Track;
  state: NodeState;
  frac: number;
  isNext: boolean;
  x: number;
  y: number;
  /** intro pop delay in seconds */
  introDelay: number;
  introDone: boolean;
  onOpen: (paper: Paper) => void;
  onHoverStart: (paper: Paper, el: HTMLElement) => void;
  onHoverEnd: () => void;
}

let floatSeq = 1;

function MapNode({
  paper,
  track,
  state,
  frac,
  isNext,
  x,
  y,
  introDelay,
  introDone,
  onOpen,
  onHoverStart,
  onHoverEnd,
}: MapNodeProps) {
  const reduced = useReducedMotion();
  const [floats, setFloats] = useState<number[]>([]);
  const discRef = useRef<HTMLButtonElement>(null);

  const lockedClick = useCallback(() => {
    const el = discRef.current;
    el?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(3px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 200, iterations: 1 },
    );
    const id = floatSeq++;
    setFloats((f) => [...f, id]);
    window.setTimeout(() => setFloats((f) => f.filter((v) => v !== id)), 750);
  }, []);

  const handleClick = useCallback(() => {
    if (state === 'locked') lockedClick();
    else onOpen(paper);
  }, [state, lockedClick, onOpen, paper]);

  const stateLabel =
    state === 'locked'
      ? 'locked'
      : state === 'available'
        ? isNext
          ? 'available — next objective'
          : 'available'
        : state === 'in-progress'
          ? `in progress ${Math.round(frac * 100)}%`
          : 'mastered';

  return (
    <div
      className="absolute z-10"
      style={{ left: x, top: y, width: 0, height: 0, opacity: state === 'locked' ? 0.45 : 1 }}
    >
      {/* NEXT tag + expanding pulse ring (single next-objective node) */}
      {isNext && state !== 'locked' && (
        <>
          {!reduced && (
            <span
              aria-hidden
              className="pointer-events-none absolute rounded-full border-2 animate-node-pulse"
              style={{
                left: -NODE_D / 2,
                top: -NODE_D / 2,
                width: NODE_D,
                height: NODE_D,
                borderColor: track.color,
              }}
            />
          )}
          <span
            className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border px-2 py-[2px] font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{
              top: -NODE_D / 2 - 24,
              color: track.color,
              borderColor: `color-mix(in srgb, ${track.color} 45%, transparent)`,
              background: `color-mix(in srgb, ${track.color} 12%, var(--void))`,
            }}
          >
            next
          </span>
        </>
      )}

      {/* floating `locked` damage numbers */}
      <AnimatePresence>
        {floats.map((id) => (
          <FloatText key={id} text="locked" />
        ))}
      </AnimatePresence>

      {/* the disc (intro pop: scale 0 → 1 spring) */}
      <motion.button
        ref={discRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={(e) => onHoverStart(paper, e.currentTarget)}
        onMouseLeave={onHoverEnd}
        onFocus={(e) => onHoverStart(paper, e.currentTarget)}
        onBlur={onHoverEnd}
        aria-label={`${fileLabel(paper)}: ${paper.title} — ${stateLabel}`}
        title={paper.title}
        className={cn(
          'absolute block rounded-full focus-visible:outline-offset-4',
          state === 'locked' ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
        style={{ left: -NODE_D / 2, top: -NODE_D / 2, width: NODE_D, height: NODE_D }}
        initial={introDone ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={
          introDone
            ? { duration: 0 }
            : { type: 'spring', stiffness: 300, damping: 20, delay: reduced ? 0 : introDelay }
        }
      >
        <NodeDisc size={NODE_D} state={state} color={track.color} frac={frac} num={paper.num} />
      </motion.button>

      {/* label below: file number + short title (2 lines max) */}
      <div
        className="pointer-events-none absolute left-1/2 w-[136px] -translate-x-1/2 text-center"
        style={{ top: NODE_D / 2 + 7 }}
      >
        <div
          className="micro-label text-[10px]"
          style={{ color: state === 'locked' ? 'var(--txt-faint)' : track.color }}
        >
          {fileLabel(paper)}
          {paper.bonus ? ' ★' : ''}
        </div>
        <div className="mt-[2px] line-clamp-2 font-mono text-[11px] leading-[14px] text-txt-dim">
          {paper.title}
        </div>
      </div>
    </div>
  );
}

export default memo(MapNode);
