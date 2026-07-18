/**
 * Boss-fight widgets — hearts, segmented HP bar, timer ring, damage numbers,
 * reacting boss glyph, typewriter, pulsing CTA. All combat chrome is code
 * (boss.md — "Everything else is code").
 */
import { memo, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/lib/game/format';
import { dangerFilter, type DamageNum } from './combat';

// ---------------------------------------------------------------------------
// Typewriter — 18 ms/char taunt lines
// ---------------------------------------------------------------------------

export function Typewriter({
  text,
  speed = 18,
  active = true,
  cursor = true,
  className,
}: {
  text: string;
  speed?: number;
  active?: boolean;
  cursor?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);
  // reset progress when the text changes (render-phase state adjustment)
  const [prevText, setPrevText] = useState(text);
  if (prevText !== text) {
    setPrevText(text);
    setN(0);
  }
  useEffect(() => {
    if (!active || reduced) return;
    const t = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(t);
          return v;
        }
        return v + 1;
      });
    }, speed);
    return () => clearInterval(t);
  }, [text, active, reduced, speed]);
  const shown = reduced ? text : text.slice(0, n);
  const done = reduced || n >= text.length;
  return (
    <span className={className}>
      {shown}
      {cursor && !done && <span className="animate-blink">▮</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Hearts — filled/hollow with pop animation on loss
// ---------------------------------------------------------------------------

export function Hearts({
  hearts,
  max = 3,
  size = 28,
  className,
}: {
  hearts: number;
  max?: number;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1.5', className)} aria-label={`${hearts} of ${max} hearts`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <AnimatePresence mode="wait" initial={false}>
            {i < hearts ? (
              <motion.span
                key="full"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="absolute inset-0"
              >
                <Heart
                  style={{ width: size, height: size, filter: 'drop-shadow(0 0 6px rgba(251,113,133,.6))' }}
                  className="fill-danger text-danger"
                />
              </motion.span>
            ) : (
              <motion.span
                key="empty"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="absolute inset-0"
              >
                <Heart style={{ width: size, height: size }} className="text-txt-faint" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BossHpBar — 10 segmented chunks, 400 ms drain per hit
// ---------------------------------------------------------------------------

export function BossHpBar({
  chunks,
  filled,
  className,
}: {
  chunks: number;
  filled: number;
  className?: string;
}) {
  return (
    <div
      className={cn('flex gap-1', className)}
      role="progressbar"
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={chunks}
    >
      {Array.from({ length: chunks }).map((_, i) => (
        <span key={i} className="h-3.5 flex-1 overflow-hidden rounded-[3px] border border-line bg-abyss">
          <motion.span
            className="block h-full w-full origin-left"
            initial={false}
            animate={{ scaleX: i < filled ? 1 : 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              backgroundColor: '#FB7185',
              boxShadow: i < filled ? '0 0 10px rgba(251,113,133,.55)' : undefined,
            }}
          />
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimerRing — per-question countdown (45 s / 35 s phase 2)
// ---------------------------------------------------------------------------

export function TimerRing({
  total,
  left,
  className,
}: {
  total: number;
  left: number;
  className?: string;
}) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const urgent = left <= 10;
  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: 40, height: 40 }}
      aria-label={`${Math.ceil(left)} seconds left`}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={urgent ? '#FB7185' : '#9AA1B8'}
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 120ms linear, stroke 250ms' }}
        />
      </svg>
      <span
        className={cn(
          'absolute font-mono text-[11px] font-bold tabular-nums',
          urgent ? 'animate-danger-pulse text-danger' : 'text-txt-dim',
        )}
      >
        {Math.ceil(left)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DamageNumbers — floating combat text (rises 48 px, fades in 700 ms)
// ---------------------------------------------------------------------------

export function DamageNumbers({ items }: { items: DamageNum[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {items.map((d) => (
          <motion.span
            key={d.id}
            initial={{ opacity: 0, y: 0, scale: 0.9 }}
            animate={{ opacity: [0, 1, 1, 0], y: -48, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="absolute font-mono text-[15px] font-bold"
            style={{ left: `${d.x}%`, top: `${d.y}%`, color: d.color, textShadow: `0 0 12px ${d.color}` }}
          >
            {d.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BossGlyph — danger-tinted emblem that shakes on hits and jitters in phase 2
// ---------------------------------------------------------------------------

export const BossGlyph = memo(function BossGlyph({
  src,
  hueRotate,
  hitKey,
  phase2,
  size = 48,
  className,
}: {
  src: string;
  hueRotate: number;
  hitKey: number;
  phase2: boolean;
  size?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={reduced ? 'static' : hitKey}
      initial={false}
      animate={!reduced && hitKey > 0 ? { x: [0, -8, 8, -4, 0], opacity: [1, 0.55, 1, 1, 1] } : { x: 0, opacity: 1 }}
      transition={{ duration: 0.24 }}
      className={cn('shrink-0', className)}
    >
      <motion.div
        animate={!reduced && phase2 ? { x: [0, -2, 2, -1, 0], rotate: [0, -1.5, 1.5, 0] } : { x: 0, rotate: 0 }}
        transition={!reduced && phase2 ? { duration: 0.45, repeat: Infinity } : { duration: 0.2 }}
      >
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          draggable={false}
          style={{ width: size, height: size, filter: dangerFilter(hueRotate) }}
        />
      </motion.div>
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// GlowButton — pulsing CTA (perpetual animation isolated in a memo component)
// ---------------------------------------------------------------------------

export const GlowButton = memo(function GlowButton({
  children,
  onClick,
  color = '#FB7185',
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      animate={
        reduced
          ? {}
          : { boxShadow: [`0 0 18px ${color}55`, `0 0 44px ${color}88`, `0 0 18px ${color}55`] }
      }
      transition={reduced ? {} : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-8 py-3.5',
        'font-mono text-[13px] font-bold uppercase tracking-[0.14em]',
        className,
      )}
      style={{ borderColor: color, color, backgroundColor: `${color}14` }}
    >
      {children}
    </motion.button>
  );
});
