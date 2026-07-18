/** Small formatting + preference helpers shared by HUD components. */

import { useSyncExternalStore } from 'react';
import { useSaveStore } from './save';

/** 1,234-style thousands grouping */
export function formatInt(n: number): string {
  return n.toLocaleString('en-US');
}

/** "2h ago" / "3d ago" style relative time */
export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

/** ★★☆☆☆ difficulty glyphs */
export function stars(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
}

/** streak flame tier — design.md §4.4 */
export type FlameTier = 'ember' | 'flame' | 'blaze' | 'inferno';

export function flameTier(count: number): FlameTier {
  if (count >= 14) return 'inferno';
  if (count >= 7) return 'blaze';
  if (count >= 3) return 'flame';
  return 'ember';
}

export const FLAME_COLORS: Record<FlameTier, string> = {
  ember: '#FBBF24', // amber
  flame: '#FB923C', // orange
  blaze: '#F97316', // deep orange
  inferno: '#A5F3FC', // cyan-white
};

function subscribeMedia(cb: () => void): () => void {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** reduced-motion = in-app toggle OR OS preference (design.md §9) */
export function useReducedMotion(): boolean {
  const appToggle = useSaveStore((s) => s.profile.reducedMotion);
  const osPref = useSyncExternalStore(
    subscribeMedia,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
  return appToggle || osPref;
}
