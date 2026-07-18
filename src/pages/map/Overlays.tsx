import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { Track } from '@/lib/game/tracks';
import { rankForXp } from '@/lib/game/ranks';
import { confettiEnabled, fireLevelUp } from '@/lib/game/confetti';
import { sfx } from '@/lib/game/sound';
import { useReducedMotion } from '@/lib/game/format';

/**
 * Map event overlays (map.md §4/§5):
 * - WorldUnlockOverlay: gate-open cinematic when a newly unlocked world is
 *   first seen on the map — dim, track-colored banner, confetti burst,
 *   level-up arp; dismiss on click / 2.5 s auto.
 * - CompletionOverlay: one-time full-screen moment when all 30 canonical
 *   papers are mastered.
 * - BossFlash: the red flash transition when entering a boss fight.
 */

export function WorldUnlockOverlay({ track, onDismiss }: { track: Track; onDismiss: () => void }) {
  useEffect(() => {
    sfx.levelUp();
    if (confettiEnabled()) {
      confetti({
        particleCount: 60,
        spread: 80,
        startVelocity: 34,
        origin: { x: 0.5, y: 0.55 },
        colors: [track.color, '#FBBF24', '#E8EAF4'],
        disableForReducedMotion: true,
      });
    }
    const t = window.setTimeout(onDismiss, 2500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-void/60 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label={`world unlocked — ${track.name}`}
    >
      <motion.div
        className="mt-[26dvh] flex flex-col items-center gap-3 px-6 text-center"
        initial={{ y: -48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <span
          className="hud-label"
          style={{ color: track.color, textShadow: `0 0 18px color-mix(in srgb, ${track.color} 55%, transparent)` }}
        >
          world unlocked
        </span>
        <span className="font-display text-[clamp(26px,5vw,44px)] font-bold leading-tight text-txt">
          {track.name}
        </span>
        <span className="micro-label text-txt-dim">
          {'// '}track {track.num} online — first node available
        </span>
        <span className="micro-label mt-4 text-txt-faint">click to continue</span>
      </motion.div>
    </motion.div>
  );
}

export function CompletionOverlay({ xp, onDismiss }: { xp: number; onDismiss: () => void }) {
  const carmack = rankForXp(xp).n >= 10;

  useEffect(() => {
    fireLevelUp();
    sfx.levelUp();
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-void/90 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="all 30 papers mastered"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 45%, rgba(251,191,36,0.16), transparent 55%)' }}
      />
      <div className="relative flex max-w-2xl flex-col items-center gap-5 px-6 text-center">
        <span className="hud-label text-xp text-glow-gold">sequence complete</span>
        {carmack && (
          <motion.img
            src="/badge-carmack.png"
            alt="Carmack Tier badge"
            className="size-28 object-contain drop-shadow-[0_0_24px_rgba(251,191,36,0.45)]"
            initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        )}
        <motion.h2
          className="font-display text-[clamp(28px,5vw,52px)] font-bold leading-tight text-txt"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          YOU NOW KNOW <span className="text-xp text-glow-gold">90%</span> OF WHAT MATTERS.
        </motion.h2>
        <p className="micro-label normal-case text-txt-dim">
          {carmack
            ? 'carmack tier achieved — the full ladder, cleared.'
            : `rank: ${rankForXp(xp).name} — 15,000 xp for carmack tier. bonus levels await.`}
        </p>
        <button
          type="button"
          className="hud-label mt-2 rounded-lg border border-xp/50 bg-xp/10 px-6 py-3 text-xp transition-all duration-200 hover:bg-xp/20 hover:shadow-glow-xp"
        >
          continue
        </button>
      </div>
    </motion.div>
  );
}

export function BossFlash({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {active && !reduced && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[80] bg-danger/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        />
      )}
    </AnimatePresence>
  );
}
