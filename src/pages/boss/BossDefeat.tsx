/**
 * Screen 4 — Defeat (boss.md): calm, never punishing. SIGNAL LOST, hearts
 * refilling, review panel of the missed papers (review → links), RETRY /
 * REVIEW & RETURN CTAs. No shakes, no red flashes.
 */
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Heart } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import { fileLabel, paperBySlug } from '@/lib/game/papers';
import { BOSS_HEARTS_MAX, type BossDef } from '@/data/bosses';
import { GlowButton } from './widgets';
import type { FightResult } from './combat';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function BossDefeat({
  boss,
  result,
  onRetry,
}: {
  boss: BossDef;
  result: FightResult;
  onRetry: () => void;
}) {
  const review = result.missedSlugs
    .map((slug) => paperBySlug(slug))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .slice(0, 3);

  return (
    <div className="relative flex min-h-[calc(100dvh-64px)] items-center justify-center overflow-hidden">
      <div className="grid-texture pointer-events-none absolute inset-0" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />
      <div className="vignette pointer-events-none absolute inset-0" />

      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="relative z-10 mx-auto w-full max-w-[620px] px-4 py-14 text-center sm:px-6"
      >
        <h1
          className="font-display text-[40px] font-bold text-danger sm:text-[48px]"
          style={{ textShadow: '0 0 28px rgba(251,113,133,.4)' }}
        >
          SIGNAL LOST
        </h1>
        <p className="mt-3 font-mono text-[13px] lowercase text-txt-dim">
          {boss.slug} stands. your progress is untouched.
        </p>

        {/* hearts refilling */}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {Array.from({ length: BOSS_HEARTS_MAX }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.2, type: 'spring', stiffness: 260, damping: 18 }}
            >
              <Heart
                className="size-7 fill-danger text-danger"
                style={{ filter: 'drop-shadow(0 0 6px rgba(251,113,133,.6))' }}
              />
            </motion.span>
          ))}
        </div>
        <p className="mt-2 font-mono text-[11px] lowercase text-txt-faint">
          hearts restored · {result.correct} hits landed · best combo ×{result.bestCombo}
        </p>

        {/* review panel */}
        {review.length > 0 && (
          <CornerPanel cornerColor="#FB7185" className="mx-auto mt-8 max-w-[520px] px-6 py-5 text-left">
            <p className="hud-label text-danger">review the diff</p>
            <p className="micro-label mt-1 text-txt-faint">questions missed came from these files</p>
            <div className="mt-4 space-y-3">
              {review.map((p) => (
                <div key={p.slug} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="micro-label block text-txt-faint">{fileLabel(p)}</span>
                    <span className="block truncate text-[14px] font-medium text-txt">{p.title}</span>
                  </div>
                  <Link
                    to={`/paper/${p.slug}`}
                    className="inline-flex shrink-0 items-center gap-1 font-mono text-[12px] lowercase text-danger transition-colors hover:text-txt"
                  >
                    review <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </CornerPanel>
        )}

        {/* CTAs */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <GlowButton onClick={onRetry}>
            retry the boss <ChevronRight className="size-4" />
          </GlowButton>
          <Link
            to="/map"
            className="rounded-lg border border-line px-6 py-3.5 font-mono text-[13px] font-bold uppercase tracking-[0.14em] text-txt-dim transition-colors hover:border-danger/60 hover:text-txt"
          >
            review &amp; return
          </Link>
        </div>
        <p className="mt-4 font-mono text-[11px] lowercase text-txt-faint">
          retry is free. the guardian reshuffles its questions.
        </p>
      </motion.div>
    </div>
  );
}
