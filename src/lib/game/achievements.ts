/**
 * Achievement definitions — design.md §4.6 (20 badges).
 * `icon` is a lucide-react icon name; page agents resolve it to a component.
 */

export interface AchievementDef {
  id: string;
  name: string;
  desc: string; // how to unlock
  xp: number; // unlock reward
  icon: string; // lucide icon name
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-blood', name: 'First Blood', desc: 'master 1 paper', xp: 50, icon: 'Droplet' },
  { id: 'warming-up', name: 'Warming Up', desc: 'master 5 papers', xp: 75, icon: 'Flame' },
  { id: 'double-digits', name: 'Double Digits', desc: 'master 10 papers', xp: 100, icon: 'Hash' },
  { id: 'halfway-there', name: 'Halfway There', desc: 'master 15 papers', xp: 125, icon: 'Mountain' },
  { id: 'the-90', name: 'The 90%', desc: 'master all 30 canonical papers', xp: 200, icon: 'Crown' },
  { id: 'beyond-physics', name: 'Beyond Physics', desc: 'master both bonus papers', xp: 150, icon: 'Sparkles' },
  { id: 'champion-t1', name: 'World Champion: Foundations', desc: 'clear the t1 boss', xp: 100, icon: 'Trophy' },
  { id: 'champion-t2', name: 'World Champion: Attention', desc: 'clear the t2 boss', xp: 100, icon: 'Trophy' },
  { id: 'champion-t3', name: 'World Champion: Vision', desc: 'clear the t3 boss', xp: 100, icon: 'Trophy' },
  { id: 'champion-t4', name: 'World Champion: Optimization', desc: 'clear the t4 boss', xp: 100, icon: 'Trophy' },
  { id: 'champion-t5', name: 'World Champion: Scaling', desc: 'clear the t5 boss', xp: 100, icon: 'Trophy' },
  { id: 'flawless-victory', name: 'Flawless Victory', desc: 'clear a boss without losing a heart', xp: 150, icon: 'Shield' },
  { id: 'speedrunner', name: 'Speedrunner', desc: 'master a paper in under 15 minutes', xp: 100, icon: 'Timer' },
  { id: 'perfectionist', name: 'Perfectionist', desc: 'score 100% on 5 quizzes', xp: 100, icon: 'Target' },
  { id: 'combo-king', name: 'Combo King', desc: 'reach a ×8 combo', xp: 100, icon: 'Zap' },
  { id: 'week-of-fire', name: 'Week of Fire', desc: 'hold a 7-day streak', xp: 100, icon: 'FlameKindling' },
  { id: 'unstoppable', name: 'Unstoppable', desc: 'hold a 14-day streak', xp: 150, icon: 'Rocket' },
  { id: 'rtfm', name: 'RTFM', desc: 'read all 7 sections of any paper', xp: 50, icon: 'BookOpen' },
  { id: 'lab-rat', name: 'Lab Rat', desc: 'complete 10 labs', xp: 100, icon: 'FlaskConical' },
  { id: 'night-owl', name: 'Night Owl', desc: 'study between 00:00 and 05:00', xp: 50, icon: 'Moon' },
  { id: 'early-bird', name: 'Early Bird', desc: 'study between 05:00 and 07:00', xp: 50, icon: 'Sunrise' },
  { id: 'save-scummer', name: 'Save Scummer', desc: 'export your save file', xp: 50, icon: 'Download' },
  { id: 'carmack-tier', name: 'Carmack Tier', desc: 'reach rank 10', xp: 200, icon: 'BadgeCheck' },
];

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
