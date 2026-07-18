import { motion } from 'framer-motion';
import { BookOpen, FlaskConical, ListChecks, Swords } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { RANKS, rankForXp } from '@/lib/game/ranks';
import { TRACKS } from '@/lib/game/tracks';
import { FLAME_COLORS, useReducedMotion } from '@/lib/game/format';
import { useSaveStore } from '@/lib/game/save';
import { cn } from '@/lib/utils';
import Reveal from '../achievements/Reveal';

/**
 * Section 3 — How to Play (about.md §3): the loop (READ → PLAY → PROVE →
 * CONQUER) as four numbered CornerPanel steps; rules reference as a
 * single-open Accordion: xp & ranks · streaks & combos · unlock rules ·
 * fair play.
 */

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const STEPS = [
  {
    n: '01',
    name: 'READ',
    icon: BookOpen,
    color: '#22D3EE',
    lines: 'the briefing, the eli-engineer, the field notes. every section you finish pays out.',
    chip: '+10 xp / section',
  },
  {
    n: '02',
    name: 'PLAY',
    icon: FlaskConical,
    color: '#4ADE80',
    lines: 'every level hides an interactive lab. drag it, break it, watch the idea move.',
    chip: '+25 xp / lab',
  },
  {
    n: '03',
    name: 'PROVE',
    icon: ListChecks,
    color: '#FBBF24',
    lines: 'pass the checkpoint quiz (≥80%) to master the paper. retries are free.',
    chip: '+100 xp / paper',
  },
  {
    n: '04',
    name: 'CONQUER',
    icon: Swords,
    color: '#FB7185',
    lines: 'clear the track boss — 10 questions, 3 hearts — to open the next world.',
    chip: '+300 xp / boss',
  },
];

const XP_TABLE: [string, string][] = [
  ['read a content section (7 per paper)', '+10'],
  ['complete the interactive lab', '+25'],
  ['correct quiz answer', '+20 × combo'],
  ['perfect quiz (100%, first try)', '+50'],
  ['paper mastered (quiz ≥ 80%)', '+100'],
  ['correct boss answer', '+30 × combo'],
  ['boss victory', '+300'],
  ['flawless boss (no hearts lost)', '+150'],
  ['first meaningful action of the day', '+25'],
  ['achievement unlock', '+50–200'],
];

const FLAME_TIERS: [string, string, string][] = [
  ['ember', '1–2 days', FLAME_COLORS.ember],
  ['flame', '3–6 days', FLAME_COLORS.flame],
  ['blaze', '7–13 days', FLAME_COLORS.blaze],
  ['inferno', '14+ days', FLAME_COLORS.inferno],
];

function XpRanksPanel() {
  const xp = useSaveStore((s) => s.xp);
  const current = rankForXp(xp);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="micro-label mb-2 text-txt-faint">xp economy</p>
        <div className="overflow-hidden rounded-lg border border-line">
          {XP_TABLE.map(([action, reward], i) => (
            <div
              key={action}
              className={cn(
                'flex items-center justify-between gap-4 px-3.5 py-2 font-mono text-[12.5px] lowercase',
                i % 2 === 0 ? 'bg-surface' : 'bg-surface-2/50',
              )}
            >
              <span className="text-txt-dim">{action}</span>
              <span className="stat-numeral shrink-0 text-xp">{reward}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="micro-label mb-2 text-txt-faint">ranks</p>
        <div className="overflow-hidden rounded-lg border border-line">
          {RANKS.map((r, i) => {
            const isCurrent = r.n === current.n;
            return (
              <div
                key={r.n}
                className={cn(
                  'flex items-center justify-between gap-4 px-3.5 py-2 font-mono text-[12.5px]',
                  i % 2 === 0 ? 'bg-surface' : 'bg-surface-2/50',
                  isCurrent && 'bg-xp/10',
                )}
              >
                <span className={cn('lowercase', isCurrent ? 'text-xp' : 'text-txt-dim')}>
                  {String(r.n).padStart(2, '0')} · {r.name.toLowerCase()}
                  {isCurrent && <span className="ml-2 text-[11px]">← you</span>}
                </span>
                <span className={cn('stat-numeral shrink-0', isCurrent ? 'text-xp' : 'text-txt-faint')}>
                  {r.xp.toLocaleString('en-US')} xp
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StreaksCombosPanel() {
  return (
    <div className="flex flex-col gap-5 font-mono text-[13px] lowercase leading-relaxed text-txt-dim">
      <div>
        <p className="micro-label mb-2 text-txt-faint">streaks</p>
        <p>
          a day counts when you do ≥1 meaningful action — read a section, finish a lab, or answer a
          quiz question. miss a day and the streak resets to 0. one streak freeze is granted per
          7-day streak, and is spent automatically to save the flame.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FLAME_TIERS.map(([name, range, color]) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px]"
            >
              <span className="size-[7px] rounded-full" style={{ backgroundColor: color }} />
              {name} <span className="text-txt-faint">{range}</span>
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="micro-label mb-2 text-txt-faint">combos</p>
        <p>
          consecutive correct answers (in any quiz or boss) build a combo. the xp multiplier is{' '}
          <span className="text-txt">mult = 1 + 0.25 × combo</span>, capped at{' '}
          <span className="text-xp">×2.0</span>. a wrong answer shatters the combo — no xp lost,
          just the multiplier. your best combo is kept as a stat.
        </p>
      </div>
    </div>
  );
}

function UnlockRulesPanel() {
  const gates: { after: number; label: string }[] = [
    { after: 1, label: 'gate: clear the t1 boss' },
    { after: 2, label: 'gate: any 6 papers mastered — opens t3 + t4' },
    { after: 4, label: 'gate: any 14 papers mastered' },
  ];
  return (
    <div className="flex flex-col gap-5 font-mono text-[13px] lowercase leading-relaxed text-txt-dim">
      <div className="relative ml-2 flex flex-col gap-0 border-l border-line pl-5">
        {TRACKS.map((t, i) => (
          <div key={t.id}>
            <div className="relative flex items-center gap-2.5 py-2">
              <span
                className="absolute -left-[26px] size-[9px] rounded-full"
                style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}` }}
              />
              <span className="text-txt">
                t{t.num} {t.short.toLowerCase()}
              </span>
              <span className="text-txt-faint">
                — {t.id === 't1' ? 'open from the start' : t.unlockHint}
                {t.id === 't5' && ' · +2 ★ bonus after scaling laws'}
              </span>
            </div>
            {gates
              .filter((g) => g.after === i + 1)
              .map((g) => (
                <div key={g.label} className="py-1">
                  <span className="rounded-full border border-xp/40 bg-xp/10 px-2.5 py-1 text-[11px] text-xp">
                    {g.label}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
      <ul className="flex list-none flex-col gap-1.5">
        <li>▸ linear within a track: paper n requires paper n−1 mastered.</li>
        <li>▸ a track's boss node unlocks when every paper in that track is mastered.</li>
        <li>▸ bonus papers ★31–32 attach to track 5; each requires scaling laws (★30) mastered.</li>
      </ul>
    </div>
  );
}

function FairPlayPanel() {
  return (
    <ul className="flex list-none flex-col gap-2 font-mono text-[13px] lowercase leading-relaxed text-txt-dim">
      <li>▸ no xp or progress is ever lost — the game only rewards.</li>
      <li>▸ quizzes draw 5 of 8 questions, reshuffled every attempt.</li>
      <li>▸ fail a checkpoint → review pointers to your weakest sections, then a free instant retry.</li>
      <li>▸ bosses cost 3 hearts; defeat shows per-paper review links. try again whenever.</li>
      <li className="pt-1 text-txt">▸ the only losing move is closing the tab.</li>
    </ul>
  );
}

export default function HowToPlay() {
  const reduced = useReducedMotion();
  return (
    <section className="py-20 md:py-24" aria-label="how to play">
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <Reveal>
          <h2 className="font-display text-[clamp(26px,4vw,32px)] font-semibold text-txt">how to play</h2>
          <p className="mt-1 font-mono text-[13px] lowercase text-txt-dim">
            {'// read → play → prove → conquer'}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-12 lg:grid-cols-2">
          {/* the loop */}
          <div className="flex flex-col gap-5">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const card = (
                <CornerPanel cornerColor={step.color} className="flex items-start gap-5 p-5 sm:p-6">
                  <span className="stat-numeral mt-0.5 text-[22px]" style={{ color: step.color }}>
                    {step.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="hud-label flex items-center gap-2 text-[14px] text-txt">
                        <Icon size={16} style={{ color: step.color }} />
                        {step.name}
                      </span>
                      <span
                        className="rounded-full border px-2.5 py-1 font-mono text-[11px]"
                        style={{
                          color: step.color,
                          borderColor: `color-mix(in srgb, ${step.color} 40%, transparent)`,
                          backgroundColor: `color-mix(in srgb, ${step.color} 8%, transparent)`,
                        }}
                      >
                        {step.chip}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-[13px] lowercase leading-relaxed text-txt-dim">
                      {step.lines}
                    </p>
                  </div>
                </CornerPanel>
              );
              if (reduced) return <div key={step.n}>{card}</div>;
              return (
                <motion.div
                  key={step.n}
                  initial={{ y: 28, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
                >
                  {card}
                </motion.div>
              );
            })}
          </div>

          {/* rules accordion */}
          <Reveal delay={0.1}>
            <Accordion type="single" collapsible defaultValue="xp-ranks" className="rounded-xl border border-line bg-surface px-5">
              <AccordionItem value="xp-ranks" className="border-line">
                <AccordionTrigger className="hud-label py-5 text-[13px] text-txt hover:no-underline">
                  xp & ranks
                </AccordionTrigger>
                <AccordionContent>
                  <XpRanksPanel />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="streaks-combos" className="border-line">
                <AccordionTrigger className="hud-label py-5 text-[13px] text-txt hover:no-underline">
                  streaks & combos
                </AccordionTrigger>
                <AccordionContent>
                  <StreaksCombosPanel />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="unlock-rules" className="border-line">
                <AccordionTrigger className="hud-label py-5 text-[13px] text-txt hover:no-underline">
                  unlock rules
                </AccordionTrigger>
                <AccordionContent>
                  <UnlockRulesPanel />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="fair-play" className="border-line">
                <AccordionTrigger className="hud-label py-5 text-[13px] text-txt hover:no-underline">
                  fair play
                </AccordionTrigger>
                <AccordionContent>
                  <FairPlayPanel />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
