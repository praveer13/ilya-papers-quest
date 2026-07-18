/**
 * Combat-shared types + styling helpers for the boss fight (no components —
 * keeps widgets.tsx fast-refresh clean).
 */

/** normalized answer emitted by QuestionCard */
export type AnswerPayload =
  | { kind: 'mcq'; index: number }
  | { kind: 'tf'; index: number } // 0 = TRUE, 1 = FALSE
  | { kind: 'order'; seq: number[] } // original item indices in placed order
  | { kind: 'fill'; token: string };

export interface FightResult {
  won: boolean;
  correct: number;
  wrong: number;
  timeouts: number;
  answerXp: number; // total XP actually awarded from answers this fight
  comboBonus: number; // answerXp beyond the flat per-correct base
  bestCombo: number;
  heartsLeft: number;
  missedSlugs: string[]; // unique paper slugs answered wrong (incl. timeouts)
  durationMs: number;
}

export interface DamageNum {
  id: number;
  text: string;
  color: string;
  x: number; // % of stage width
  y: number; // % of stage height
}

/** CSS filter that retints a track emblem to danger red (boss.md §assets) */
export function dangerFilter(hueRotate: number): string {
  return `hue-rotate(${hueRotate}deg) saturate(1.6) brightness(1.05) drop-shadow(0 0 14px rgba(251,113,133,.45))`;
}
