/** XP economy constants + combo math — design.md §4.1 / §4.5 */

export const XP = {
  SECTION_READ: 10, // per content section (7 per paper)
  LAB_COMPLETE: 25,
  QUIZ_CORRECT: 20, // × combo multiplier
  PERFECT_QUIZ: 50, // bonus, first try 100%
  PAPER_MASTERED: 100, // quiz >= 80%
  BOSS_CORRECT: 30, // × combo multiplier
  BOSS_VICTORY: 300,
  FLAWLESS_BOSS: 150, // bonus, no hearts lost
  FIRST_ACTION_OF_DAY: 25,
} as const;

export const QUIZ_PASS_PCT = 80; // pass threshold
export const QUIZ_POOL_SIZE = 8; // per-paper question pool
export const QUIZ_DRAW = 5; // questions drawn per attempt
export const BOSS_QUESTIONS = 10;
export const BOSS_HEARTS = 3;

/** combo multiplier = 1 + 0.25 × combo, capped ×2.0 */
export function comboMultiplier(combo: number): number {
  return Math.min(2, 1 + 0.25 * combo);
}

/** xp for a correct answer given current combo (before increment) */
export function answerXp(base: number, combo: number): number {
  return Math.round(base * comboMultiplier(combo));
}
