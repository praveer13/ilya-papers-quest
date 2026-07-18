import { useNavigate } from 'react-router';
import { Snowflake } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import RankBadge from '@/components/game/RankBadge';
import XPBar from '@/components/game/XPBar';
import StreakFlame from '@/components/game/StreakFlame';
import ProgressRing from '@/components/game/ProgressRing';
import CountUp from '@/components/game/CountUp';
import Reveal from './Reveal';
import { useSaveStore } from '@/lib/game/save';
import { nextRank, rankForXp, rankProgress, RANKS } from '@/lib/game/ranks';
import { masteredCount, percentOfWhatMatters } from '@/lib/game/unlocks';

/**
 * Section 3 — Command Deck (home.md): 4 stat cards live from the save file.
 * Rank card spans 2 cols with ladder tooltip; 90% ProgressRing; streak;
 * accuracy. Zero-state hints when the save is fresh. Click → /achievements.
 */
export default function CommandDeck() {
  const navigate = useNavigate();
  const xp = useSaveStore((s) => s.xp);
  const streak = useSaveStore((s) => s.streak);
  const stats = useSaveStore((s) => s.stats);
  const mastered = useSaveStore((s) => masteredCount(s, { canonicalOnly: true }));
  const pct = useSaveStore((s) => percentOfWhatMatters(s));

  const rank = rankForXp(xp);
  const next = nextRank(xp);
  const prog = rankProgress(xp);
  const fresh = xp === 0 && mastered === 0;
  const accuracy = stats.totalAnswers > 0 ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100) : 0;

  const go = () => navigate('/achievements');

  return (
    <section className="bg-void py-24 md:py-32" aria-label="command deck">
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-[30px] font-semibold text-txt md:text-[36px]">command deck</h2>
          <span className="micro-label text-txt-faint">{'// live from your save file'}</span>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* rank card (span 2) */}
          <Reveal className="sm:col-span-2" delay={0}>
            <div className="group relative h-full" title={RANKS.map((r) => `${r.n}. ${r.name} — ${r.xp.toLocaleString()} xp`).join('\n')}>
              <CornerPanel
                cornerColor="#FBBF24"
                className="h-full cursor-pointer p-6 transition-all duration-200 hover:border-xp/40"
                onClick={go}
              >
                <span className="micro-label text-txt-faint">rank</span>
                <div className="mt-4 flex items-center gap-4">
                  <RankBadge rank={rank} size={56} />
                  <div>
                    <h3 className="font-display text-[22px] font-semibold text-txt">{rank.name}</h3>
                    <p className="font-mono text-[12px] lowercase text-txt-dim">
                      next: {next ? next.name : '— max —'}
                    </p>
                  </div>
                </div>
                <XPBar className="mt-6" current={prog.current} needed={prog.needed} />
                {fresh && <p className="micro-label mt-3 text-txt-faint">master paper 01 to light this up</p>}
              </CornerPanel>
            </div>
          </Reveal>

          {/* 90% meter card */}
          <Reveal delay={0.08}>
            <CornerPanel cornerColor="#FBBF24" className="h-full cursor-pointer p-6 text-center" onClick={go}>
              <span className="micro-label text-txt-faint">the 90% meter</span>
              <div className="mt-4 flex justify-center">
                <ProgressRing value={pct / 100} size={140} />
              </div>
              <p className="mt-4 font-mono text-[12px] lowercase text-txt-dim">
                <CountUp value={mastered} /> / 30 papers mastered
              </p>
            </CornerPanel>
          </Reveal>

          {/* streak card */}
          <Reveal delay={0.16}>
            <CornerPanel cornerColor="#FB923C" className="h-full cursor-pointer p-6" onClick={go}>
              <span className="micro-label text-txt-faint">streak</span>
              <div className="mt-4 flex items-center gap-3">
                <span className="inline-block animate-ignite">
                  <StreakFlame count={streak.count} size={40} showCount={false} />
                </span>
                <CountUp value={streak.count} className="stat-numeral text-[40px] text-txt" />
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-[12px] lowercase text-txt-dim">
                <span>best: {streak.best}</span>
                <span className="inline-flex items-center gap-1">
                  <Snowflake size={12} className="text-focus" /> {streak.freezes}
                </span>
              </div>
            </CornerPanel>
          </Reveal>

          {/* accuracy card */}
          <Reveal delay={0.24}>
            <CornerPanel cornerColor="#34D399" className="h-full cursor-pointer p-6" onClick={go}>
              <span className="micro-label text-txt-faint">accuracy</span>
              <div className="mt-4">
                <CountUp value={accuracy} format={(n) => `${n}%`} className="stat-numeral text-[40px] text-success" />
              </div>
              <p className="mt-3 font-mono text-[12px] lowercase text-txt-dim">
                {stats.totalAnswers} answers · best combo ×{stats.bestCombo}
              </p>
              {fresh && <p className="micro-label mt-3 text-txt-faint">master paper 01 to light this up</p>}
            </CornerPanel>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
