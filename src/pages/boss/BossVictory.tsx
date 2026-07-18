/**
 * Screen 3 — Victory (boss.md): BOSS SLAIN display text over the desaturating
 * emblem, gold confetti salvo, World Champion trophy card, staggered XP
 * ledger with count-up total, world-unlock banner (T1→T2), CTAs.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { ChevronRight, Trophy } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import CountUp from '@/components/game/CountUp';
import { fireBossKill } from '@/lib/game/confetti';
import { sfx } from '@/lib/game/sound';
import { XP } from '@/lib/game/xp';
import { formatInt } from '@/lib/game/format';
import type { Track } from '@/lib/game/tracks';
import { REPLAY_XP_CAP, type BossDef } from '@/data/bosses';
import { GlowButton } from './widgets';
import { dangerFilter, type FightResult } from './combat';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface VictoryProps {
  boss: BossDef;
  track: Track;
  result: FightResult;
  firstClear: boolean; // this fight was the first clear (victory XP actually awarded)
  isReplay: boolean;
  onReplay: () => void;
}

export default function BossVictory({ boss, track, result, firstClear, isReplay, onReplay }: VictoryProps) {
  const [dead, setDead] = useState(false);
  const firedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    fireBossKill(track.color);
    sfx.levelUp();
    sfx.bossHit();
    const t = setTimeout(() => setDead(true), 150);
    return () => clearTimeout(t);
  }, [track.color]);

  const flawless = result.heartsLeft >= 3;
  const victoryXp = firstClear ? XP.BOSS_VICTORY : 0;
  const flawlessXp = firstClear && flawless ? XP.FLAWLESS_BOSS : 0;
  const total = result.answerXp + victoryXp + flawlessXp;

  const lines: { label: string; value: string }[] = isReplay
    ? [{ label: `correct answers ${result.correct} (replay, capped)`, value: `+${formatInt(result.answerXp)}` }]
    : [{ label: `correct answers ${result.correct} × ${XP.BOSS_CORRECT}`, value: formatInt(result.correct * XP.BOSS_CORRECT) }];
  if (!isReplay && result.comboBonus > 0) lines.push({ label: 'combo bonus', value: `+${formatInt(result.comboBonus)}` });
  lines.push({ label: 'victory bonus', value: firstClear ? `+${XP.BOSS_VICTORY}` : 'claimed' });
  if (firstClear && flawless) lines.push({ label: 'flawless — no hearts lost', value: `+${XP.FLAWLESS_BOSS}` });
  lines.push({ label: `${result.heartsLeft} ${result.heartsLeft === 1 ? 'heart' : 'hearts'} standing`, value: '—' });
  if (isReplay) lines.push({ label: `replay per-correct xp capped at +${REPLAY_XP_CAP}`, value: 'anti-grind' });

  return (
    <div className="relative flex min-h-[calc(100dvh-64px)] items-center justify-center overflow-hidden">
      <div className="grid-texture pointer-events-none absolute inset-0" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />
      <div className="vignette pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 40%, rgba(251,191,36,.10), transparent 70%)' }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[680px] px-4 py-14 text-center sm:px-6">
        {/* emblem drained of color */}
        <motion.img
          src={boss.emblem}
          alt=""
          width={140}
          height={140}
          draggable={false}
          className="mx-auto"
          initial={{ opacity: 0.9 }}
          style={{
            width: 140,
            height: 140,
            filter: dead
              ? 'grayscale(1) brightness(0.6) drop-shadow(0 0 20px rgba(251,191,36,.20))'
              : dangerFilter(boss.hueRotate),
            transition: 'filter 800ms ease',
          }}
        />

        {/* BOSS SLAIN — character split drop-in */}
        <motion.h1
          aria-label="BOSS SLAIN"
          className="text-glow-gold mt-6 font-display text-[46px] font-bold leading-none text-xp sm:text-[64px]"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } }}
        >
          {'BOSS SLAIN'.split('').map((c, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="inline-block"
              variants={{
                hidden: { y: -28, opacity: 0, rotate: 4 },
                show: { y: 0, opacity: 1, rotate: 0, transition: { duration: 0.4, ease: EASE } },
              }}
            >
              {c === ' ' ? ' ' : c}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-3 font-mono text-[13px] lowercase text-txt-dim"
        >
          {boss.slug} deleted in {Math.max(1, Math.round(result.durationMs / 1000))}s · best combo ×
          {result.bestCombo}
        </motion.p>

        {/* trophy card */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 24 }}
        >
          <CornerPanel cornerColor="#FBBF24" raised className="mx-auto mt-7 flex max-w-[420px] items-center gap-4 px-5 py-4 text-left">
            <span className="flex size-11 items-center justify-center rounded-full border border-xp/50 bg-xp/10">
              <Trophy className="size-5 text-xp" />
            </span>
            <span>
              <span className="block font-mono text-[13px] font-bold text-xp">
                World Champion — {track.name}
              </span>
              <span className="micro-label text-txt-faint">
                {firstClear ? 'achievement unlocked' : 'achievement already held'}
              </span>
            </span>
          </CornerPanel>
        </motion.div>

        {/* XP ledger */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.7 } } }}
        >
          <CornerPanel cornerColor="#FBBF24" className="mx-auto mt-6 max-w-[480px] px-6 py-5 text-left">
            <p className="hud-label text-xp">xp ledger</p>
            <div className="mt-3 space-y-2">
              {lines.map((l) => (
                <motion.div
                  key={l.label}
                  variants={{
                    hidden: { opacity: 0, x: -12 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE } },
                  }}
                  className="flex items-baseline justify-between gap-4 font-mono text-[13px] lowercase"
                >
                  <span className="text-txt-dim">{l.label}</span>
                  <span className="stat-numeral text-txt">{l.value}</span>
                </motion.div>
              ))}
            </div>
            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { duration: 0.3 } },
              }}
              className="mt-4 flex items-baseline justify-between border-t border-line pt-4"
            >
              <span className="hud-label text-xp">total</span>
              <span className="stat-numeral text-3xl text-xp">
                +<CountUp value={total} />
              </span>
            </motion.div>
          </CornerPanel>
        </motion.div>

        {/* world-unlock banner (this boss gates T2) */}
        {firstClear && track.id === 't1' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.4, ease: EASE }}
            className="mx-auto mt-6 max-w-[480px] rounded-lg border border-success/40 bg-success/10 px-5 py-3"
          >
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-success">
              world unlocked — sequences, attention, transformers
            </p>
          </motion.div>
        )}

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.4, ease: EASE }}
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
        >
          <GlowButton color="#FBBF24" onClick={() => navigate('/map')}>
            next world <ChevronRight className="size-4" />
          </GlowButton>
          <button
            type="button"
            onClick={onReplay}
            className="rounded-lg border border-line px-6 py-3.5 font-mono text-[13px] font-bold uppercase tracking-[0.14em] text-txt-dim transition-colors hover:border-xp/60 hover:text-xp"
          >
            replay boss
          </button>
          <Link
            to="/"
            className="font-mono text-[12px] lowercase text-txt-faint underline-offset-4 transition-colors hover:text-txt-dim hover:underline"
          >
            deck
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
