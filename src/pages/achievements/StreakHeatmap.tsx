import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { addDays, format, startOfWeek } from 'date-fns';
import { Snowflake } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import StreakFlame from '@/components/game/StreakFlame';
import { useReducedMotion } from '@/lib/game/format';
import type { SaveFile } from '@/lib/game/types';
import Reveal from './Reveal';
import Tip from './Tip';

/**
 * Section 5 — Streak Heatmap (achievements.md §5): GitHub-style 7×12-week
 * contribution grid (14px cells, 3px gap), weeks start Monday. Intensity by
 * actions that day (1 = 25% · 2–3 = 50% · 4+ = 100% orange); today outlined.
 * Cells cascade column-by-column (6ms stagger, ~500ms total). Hover →
 * tooltip with the day's action count + XP.
 *
 * Data: `streak.history` marks active days; per-day action counts / XP are
 * derived from the activity log (capped at the 60 most recent events), so
 * older active days render at base intensity.
 */

const ORANGE = '#FB923C';
const WEEKS = 12;
const CELL = 14;
const GAP = 3;

interface DayCell {
  date: Date;
  key: string; // yyyy-MM-dd
  actions: number;
  xp: number;
  future: boolean;
  today: boolean;
}

function levelOf(actions: number): 0 | 1 | 2 | 3 {
  if (actions <= 0) return 0;
  if (actions === 1) return 1;
  if (actions <= 3) return 2;
  return 3;
}

const LEVEL_COLORS = [
  '#1A1A2C', // empty = --surface-2
  'rgba(251,146,60,0.28)',
  'rgba(251,146,60,0.55)',
  ORANGE,
] as const;

export default function StreakHeatmap({ save }: { save: SaveFile }) {
  const reduced = useReducedMotion();
  const streak = save.streak;

  const days = useMemo<DayCell[]>(() => {
    // per-day counters from the activity log (newest-first, capped at 60)
    const counters = new Map<string, { count: number; xp: number }>();
    for (const ev of save.activity) {
      const key = format(new Date(ev.at), 'yyyy-MM-dd');
      const cur = counters.get(key) ?? { count: 0, xp: 0 };
      cur.count += 1;
      cur.xp += ev.xp;
      counters.set(key, cur);
    }
    const history = new Set(streak.history);
    const today = new Date();
    const thisMonday = startOfWeek(today, { weekStartsOn: 1 });
    const start = addDays(thisMonday, -(WEEKS - 1) * 7);
    const todayKey = format(today, 'yyyy-MM-dd');
    return Array.from({ length: WEEKS * 7 }, (_, i) => {
      const date = addDays(start, i);
      const key = format(date, 'yyyy-MM-dd');
      const counter = counters.get(key);
      const actions = counter?.count ?? (history.has(key) ? 1 : 0);
      return {
        date,
        key,
        actions,
        xp: counter?.xp ?? 0,
        future: key > todayKey,
        today: key === todayKey,
      };
    });
  }, [save.activity, streak.history]);

  const tipText = (d: DayCell): string => {
    const label = format(d.date, 'MMM d');
    if (d.future) return `${label} — the future, unwritten`;
    if (d.actions <= 0) return `${label} — no activity`;
    return d.xp > 0
      ? `${label} — ${d.actions} action${d.actions === 1 ? '' : 's'} · ${d.xp} xp`
      : `${label} — active`;
  };

  return (
    <section className="py-20 md:py-24" aria-label="streak heatmap">
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <Reveal className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-[22px] font-semibold text-txt">streak</h3>
            <p className="mt-1 font-mono text-[13px] lowercase text-txt-dim">
              one meaningful action a day keeps the weights warm
            </p>
          </div>
          <div className="flex items-center gap-4 font-mono text-[13px] lowercase text-txt-dim">
            <StreakFlame count={streak.count} size={20} />
            <span>
              <span className="stat-numeral text-txt">{streak.count}</span> day streak
            </span>
            <span className="text-txt-faint">best: {streak.best}</span>
            <span className="inline-flex items-center gap-1 text-txt-faint" title="streak freezes">
              <Snowflake size={13} className="text-focus" />
              {streak.freezes}
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <CornerPanel cornerColor={ORANGE} className="mt-10 overflow-x-auto p-5 sm:p-7">
            <div
              role="grid"
              aria-label="activity heatmap, last 12 weeks"
              className="mx-auto grid w-fit grid-flow-col grid-rows-7"
              style={{ gap: GAP }}
            >
              {days.map((d, i) => {
                const cell = (
                  <div
                    role="gridcell"
                    aria-label={tipText(d)}
                    tabIndex={0}
                    className="rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    style={{
                      width: CELL,
                      height: CELL,
                      backgroundColor: LEVEL_COLORS[levelOf(d.actions)],
                      opacity: d.future ? 0.25 : 1,
                      outline: d.today ? '1px solid rgba(232,234,244,0.75)' : undefined,
                      outlineOffset: d.today ? 1 : undefined,
                    }}
                  />
                );
                if (reduced) {
                  return (
                    <Tip key={d.key} label={tipText(d)}>
                      {cell}
                    </Tip>
                  );
                }
                return (
                  <motion.div
                    key={d.key}
                    initial={{ opacity: 0, scale: 0.4 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.25, delay: i * 0.006, ease: 'easeOut' }}
                  >
                    <Tip label={tipText(d)}>
                      {d.today ? (
                        <motion.span
                          className="block rounded-[3px]"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 0.5, delay: 0.7, ease: 'easeInOut' }}
                        >
                          {cell}
                        </motion.span>
                      ) : (
                        cell
                      )}
                    </Tip>
                  </motion.div>
                );
              })}
            </div>
            {/* legend */}
            <motion.div
              className="mt-4 flex items-center justify-end gap-1.5 font-mono text-[11px] lowercase text-txt-faint"
              initial={reduced ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.65 }}
            >
              <span className="mr-1">less</span>
              {LEVEL_COLORS.map((c) => (
                <span
                  key={c}
                  className="rounded-[3px]"
                  style={{ width: CELL - 4, height: CELL - 4, backgroundColor: c }}
                />
              ))}
              <span className="ml-1">more</span>
              <span className="ml-4 hidden sm:inline">last 12 weeks · weeks start monday</span>
            </motion.div>
          </CornerPanel>
        </Reveal>
      </div>
    </section>
  );
}
