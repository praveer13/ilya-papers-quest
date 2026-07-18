import { create } from 'zustand';
import type { Rank } from './ranks';

/**
 * Ephemeral UI state (NOT persisted): XP toast stack + level-up modal queue.
 * The save store (save.ts) pushes here; HUD components render from here.
 */

export type ToastKind = 'xp' | 'success' | 'danger' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string; // e.g. "+25 XP — lab experiment complete"
}

export interface LevelUpEvent {
  oldRank: Rank;
  newRank: Rank;
}

interface UiState {
  toasts: Toast[];
  levelUp: LevelUpEvent | null;
  pushToast: (text: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
  openLevelUp: (ev: LevelUpEvent) => void;
  closeLevelUp: () => void;
}

let toastSeq = 1;

export const useUiStore = create<UiState>()((set) => ({
  toasts: [],
  levelUp: null,
  pushToast: (text, kind = 'xp') =>
    set((s) => {
      const toast: Toast = { id: toastSeq++, kind, text };
      // max 3 stacked (design.md §12 XPToast)
      const toasts = [...s.toasts, toast].slice(-3);
      return { toasts };
    }),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openLevelUp: (ev) => set({ levelUp: ev }),
  closeLevelUp: () => set({ levelUp: null }),
}));

/** Convenience non-hook access for stores / helpers. */
export function pushToast(text: string, kind: ToastKind = 'xp'): void {
  useUiStore.getState().pushToast(text, kind);
}
