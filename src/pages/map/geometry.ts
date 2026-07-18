import type { Paper } from '@/lib/game/papers';
import { papersByTrack } from '@/lib/game/papers';
import { TRACKS, type Track } from '@/lib/game/tracks';

/**
 * Quest Map canvas geometry — map.md §2. One shared coordinate system for the
 * SVG edge layer and the absolutely-positioned node divs.
 *
 * Canvas: 1900px wide = 5 lanes × 340px + 4 gutters × 40px + 2 × 20px padding.
 * Nodes sit on a vertical pitch with a ±40px zig-zag so edges read as a
 * winding world-map path. The boss hexagon closes each lane; bonus papers
 * hang off lane 5 as a side branch below the boss.
 */

export const LANE_W = 340;
export const GUTTER = 40;
export const PAD_X = 20;
export const CANVAS_W = PAD_X * 2 + TRACKS.length * LANE_W + (TRACKS.length - 1) * GUTTER; // 1900

export const NODE_D = 64;
export const BOSS_D = 96;
export const NODE_PITCH = 108; // 96px spec + room for the 2-line node label
export const FIRST_NODE_Y = 84;
export const BOSS_GAP = 64; // extra vertical space before the boss
export const BONUS_GAP = 132; // boss → first bonus node
export const PAD_BOTTOM = 110;

export interface NodePos {
  x: number;
  y: number;
}

export function laneLeft(laneIdx: number): number {
  return PAD_X + laneIdx * (LANE_W + GUTTER);
}

export function laneCenter(laneIdx: number): number {
  return laneLeft(laneIdx) + LANE_W / 2;
}

export function canonicalPapers(track: Track): Paper[] {
  return papersByTrack(track.id).filter((p) => !p.bonus);
}

export function bonusPapers(track: Track): Paper[] {
  return papersByTrack(track.id).filter((p) => p.bonus);
}

/** zig-zag: even nodes +40px right, odd −40px left of the lane center */
export function paperNodePos(laneIdx: number, idx: number): NodePos {
  return {
    x: laneCenter(laneIdx) + (idx % 2 === 0 ? 40 : -40),
    y: FIRST_NODE_Y + idx * NODE_PITCH,
  };
}

export function bossNodePos(laneIdx: number, paperCount: number): NodePos {
  return {
    x: laneCenter(laneIdx),
    y: FIRST_NODE_Y + paperCount * NODE_PITCH + BOSS_GAP,
  };
}

/** bonus nodes hang as a side branch (right of center) below the boss */
export function bonusNodePos(laneIdx: number, bonusIdx: number, paperCount: number): NodePos {
  return {
    x: laneCenter(laneIdx) + 84,
    y: bossNodePos(laneIdx, paperCount).y + BONUS_GAP + bonusIdx * NODE_PITCH,
  };
}

function laneBottom(track: Track, laneIdx: number): number {
  const n = canonicalPapers(track).length;
  let bottom = bossNodePos(laneIdx, n).y + BOSS_D / 2 + 44; // boss plate + hearts
  const bonus = bonusPapers(track);
  if (bonus.length > 0) {
    bottom = Math.max(bottom, bonusNodePos(laneIdx, bonus.length - 1, n).y + NODE_D / 2 + 44);
  }
  return bottom;
}

export const CANVAS_H = Math.max(...TRACKS.map((t, i) => laneBottom(t, i))) + PAD_BOTTOM;

// ---------------------------------------------------------------------------
// edge paths (cubic beziers)
// ---------------------------------------------------------------------------

/** vertical S-curve between two node centers (circles are opaque, drawn above) */
export function chainPath(a: NodePos, b: NodePos): string {
  const my = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
}

/** cross-lane gate edge: T1 boss → T2 first node, a long rising arc */
export function gatePath(a: NodePos, b: NodePos): string {
  return `M ${a.x} ${a.y} C ${a.x + 200} ${a.y + 30}, ${b.x - 200} ${b.y - 150}, ${b.x} ${b.y}`;
}

/** bonus branch edge: leaves the Scaling Laws node and bulges right around the boss */
export function bonusPath(a: NodePos, b: NodePos): string {
  return `M ${a.x} ${a.y} C ${a.x + 110} ${a.y + 130}, ${b.x + 80} ${b.y - 150}, ${b.x} ${b.y}`;
}

/** flat-top hexagon points for the boss node (viewBox 0 0 96 96) */
export const BOSS_HEX_POINTS = '28,6 68,6 92,48 68,90 28,90 4,48';
