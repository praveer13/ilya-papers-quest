import confetti from 'canvas-confetti';
import { useSaveStore } from './save';

/**
 * Confetti volleys — design.md §9. Confetti is earned (quiz pass, boss kill,
 * level-up), never ambient. Disabled under prefers-reduced-motion / the
 * in-app toggle (the caller should show a 300 ms gold flash instead).
 */

const GOLD = '#FBBF24';
const TRACK_COLORS = ['#22D3EE', '#A78BFA', '#4ADE80', '#FB923C', '#F472B6'];

export function confettiEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const reduced =
    useSaveStore.getState().profile.reducedMotion ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return !reduced;
}

/** quiz pass — 120 particles, spread 70°, two bursts from bottom corners */
export function fireQuizPass(trackColor?: string): void {
  if (!confettiEnabled()) return;
  const colors = trackColor ? [trackColor, GOLD, '#E8EAF4'] : [...TRACK_COLORS, GOLD];
  confetti({
    particleCount: 60,
    angle: 60,
    spread: 70,
    origin: { x: 0, y: 1 },
    colors,
    disableForReducedMotion: true,
  });
  confetti({
    particleCount: 60,
    angle: 120,
    spread: 70,
    origin: { x: 1, y: 1 },
    colors,
    disableForReducedMotion: true,
  });
}

/** boss kill — 260 particles, 3 salvos */
export function fireBossKill(trackColor?: string): void {
  if (!confettiEnabled()) return;
  const colors = trackColor ? [trackColor, GOLD, '#FB7185'] : [...TRACK_COLORS, GOLD];
  const salvo = (delay: number, x: number) =>
    setTimeout(
      () =>
        confetti({
          particleCount: 90,
          spread: 100,
          origin: { x, y: 0.7 },
          colors,
          disableForReducedMotion: true,
        }),
      delay,
    );
  salvo(0, 0.2);
  salvo(180, 0.8);
  salvo(360, 0.5);
}

/** level-up — radial 180 particle ring */
export function fireLevelUp(): void {
  if (!confettiEnabled()) return;
  confetti({
    particleCount: 180,
    spread: 360,
    startVelocity: 32,
    origin: { x: 0.5, y: 0.5 },
    colors: [GOLD, '#E8EAF4', '#FDE68A'],
    disableForReducedMotion: true,
  });
}
