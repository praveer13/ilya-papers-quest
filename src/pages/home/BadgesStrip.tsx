import { Link } from 'react-router';
import { motion } from 'framer-motion';
import {
  ArrowRight, BadgeCheck, BookOpen, Crown, Download, Droplet, FlaskConical, Flame, FlameKindling,
  Hash, Moon, Mountain, Rocket, Shield, Sparkles, Sunrise, Target, Timer, Trophy, Zap,
} from 'lucide-react';
import Reveal from './Reveal';
import { useSaveStore } from '@/lib/game/save';
import { ACHIEVEMENTS, achievementById } from '@/lib/game/achievements';
import { formatInt } from '@/lib/game/format';
import { cn } from '@/lib/utils';

/**
 * Section 7 — Achievements Preview Strip (home.md): 4 most recently unlocked
 * badges (88 px) + XP total chip; locked slots are `?` silhouettes (30%
 * opacity) with unlock hint on hover. Badges pop with spring stagger.
 */

const ICONS: Record<string, typeof Trophy> = {
  Droplet, Flame, Hash, Mountain, Crown, Sparkles, Trophy, Shield, Timer, Target, Zap,
  FlameKindling, Rocket, BookOpen, FlaskConical, Moon, Sunrise, Download, BadgeCheck,
};

export default function BadgesStrip() {
  const unlocked = useSaveStore((s) => s.achievements);
  const xp = useSaveStore((s) => s.xp);

  const recent = Object.entries(unlocked)
    .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
    .slice(0, 4)
    .map(([id]) => achievementById(id))
    .filter((a): a is NonNullable<typeof a> => !!a);

  const slots = [...recent];
  while (slots.length < 4) {
    // next locked achievements as silhouettes
    const nextLocked = ACHIEVEMENTS.find((a) => !(a.id in unlocked) && !slots.some((s) => s?.id === a.id));
    slots.push(nextLocked as (typeof slots)[number]);
  }

  return (
    <section className="bg-abyss py-20 md:py-24" aria-label="latest badges">
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <Reveal className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-[22px] font-semibold text-txt">latest badges</h3>
          <Link
            to="/achievements"
            className="group inline-flex items-center gap-1.5 font-mono text-[13px] lowercase text-t1 transition-colors hover:text-focus"
          >
            all achievements
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>

        <div className="mt-8 flex flex-wrap items-center gap-5">
          {slots.map((a, i) => {
            const isUnlocked = a && a.id in unlocked;
            const Icon = a ? ICONS[a.icon] ?? Trophy : Trophy;
            return (
              <motion.div
                key={a?.id ?? `empty-${i}`}
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.08 * i }}
              >
                <Link
                  to="/achievements"
                  title={a ? (isUnlocked ? a.name : `locked: ${a.desc}`) : 'locked'}
                  className={cn(
                    'relative flex size-[88px] items-center justify-center overflow-hidden rounded-xl border',
                    isUnlocked
                      ? 'border-xp/50 bg-surface-2 shadow-glow-xp'
                      : 'border-line bg-surface opacity-40',
                  )}
                >
                  {isUnlocked ? (
                    <Icon size={34} className="text-xp" strokeWidth={1.6} />
                  ) : (
                    <>
                      <span className="font-mono text-[26px] text-txt-faint">?</span>
                      <span className="absolute inset-0 -translate-x-full animate-scan-shimmer bg-gradient-to-r from-transparent via-txt/10 to-transparent" />
                    </>
                  )}
                </Link>
              </motion.div>
            );
          })}

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.34 }}
            className="ml-auto rounded-full border border-xp/40 bg-xp/10 px-4 py-2 font-mono text-[13px] text-xp"
          >
            {formatInt(xp)} xp total
          </motion.div>
        </div>
      </div>
    </section>
  );
}
