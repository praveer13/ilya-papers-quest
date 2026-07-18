import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import ProgressRing from '@/components/game/ProgressRing';
import RankBadge from '@/components/game/RankBadge';
import XPBar from '@/components/game/XPBar';
import CountUp from '@/components/game/CountUp';
import { useSaveStore } from '@/lib/game/save';
import { nextRank, rankForXp, rankProgress } from '@/lib/game/ranks';
import { ACHIEVEMENTS } from '@/lib/game/achievements';
import { isBossCleared, masteredCount, percentOfWhatMatters } from '@/lib/game/unlocks';
import { useReducedMotion } from '@/lib/game/format';
import { TRACKS } from '@/lib/game/tracks';
import type { SaveFile } from '@/lib/game/types';
import { identiconCells } from './identicon';

/**
 * Section 1 — Profile Header (achievements.md §1): gold CornerPanel with
 * generated identicon, inline-editable handle, rank + XPBar; big 180px
 * ProgressRing (the 90% meter) with papers/bosses/badges caption row.
 */

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

function Identicon({ handle, size = 96 }: { handle: string; size?: number }) {
  const cells = useMemo(() => identiconCells(handle), [handle]);
  const cell = size / 5;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`identicon for ${handle || 'player'}`}
      className="shrink-0 rounded-lg border border-line bg-surface-2"
      style={{ filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.25))' }}
    >
      {cells.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={(i % 5) * cell + 0.5}
            y={Math.floor(i / 5) * cell + 0.5}
            width={cell - 1}
            height={cell - 1}
            fill="#22D3EE"
            fillOpacity={0.92}
          />
        ) : null,
      )}
    </svg>
  );
}

/** handle characters split-rise (0.02 s stagger) — re-runs when text changes */
function SplitHandle({ text }: { text: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{text}</>;
  return (
    <span aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={`${text}-${i}`}
          aria-hidden
          className="inline-block"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 + i * 0.02, ease: EASE }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}
    </span>
  );
}

export default function ProfileHeader({ save }: { save: SaveFile }) {
  const setHandle = useSaveStore((s) => s.setHandle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const xp = save.xp;
  const rank = rankForXp(xp);
  const next = nextRank(xp);
  const prog = rankProgress(xp);
  const handle = save.profile.handle;

  const canonical = masteredCount(save, { canonicalOnly: true });
  const bosses = TRACKS.filter((t) => isBossCleared(save, t.id)).length;
  const badges = Object.keys(save.achievements).length;
  const percent = percentOfWhatMatters(save);

  const startEdit = () => {
    setDraft(handle);
    setEditing(true);
  };
  const commit = () => {
    const clean = draft.trim();
    if (clean && clean !== handle) setHandle(clean);
    setEditing(false);
  };

  return (
    <section className="border-b border-line bg-abyss py-16 md:py-20" aria-label="profile">
      <div className="mx-auto grid max-w-shell grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-12">
        {/* left: identity panel */}
        <motion.div
          className="lg:col-span-5"
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <CornerPanel cornerColor="#FBBF24" className="p-6 sm:p-8">
            <span className="micro-label text-txt-faint">// player profile</span>
            <div className="mt-5 flex items-start gap-5">
              <Identicon handle={editing ? draft : handle} />
              <div className="min-w-0 flex-1">
                {editing ? (
                  <input
                    autoFocus
                    value={draft}
                    maxLength={16}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commit();
                      if (e.key === 'Escape') setEditing(false);
                    }}
                    className="w-full rounded-md border border-t1/60 bg-void px-2 py-1 font-display text-[26px] font-semibold text-txt outline-none"
                    aria-label="edit handle"
                    placeholder="player_1"
                  />
                ) : (
                  <button
                    onClick={startEdit}
                    className="group flex max-w-full items-center gap-2 text-left"
                    title="click to edit handle"
                  >
                    <h2 className="truncate font-display text-[26px] font-semibold text-txt">
                      {handle ? (
                        <SplitHandle key={handle} text={handle} />
                      ) : (
                        <span className="text-txt-faint">player_1</span>
                      )}
                    </h2>
                    <Pencil
                      size={14}
                      className="shrink-0 text-txt-faint opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </button>
                )}
                <p className="mt-1.5 font-mono text-[12px] lowercase text-txt-faint">
                  player since {save.profile.createdAt}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <RankBadge rank={rank} size={30} />
                  <span className="hud-label text-[12px] text-xp">{rank.name}</span>
                </div>
              </div>
            </div>

            <div className="mt-7">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="micro-label text-txt-faint">experience</span>
                <span className="stat-numeral text-[15px] text-xp">
                  <CountUp value={xp} /> xp
                </span>
              </div>
              <XPBar current={prog.current} needed={prog.needed} />
              <p className="mt-2 font-mono text-[12px] lowercase text-txt-faint">
                {next ? `next: ${next.name} at ${next.xp.toLocaleString('en-US')} xp` : 'max rank achieved'}
              </p>
            </div>
          </CornerPanel>
        </motion.div>

        {/* right: the 90% meter */}
        <motion.div
          className="flex flex-col items-center lg:col-span-7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <ProgressRing value={percent / 100} size={180} stroke={10} />
          <p className="mt-5 text-center font-mono text-[13px] lowercase tracking-[0.08em] text-txt-dim">
            {canonical}/30 papers · {bosses}/5 bosses · {badges}/{ACHIEVEMENTS.length} badges
          </p>
          {percent > 90 && (
            <p className="mt-1.5 font-mono text-[12px] lowercase text-xp">beyond known physics</p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
