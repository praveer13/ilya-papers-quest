import type { SaveFile, TrackId } from './types';
import { PAPERS, CANONICAL_COUNT, papersByTrack, type Paper } from './papers';
import { TRACKS } from './tracks';

/**
 * Unlock graph + derived progress selectors — design.md §4.7 / §4.3.
 * All functions are pure over the SaveFile state.
 */

export function isMastered(save: SaveFile, slug: string): boolean {
  return save.papers[slug]?.mastered === true;
}

export function masteredCount(save: SaveFile, opts?: { canonicalOnly?: boolean }): number {
  return PAPERS.filter(
    (p) => (!opts?.canonicalOnly || !p.bonus) && isMastered(save, p.slug),
  ).length;
}

/** The "90% meter": mastered canonical ÷ 30 × 90, +2 per bonus paper, cap 94. */
export function percentOfWhatMatters(save: SaveFile): number {
  const canonical = masteredCount(save, { canonicalOnly: true });
  const bonus = PAPERS.filter((p) => p.bonus && isMastered(save, p.slug)).length;
  return Math.min(94, Math.round((canonical / CANONICAL_COUNT) * 90) + bonus * 2);
}

export function isBossCleared(save: SaveFile, track: TrackId): boolean {
  return save.bosses[track]?.cleared === true;
}

/** Track unlock rules: t1 open; t2 needs t1 boss; t3/t4 need 6 papers; t5 needs 14. */
export function isTrackUnlocked(save: SaveFile, track: TrackId): boolean {
  const mastered = masteredCount(save);
  switch (track) {
    case 't1':
      return true;
    case 't2':
      return isBossCleared(save, 't1');
    case 't3':
    case 't4':
      return mastered >= 6;
    case 't5':
      return mastered >= 14;
  }
}

/** Short requirement line for locked track cards, e.g. "unlock: master 6 papers". */
export function trackLockReason(track: TrackId): string {
  const t = TRACKS.find((x) => x.id === track)!;
  return `unlock: ${t.unlockHint}`;
}

/**
 * Paper unlock: its track must be unlocked; within a track papers are linear
 * (paper N requires paper N−1 mastered). Bonus papers require scaling-laws-2020.
 */
export function isPaperUnlocked(save: SaveFile, paper: Paper): boolean {
  if (!isTrackUnlocked(save, paper.track)) return false;
  if (paper.bonus) return isMastered(save, 'scaling-laws-2020');
  const lane = papersByTrack(paper.track).filter((p) => !p.bonus);
  const idx = lane.findIndex((p) => p.slug === paper.slug);
  if (idx <= 0) return true;
  return isMastered(save, lane[idx - 1].slug);
}

/** Boss node unlocks when every canonical paper in the track is mastered. */
export function isBossUnlocked(save: SaveFile, track: TrackId): boolean {
  if (!isTrackUnlocked(save, track)) return false;
  return papersByTrack(track)
    .filter((p) => !p.bonus)
    .every((p) => isMastered(save, p.slug));
}

export type NodeState = 'locked' | 'available' | 'in-progress' | 'mastered';

export function paperNodeState(save: SaveFile, paper: Paper): NodeState {
  if (isMastered(save, paper.slug)) return 'mastered';
  if (!isPaperUnlocked(save, paper)) return 'locked';
  const prog = save.papers[paper.slug];
  const started =
    !!prog && (prog.sectionsRead.length > 0 || prog.labDone || prog.quizAttempts > 0);
  return started ? 'in-progress' : 'available';
}

export interface TrackProgress {
  mastered: number;
  total: number; // canonical papers in track
  bossCleared: boolean;
  bossUnlocked: boolean;
  unlocked: boolean;
}

export function trackProgress(save: SaveFile, track: TrackId): TrackProgress {
  const lane = papersByTrack(track).filter((p) => !p.bonus);
  return {
    mastered: lane.filter((p) => isMastered(save, p.slug)).length,
    total: lane.length,
    bossCleared: isBossCleared(save, track),
    bossUnlocked: isBossUnlocked(save, track),
    unlocked: isTrackUnlocked(save, track),
  };
}

export type Objective =
  | { kind: 'paper'; paper: Paper; resumeSection: number | null }
  | { kind: 'boss'; track: TrackId }
  | { kind: 'done' };

/**
 * Next objective: an unlocked-but-uncleared boss takes priority; otherwise the
 * lowest-numbered unmastered, unlocked paper. `done` when everything is cleared.
 */
export function nextObjective(save: SaveFile): Objective {
  for (const t of TRACKS) {
    if (isBossUnlocked(save, t.id) && !isBossCleared(save, t.id)) {
      return { kind: 'boss', track: t.id };
    }
  }
  for (const p of PAPERS) {
    if (!p.bonus && !isMastered(save, p.slug) && isPaperUnlocked(save, p)) {
      const prog = save.papers[p.slug];
      const resume = prog && prog.sectionsRead.length > 0 ? prog.sectionsRead.length : null;
      return { kind: 'paper', paper: p, resumeSection: resume };
    }
  }
  for (const p of PAPERS) {
    if (p.bonus && !isMastered(save, p.slug) && isPaperUnlocked(save, p)) {
      return { kind: 'paper', paper: p, resumeSection: null };
    }
  }
  return { kind: 'done' };
}

/** First unmastered unlocked paper slug — used by the hero CONTINUE CTA. */
export function continueSlug(save: SaveFile): string | null {
  const obj = nextObjective(save);
  if (obj.kind === 'paper') return obj.paper.slug;
  return null;
}
