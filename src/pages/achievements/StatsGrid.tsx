import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Flame, Heart, Skull, Target, Zap } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import CountUp from '@/components/game/CountUp';
import { PAPERS } from '@/lib/game/papers';
import { TRACKS } from '@/lib/game/tracks';
import { isBossCleared, masteredCount } from '@/lib/game/unlocks';
import { rankForXp } from '@/lib/game/ranks';
import { formatInt, useReducedMotion } from '@/lib/game/format';
import type { SaveFile } from '@/lib/game/types';
import Reveal from './Reveal';
import Tip from './Tip';

/**
 * Section 3 — Stats Grid (achievements.md §3): 6 CornerPanel stat cards
 * (3 → 2 → 1 cols) with icon + stat number + micro label + sub-stat.
 * Numbers count up 900 ms (staggered by card); hover → raw-value tooltip.
 */

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

function fmtTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** 32-segment papers bar — each segment colored by its paper's track */
function PaperSegments({ save }: { save: SaveFile }) {
  const reduced = useReducedMotion();
  return (
    <div className="mt-3 flex gap-[3px]" aria-hidden>
      {PAPERS.map((p, i) => {
        const mastered = save.papers[p.slug]?.mastered === true;
        const color = TRACKS.find((t) => t.id === p.track)!.color;
        const seg = (
          <span
            className="h-[6px] flex-1 rounded-[2px]"
            style={{ backgroundColor: mastered ? color : '#1A1A2C' }}
          />
        );
        if (reduced || !mastered) return <span key={p.slug}>{seg}</span>;
        return (
          <motion.span
            key={p.slug}
            className="flex-1"
            initial={{ opacity: 0.15 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            {seg}
          </motion.span>
        );
      })}
    </div>
  );
}

function BossHearts({ save }: { save: SaveFile }) {
  return (
    <div className="mt-3 flex items-center gap-3" aria-hidden>
      {TRACKS.map((t) => {
        const cleared = isBossCleared(save, t.id);
        return cleared ? (
          <Skull key={t.id} size={18} style={{ color: t.color }} strokeWidth={2} />
        ) : (
          <Heart key={t.id} size={18} className="text-txt-faint" strokeWidth={1.8} />
        );
      })}
    </div>
  );
}

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tip: string;
  delay: number;
}

function StatCard({ icon, label, value, sub, tip, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      <Tip label={tip} className="block h-full">
        <CornerPanel className="h-full p-5">
          <div className="flex items-center justify-between">
            <span className="micro-label text-txt-faint">{label}</span>
            {icon}
          </div>
          <div className="stat-numeral mt-3 text-[clamp(28px,4vw,40px)] leading-none text-txt">{value}</div>
          {sub && <div className="mt-2 font-mono text-[12px] lowercase text-txt-dim">{sub}</div>}
        </CornerPanel>
      </Tip>
    </motion.div>
  );
}

export default function StatsGrid({ save }: { save: SaveFile }) {
  const { stats } = save;
  const mastered = masteredCount(save);
  const bosses = TRACKS.filter((t) => isBossCleared(save, t.id)).length;
  const accuracy =
    stats.totalAnswers > 0 ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100) : null;
  const rank = rankForXp(save.xp);

  return (
    <section className="bg-abyss py-20 md:py-24" aria-label="lifetime stats">
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <Reveal>
          <h3 className="font-display text-[22px] font-semibold text-txt">lifetime stats</h3>
          <p className="mt-1 font-mono text-[13px] lowercase text-txt-dim">
            the character sheet — every number earned, none given
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={<Zap size={18} className="text-xp" />}
            label="total xp"
            value={<CountUp value={save.xp} className="text-xp" />}
            sub={`rank ${rank.n} · ${rank.name.toLowerCase()}`}
            tip={`${formatInt(save.xp)} xp earned`}
            delay={0}
          />
          <StatCard
            icon={<Target size={18} className="text-success" />}
            label="accuracy"
            value={
              accuracy === null ? (
                <span className="text-txt-faint">--</span>
              ) : (
                <CountUp value={accuracy} format={(n) => `${n}%`} />
              )
            }
            sub={`${formatInt(stats.totalAnswers)} answers`}
            tip={
              stats.totalAnswers > 0
                ? `${formatInt(stats.correctAnswers)} correct / ${formatInt(stats.totalAnswers)} total`
                : 'no answers yet — go take a quiz'
            }
            delay={0.07}
          />
          <StatCard
            icon={<Flame size={18} className="text-t4" />}
            label="best combo"
            value={<CountUp value={stats.bestCombo} format={(n) => `×${n}`} />}
            sub="multiplier cap ×2.0"
            tip={`best combo ×${stats.bestCombo} · mult = 1 + 0.25 × combo`}
            delay={0.14}
          />
          <StatCard
            icon={<BookOpen size={18} className="text-t1" />}
            label="papers mastered"
            value={
              <>
                <CountUp value={mastered} />
                <span className="text-txt-faint">/32</span>
              </>
            }
            sub={<PaperSegments save={save} />}
            tip={`${mastered}/32 papers mastered (30 canonical + 2 bonus)`}
            delay={0.21}
          />
          <StatCard
            icon={<Skull size={18} className="text-danger" />}
            label="bosses slain"
            value={
              <>
                <CountUp value={bosses} />
                <span className="text-txt-faint">/5</span>
              </>
            }
            sub={<BossHearts save={save} />}
            tip={`${bosses}/5 track bosses cleared`}
            delay={0.28}
          />
          <StatCard
            icon={<Clock size={18} className="text-t2" />}
            label="time in the game"
            value={<CountUp value={stats.totalTimeMs} format={fmtTime} />}
            sub="tracked in your browser"
            tip={`${formatInt(stats.totalTimeMs)} ms in paper & boss pages`}
            delay={0.35}
          />
        </div>
      </div>
    </section>
  );
}
