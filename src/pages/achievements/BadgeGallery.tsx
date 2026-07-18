import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ACHIEVEMENTS, type AchievementDef } from '@/lib/game/achievements';
import type { SaveFile } from '@/lib/game/types';
import { cn } from '@/lib/utils';
import Reveal from './Reveal';
import {
  BADGE_ICONS,
  CATEGORY_COLORS,
  badgeMeta,
  type BadgeCategory,
} from './badges';

/**
 * Section 4 — Badge Gallery (achievements.md §4): filter tabs
 * (ALL/PROGRESS/MASTERY/STREAKS/SECRET) + counter, grid of 150px badge
 * cards. Unlocked: icon in category-colored ring, name, date, +XP chip,
 * glow. Locked: 35% opacity, `?` glyph, SECRET hides the name behind `???`,
 * quantitative badges show a progress bar. Click → detail popover.
 */

const FILTERS: { value: 'all' | BadgeCategory; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'progress', label: 'PROGRESS' },
  { value: 'mastery', label: 'MASTERY' },
  { value: 'streaks', label: 'STREAKS' },
  { value: 'secret', label: 'SECRET' },
];

/** one-time shine sweep for badges unlocked in the last 5 minutes */
const NEW_WINDOW_MS = 5 * 60 * 1000;
/** module-load timestamp: "new" is measured against this visit, not per-render now */
const VISIT_STARTED_AT = Date.now();

function BadgeCard({
  def,
  save,
}: {
  def: AchievementDef;
  save: SaveFile;
}) {
  const meta = badgeMeta(def.id);
  const color = CATEGORY_COLORS[meta.category];
  const Icon = BADGE_ICONS[def.icon] ?? BADGE_ICONS.Trophy;
  const unlockedAt = save.achievements[def.id];
  const unlocked = unlockedAt != null;
  const isSecretLocked = meta.category === 'secret' && !unlocked;
  const prog = !unlocked && meta.progress ? meta.progress(save) : null;
  const isNew = unlocked && VISIT_STARTED_AT - new Date(unlockedAt).getTime() < NEW_WINDOW_MS;
  const name = isSecretLocked ? '???' : def.name;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'panel relative flex h-[150px] w-full flex-col items-center justify-center gap-2 overflow-hidden p-4 text-center transition-transform duration-200 ease-expo-out hover:-translate-y-1',
            !unlocked && 'opacity-35',
          )}
          style={
            unlocked
              ? { boxShadow: `0 0 24px color-mix(in srgb, ${color} 18%, transparent), inset 0 1px 0 rgba(255,255,255,.04)` }
              : undefined
          }
          aria-label={
            unlocked
              ? `${def.name} — unlocked, ${def.desc}`
              : isSecretLocked
                ? 'secret badge — locked'
                : `${def.name} — locked, ${def.desc}`
          }
        >
          {/* icon ring */}
          <span
            className="flex size-[52px] items-center justify-center rounded-full"
            style={{
              border: `2px solid ${unlocked ? color : '#24243A'}`,
              boxShadow: unlocked ? `0 0 14px color-mix(in srgb, ${color} 35%, transparent)` : undefined,
            }}
          >
            {unlocked ? (
              <Icon size={26} style={{ color }} strokeWidth={1.8} />
            ) : (
              <span className="font-mono text-[20px] text-txt-faint">?</span>
            )}
          </span>
          <span className="font-display text-[15px] font-semibold leading-tight text-txt">{name}</span>
          {unlocked ? (
            <span className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-txt-faint">
                {format(new Date(unlockedAt), 'yyyy-MM-dd')}
              </span>
              <span className="rounded-full border border-xp/40 bg-xp/10 px-1.5 py-px font-mono text-[10px] text-xp">
                +{def.xp} xp
              </span>
            </span>
          ) : isSecretLocked ? (
            <span className="line-clamp-2 font-mono text-[11px] lowercase leading-snug text-txt-faint">
              {meta.hint}
            </span>
          ) : prog ? (
            <span className="w-full px-1">
              <span className="block h-[4px] w-full overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(prog.cur / prog.max) * 100}%`, backgroundColor: color }}
                />
              </span>
              <span className="mt-1 block font-mono text-[10px] lowercase text-txt-faint">{prog.label}</span>
            </span>
          ) : (
            <span className="line-clamp-2 font-mono text-[11px] lowercase leading-snug text-txt-faint">
              {def.desc}
            </span>
          )}
          {/* one-time shine sweep for freshly unlocked badges */}
          {isNew && (
            <span aria-hidden className="badge-shine pointer-events-none absolute inset-0">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 border-line bg-surface-2 p-4" sideOffset={8}>
        <div className="flex items-center gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full"
            style={{ border: `2px solid ${color}` }}
          >
            <Icon size={18} style={{ color }} strokeWidth={1.8} />
          </span>
          <div>
            <p className="font-display text-[15px] font-semibold text-txt">{name}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-txt-faint">
              {meta.category}
            </p>
          </div>
        </div>
        {(isSecretLocked ? meta.hint : meta.flavor) && (
          <p className="mt-3 text-[13px] leading-relaxed text-txt-dim">
            {isSecretLocked ? meta.hint : meta.flavor}
          </p>
        )}
        <p className="mt-2 font-mono text-[12px] lowercase text-txt-faint">unlock: {def.desc}</p>
        {unlocked ? (
          <p className="mt-1.5 font-mono text-[12px] lowercase text-xp">
            unlocked {format(new Date(unlockedAt), 'MMM d, yyyy')} · +{def.xp} xp awarded
          </p>
        ) : prog ? (
          <p className="mt-1.5 font-mono text-[12px] lowercase text-txt-dim">
            progress: {prog.label}
          </p>
        ) : (
          <p className="mt-1.5 font-mono text-[12px] lowercase text-txt-faint">locked</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function BadgeGallery({ save }: { save: SaveFile }) {
  const [filter, setFilter] = useState<'all' | BadgeCategory>('all');
  const unlockedCount = Object.keys(save.achievements).length;

  const filtered = useMemo(
    () =>
      ACHIEVEMENTS.filter(
        (a) => filter === 'all' || badgeMeta(a.id).category === filter,
      ),
    [filter],
  );

  return (
    <section className="py-20 md:py-24" aria-label="badge gallery">
      <style>{`
        .badge-shine > span { animation: badge-shine-sweep 900ms cubic-bezier(.22,1,.36,1) 300ms 1 forwards; }
        @keyframes badge-shine-sweep { to { transform: translateX(100%); } }
      `}</style>
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <Reveal className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-[22px] font-semibold text-txt">achievements</h3>
            <p className="mt-1 font-mono text-[13px] lowercase text-txt-dim">
              the trophy room — {ACHIEVEMENTS.length} badges on the wall
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList className="h-auto rounded-full border border-line bg-surface p-1">
                {FILTERS.map((f) => (
                  <TabsTrigger
                    key={f.value}
                    value={f.value}
                    className="h-auto rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-txt-dim data-[state=active]:bg-surface-2 data-[state=active]:text-txt data-[state=active]:shadow-none"
                  >
                    {f.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <span className="stat-numeral text-[14px] text-xp">
              {unlockedCount}/{ACHIEVEMENTS.length}
            </span>
          </div>
        </Reveal>

        <motion.div layout className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((def, i) => (
              <motion.div
                key={def.id}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 9) * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                <BadgeCard def={def} save={save} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
