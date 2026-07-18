import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useUiStore } from '@/lib/game/ui';
import { fireLevelUp } from '@/lib/game/confetti';
import { sfx } from '@/lib/game/sound';
import RankBadge from './RankBadge';

/**
 * LevelUpModal — rank-up overlay (design.md §4.2/§12): full-screen
 * --void/90%, radial gold glow, rank emblem spring-in, `RANK UP` hud label,
 * old→new rank names, CTA `CONTINUE`. Mount once inside Layout; driven by
 * the ui store's levelUp queue.
 */

export default function LevelUpModal() {
  const levelUp = useUiStore((s) => s.levelUp);
  const close = useUiStore((s) => s.closeLevelUp);

  useEffect(() => {
    if (levelUp) {
      fireLevelUp();
      sfx.levelUp();
    }
  }, [levelUp]);

  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-void/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="Rank up"
        >
          {/* radial gold glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(circle at 50% 45%, rgba(251,191,36,0.16), transparent 55%)' }}
          />
          <div className="relative flex flex-col items-center gap-5 px-6 text-center">
            <span className="hud-label text-xp text-glow-gold">rank up</span>
            <motion.div
              initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            >
              <RankBadge rank={levelUp.newRank} size={104} />
            </motion.div>
            <div className="flex items-center gap-3 font-mono text-[13px] uppercase tracking-[0.14em]">
              <span className="text-txt-faint line-through decoration-danger/60">{levelUp.oldRank.name}</span>
              <ArrowRight size={14} className="text-xp" />
              <span className="text-xp">{levelUp.newRank.name}</span>
            </div>
            <p className="max-w-[38ch] font-mono text-[12px] lowercase text-txt-dim">
              {levelUp.newRank.n >= 10
                ? 'the full ladder. carmack would be proud.'
                : 'new clearance granted. the map grows.'}
            </p>
            <button
              onClick={close}
              className="hud-label mt-2 rounded-lg border border-xp/50 bg-xp/10 px-6 py-3 text-xp transition-all duration-200 hover:bg-xp/20 hover:shadow-glow-xp"
            >
              continue
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
