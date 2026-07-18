import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useSaveStore } from '@/lib/game/save';
import { TRACKS, trackById } from '@/lib/game/tracks';
import type { Track } from '@/lib/game/tracks';
import type { Paper } from '@/lib/game/papers';
import { CANONICAL_COUNT, fileLabel, paperBySlug } from '@/lib/game/papers';
import type { SaveFile, TrackId } from '@/lib/game/types';
import {
  isBossCleared,
  isBossUnlocked,
  isTrackUnlocked,
  masteredCount,
  nextObjective,
  paperNodeState,
} from '@/lib/game/unlocks';
import { useReducedMotion } from '@/lib/game/format';
import MapNode from './MapNode';
import BossNode, { type BossState } from './BossNode';
import IntelCard, { type IntelData } from './IntelCard';
import MapNavigator from './MapNavigator';
import LaneStrip from './LaneStrip';
import {
  CANVAS_H,
  CANVAS_W,
  LANE_W,
  bonusNodePos,
  bonusPapers,
  bonusPath,
  bossNodePos,
  canonicalPapers,
  chainPath,
  gatePath,
  laneLeft,
  paperNodePos,
} from './geometry';

/**
 * SkillTree (map.md §2) — the desktop (≥1024px) quest-map canvas: a
 * horizontally-scrollable 1900px playfield with five track lanes, SVG bezier
 * edges (locked dashed / unlocked solid / mastered energy-flow), 32 paper
 * nodes + 5 boss hexagons, drag-to-pan, a synced sticky lane-header strip,
 * the mini navigator, and the one-time entrance choreography (edges draw
 * top-down, nodes pop, ~2.5s, skippable on click, once per session).
 */

const INTRO_KEY = 'np90.map.intro';
const INTRO_MS = 2600;

type EdgeState = 'locked' | 'unlocked' | 'mastered';

interface Edge {
  id: string;
  d: string;
  state: EdgeState;
  color: string;
  delay: number;
}

/** in-progress ring fraction: sections 60% · lab 20% · quiz best 20% */
function progressFrac(save: SaveFile, paper: Paper): number {
  const p = save.papers[paper.slug];
  if (!p) return 0;
  const sections = Math.min(7, p.sectionsRead.length) / 7;
  const lab = p.labDone ? 1 : 0;
  const quiz = Math.min(100, p.quizBest) / 100;
  return Math.min(1, sections * 0.6 + lab * 0.2 + quiz * 0.2);
}

function paperStateLine(save: SaveFile, paper: Paper): string {
  const state = paperNodeState(save, paper);
  const prog = save.papers[paper.slug];
  if (state === 'mastered') {
    return `mastered ✓ · quiz best ${prog?.quizBest ?? 0}%${prog?.perfectQuiz ? ' · perfect' : ''}`;
  }
  if (state === 'in-progress') {
    return `in progress — ${prog?.sectionsRead.length ?? 0}/7 sections · quiz best ${prog?.quizBest ?? 0}%`;
  }
  if (state === 'available') return 'available — enter the level';
  // locked — find the blocking requirement
  if (!isTrackUnlocked(save, paper.track)) {
    return `locked — ${trackById(paper.track).unlockHint}`;
  }
  if (paper.bonus) {
    const scaling = paperBySlug('scaling-laws-2020');
    return `locked — master ${scaling ? fileLabel(scaling) : 'FILE 030'} first`;
  }
  const lane = canonicalPapers(trackById(paper.track));
  const idx = lane.findIndex((p) => p.slug === paper.slug);
  if (idx > 0) return `locked — master ${fileLabel(lane[idx - 1])} first`;
  return 'locked';
}

function bossStateOf(save: SaveFile, track: Track): BossState {
  if (isBossCleared(save, track.id)) return 'cleared';
  if (isBossUnlocked(save, track.id)) return 'ready';
  return 'locked';
}

function bossStateLine(save: SaveFile, track: Track): string {
  const state = bossStateOf(save, track);
  const rec = save.bosses[track.id];
  if (state === 'cleared') {
    return `slain ✓ · best ${rec?.bestHearts ?? 3}♥${rec?.flawless ? ' · flawless' : ''}`;
  }
  if (state === 'ready') return 'ready — 10 questions · 3 hearts';
  return `locked — master all ${canonicalPapers(track).length} track papers first`;
}

export default function SkillTree({ onFight }: { onFight: (trackId: TrackId) => void }) {
  const save = useSaveStore();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
  const swallowClick = useRef(false);
  const [grabbing, setGrabbing] = useState(false);
  const [intel, setIntel] = useState<IntelData | null>(null);

  // ---- entrance choreography (once per session, skippable) ----------------
  const [introDone, setIntroDone] = useState(() => {
    if (reduced) return true;
    try {
      return sessionStorage.getItem(INTRO_KEY) === '1';
    } catch {
      return true;
    }
  });
  const introActive = !introDone && !reduced;
  const finishIntro = useCallback(() => {
    setIntroDone(true);
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* private mode */
    }
  }, []);
  useEffect(() => {
    if (!introActive) return;
    const t = window.setTimeout(finishIntro, INTRO_MS);
    return () => window.clearTimeout(t);
  }, [introActive, finishIntro]);

  // ---- derived state -------------------------------------------------------
  const objective = nextObjective(save);
  const nextSlug = objective.kind === 'paper' ? objective.paper.slug : null;
  const allDone = masteredCount(save, { canonicalOnly: true }) >= CANONICAL_COUNT;

  // ---- edges ---------------------------------------------------------------
  const edges: Edge[] = [];
  TRACKS.forEach((track, laneIdx) => {
    const papers = canonicalPapers(track);
    const base = 0.25 + laneIdx * 0.1;
    const pos = papers.map((_, j) => paperNodePos(laneIdx, j));
    const bPos = bossNodePos(laneIdx, papers.length);
    const bState = bossStateOf(save, track);

    for (let j = 0; j < papers.length - 1; j++) {
      const target = paperNodeState(save, papers[j + 1]);
      const st: EdgeState = target === 'mastered' ? 'mastered' : target === 'locked' ? 'locked' : 'unlocked';
      edges.push({
        id: `${track.id}-c${j}`,
        d: chainPath(pos[j], pos[j + 1]),
        state: st,
        color: track.color,
        delay: base + j * 0.08,
      });
    }
    // last node → boss
    edges.push({
      id: `${track.id}-boss`,
      d: chainPath(pos[pos.length - 1], bPos),
      state: bState === 'cleared' ? 'mastered' : bState === 'ready' ? 'unlocked' : 'locked',
      color: track.color,
      delay: base + (papers.length - 1) * 0.08,
    });
    // bonus branches (lane 5): Scaling Laws → each bonus node, around the boss
    const bonus = bonusPapers(track);
    if (bonus.length > 0) {
      const scalingIdx = papers.findIndex((p) => p.slug === 'scaling-laws-2020');
      const from = scalingIdx >= 0 ? pos[scalingIdx] : pos[pos.length - 1];
      bonus.forEach((bp, k) => {
        const st = paperNodeState(save, bp);
        edges.push({
          id: `${track.id}-b${k}`,
          d: bonusPath(from, bonusNodePos(laneIdx, k, papers.length)),
          state: st === 'mastered' ? 'mastered' : st === 'locked' ? 'locked' : 'unlocked',
          color: track.color,
          delay: base + (papers.length + k) * 0.08,
        });
      });
    }
  });
  // cross-lane gate edge: T1 boss → T2 first node
  {
    const t1 = TRACKS[0];
    const t2 = TRACKS[1];
    const a = bossNodePos(0, canonicalPapers(t1).length);
    const b = paperNodePos(1, 0);
    edges.push({
      id: 'gate-t1-t2',
      d: gatePath(a, b),
      state: isTrackUnlocked(save, 't2') ? 'mastered' : 'locked',
      color: t2.color,
      delay: 1.1,
    });
  }
  if (allDone) {
    // completion state (map.md §5): the whole canvas flows with energy
    for (const e of edges) e.state = 'mastered';
  }

  // ---- hover intel card ----------------------------------------------------
  const hoverPaper = useCallback(
    (paper: Paper, el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      setIntel({
        kind: 'paper',
        track: trackById(paper.track),
        rect: { top: r.top, bottom: r.bottom, left: r.left, width: r.width },
        state: paperNodeState(save, paper),
        stateLine: paperStateLine(save, paper),
        paper,
      });
    },
    [save],
  );
  const hoverBoss = useCallback(
    (track: Track) => (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const bs = bossStateOf(save, track);
      setIntel({
        kind: 'boss',
        track,
        rect: { top: r.top, bottom: r.bottom, left: r.left, width: r.width },
        state: bs === 'cleared' ? 'mastered' : bs === 'ready' ? 'available' : 'locked',
        stateLine: bossStateLine(save, track),
      });
    },
    [save],
  );
  const clearIntel = useCallback(() => setIntel(null), []);

  useEffect(() => {
    window.addEventListener('scroll', clearIntel, { passive: true });
    return () => window.removeEventListener('scroll', clearIntel);
  }, [clearIntel]);

  // ---- navigation ----------------------------------------------------------
  const openPaper = useCallback(
    (paper: Paper) => {
      setIntel(null);
      navigate(`/paper/${paper.slug}`);
    },
    [navigate],
  );

  // ---- strip sync + intel clear on canvas scroll ---------------------------
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    const strip = stripRef.current;
    if (el && strip) strip.style.transform = `translateX(${-el.scrollLeft}px)`;
    setIntel(null);
  }, []);
  // initial strip alignment (DOM sync only)
  useEffect(() => {
    const el = scrollRef.current;
    const strip = stripRef.current;
    if (el && strip) strip.style.transform = `translateX(${-el.scrollLeft}px)`;
  }, []);

  // ---- drag to pan ----------------------------------------------------------
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  }, []);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      const el = scrollRef.current;
      if (!d.down || !el) return;
      const dx = e.clientX - d.startX;
      if (!d.moved && Math.abs(dx) > 5) {
        d.moved = true;
        setGrabbing(true);
      }
      if (d.moved) el.scrollLeft = d.startScroll - dx;
    };
    const up = () => {
      if (drag.current.moved) {
        swallowClick.current = true;
        window.setTimeout(() => {
          swallowClick.current = false;
        }, 0);
      }
      drag.current.down = false;
      setGrabbing(false);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  // shift+wheel pans horizontally
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        el.scrollLeft += e.deltaY + e.deltaX;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onClickCapture = useCallback(
    (e: React.MouseEvent) => {
      if (introActive) finishIntro(); // entrance is skippable on click
      if (swallowClick.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [introActive, finishIntro],
  );

  // ---- render ---------------------------------------------------------------
  return (
    <div className="hidden lg:block" aria-label="skill tree">
      <LaneStrip stripRef={stripRef} introDone={!introActive} />

      <div className="mx-auto max-w-map px-4 pt-8 pb-20 sm:px-6">
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            onPointerDown={onPointerDown}
            onClickCapture={onClickCapture}
            className={`np-map-scroll overflow-x-auto ${grabbing ? 'cursor-grabbing' : 'cursor-crosshair'}`}
            aria-label="quest map canvas — drag or shift+wheel to pan horizontally"
          >
            <div className="grid-texture relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
              {/* faint larger grid at 160px */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
                  backgroundSize: '160px 160px',
                }}
              />
              {/* per-lane tint washes (track color at 4%) */}
              {TRACKS.map((t, i) => (
                <div
                  key={t.id}
                  aria-hidden
                  className="absolute top-0 bottom-0"
                  style={{
                    left: laneLeft(i),
                    width: LANE_W,
                    background: `color-mix(in srgb, ${t.color} 4%, transparent)`,
                  }}
                />
              ))}

              {/* edges layer */}
              <svg
                aria-hidden
                className="pointer-events-none absolute inset-0"
                width={CANVAS_W}
                height={CANVAS_H}
              >
                {edges.map((e) =>
                  introActive ? (
                    <motion.path
                      key={e.id}
                      d={e.d}
                      fill="none"
                      stroke={e.state === 'locked' ? 'var(--line)' : e.color}
                      strokeWidth={e.state === 'mastered' ? 2 : e.state === 'unlocked' ? 1.5 : 1}
                      strokeLinecap="round"
                      opacity={e.state === 'unlocked' ? 0.6 : 1}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.7, delay: e.delay, ease: 'easeInOut' }}
                    />
                  ) : (
                    <path
                      key={e.id}
                      d={e.d}
                      fill="none"
                      stroke={e.state === 'locked' ? 'var(--line)' : e.color}
                      strokeWidth={e.state === 'mastered' ? 2 : e.state === 'unlocked' ? 1.5 : 1}
                      strokeDasharray={
                        e.state === 'locked' ? '3 7' : e.state === 'mastered' ? '12 8' : undefined
                      }
                      strokeLinecap="round"
                      opacity={e.state === 'unlocked' ? 0.6 : 1}
                    >
                      {e.state === 'mastered' && !reduced && (
                        <animate
                          attributeName="stroke-dashoffset"
                          from="20"
                          to="0"
                          dur="1.2s"
                          repeatCount="indefinite"
                        />
                      )}
                    </path>
                  ),
                )}
              </svg>

              {/* paper nodes + boss nodes */}
              {TRACKS.map((track, laneIdx) => {
                const papers = canonicalPapers(track);
                const bonus = bonusPapers(track);
                const base = 0.25 + laneIdx * 0.1;
                const bPos = bossNodePos(laneIdx, papers.length);
                const bState = bossStateOf(save, track);
                const bossRec = save.bosses[track.id];
                return (
                  <div key={track.id}>
                    {papers.map((paper, j) => {
                      const p = paperNodePos(laneIdx, j);
                      const st = paperNodeState(save, paper);
                      return (
                        <MapNode
                          key={paper.slug}
                          paper={paper}
                          track={track}
                          state={st}
                          frac={st === 'in-progress' ? progressFrac(save, paper) : 0}
                          isNext={paper.slug === nextSlug}
                          x={p.x}
                          y={p.y}
                          introDelay={base + 0.3 + j * 0.08}
                          introDone={!introActive}
                          onOpen={openPaper}
                          onHoverStart={hoverPaper}
                          onHoverEnd={clearIntel}
                        />
                      );
                    })}
                    <BossNode
                      track={track}
                      state={bState}
                      bestHearts={bossRec?.bestHearts ?? 3}
                      attempts={bossRec?.attempts ?? 0}
                      x={bPos.x}
                      y={bPos.y}
                      introDelay={base + 0.3 + papers.length * 0.08}
                      introDone={!introActive}
                      onFight={(t) => {
                        setIntel(null);
                        onFight(t.id);
                      }}
                      onHoverStart={hoverBoss(track)}
                      onHoverEnd={clearIntel}
                    />
                    {bonus.map((bp, k) => {
                      const p = bonusNodePos(laneIdx, k, papers.length);
                      const st = paperNodeState(save, bp);
                      return (
                        <MapNode
                          key={bp.slug}
                          paper={bp}
                          track={track}
                          state={st}
                          frac={st === 'in-progress' ? progressFrac(save, bp) : 0}
                          isNext={bp.slug === nextSlug}
                          x={p.x}
                          y={p.y}
                          introDelay={base + 0.3 + (papers.length + 1 + k) * 0.08}
                          introDone={!introActive}
                          onOpen={openPaper}
                          onHoverStart={hoverPaper}
                          onHoverEnd={clearIntel}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* edge fade masks (48px) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-20 w-12 bg-gradient-to-r from-void to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-20 w-12 bg-gradient-to-l from-void to-transparent"
          />
        </div>
      </div>

      <MapNavigator scrollRef={scrollRef} />
      {intel && <IntelCard data={intel} />}
    </div>
  );
}
