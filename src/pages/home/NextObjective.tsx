import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Skull } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import TrackChip from '@/components/game/TrackChip';
import Reveal from './Reveal';
import { useSaveStore } from '@/lib/game/save';
import { nextObjective } from '@/lib/game/unlocks';
import { trackById } from '@/lib/game/tracks';
import { fileLabel } from '@/lib/game/papers';
import { stars } from '@/lib/game/format';

/**
 * Section 4 — Next Objective (home.md): wide CornerPanel, corners in the
 * next paper's track color; left content / right pulsing mini-map snippet.
 * Boss-unlocked state flips it to a danger callout.
 */

function MiniMapSnippet({ color, danger }: { color: string; danger?: boolean }) {
  return (
    <svg viewBox="0 0 260 160" className="h-full w-full" aria-hidden>
      {/* lane */}
      <line x1="20" y1="80" x2="240" y2="80" stroke="var(--line)" strokeWidth="2" strokeDasharray="6 6" />
      {/* upstream nodes */}
      <circle cx="52" cy="80" r="10" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="2" />
      <circle cx="96" cy="80" r="10" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="2" opacity="0.7" />
      {/* target node */}
      <circle cx="160" cy="80" r="14" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="160" cy="80" r="6" fill={color} />
      {/* pulsing ring */}
      <circle cx="160" cy="80" r="14" fill="none" stroke={color} strokeWidth="2" opacity="0.9">
        <animate attributeName="r" values="14;26" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* boss hex ahead */}
      {danger && (
        <polygon
          points="220,62 236,71 236,89 220,98 204,89 204,71"
          fill="none"
          stroke="var(--danger)"
          strokeWidth="2.5"
        />
      )}
    </svg>
  );
}

export default function NextObjective() {
  // Compute the derived objective once per render; nextObjective reads
  // from the store directly so no dependency array needed.
  const objective = useMemo(
    () => nextObjective(useSaveStore.getState()),
    [],
  );

  if (objective.kind === 'done') {
    return (
      <section className="bg-void pb-24 md:pb-32" aria-label="next objective">
        <div className="mx-auto max-w-shell px-4 sm:px-6">
          <Reveal>
            <CornerPanel cornerColor="#FBBF24" className="p-8 text-center md:p-10">
              <span className="hud-label text-xp">run complete</span>
              <h3 className="mt-3 font-display text-2xl font-semibold text-txt">
                all 32 levels cleared — 94% and beyond.
              </h3>
              <p className="mt-2 font-mono text-[13px] lowercase text-txt-dim">
                there is no next objective. there is only the leaderboard in your head.
              </p>
            </CornerPanel>
          </Reveal>
        </div>
      </section>
    );
  }

  if (objective.kind === 'boss') {
    const track = trackById(objective.track);
    return (
      <section className="bg-void pb-24 md:pb-32" aria-label="next objective">
        <div className="mx-auto max-w-shell px-4 sm:px-6">
          <Reveal>
            <CornerPanel cornerColor="#FB7185" className="overflow-hidden">
              <div className="grid items-center gap-8 p-8 md:grid-cols-5 md:p-10">
                <div className="md:col-span-3">
                  <span className="hud-label animate-danger-pulse text-danger">boss ready — {track.bossSlug} awaits</span>
                  <h3 className="mt-3 font-display text-[26px] font-semibold text-txt">
                    BOSS T{track.num} — {track.bossName}
                  </h3>
                  <div className="mt-3">
                    <TrackChip track={track} />
                  </div>
                  <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.75] text-txt-dim">
                    10 questions from the whole {track.short.toLowerCase()} pool. 3 hearts. no progress lost on defeat —
                    only pride.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-4 font-mono text-[12px] lowercase text-txt-dim">
                    <span className="text-xp">+600 xp available</span>
                    <span>3 ♥</span>
                  </div>
                  <Link
                    to={`/boss/${track.id}`}
                    className="hud-label mt-6 inline-flex items-center gap-2 rounded-lg bg-danger px-6 py-3.5 text-void transition-all duration-200 hover:shadow-glow-danger"
                  >
                    <Skull size={15} />
                    fight
                    <ArrowRight size={15} />
                  </Link>
                </div>
                <div className="hidden h-[160px] md:col-span-2 md:block">
                  <MiniMapSnippet color={track.color} danger />
                </div>
              </div>
            </CornerPanel>
          </Reveal>
        </div>
      </section>
    );
  }

  const { paper, resumeSection } = objective;
  const track = trackById(paper.track);

  return (
    <section className="bg-void pb-24 md:pb-32" aria-label="next objective">
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <Reveal>
          <CornerPanel cornerColor={track.color} className="overflow-hidden">
            <div className="grid items-center gap-8 p-8 md:grid-cols-5 md:p-10">
              <div className="md:col-span-3">
                <span className="hud-label" style={{ color: track.color }}>
                  next objective
                </span>
                <h3 className="mt-3 font-display text-[22px] font-semibold leading-snug text-txt md:text-[26px]">
                  {fileLabel(paper)} — {paper.title}
                </h3>
                <div className="mt-3">
                  <TrackChip track={track} />
                </div>
                <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.75] text-txt-dim">{paper.hook}</p>
                <div className="mt-5 flex flex-wrap items-center gap-4 font-mono text-[12px] lowercase text-txt-dim">
                  <span className="text-xp">+{paper.xp} xp available</span>
                  <span>~{paper.minutes} min</span>
                  <span>{stars(paper.stars)}</span>
                </div>
                {resumeSection != null && resumeSection > 0 && (
                  <div className="mt-4 max-w-[360px]">
                    <div className="h-[4px] overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${Math.min(100, (resumeSection / 7) * 100)}%`, backgroundColor: track.color }}
                      />
                    </div>
                    <span className="micro-label mt-1.5 inline-block text-txt-faint">section {resumeSection}/7</span>
                  </div>
                )}
                <Link
                  to={`/paper/${paper.slug}`}
                  className="hud-label group mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-void transition-all duration-200"
                  style={{ backgroundColor: track.color, boxShadow: `0 0 0 transparent` }}
                >
                  {resumeSection != null && resumeSection > 0 ? `continue — section ${resumeSection + 1}/7` : 'start level'}
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="hidden h-[160px] md:col-span-2 md:block">
                <MiniMapSnippet color={track.color} />
              </div>
            </div>
          </CornerPanel>
        </Reveal>
      </div>
    </section>
  );
}
