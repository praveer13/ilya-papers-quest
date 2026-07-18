/**
 * Screen 1 — Boss Reveal (boss.md): warning label, danger-tinted emblem with
 * shockwave, letter-drop boss name, typewriter taunt card, rules strip,
 * "your arsenal" recap row, FIGHT CTA + retreat link.
 */
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Trophy } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import { useSaveStore } from '@/lib/game/save';
import { fileLabel, papersByTrack } from '@/lib/game/papers';
import { sfx } from '@/lib/game/sound';
import type { Track } from '@/lib/game/tracks';
import {
  BOSS_HEARTS_MAX,
  BOSS_HP_CHUNKS,
  BOSS_ROUND_SIZE,
  REPLAY_XP_CAP,
  type BossDef,
} from '@/data/bosses';
import { BossHpBar, GlowButton, Hearts, Typewriter } from './widgets';
import { dangerFilter } from './combat';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function NameDrop({ name }: { name: string }) {
  const chars = name.split('');
  return (
    <motion.h1
      aria-label={name}
      className="mt-5 font-display text-[38px] font-bold leading-tight tracking-[-0.01em] text-danger sm:text-[56px]"
      style={{ textShadow: '0 0 32px rgba(251,113,133,.5)' }}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03, delayChildren: 0.15 } } }}
    >
      {chars.map((c, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          variants={{
            hidden: { y: -30, opacity: 0, rotate: -4 },
            show: { y: 0, opacity: 1, rotate: 0, transition: { duration: 0.35, ease: EASE } },
          }}
        >
          {c === ' ' ? ' ' : c}
        </motion.span>
      ))}
    </motion.h1>
  );
}

function ArsenalRow({ track }: { track: Track }) {
  const papers = papersByTrack(track.id).filter((p) => !p.bonus);
  const progress = useSaveStore((s) => s.papers);
  return (
    <div className="mt-6">
      <p className="micro-label text-txt-faint">your arsenal</p>
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
        {papers.map((p) => {
          const mastered = progress[p.slug]?.mastered === true;
          return (
            <span
              key={p.slug}
              title={`${fileLabel(p)} — ${p.title}`}
              className="flex size-9 items-center justify-center rounded-full border"
              style={{
                borderColor: mastered ? track.color : 'var(--line)',
                backgroundColor: mastered ? `${track.color}14` : 'transparent',
                boxShadow: mastered ? `0 0 12px ${track.color}44` : undefined,
              }}
            >
              {mastered ? (
                <Check className="size-4" style={{ color: track.color }} />
              ) : (
                <span className="font-mono text-[10px] text-txt-faint">{p.num}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function BossReveal({
  boss,
  track,
  onFight,
}: {
  boss: BossDef;
  track: Track;
  onFight: () => void;
}) {
  const prog = useSaveStore((s) => s.bosses[track.id]);
  const cleared = prog?.cleared === true;

  return (
    <div className="relative flex min-h-[calc(100dvh-64px)] items-center justify-center overflow-hidden">
      {/* textures: grid + scanlines + vignette + red radial */}
      <div className="grid-texture pointer-events-none absolute inset-0" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />
      <div className="vignette pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 38%, rgba(251,113,133,.10), transparent 70%)' }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[700px] px-4 py-14 text-center sm:px-6">
        {/* warning label: flickers in, then blinks */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.25, 1, 0.5, 1] }}
          transition={{ duration: 0.4, times: [0, 0.25, 0.45, 0.65, 0.85, 1] }}
          className="hud-label text-danger"
        >
          <span className="animate-blink">WARNING // TRACK {track.num} GUARDIAN</span>
        </motion.p>

        {/* emblem + shockwave ring */}
        <div className="relative mx-auto mt-8 w-fit">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-danger"
            initial={{ scale: 0.7, opacity: 0.9 }}
            animate={{ scale: 2.3, opacity: 0 }}
            transition={{ delay: 0.55, duration: 0.6, ease: EASE }}
          />
          <motion.img
            src={boss.emblem}
            alt={`${boss.name} emblem`}
            width={180}
            height={180}
            draggable={false}
            style={{ width: 180, height: 180, filter: dangerFilter(boss.hueRotate) }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 18 }}
            onAnimationComplete={() => sfx.bossHit()}
          />
        </div>

        <NameDrop name={boss.name} />

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.4, ease: EASE }}
          className="mt-2 font-mono text-[13px] lowercase text-txt-dim"
        >
          guardian of the {track.name} · {boss.tagline}
        </motion.p>

        {/* HP + hearts preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.4, ease: EASE }}
          className="mx-auto mt-7 w-full max-w-[480px]"
        >
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="micro-label text-danger">boss hp</span>
            <span className="stat-numeral text-[13px] text-danger">100%</span>
          </div>
          <BossHpBar chunks={BOSS_HP_CHUNKS} filled={BOSS_HP_CHUNKS} />
          <div className="mt-3 flex justify-center">
            <Hearts hearts={BOSS_HEARTS_MAX} max={BOSS_HEARTS_MAX} />
          </div>
        </motion.div>

        {/* taunt card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.4, ease: EASE }}
        >
          <CornerPanel cornerColor="#FB7185" className="mx-auto mt-7 max-w-[520px] px-5 py-4 text-left" raised>
            <p className="font-mono text-[13px] leading-relaxed text-danger/90">
              &gt; &quot;<Typewriter text={boss.taunts[0]} active />&quot;
            </p>
          </CornerPanel>
        </motion.div>

        {/* rules strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.4, ease: EASE }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          {[
            `${BOSS_ROUND_SIZE} QUESTIONS`,
            `${BOSS_HEARTS_MAX} HEARTS`,
            cleared ? `REPLAY · XP CAPPED +${REPLAY_XP_CAP}` : '+600 XP ON VICTORY',
          ].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-line bg-surface/70 px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-txt-dim"
            >
              {chip}
            </span>
          ))}
        </motion.div>

        {/* already-slain chip */}
        {cleared && prog && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-4 inline-flex items-center gap-2 font-mono text-[12px] lowercase text-xp"
          >
            <Trophy className="size-3.5" />
            already slain · attempts {prog.attempts} · best ♥ {prog.bestHearts}
            {prog.flawless ? ' · flawless' : ''}
          </motion.p>
        )}

        {/* arsenal recap */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.4, ease: EASE }}
        >
          <ArsenalRow track={track} />
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, type: 'spring', stiffness: 120, damping: 18 }}
          className="mt-9"
        >
          <GlowButton onClick={onFight}>
            {cleared ? 'REFIGHT' : 'FIGHT'} <ChevronRight className="size-4" />
          </GlowButton>
          <div className="mt-4">
            <Link
              to="/map"
              className="font-mono text-[12px] lowercase text-txt-faint underline-offset-4 transition-colors hover:text-txt-dim hover:underline"
            >
              retreat
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
