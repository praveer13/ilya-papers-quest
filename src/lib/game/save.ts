import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import {
  defaultPaperProgress,
  defaultSave,
  SAVE_KEY,
  MAX_ACTIVITY,
  type ActivityEvent,
  type ActivityKind,
  type SaveFile,
  type TrackId,
} from './types';
import { XP } from './xp';
import { rankForXp } from './ranks';
import { ACHIEVEMENTS, achievementById } from './achievements';
import { paperBySlug } from './papers';
import { masteredCount } from './unlocks';
import { pushToast, useUiStore } from './ui';

/**
 * The save-file store — zustand persist → localStorage key `np90.save.v1`,
 * writes debounced 300 ms (design.md §5). Components read state via hooks;
 * page agents mutate ONLY through these actions so XP/streak/achievement
 * rules stay consistent.
 */

// ---------------------------------------------------------------------------
// debounced storage (flush on hide/unload so nothing is lost)
// ---------------------------------------------------------------------------

function createDebouncedStorage(delay = 300): StateStorage {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingName: string | null = null;
  let pendingValue: string | null = null;
  const flush = () => {
    if (pendingName != null && pendingValue != null) {
      try {
        localStorage.setItem(pendingName, pendingValue);
      } catch {
        /* storage full / unavailable — game keeps running in-memory */
      }
      pendingName = pendingValue = null;
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }
  return {
    getItem: (name) => {
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      pendingName = name;
      pendingValue = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delay);
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name);
      } catch {
        /* noop */
      }
    },
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

let activitySeq = 0;

function activityEvent(kind: ActivityKind, xp: number, label: string): ActivityEvent {
  const at = Date.now();
  const hash = ((at ^ (++activitySeq * 2654435761)) >>> 0).toString(16).padStart(8, '0').slice(0, 7);
  return { id: hash, at, kind, xp, label };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** shape of the persisted slice (everything except actions) */
type SaveState = SaveFile;

export interface SaveActions {
  // lifecycle
  setHandle: (handle: string) => void;
  resetSave: () => void;
  exportSave: () => string;
  importSave: (json: string) => { ok: boolean; error?: string };
  // progress actions (award XP, touch streak, evaluate achievements)
  markSectionRead: (slug: string, sectionId: string, sectionIndex?: number) => void;
  markLabDone: (slug: string) => void;
  recordQuizAnswer: (slug: string, correct: boolean, combo: number) => number; // returns xp gained
  recordQuizResult: (slug: string, scorePct: number, opts?: { firstTry?: boolean }) => void;
  recordBossResult: (track: TrackId, cleared: boolean, heartsLeft: number) => void;
  unlockAchievement: (id: string) => void;
  touchStreak: () => void;
  addTime: (ms: number) => void;
  // profile
  setSound: (on: boolean) => void;
  setReducedMotion: (on: boolean) => void;
  // raw xp (rarely needed directly — prefer the semantic actions above)
  awardXp: (amount: number, label?: string, kind?: ActivityKind) => void;
}

export type SaveStore = SaveState & SaveActions;

// ---------------------------------------------------------------------------
// achievement evaluation (pure-ish; mutates a draft, returns unlocks)
// ---------------------------------------------------------------------------

function evaluateAchievements(draft: SaveFile): string[] {
  const unlocked: string[] = [];
  const has = (id: string) => id in draft.achievements;
  const grant = (id: string) => {
    if (!has(id) && achievementById(id)) {
      draft.achievements[id] = new Date().toISOString();
      unlocked.push(id);
    }
  };

  const mastered = masteredCount(draft);
  const canonical = masteredCount(draft, { canonicalOnly: true });
  const bonusMastered = mastered - canonical;

  if (mastered >= 1) grant('first-blood');
  if (mastered >= 5) grant('warming-up');
  if (mastered >= 10) grant('double-digits');
  if (mastered >= 15) grant('halfway-there');
  if (canonical >= 30) grant('the-90');
  if (bonusMastered >= 2) grant('beyond-physics');
  for (const t of ['t1', 't2', 't3', 't4', 't5'] as TrackId[]) {
    if (draft.bosses[t]?.cleared) grant(`champion-${t}`);
  }
  if (Object.values(draft.bosses).some((b) => b?.flawless)) grant('flawless-victory');
  if (Object.values(draft.papers).filter((p) => p.perfectQuiz).length >= 5) grant('perfectionist');
  if (draft.stats.bestCombo >= 8) grant('combo-king');
  if (draft.streak.count >= 7) grant('week-of-fire');
  if (draft.streak.count >= 14) grant('unstoppable');
  if (Object.values(draft.papers).some((p) => p.sectionsRead.length >= 7)) grant('rtfm');
  if (draft.stats.labsDone >= 10) grant('lab-rat');
  if (rankForXp(draft.xp).n >= 10) grant('carmack-tier');

  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) grant('night-owl');
  if (hour >= 5 && hour < 7) grant('early-bird');

  return unlocked;
}

// ---------------------------------------------------------------------------
// store
// ---------------------------------------------------------------------------

export const useSaveStore = create<SaveStore>()(
  persist(
    (set, get) => {
      /** apply a mutation, then run achievements + toasts once */
      const commit = (mutate: (draft: SaveFile) => void) => {
        const prev = get();
        const draft: SaveFile = structuredClone({
          version: prev.version,
          profile: prev.profile,
          xp: prev.xp,
          papers: prev.papers,
          bosses: prev.bosses,
          achievements: prev.achievements,
          streak: prev.streak,
          stats: prev.stats,
          activity: prev.activity,
        });
        mutate(draft);
        const unlocked = evaluateAchievements(draft);
        for (const id of unlocked) {
          const def = ACHIEVEMENTS.find((a) => a.id === id)!;
          draft.xp += def.xp;
          draft.activity = [
            activityEvent('achievement', def.xp, `achievement(${def.name.toLowerCase().replaceAll(' ', '-')})`),
            ...draft.activity,
          ].slice(0, MAX_ACTIVITY);
          pushToast(`achievement unlocked — ${def.name} · +${def.xp} xp`, 'success');
        }
        set(draft);
      };

      const award = (amount: number, label?: string, kind: ActivityKind = 'xp') => {
        const before = rankForXp(get().xp);
        commit((draft) => {
          draft.xp += amount;
          if (label) {
            draft.activity = [activityEvent(kind, amount, label), ...draft.activity].slice(0, MAX_ACTIVITY);
          }
        });
        const after = rankForXp(get().xp);
        if (after.n > before.n) {
          useUiStore.getState().openLevelUp({ oldRank: before, newRank: after });
          get().unlockAchievement('carmack-tier'); // no-op unless rank 10
        }
      };

      const touchStreakInternal = (draft: SaveFile) => {
        const today = todayStr();
        const s = draft.streak;
        if (s.lastActiveDate === today) return false; // already counted today
        const firstOfDay = true;
        if (s.lastActiveDate === yesterdayStr()) {
          s.count += 1;
        } else if (s.lastActiveDate === null) {
          s.count = 1;
        } else {
          // gap — try streak freeze
          const gapDays = Math.round(
            (new Date(today).getTime() - new Date(s.lastActiveDate).getTime()) / 86400000,
          );
          const missed = gapDays - 1;
          if (missed > 0 && s.freezes >= missed) {
            s.freezes -= missed;
            s.count += 1;
            pushToast('streak freeze consumed — the flame survives', 'info');
          } else {
            s.count = 1;
            pushToast('streak lost — the weights have cooled', 'info');
          }
        }
        s.best = Math.max(s.best, s.count);
        s.lastActiveDate = today;
        if (!s.history.includes(today)) s.history = [...s.history, today].slice(-400);
        if (s.count > 0 && s.count % 7 === 0) {
          s.freezes += 1;
          pushToast(`streak freeze earned — ${s.count} days`, 'success');
        }
        return firstOfDay;
      };

      return {
        ...defaultSave(),

        setHandle: (handle) =>
          commit((draft) => {
            draft.profile.handle = handle.slice(0, 16) || 'player_1';
            draft.activity = [
              activityEvent('system', 0, 'run initialized'),
              ...draft.activity,
            ].slice(0, MAX_ACTIVITY);
          }),

        resetSave: () => {
          set({ ...defaultSave(), activity: [] });
        },

        exportSave: () => {
          const state = get();
          const file: SaveFile = {
            version: state.version,
            profile: state.profile,
            xp: state.xp,
            papers: state.papers,
            bosses: state.bosses,
            achievements: state.achievements,
            streak: state.streak,
            stats: state.stats,
            activity: state.activity,
          };
          get().unlockAchievement('save-scummer');
          return JSON.stringify(file, null, 2);
        },

        importSave: (json) => {
          try {
            const parsed = JSON.parse(json) as Partial<SaveFile>;
            if (typeof parsed !== 'object' || parsed === null) return { ok: false, error: 'not an object' };
            if (parsed.version !== 1) return { ok: false, error: `unsupported version: ${String(parsed.version)}` };
            if (typeof parsed.xp !== 'number' || typeof parsed.profile !== 'object' || !parsed.profile) {
              return { ok: false, error: 'schema mismatch (xp/profile)' };
            }
            const base = defaultSave();
            set({
              ...base,
              ...parsed,
              profile: { ...base.profile, ...parsed.profile },
              streak: { ...base.streak, ...parsed.streak },
              stats: { ...base.stats, ...parsed.stats },
              papers: parsed.papers ?? {},
              bosses: parsed.bosses ?? {},
              achievements: parsed.achievements ?? {},
              activity: parsed.activity ?? [],
            });
            pushToast('save file imported — run restored', 'success');
            return { ok: true };
          } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : 'invalid json' };
          }
        },

        markSectionRead: (slug, sectionId, sectionIndex) => {
          const paper = paperBySlug(slug);
          if (!paper) return;
          const existing = get().papers[slug];
          const already = existing?.sectionsRead.includes(sectionId) ?? false;
          commit((draft) => {
            const p = (draft.papers[slug] ??= defaultPaperProgress());
            if (!p.startedAt) p.startedAt = new Date().toISOString();
            if (sectionIndex != null) p.lastSection = sectionIndex;
            if (already) return;
            p.sectionsRead.push(sectionId);
            p.xpEarned += XP.SECTION_READ;
            draft.xp += XP.SECTION_READ;
            draft.activity = [
              activityEvent('section', XP.SECTION_READ, `read(${slug}#${sectionId})`),
              ...draft.activity,
            ].slice(0, MAX_ACTIVITY);
            if (touchStreakInternal(draft)) {
              draft.xp += XP.FIRST_ACTION_OF_DAY;
              p.xpEarned += XP.FIRST_ACTION_OF_DAY;
            }
          });
          if (!already) pushToast(`+${XP.SECTION_READ} xp — section read`);
        },

        markLabDone: (slug) => {
          const paper = paperBySlug(slug);
          if (!paper) return;
          const existing = get().papers[slug];
          if (existing?.labDone) return;
          commit((draft) => {
            const p = (draft.papers[slug] ??= defaultPaperProgress());
            if (!p.startedAt) p.startedAt = new Date().toISOString();
            p.labDone = true;
            p.xpEarned += XP.LAB_COMPLETE;
            draft.xp += XP.LAB_COMPLETE;
            draft.stats.labsDone += 1;
            draft.activity = [
              activityEvent('lab', XP.LAB_COMPLETE, `lab(${slug})`),
              ...draft.activity,
            ].slice(0, MAX_ACTIVITY);
            if (touchStreakInternal(draft)) {
              draft.xp += XP.FIRST_ACTION_OF_DAY;
              p.xpEarned += XP.FIRST_ACTION_OF_DAY;
            }
          });
          pushToast(`+${XP.LAB_COMPLETE} xp — lab experiment complete`);
        },

        recordQuizAnswer: (slug, correct, combo) => {
          const mult = Math.min(2, 1 + 0.25 * combo);
          const gained = correct ? Math.round(XP.QUIZ_CORRECT * mult) : 0;
          commit((draft) => {
            draft.stats.totalAnswers += 1;
            if (correct) {
              draft.stats.correctAnswers += 1;
              draft.xp += gained;
              const p = (draft.papers[slug] ??= defaultPaperProgress());
              p.xpEarned += gained;
            }
            draft.stats.bestCombo = Math.max(draft.stats.bestCombo, correct ? combo + 1 : combo);
            if (touchStreakInternal(draft)) draft.xp += XP.FIRST_ACTION_OF_DAY;
          });
          return gained;
        },

        recordQuizResult: (slug, scorePct, opts) => {
          const paper = paperBySlug(slug);
          if (!paper) return;
          const passed = scorePct >= 80;
          const perfect = scorePct >= 100 && (opts?.firstTry ?? false);
          let gained = 0;
          commit((draft) => {
            const p = (draft.papers[slug] ??= defaultPaperProgress());
            if (!p.startedAt) p.startedAt = new Date().toISOString();
            p.quizAttempts += 1;
            p.quizBest = Math.max(p.quizBest, scorePct);
            if (perfect && !p.perfectQuiz) {
              p.perfectQuiz = true;
              p.xpEarned += XP.PERFECT_QUIZ;
              draft.xp += XP.PERFECT_QUIZ;
              gained += XP.PERFECT_QUIZ;
            }
            if (passed && !p.mastered) {
              p.mastered = true;
              p.masteredAt = new Date().toISOString();
              p.xpEarned += XP.PAPER_MASTERED;
              draft.xp += XP.PAPER_MASTERED;
              gained += XP.PAPER_MASTERED;
              draft.activity = [
                activityEvent('master', XP.PAPER_MASTERED, `master(${slug})`),
                ...draft.activity,
              ].slice(0, MAX_ACTIVITY);
              // speedrunner: mastered within 15 min of starting
              if (p.startedAt && Date.now() - new Date(p.startedAt).getTime() < 15 * 60 * 1000) {
                draft.achievements['speedrunner'] ??= new Date().toISOString();
              }
            }
            if (touchStreakInternal(draft)) draft.xp += XP.FIRST_ACTION_OF_DAY;
          });
          if (passed) pushToast('checkpoint reached — understanding merged to main', 'success');
          else pushToast('segfault in comprehension. review the diff and retry.', 'danger');
          return gained;
        },

        recordBossResult: (track, cleared, heartsLeft) => {
          commit((draft) => {
            const b = (draft.bosses[track] ??= { attempts: 0, cleared: false, flawless: false, bestHearts: 3 });
            b.attempts += 1;
            b.bestHearts = Math.max(b.bestHearts, heartsLeft);
            if (cleared && !b.cleared) {
              b.cleared = true;
              draft.xp += XP.BOSS_VICTORY;
              draft.activity = [
                activityEvent('boss', XP.BOSS_VICTORY, `boss(${track}) cleared`),
                ...draft.activity,
              ].slice(0, MAX_ACTIVITY);
              if (heartsLeft >= 3) {
                b.flawless = true;
                draft.xp += XP.FLAWLESS_BOSS;
              }
            }
            if (touchStreakInternal(draft)) draft.xp += XP.FIRST_ACTION_OF_DAY;
          });
        },

        unlockAchievement: (id) => {
          const def = achievementById(id);
          if (!def || get().achievements[id]) return;
          commit((draft) => {
            draft.achievements[id] = new Date().toISOString();
            draft.xp += def.xp;
            draft.activity = [
              activityEvent('achievement', def.xp, `achievement(${id})`),
              ...draft.activity,
            ].slice(0, MAX_ACTIVITY);
          });
          pushToast(`achievement unlocked — ${def.name} · +${def.xp} xp`, 'success');
        },

        touchStreak: () => {
          commit((draft) => {
            if (touchStreakInternal(draft)) draft.xp += XP.FIRST_ACTION_OF_DAY;
          });
        },

        addTime: (ms) =>
          commit((draft) => {
            draft.stats.totalTimeMs += Math.max(0, ms);
          }),

        setSound: (on) =>
          commit((draft) => {
            draft.profile.sound = on;
          }),

        setReducedMotion: (on) =>
          commit((draft) => {
            draft.profile.reducedMotion = on;
          }),

        awardXp: award,
      };
    },
    {
      name: SAVE_KEY,
      version: 1,
      storage: createJSONStorage(() => createDebouncedStorage(300)),
      partialize: (state) => ({
        version: state.version,
        profile: state.profile,
        xp: state.xp,
        papers: state.papers,
        bosses: state.bosses,
        achievements: state.achievements,
        streak: state.streak,
        stats: state.stats,
        activity: state.activity,
      }),
      merge: (persisted, current) => {
        const base = defaultSave();
        const p = (persisted ?? {}) as Partial<SaveFile>;
        return {
          ...current,
          ...base,
          ...p,
          profile: { ...base.profile, ...p.profile },
          streak: { ...base.streak, ...p.streak },
          stats: { ...base.stats, ...p.stats },
          papers: p.papers ?? {},
          bosses: p.bosses ?? {},
          achievements: p.achievements ?? {},
          activity: p.activity ?? [],
        };
      },
    },
  ),
);

/** true when the player has initialized a run (NewGameModal gate). */
export function selectHasRun(s: SaveStore): boolean {
  return s.profile.handle !== '';
}

/** approximate save-file size in KB (footer readout) */
export function saveSizeKB(s: SaveStore): number {
  try {
    const file = {
      version: s.version, profile: s.profile, xp: s.xp, papers: s.papers,
      bosses: s.bosses, achievements: s.achievements, streak: s.streak,
      stats: s.stats, activity: s.activity,
    };
    return Math.round((JSON.stringify(file).length / 1024) * 10) / 10;
  } catch {
    return 0;
  }
}
