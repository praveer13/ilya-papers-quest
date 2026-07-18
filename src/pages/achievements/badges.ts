/**
 * Badge gallery metadata — page-local taxonomy layered over the shared
 * ACHIEVEMENTS defs (src/lib/game/achievements.ts): category (filter tabs +
 * ring colors), one-line flavor, cryptic hints for SECRET badges, and
 * quantitative progress evaluators for locked cards (achievements.md §4).
 *
 * Categories: progress=cyan · mastery=gold · streaks=orange · secret=violet.
 */

import {
  BadgeCheck, BookOpen, Crown, Download, Droplet, FlaskConical, Flame, FlameKindling,
  Hash, Moon, Mountain, Rocket, Shield, Sparkles, Sunrise, Target, Timer, Trophy, Zap,
} from 'lucide-react';
import type { SaveFile } from '@/lib/game/types';
import { PAPERS, CANONICAL_COUNT } from '@/lib/game/papers';
import { masteredCount } from '@/lib/game/unlocks';
import { RANKS } from '@/lib/game/ranks';

export type BadgeCategory = 'progress' | 'mastery' | 'streaks' | 'secret';

export const CATEGORY_COLORS: Record<BadgeCategory, string> = {
  progress: '#22D3EE',
  mastery: '#FBBF24',
  streaks: '#FB923C',
  secret: '#A78BFA',
};

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  progress: 'PROGRESS',
  mastery: 'MASTERY',
  streaks: 'STREAKS',
  secret: 'SECRET',
};

/** lucide icon lookup by def.icon name (same map as the home badges strip) */
export const BADGE_ICONS: Record<string, typeof Trophy> = {
  Droplet, Flame, Hash, Mountain, Crown, Sparkles, Trophy, Shield, Timer, Target, Zap,
  FlameKindling, Rocket, BookOpen, FlaskConical, Moon, Sunrise, Download, BadgeCheck,
};

export interface BadgeProgress {
  cur: number;
  max: number;
  label: string; // e.g. "papers 8/15", "combo ×5/×8"
}

export interface BadgeMeta {
  category: BadgeCategory;
  flavor: string; // one-line flavor, shown in the detail popover
  hint?: string; // cryptic locked hint for SECRET badges
  progress?: (save: SaveFile) => BadgeProgress | null;
}

const papersProgress = (target: number) => (save: SaveFile): BadgeProgress => {
  const cur = Math.min(target, masteredCount(save));
  return { cur, max: target, label: `papers ${cur}/${target}` };
};

export const BADGE_META: Record<string, BadgeMeta> = {
  'first-blood': {
    category: 'progress',
    flavor: 'one paper down. the weights have noticed.',
    progress: papersProgress(1),
  },
  'warming-up': {
    category: 'progress',
    flavor: 'five papers. loss is decreasing nicely.',
    progress: papersProgress(5),
  },
  'double-digits': {
    category: 'progress',
    flavor: 'ten papers — your priors are updating.',
    progress: papersProgress(10),
  },
  'halfway-there': {
    category: 'progress',
    flavor: 'fifteen down. gradient still flowing.',
    progress: papersProgress(15),
  },
  'the-90': {
    category: 'progress',
    flavor: 'all thirty canonical papers. you now know 90% of what matters.',
    progress: (save) => {
      const cur = Math.min(CANONICAL_COUNT, masteredCount(save, { canonicalOnly: true }));
      return { cur, max: CANONICAL_COUNT, label: `papers ${cur}/${CANONICAL_COUNT}` };
    },
  },
  'beyond-physics': {
    category: 'progress',
    flavor: 'both bonus papers. 94% — beyond known physics.',
    progress: (save) => {
      const cur = Math.min(2, PAPERS.filter((p) => p.bonus && save.papers[p.slug]?.mastered).length);
      return { cur, max: 2, label: `bonus ${cur}/2` };
    },
  },
  'champion-t1': { category: 'mastery', flavor: 'boss slain: ECHO-7, the Vanishing.' },
  'champion-t2': { category: 'mastery', flavor: 'boss slain: ATTENTION PRIME.' },
  'champion-t3': { category: 'mastery', flavor: 'boss slain: MAXPOOL HYDRA.' },
  'champion-t4': { category: 'mastery', flavor: 'boss slain: OVERFIT.' },
  'champion-t5': { category: 'mastery', flavor: 'boss slain: THE SCALING COLOSSUS.' },
  'flawless-victory': {
    category: 'mastery',
    flavor: 'a boss cleared with all three hearts intact. no damage taken, no notes.',
  },
  speedrunner: {
    category: 'mastery',
    flavor: "master any paper in under 15 minutes. it's called a fast pass.",
  },
  perfectionist: {
    category: 'mastery',
    flavor: 'five perfect quizzes. 100% or it didn\'t happen.',
    progress: (save) => {
      const cur = Math.min(5, Object.values(save.papers).filter((p) => p.perfectQuiz).length);
      return { cur, max: 5, label: `perfect ${cur}/5` };
    },
  },
  'combo-king': {
    category: 'mastery',
    flavor: 'a ×8 combo. the multiplier sings.',
    progress: (save) => {
      const cur = Math.min(8, save.stats.bestCombo);
      return { cur, max: 8, label: `combo ×${cur}/×8` };
    },
  },
  'week-of-fire': {
    category: 'streaks',
    flavor: 'seven days straight. the flame tier rises.',
    progress: (save) => {
      const cur = Math.min(7, Math.max(save.streak.count, save.streak.best));
      return { cur, max: 7, label: `days ${cur}/7` };
    },
  },
  unstoppable: {
    category: 'streaks',
    flavor: 'fourteen days. the weights fear you.',
    progress: (save) => {
      const cur = Math.min(14, Math.max(save.streak.count, save.streak.best));
      return { cur, max: 14, label: `days ${cur}/14` };
    },
  },
  rtfm: {
    category: 'mastery',
    flavor: 'all seven sections of one paper. you read the manual.',
    progress: (save) => {
      const cur = Math.min(7, Math.max(0, ...Object.values(save.papers).map((p) => p.sectionsRead.length)));
      return { cur, max: 7, label: `sections ${cur}/7` };
    },
  },
  'lab-rat': {
    category: 'mastery',
    flavor: 'ten labs complete. science thanks you.',
    progress: (save) => {
      const cur = Math.min(10, save.stats.labsDone);
      return { cur, max: 10, label: `labs ${cur}/10` };
    },
  },
  'night-owl': {
    category: 'secret',
    flavor: 'studied between 00:00 and 05:00. the void approved.',
    hint: 'the void is quietest after midnight.',
  },
  'early-bird': {
    category: 'secret',
    flavor: 'studied between 05:00 and 07:00. gradients at dawn.',
    hint: 'the gradient rises with the sun.',
  },
  'save-scummer': {
    category: 'secret',
    flavor: 'export your save file. backups are a virtue.',
    hint: 'your soul fits in a json file.',
  },
  'carmack-tier': {
    category: 'mastery',
    flavor: 'rank 10. "and it all started sorting out in my head."',
    progress: (save) => {
      const max = RANKS[RANKS.length - 1].xp;
      const cur = Math.min(max, save.xp);
      return { cur, max, label: `xp ${cur.toLocaleString('en-US')}/${max.toLocaleString('en-US')}` };
    },
  },
};

export function badgeMeta(id: string): BadgeMeta {
  return (
    BADGE_META[id] ?? {
      category: 'mastery',
      flavor: '',
    }
  );
}
