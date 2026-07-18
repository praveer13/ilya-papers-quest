/**
 * Identicon — deterministic 5×5 symmetric pixel-art derived from the player
 * handle (achievements.md §1). FNV-1a hash seeds an xorshift PRNG; the left
 * 3 columns are drawn and mirrored horizontally (classic GitHub identicon).
 */

export function identiconCells(handle: string): boolean[] {
  let h = 2166136261; // FNV offset basis
  const src = handle || 'player_1';
  for (let i = 0; i < src.length; i++) {
    h ^= src.codePointAt(i)!;
    h = Math.imul(h, 16777619); // FNV prime
  }
  let seed = h >>> 0 || 0x9e3779b9;
  const rand = (): number => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    return seed / 4294967296;
  };
  const cells = new Array<boolean>(25).fill(false);
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const on = rand() > 0.45; // slightly denser than 50%
      cells[y * 5 + x] = on;
      cells[y * 5 + (4 - x)] = on;
    }
  }
  return cells;
}
