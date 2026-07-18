import { memo, useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Lock, Skull, Trophy } from 'lucide-react';
import type { Track } from '@/lib/game/tracks';
import { useReducedMotion } from '@/lib/game/format';
import { BOSS_D, BOSS_HEX_POINTS } from './geometry';
import { FloatText } from './MapNode';
import { cn } from '@/lib/utils';

/**
 * BossNode — the 96px hexagon at a lane's bottom (map.md §2). States:
 * locked (grey hex + lock), ready (danger breathing glow + READY TO FIGHT
 * tag), cleared (gold ring + SLAIN plate + trophy). Three hearts are engraved
 * underneath; the name plate shows the boss slug.
 */

export type BossState = 'locked' | 'ready' | 'cleared';

const GOLD = '#FBBF24';
const DANGER = '#FB7185';

function bossVisual(state: BossState): { stroke: string; iconColor: string } {
  if (state === 'cleared') return { stroke: GOLD, iconColor: GOLD };
  if (state === 'ready') return { stroke: DANGER, iconColor: DANGER };
  return { stroke: 'var(--line)', iconColor: 'var(--txt-faint)' };
}

/** The hexagon + glyph visual, shared by desktop node and mobile row. */
export function BossHex({ size, state }: { size: number; state: BossState }) {
  const reduced = useReducedMotion();
  const { stroke, iconColor } = bossVisual(state);
  const iconSize = Math.round(size * 0.34);
  return (
    <span
      className="relative inline-block"
      style={{
        width: size,
        height: size,
        animation: state === 'ready' && !reduced ? 'np-breathe 2.4s ease-in-out infinite' : undefined,
        ['--np-glow' as string]: 'color-mix(in srgb, #FB7185 40%, transparent)',
        filter: state === 'cleared' ? 'drop-shadow(0 0 10px rgba(251,191,36,0.35))' : undefined,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden className="block">
        <polygon
          points={BOSS_HEX_POINTS}
          fill="var(--surface)"
          stroke={stroke}
          strokeWidth={state === 'locked' ? 1.5 : 2.5}
          strokeLinejoin="round"
        />
        {state === 'ready' && (
          <polygon
            points={BOSS_HEX_POINTS}
            fill="none"
            stroke={DANGER}
            strokeWidth={1}
            strokeLinejoin="round"
            opacity={0.35}
            transform="translate(48 48) scale(0.82) translate(-48 -48)"
          />
        )}
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: iconColor, opacity: state === 'locked' ? 0.7 : 1 }}
      >
        {state === 'locked' && <Lock size={iconSize} />}
        {state === 'ready' && <Skull size={iconSize} />}
        {state === 'cleared' && <Trophy size={iconSize} />}
      </span>
    </span>
  );
}

/** hearts ×3 engraved under the boss — filled by bestHearts once attempted */
export function BossHearts({ bestHearts, attempts, size = 12 }: { bestHearts: number; attempts: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={`best hearts: ${attempts > 0 ? bestHearts : 3} of 3`}>
      {[0, 1, 2].map((i) => {
        const filled = attempts > 0 && i < bestHearts;
        return (
          <Heart
            key={i}
            size={size}
            strokeWidth={2}
            style={{
              color: filled ? DANGER : 'var(--txt-faint)',
              fill: filled ? DANGER : 'transparent',
              opacity: filled ? 1 : 0.6,
            }}
          />
        );
      })}
    </span>
  );
}

export interface BossNodeProps {
  track: Track;
  state: BossState;
  bestHearts: number;
  attempts: number;
  x: number;
  y: number;
  introDelay: number;
  introDone: boolean;
  onFight: (track: Track) => void;
  onHoverStart: (el: HTMLElement) => void;
  onHoverEnd: () => void;
}

let floatSeq = 10000;

function BossNode({
  track,
  state,
  bestHearts,
  attempts,
  x,
  y,
  introDelay,
  introDone,
  onFight,
  onHoverStart,
  onHoverEnd,
}: BossNodeProps) {
  const reduced = useReducedMotion();
  const [floats, setFloats] = useState<number[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);

  const lockedClick = useCallback(() => {
    btnRef.current?.animate(
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
    else onFight(track);
  }, [state, lockedClick, onFight, track]);

  const stateLabel = state === 'locked' ? 'locked' : state === 'ready' ? 'ready to fight' : 'slain';

  return (
    <div
      className="absolute z-10"
      style={{ left: x, top: y, width: 0, height: 0, opacity: state === 'locked' ? 0.5 : 1 }}
    >
      {/* state tag above */}
      {state === 'ready' && (
        <span
          className={cn(
            'pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-danger/50 bg-danger/10 px-2 py-[2px]',
            'font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-danger',
            !reduced && 'animate-danger-pulse',
          )}
          style={{ top: -BOSS_D / 2 - 26 }}
        >
          ready to fight
        </span>
      )}
      {state === 'cleared' && (
        <span
          className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-xp/50 bg-xp/10 px-2 py-[2px] font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-xp"
          style={{ top: -BOSS_D / 2 - 26 }}
        >
          slain
        </span>
      )}

      <AnimatePresence>
        {floats.map((id) => (
          <FloatText key={id} text="locked" />
        ))}
      </AnimatePresence>

      <motion.button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={(e) => onHoverStart(e.currentTarget)}
        onMouseLeave={onHoverEnd}
        onFocus={(e) => onHoverStart(e.currentTarget)}
        onBlur={onHoverEnd}
        aria-label={`boss ${track.bossName} — ${stateLabel}`}
        title={track.bossName}
        className={cn(
          'absolute block focus-visible:outline-offset-4',
          state === 'locked' ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
        style={{ left: -BOSS_D / 2, top: -BOSS_D / 2, width: BOSS_D, height: BOSS_D, borderRadius: 24 }}
        initial={introDone ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={
          introDone
            ? { duration: 0 }
            : { type: 'spring', stiffness: 300, damping: 20, delay: reduced ? 0 : introDelay }
        }
      >
        <BossHex size={BOSS_D} state={state} />
      </motion.button>

      {/* hearts + name plate below */}
      <div
        className="pointer-events-none absolute left-1/2 flex w-[160px] -translate-x-1/2 flex-col items-center gap-1 text-center"
        style={{ top: BOSS_D / 2 + 8 }}
      >
        <BossHearts bestHearts={bestHearts} attempts={attempts} />
        <span
          className="micro-label text-[10px]"
          style={{ color: state === 'cleared' ? GOLD : state === 'ready' ? DANGER : 'var(--txt-faint)' }}
        >
          {track.bossSlug}
        </span>
      </div>
    </div>
  );
}

export default memo(BossNode);
