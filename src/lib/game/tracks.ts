import type { TrackId } from './types';

/** Track (world) metadata — design.md §6 + §13 */

export interface Track {
  id: TrackId;
  num: 1 | 2 | 3 | 4 | 5;
  short: string; // e.g. FOUNDATIONS
  name: string; // full name
  color: string; // hex
  colorVar: string; // css var name e.g. --t1
  emblem: string; // /public asset path
  bossName: string; // e.g. ECHO-7, the Vanishing
  bossSlug: string; // e.g. ECHO-7
  unlockHint: string; // human-readable unlock rule
}

export const TRACKS: Track[] = [
  {
    id: 't1', num: 1, short: 'FOUNDATIONS', name: 'Foundations & Recurrent Nets',
    color: '#22D3EE', colorVar: '--t1', emblem: '/emblem-foundations.png',
    bossName: 'ECHO-7, the Vanishing', bossSlug: 'ECHO-7',
    unlockHint: 'open from the start',
  },
  {
    id: 't2', num: 2, short: 'ATTENTION', name: 'Sequences, Attention, Transformers',
    color: '#A78BFA', colorVar: '--t2', emblem: '/emblem-attention.png',
    bossName: 'ATTENTION PRIME', bossSlug: 'ATTENTION PRIME',
    unlockHint: 'clear the t1 boss',
  },
  {
    id: 't3', num: 3, short: 'VISION', name: 'Vision & ConvNets',
    color: '#4ADE80', colorVar: '--t3', emblem: '/emblem-vision.png',
    bossName: 'MAXPOOL HYDRA', bossSlug: 'MAXPOOL HYDRA',
    unlockHint: 'master 6 papers',
  },
  {
    id: 't4', num: 4, short: 'OPTIMIZATION', name: 'Training & Optimization',
    color: '#FB923C', colorVar: '--t4', emblem: '/emblem-optimization.png',
    bossName: 'OVERFIT', bossSlug: 'OVERFIT',
    unlockHint: 'master 6 papers',
  },
  {
    id: 't5', num: 5, short: 'SCALING', name: 'Speech, Generative & Scaling',
    color: '#F472B6', colorVar: '--t5', emblem: '/emblem-scaling.png',
    bossName: 'THE SCALING COLOSSUS', bossSlug: 'THE SCALING COLOSSUS',
    unlockHint: 'master 14 papers',
  },
];

export function trackById(id: TrackId): Track {
  return TRACKS.find((t) => t.id === id)!;
}
