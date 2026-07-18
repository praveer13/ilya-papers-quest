# GAME API — shared game-state infrastructure

Everything page agents need to build `/map`, `/paper/:slug`, `/boss/:trackId`,
`/achievements`, `/about`. Import via the `@/` alias. **Never** hand-roll
localStorage access or XP math — go through the store actions so streaks,
achievements, rank-ups, and the activity log stay consistent.

## Save store (zustand persist → `localStorage["np90.save.v1"]`, debounced 300 ms)

```ts
import { useSaveStore, selectHasRun, saveSizeKB } from '@/lib/game/save';

const xp = useSaveStore((s) => s.xp);                    // subscribe to a field
const mastered = useSaveStore((s) => s.papers[slug]?.mastered);
useSaveStore.getState().markSectionRead(slug, 'briefing'); // non-hook access
```

State shape (`SaveFile`, see `@/lib/game/types`): `profile` (handle, sound,
reducedMotion) · `xp` · `papers` (per-slug `PaperProgress`) · `bosses`
(per-track `BossProgress`) · `achievements` (id → ISO ts) · `streak`
(count/best/lastActiveDate/freezes/history) · `stats` (bestCombo, answers,
labsDone, totalTimeMs) · `activity` (newest-first `ActivityEvent[]`, cap 60 —
extension beyond design.md §5 for the git-log feed).

### Actions (mutate ONLY through these)

| Action | Effect |
|---|---|
| `setHandle(handle)` | initialize run (NewGameModal) |
| `markSectionRead(slug, sectionId, sectionIndex?)` | +10 XP once per section, streak touch |
| `markLabDone(slug)` | +25 XP once, streak touch |
| `recordQuizAnswer(slug, correct, combo)` | +20×mult XP on correct; returns xp gained; updates best combo |
| `recordQuizResult(slug, scorePct, { firstTry? })` | pass ≥80 → mastered +100; perfect-first-try +50; toasts |
| `recordBossResult(trackId, cleared, heartsLeft)` | victory +300; flawless (3♥) +150; champion badges |
| `unlockAchievement(id)` | +badge XP (see ACHIEVEMENTS) |
| `touchStreak()` | mark a meaningful action for today |
| `addTime(ms)` | add to totalTimeMs (paper/boss pages: session timers) |
| `setSound(on)` / `setReducedMotion(on)` | profile toggles |
| `exportSave()` → JSON string · `importSave(json)` → `{ok,error}` · `resetSave()` | save manager |

Rank-ups open the `LevelUpModal` automatically (mounted in `Layout`) and fire
gold confetti. Achievement unlocks toast automatically.

## Pure helpers

```ts
import { RANKS, rankForXp, nextRank, rankProgress } from '@/lib/game/ranks';
import { TRACKS, trackById } from '@/lib/game/tracks';            // colors, emblems, boss names
import { PAPERS, paperBySlug, papersByTrack, fileLabel, CANONICAL_COUNT } from '@/lib/game/papers';
import { ACHIEVEMENTS, achievementById } from '@/lib/game/achievements';
import { XP, QUIZ_PASS_PCT, QUIZ_DRAW, BOSS_QUESTIONS, BOSS_HEARTS, comboMultiplier, answerXp } from '@/lib/game/xp';
import {
  isMastered, masteredCount, percentOfWhatMatters,       // the "n% of what matters" meter
  isTrackUnlocked, trackLockReason, isPaperUnlocked, isBossUnlocked, isBossCleared,
  paperNodeState, trackProgress, nextObjective, continueSlug,
} from '@/lib/game/unlocks';
import { formatInt, timeAgo, stars, flameTier, FLAME_COLORS, useReducedMotion } from '@/lib/game/format';
import { sfx, armAudio } from '@/lib/game/sound';          // sfx.correct/wrong/xp/levelUp/bossHit/combo(tier)
import { fireQuizPass, fireBossKill, fireLevelUp, confettiEnabled } from '@/lib/game/confetti';
import { useUiStore, pushToast } from '@/lib/game/ui';     // toasts + level-up queue
```

Unlock rules (§4.7): linear within a track; t1 open; t2 ← t1 boss; t3/t4 ← 6
papers; t5 ← 14 papers; bonus papers (31–32) ← scaling-laws-2020 mastered;
boss ← all canonical papers in track mastered.

## HUD components (`@/components/game/*`)

| Component | Key props |
|---|---|
| `CornerPanel` | `cornerColor` (track/gold/danger), `cornerSize`, `raised` — signature HUD panel |
| `XPBar` | `current`, `needed` (rank span), `labeled` |
| `RankBadge` | `rank` (from `rankForXp`), `size`, `showName` — Carmack Tier renders `/badge-carmack.png` |
| `StreakFlame` | `count`, `size`, `showCount` — tier-tinted, pulses on increment |
| `TrackChip` | `track`, `full` |
| `ProgressRing` | `value` 0..1, `size`, `color` — the 90% meter |
| `CountUp` | `value`, `duration`, `format` — 900 ms expo-out numerals |
| `ComboMeter` | `combo`, `color`, `breakKey` (bump on wrong answer to scatter) |
| `EmptyState` | `glyph`, `message`, `cta` |
| `XPToast` | mounted in Layout — push via `pushToast(text, kind)` |
| `LevelUpModal` | mounted in Layout — driven by the store |

Chrome (`@/components/Navbar`, `Footer`, `Layout`) is already wired in
`App.tsx` — pages render only their own content. Nav is `sticky top-0 z-50`
in normal flow: **do not** add nav-height padding in pages.

## Sound & motion rules

- `armAudio()` is already wired to the first gesture in `Layout`; call
  `sfx.*` freely — they no-op when muted/unarmed.
- Respect `useReducedMotion()`: kill particles/confetti/parallax, keep fades
  ≤ 200 ms. `confettiEnabled()` already checks it.
- Confetti is earned (quiz pass / boss kill / level-up), never ambient.
