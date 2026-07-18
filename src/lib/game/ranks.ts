/** Rank ladder — design.md §4.2 */

export interface Rank {
  n: number; // 1..10
  name: string;
  xp: number; // xp required to reach this rank
}

export const RANKS: Rank[] = [
  { n: 1, name: 'Script Kiddie', xp: 0 },
  { n: 2, name: 'Hello Worlder', xp: 250 },
  { n: 3, name: 'Tensor Tinkerer', xp: 700 },
  { n: 4, name: 'Gradient Descendant', xp: 1500 },
  { n: 5, name: 'Backprop Adept', xp: 2600 },
  { n: 6, name: 'Loss Surfer', xp: 4200 },
  { n: 7, name: 'Grad Student', xp: 6400 },
  { n: 8, name: 'Paper Slayer', xp: 9200 },
  { n: 9, name: 'Research Engineer', xp: 12500 },
  { n: 10, name: 'Carmack Tier', xp: 15000 },
];

export function rankForXp(xp: number): Rank {
  let r = RANKS[0];
  for (const rank of RANKS) if (xp >= rank.xp) r = rank;
  return r;
}

/** Next rank above current xp, or null at Carmack Tier. */
export function nextRank(xp: number): Rank | null {
  const cur = rankForXp(xp);
  return cur.n < RANKS.length ? RANKS[cur.n] : null;
}

/** Progress toward next rank: { current, needed, pct (0..1) }. At max rank, pct = 1. */
export function rankProgress(xp: number): { current: number; needed: number; pct: number } {
  const cur = rankForXp(xp);
  const nxt = nextRank(xp);
  if (!nxt) return { current: xp - cur.xp, needed: 0, pct: 1 };
  const current = xp - cur.xp;
  const needed = nxt.xp - cur.xp;
  return { current, needed, pct: Math.min(1, current / needed) };
}
