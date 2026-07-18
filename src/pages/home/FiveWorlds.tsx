import { useNavigate } from 'react-router';
import { Check, Lock } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import Reveal from './Reveal';
import { useSaveStore } from '@/lib/game/save';
import { TRACKS, type Track } from '@/lib/game/tracks';
import { trackLockReason, trackProgress } from '@/lib/game/unlocks';
import { cn } from '@/lib/utils';

/**
 * Section 5 — The Five Worlds (home.md): 5-column track card row (horizontal
 * snap-scroll on mobile). Emblem, name, progress, boss status; locked cards
 * get a grayscale overlay + requirement line and shake on click.
 */

function BossStatus({ track, save }: { track: Track; save: Parameters<typeof trackProgress>[0] }) {
  const prog = trackProgress(save, track.id);
  if (prog.bossCleared) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[12px] uppercase tracking-[0.08em] text-success">
        slain <Check size={12} />
      </span>
    );
  }
  if (prog.bossUnlocked) {
    return (
      <span className="inline-flex animate-danger-pulse items-center gap-1 font-mono text-[12px] uppercase tracking-[0.08em] text-danger">
        ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[12px] uppercase tracking-[0.08em] text-txt-faint">
      <Lock size={11} /> locked
    </span>
  );
}

export default function FiveWorlds() {
  const navigate = useNavigate();
  const save = useSaveStore();

  const handleClick = (_track: Track, unlocked: boolean, e: React.MouseEvent<HTMLDivElement>) => {
    if (unlocked) {
      navigate('/map');
    } else {
      // gentle shake (x ±3px, 200 ms)
      const el = e.currentTarget;
      el.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }],
        { duration: 200, iterations: 1 },
      );
    }
  };

  return (
    <section className="bg-abyss py-24 md:py-32" aria-label="the five worlds">
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <Reveal>
          <h2 className="font-display text-[30px] font-semibold text-txt md:text-[36px]">the five worlds</h2>
          <p className="micro-label mt-2 text-txt-faint">{'// clear a world’s boss to unlock the next'}</p>
        </Reveal>

        <div className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
          {TRACKS.map((track, i) => {
            const prog = trackProgress(save, track.id);
            const unlocked = prog.unlocked;
            return (
              <Reveal key={track.id} delay={0.1 * i} y={48} className="min-w-[220px] snap-start lg:min-w-0">
                <div
                  onClick={(e) => handleClick(track, unlocked, e)}
                  title={unlocked ? track.name : trackLockReason(track.id)}
                  className="h-full"
                >
                  <CornerPanel
                    cornerColor={track.color}
                    className={cn(
                      'group h-full cursor-pointer p-5 transition-all duration-200 hover:-translate-y-1.5',
                      unlocked && 'hover:shadow-glow-cyan',
                    )}
                  >
                    <div className="relative">
                      <img
                        src={track.emblem}
                        alt={`${track.name} emblem`}
                        className={cn(
                          'mx-auto size-24 object-contain transition-all duration-300',
                          unlocked ? 'opacity-100 group-hover:drop-shadow-[0_0_14px_var(--glow)]' : 'opacity-60 grayscale',
                        )}
                        style={{ ['--glow' as string]: track.color }}
                        loading="lazy"
                      />
                      {!unlocked && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock size={20} className="text-txt-faint" />
                        </div>
                      )}
                    </div>

                    <h3 className="mt-4 font-display text-[18px] font-semibold text-txt">
                      T{track.num} · {track.short}
                    </h3>
                    <p className="micro-label mt-1 normal-case text-txt-faint">{track.name.toLowerCase()}</p>

                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full transition-[width] duration-700 ease-expo-out"
                          style={{
                            width: `${prog.total ? (prog.mastered / prog.total) * 100 : 0}%`,
                            backgroundColor: track.color,
                            transitionDelay: '300ms',
                          }}
                        />
                      </div>
                      <span className="font-mono text-[12px] text-txt-dim">
                        {prog.mastered}/{prog.total}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                      <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-txt-dim">
                        {prog.total} LEVELS
                      </span>
                      <BossStatus track={track} save={save} />
                    </div>

                    {!unlocked && (
                      <p className="micro-label mt-3 text-txt-faint">{trackLockReason(track.id)}</p>
                    )}
                  </CornerPanel>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
