/**
 * Save-file schema types for `np90.save.v1` (localStorage, zustand persist).
 * See design.md §5. Extra field beyond the doc: `activity` (git-log feed).
 */

export type TrackId = 't1' | 't2' | 't3' | 't4' | 't5';

export interface Profile {
  handle: string;
  createdAt: string; // ISO date
  sound: boolean;
  reducedMotion: boolean;
}

export interface PaperProgress {
  sectionsRead: string[]; // section ids, 7 per paper
  labDone: boolean;
  quizBest: number; // best score 0..100
  quizAttempts: number;
  perfectQuiz: boolean;
  mastered: boolean;
  masteredAt: string | null;
  xpEarned: number;
  startedAt: string | null;
  lastSection?: number; // resume hint: last visited section index
}

export interface BossProgress {
  attempts: number;
  cleared: boolean;
  flawless: boolean;
  bestHearts: number; // 0..3
}

export interface StreakState {
  count: number;
  best: number;
  lastActiveDate: string | null; // YYYY-MM-DD (local)
  freezes: number;
  history: string[]; // YYYY-MM-DD dates with >=1 meaningful action
}

export interface GameStats {
  bestCombo: number;
  totalAnswers: number;
  correctAnswers: number;
  labsDone: number;
  totalTimeMs: number;
}

export type ActivityKind =
  | 'xp'
  | 'section'
  | 'lab'
  | 'quiz'
  | 'master'
  | 'boss'
  | 'streak'
  | 'achievement'
  | 'rank'
  | 'system';

export interface ActivityEvent {
  id: string; // hash derived from timestamp + counter
  at: number; // epoch ms
  kind: ActivityKind;
  xp: number; // xp delta attached to the event (0 if none)
  label: string; // e.g. master(attention-is-all-you-need)
}

export interface SaveFile {
  version: 1;
  profile: Profile;
  xp: number;
  papers: Record<string, PaperProgress>;
  bosses: Partial<Record<TrackId, BossProgress>>;
  achievements: Record<string, string>; // achievementId -> ISO timestamp
  streak: StreakState;
  stats: GameStats;
  activity: ActivityEvent[]; // newest first, capped (see MAX_ACTIVITY)
}

export const SAVE_KEY = 'np90.save.v1';
export const MAX_ACTIVITY = 60;

export function defaultPaperProgress(): PaperProgress {
  return {
    sectionsRead: [],
    labDone: false,
    quizBest: 0,
    quizAttempts: 0,
    perfectQuiz: false,
    mastered: false,
    masteredAt: null,
    xpEarned: 0,
    startedAt: null,
  };
}

export function defaultSave(): SaveFile {
  return {
    version: 1,
    profile: {
      handle: '',
      createdAt: new Date().toISOString().slice(0, 10),
      sound: true,
      reducedMotion: false,
    },
    xp: 0,
    papers: {},
    bosses: {},
    achievements: {},
    streak: { count: 0, best: 0, lastActiveDate: null, freezes: 0, history: [] },
    stats: { bestCombo: 0, totalAnswers: 0, correctAnswers: 0, labsDone: 0, totalTimeMs: 0 },
    activity: [],
  };
}
