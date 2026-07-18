import { motion } from 'framer-motion';
import { Check, Lock, Swords } from 'lucide-react';
import type { RefObject } from 'react';
import { useSaveStore } from '@/lib/game/save';
import { TRACKS } from '@/lib/game/tracks';
import { trackLockReason, trackProgress } from '@/lib/game/unlocks';
import { CANVAS_W, LANE_W, laneLeft } from './geometry';
import { cn } from '@/lib/utils';

/**
 * LaneStrip (map.md §2 lane headers) — the five lane headers pinned to the
 * top of the map canvas. Lives outside the horizontal scroll container (so
 * `sticky` works against page scroll) and is kept in sync with the canvas
 * pan via a translateX on `stripRef` (driven by SkillTree's onScroll).
 */
export default function LaneStrip({
  stripRef,
  introDone,
}: {
  stripRef: RefObject<HTMLDivElement | null>;
  introDone: boolean;
}) {
  const save = useSaveStore();

  return (
    <div className="sticky top-32 z-30 hidden border-b border-line bg-void/90 backdrop-blur-md lg:block">
      <div className="mx-auto max-w-map px-4 sm:px-6">
        <div className="h-[84px] overflow-hidden">
          <div ref={stripRef} className="relative h-full will-change-transform" style={{ width: CANVAS_W }}>
            {TRACKS.map((track, i) => {
              const prog = trackProgress(save, track.id);
              return (
                <div
                  key={track.id}
                  className="absolute top-0 h-full px-3"
                  style={{ left: laneLeft(i), width: LANE_W }}
                >
                  <motion.div
                    className="flex h-full items-center gap-3"
                    initial={introDone ? false : { y: -16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <img
                      src={track.emblem}
                      alt=""
                      loading="lazy"
                      className={cn(
                        'size-12 shrink-0 object-contain',
                        !prog.unlocked && 'opacity-50 grayscale',
                      )}
                      style={prog.unlocked ? { filter: `drop-shadow(0 0 8px color-mix(in srgb, ${track.color} 45%, transparent))` } : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="micro-label text-[10px]" style={{ color: track.color }}>
                        track {track.num}
                      </div>
                      <div className="truncate font-display text-[15px] font-semibold leading-tight text-txt">
                        {track.name}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
                          <div
                            className="h-full rounded-full transition-[width] duration-700 ease-expo-out"
                            style={{
                              width: `${prog.total ? (prog.mastered / prog.total) * 100 : 0}%`,
                              backgroundColor: track.color,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-txt-dim">
                          {prog.mastered}/{prog.total}
                        </span>
                      </div>
                      <div className="micro-label mt-[3px] flex items-center gap-1 text-[10px] normal-case">
                        {!prog.unlocked && (
                          <span className="inline-flex items-center gap-1 text-txt-faint">
                            <Lock size={9} /> {trackLockReason(track.id)}
                          </span>
                        )}
                        {prog.unlocked && prog.bossCleared && (
                          <span className="inline-flex items-center gap-1 text-success">
                            boss slain <Check size={9} />
                          </span>
                        )}
                        {prog.unlocked && !prog.bossCleared && prog.bossUnlocked && (
                          <span className="inline-flex animate-danger-pulse items-center gap-1 text-danger">
                            <Swords size={9} /> boss ready
                          </span>
                        )}
                        {prog.unlocked && !prog.bossCleared && !prog.bossUnlocked && (
                          <span className="text-txt-faint">world open</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
