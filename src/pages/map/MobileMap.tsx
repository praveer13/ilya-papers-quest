import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Lock } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useSaveStore } from '@/lib/game/save';
import { TRACKS } from '@/lib/game/tracks';
import type { Paper } from '@/lib/game/papers';
import { fileLabel } from '@/lib/game/papers';
import type { SaveFile, TrackId } from '@/lib/game/types';
import { nextObjective, paperNodeState, trackLockReason, trackProgress } from '@/lib/game/unlocks';
import { useReducedMotion } from '@/lib/game/format';
import { NodeDisc } from './MapNode';
import { BossHex, BossHearts, type BossState } from './BossNode';
import { bonusPapers, canonicalPapers } from './geometry';
import { cn } from '@/lib/utils';

/**
 * MobileMap (map.md §3) — <1024px fallback: a vertical accordion of the five
 * track panels. Each panel body is a chain of full-width node rows (disc +
 * label + state) joined by 2px track-colored edge segments, boss row last.
 */

function inProgressPct(save: SaveFile, paper: Paper): number {
  const p = save.papers[paper.slug];
  if (!p) return 0;
  const frac =
    (Math.min(7, p.sectionsRead.length) / 7) * 0.6 + (p.labDone ? 0.2 : 0) + (Math.min(100, p.quizBest) / 100) * 0.2;
  return Math.round(frac * 100);
}

function EdgeSeg({ locked, color }: { locked: boolean; color: string }) {
  return (
    <div
      aria-hidden
      className="ml-[27px] h-5 w-[2px]"
      style={{
        background: locked ? 'var(--line)' : color,
        opacity: locked ? 0.7 : 0.5,
      }}
    />
  );
}

export default function MobileMap({ onFight }: { onFight: (trackId: TrackId) => void }) {
  const save = useSaveStore();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const objective = nextObjective(save);
  const defaultOpen =
    objective.kind === 'paper' ? objective.paper.track : objective.kind === 'boss' ? objective.track : 't1';

  return (
    <div className="mx-auto max-w-map px-4 pt-6 pb-16 sm:px-6 lg:hidden">
      <Accordion type="single" collapsible defaultValue={defaultOpen}>
        {TRACKS.map((track) => {
          const prog = trackProgress(save, track.id);
          const papers = canonicalPapers(track);
          const bonus = bonusPapers(track);
          const bossState: BossState = prog.bossCleared ? 'cleared' : prog.bossUnlocked ? 'ready' : 'locked';
          const bossRec = save.bosses[track.id];

          const rows: ReactNode[] = [];
          papers.forEach((paper, j) => {
            const nextSt =
              j + 1 < papers.length
                ? paperNodeState(save, papers[j + 1])
                : bossState === 'locked'
                  ? 'locked'
                  : 'unlocked';
            rows.push(
              <PaperRow
                key={paper.slug}
                paper={paper}
                color={track.color}
                save={save}
                onOpen={() => navigate(`/paper/${paper.slug}`)}
                index={j}
              />,
            );
            rows.push(
              <EdgeSeg
                key={`${paper.slug}-seg`}
                locked={nextSt === 'locked'}
                color={track.color}
              />,
            );
          });
          // boss row
          rows.push(
            <motion.div
              key={`${track.id}-boss`}
              initial={reduced ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.04 * papers.length }}
            >
              <button
                type="button"
                disabled={bossState === 'locked'}
                onClick={() => onFight(track.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                  bossState === 'locked' ? 'cursor-not-allowed opacity-50' : 'hover:bg-surface',
                )}
                aria-label={`boss ${track.bossName} — ${bossState === 'locked' ? 'locked' : bossState === 'ready' ? 'ready to fight' : 'slain'}`}
              >
                <span className="flex w-[56px] shrink-0 justify-center">
                  <BossHex size={44} state={bossState} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="micro-label block text-[10px] text-danger">boss fight</span>
                  <span className="block truncate font-mono text-[13px] text-txt">{track.bossName}</span>
                  <span className="mt-0.5 block">
                    <BossHearts bestHearts={bossRec?.bestHearts ?? 3} attempts={bossRec?.attempts ?? 0} size={10} />
                  </span>
                </span>
                <span className="shrink-0">
                  {bossState === 'locked' && <span className="micro-label text-[10px] text-txt-faint">locked</span>}
                  {bossState === 'ready' && (
                    <span className="micro-label animate-danger-pulse text-[10px] text-danger">fight</span>
                  )}
                  {bossState === 'cleared' && (
                    <span className="micro-label inline-flex items-center gap-1 text-[10px] text-xp">
                      slain <Check size={11} />
                    </span>
                  )}
                </span>
              </button>
            </motion.div>,
          );
          // bonus rows after the boss
          bonus.forEach((paper, k) => {
            rows.push(
              <EdgeSeg key={`${paper.slug}-seg`} locked={paperNodeState(save, paper) === 'locked'} color={track.color} />,
            );
            rows.push(
              <PaperRow
                key={paper.slug}
                paper={paper}
                color={track.color}
                save={save}
                onOpen={() => navigate(`/paper/${paper.slug}`)}
                index={papers.length + 1 + k}
              />,
            );
          });

          return (
            <AccordionItem key={track.id} value={track.id} className="border-line">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <img
                    src={track.emblem}
                    alt=""
                    loading="lazy"
                    className={cn('size-10 shrink-0 object-contain', !prog.unlocked && 'opacity-50 grayscale')}
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="micro-label text-[10px]" style={{ color: track.color }}>
                      track {track.num}
                    </div>
                    <div className="truncate font-display text-[16px] font-semibold text-txt">{track.name}</div>
                    {!prog.unlocked && (
                      <div className="micro-label mt-0.5 flex items-center gap-1 text-[10px] normal-case text-txt-faint">
                        <Lock size={9} /> {trackLockReason(track.id)}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pr-1">
                    <div className="h-[3px] w-14 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${prog.total ? (prog.mastered / prog.total) * 100 : 0}%`,
                          backgroundColor: track.color,
                        }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-txt-dim">
                      {prog.mastered}/{prog.total}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col pb-2">{rows}</div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function PaperRow({
  paper,
  color,
  save,
  onOpen,
  index,
}: {
  paper: Paper;
  color: string;
  save: SaveFile;
  onOpen: () => void;
  index: number;
}) {
  const reduced = useReducedMotion();
  const st = paperNodeState(save, paper);
  const prog = save.papers[paper.slug];
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: 0.04 * index }}
    >
      <button
        type="button"
        disabled={st === 'locked'}
        onClick={onOpen}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
          st === 'locked' ? 'cursor-not-allowed opacity-50' : 'hover:bg-surface',
        )}
        aria-label={`${fileLabel(paper)}: ${paper.title} — ${st}`}
      >
        <span className="flex w-[56px] shrink-0 justify-center">
          <NodeDisc size={40} state={st} color={color} frac={inProgressPct(save, paper) / 100} num={paper.num} breathing={false} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="micro-label block text-[10px]" style={{ color: st === 'locked' ? 'var(--txt-faint)' : color }}>
            {fileLabel(paper)}
            {paper.bonus ? ' ★' : ''}
          </span>
          <span className="block truncate font-mono text-[13px] text-txt">{paper.title}</span>
        </span>
        <span className="shrink-0">
          {st === 'locked' && <span className="micro-label text-[10px] text-txt-faint">locked</span>}
          {st === 'available' && <ChevronRight size={15} className="text-txt-faint" />}
          {st === 'in-progress' && (
            <span className="font-mono text-[11px] text-xp">{inProgressPct(save, paper)}%</span>
          )}
          {st === 'mastered' && (
            <span className="inline-flex items-center gap-1">
              {prog?.perfectQuiz && <span className="font-mono text-[11px] text-xp">★</span>}
              <Check size={15} className="text-success" />
            </span>
          )}
        </span>
      </button>
    </motion.div>
  );
}
