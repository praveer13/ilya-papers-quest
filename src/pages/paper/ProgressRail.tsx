import type { SectionId } from '@/data/papers/schema';
import { SECTION_IDS, SECTION_LABELS } from '@/data/papers/schema';
import { cn } from '@/lib/utils';

/**
 * ProgressRail — sticky left column (paper.md §2): vertical checklist of the
 * 7 sections + LAB + QUIZ with state dots (hollow → filled track color),
 * scrollspy active highlight, and the live level-XP counter at the bottom.
 */

export interface RailProps {
  active: string; // current scrollspy id
  sectionsRead: string[];
  labDone: boolean;
  mastered: boolean;
  xpEarned: number;
  color: string;
  onJump: (id: string) => void;
}

const RAIL_ITEMS: { id: string; label: string }[] = [
  ...SECTION_IDS.map((id: SectionId, i) => ({ id, label: `${String(i + 1).padStart(2, '0')} · ${SECTION_LABELS[id]}` })),
  { id: 'checkpoint', label: '08 · CHECKPOINT' },
];

export default function ProgressRail({
  active,
  sectionsRead,
  labDone,
  mastered,
  xpEarned,
  color,
  onJump,
}: RailProps) {
  const isDone = (id: string) => {
    if (id === 'checkpoint') return mastered;
    if (id === 'lab') return labDone;
    return sectionsRead.includes(id);
  };

  return (
    <nav className="flex flex-col gap-1" aria-label="level progress">
      <span className="micro-label mb-2 text-txt-faint">// level progress</span>
      {RAIL_ITEMS.map((item) => {
        const done = isDone(item.id);
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onJump(item.id)}
            className={cn(
              'group flex items-center gap-2.5 rounded-md border-l-2 px-2.5 py-1.5 text-left font-mono text-[11px] tracking-wider transition-all',
              isActive ? 'border-current bg-surface-2/70 text-txt' : 'border-transparent text-txt-faint hover:text-txt-dim',
            )}
            style={isActive ? { color } : undefined}
          >
            <span
              className="inline-block size-2 shrink-0 rounded-full border transition-all"
              style={{
                borderColor: done || isActive ? color : '#5B6178',
                backgroundColor: done ? color : 'transparent',
                boxShadow: done ? `0 0 6px ${color}` : 'none',
              }}
            />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
      <div className="mt-4 border-t border-line pt-3">
        <span className="stat-numeral text-[15px]" style={{ color: '#FBBF24' }}>
          +{xpEarned} XP
        </span>
        <span className="micro-label ml-1.5 text-txt-faint">earned here</span>
      </div>
    </nav>
  );
}
