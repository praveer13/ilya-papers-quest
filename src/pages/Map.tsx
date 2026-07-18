import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence } from 'framer-motion';
import { useSaveStore } from '@/lib/game/save';
import { TRACKS, type Track } from '@/lib/game/tracks';
import type { TrackId } from '@/lib/game/types';
import { CANONICAL_COUNT } from '@/lib/game/papers';
import { isTrackUnlocked, masteredCount, percentOfWhatMatters } from '@/lib/game/unlocks';
import MapHeader from './map/MapHeader';
import SkillTree from './map/SkillTree';
import MobileMap from './map/MobileMap';
import { BossFlash, CompletionOverlay, WorldUnlockOverlay } from './map/Overlays';

/**
 * Quest Map — `/map` (map.md). The skill tree: five lanes, 32 paper nodes,
 * 5 boss hexagons, edges that light up as you progress. Desktop gets the
 * horizontally-pannable SVG canvas; <1024px gets the accordion fallback.
 *
 * State derives entirely from the save store (mastered papers, section/lab/
 * quiz progress, boss records) evaluated through `@/lib/game/unlocks`.
 * Page-local UI memories live in storage: intro seen (session), worlds whose
 * unlock cinematic already played, and the one-time completion overlay.
 */

const UNLOCKS_KEY = 'np90.map.unlocksSeen';
const COMPLETE_KEY = 'np90.map.completeSeen';

/** page-scoped styles: breathing node glow + slim canvas scrollbar */
const MAP_STYLES = `
@keyframes np-breathe {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
  50% { box-shadow: 0 0 24px var(--np-glow, rgba(34, 211, 238, 0.3)); }
}
.np-map-scroll { scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
.np-map-scroll::-webkit-scrollbar { height: 6px; }
.np-map-scroll::-webkit-scrollbar-track { background: transparent; }
.np-map-scroll::-webkit-scrollbar-thumb { background: var(--line); border: none; border-radius: 999px; }
.np-map-scroll::-webkit-scrollbar-thumb:hover { background: #33334f; }
`;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — cinematics may replay, harmless */
  }
}

export default function Map() {
  const save = useSaveStore();
  const navigate = useNavigate();

  const pct = percentOfWhatMatters(save);
  const canonical = masteredCount(save, { canonicalOnly: true });

  // map.md §4/§5 — on arrival, celebrate worlds unlocked since the last map
  // visit (one at a time) and the all-30 completion moment (plays once ever).
  const [unlockQueue, setUnlockQueue] = useState<Track[]>(() => {
    const state = useSaveStore.getState();
    const seen = readJSON<string[]>(UNLOCKS_KEY, []);
    return TRACKS.filter((t) => t.id !== 't1' && isTrackUnlocked(state, t.id) && !seen.includes(t.id));
  });
  const [showComplete, setShowComplete] = useState<boolean>(() => {
    const state = useSaveStore.getState();
    return (
      masteredCount(state, { canonicalOnly: true }) >= CANONICAL_COUNT &&
      !readJSON<boolean>(COMPLETE_KEY, false)
    );
  });
  const [flash, setFlash] = useState(false);

  // persist the "already celebrated" markers once, on mount
  useEffect(() => {
    const state = useSaveStore.getState();
    const seen = readJSON<string[]>(UNLOCKS_KEY, []);
    const fresh = TRACKS.filter((t) => t.id !== 't1' && isTrackUnlocked(state, t.id) && !seen.includes(t.id));
    if (fresh.length > 0) writeJSON(UNLOCKS_KEY, [...seen, ...fresh.map((t) => t.id)]);
    if (masteredCount(state, { canonicalOnly: true }) >= CANONICAL_COUNT) writeJSON(COMPLETE_KEY, true);
  }, []);

  // boss fight entry — red flash transition (map.md §2 interactions)
  const fight = useCallback(
    (trackId: TrackId) => {
      setFlash(true);
      window.setTimeout(() => navigate(`/boss/${trackId}`), 200);
    },
    [navigate],
  );

  const currentUnlock = unlockQueue[0] ?? null;

  return (
    <div className="relative" aria-label="quest map">
      <style>{MAP_STYLES}</style>

      <MapHeader mastered={canonical} pct={pct} />

      {/* desktop ≥1024px: the skill-tree canvas */}
      <SkillTree onFight={fight} />

      {/* mobile <1024px: accordion fallback */}
      <MobileMap onFight={fight} />

      {/* world unlock celebration (queued, one per newly opened world) */}
      <AnimatePresence>
        {currentUnlock && (
          <WorldUnlockOverlay
            key={currentUnlock.id}
            track={currentUnlock}
            onDismiss={() => setUnlockQueue((q) => q.slice(1))}
          />
        )}
      </AnimatePresence>

      {/* all-30 completion moment (after any pending unlock cinematics) */}
      <AnimatePresence>
        {showComplete && !currentUnlock && (
          <CompletionOverlay xp={save.xp} onDismiss={() => setShowComplete(false)} />
        )}
      </AnimatePresence>

      <BossFlash active={flash} />
    </div>
  );
}
