/**
 * Boss Fight — `/boss/:trackId` (boss.md). Route glue + screen machine:
 * reveal → (red wipe) → battle → victory | defeat. Handles unknown track ids
 * and locked boss nodes (all canonical papers of the track must be mastered).
 * The global Layout already hides the footer on /boss/* (focus mode).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Lock, TriangleAlert } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import { useSaveStore } from '@/lib/game/save';
import { TRACKS, type Track } from '@/lib/game/tracks';
import { papersByTrack } from '@/lib/game/papers';
import { isBossUnlocked, trackProgress } from '@/lib/game/unlocks';
import { BOSSES, type BossDef } from '@/data/bosses';
import BossReveal from './boss/BossReveal';
import BossBattle from './boss/BossBattle';
import BossVictory from './boss/BossVictory';
import BossDefeat from './boss/BossDefeat';
import type { FightResult } from './boss/combat';

type Screen = 'reveal' | 'battle' | 'victory' | 'defeat';

// ---------------------------------------------------------------------------
// locked / unknown states
// ---------------------------------------------------------------------------

function LockedBoss({ track, boss }: { track: Track; boss: BossDef }) {
  const prog = useSaveStore((s) => trackProgress(s, track.id));
  const papers = useSaveStore((s) => s.papers);
  const lane = papersByTrack(track.id).filter((p) => !p.bonus);
  return (
    <div className="mx-auto flex max-w-shell flex-col items-center px-4 py-24 sm:px-6">
      <CornerPanel cornerColor="#FB7185" className="w-full max-w-[560px] p-10 text-center">
        <Lock className="mx-auto size-8 text-danger" />
        <span className="micro-label mt-4 block text-txt-faint">// boss node locked</span>
        <h1 className="mt-3 font-display text-3xl font-bold text-txt">{boss.name}</h1>
        <p className="mt-3 font-mono text-[13px] lowercase leading-relaxed text-txt-dim">
          guardian of {track.name} — master every paper in this track to summon it.
        </p>
        <p className="stat-numeral mt-6 text-3xl text-danger">
          {prog.mastered}/{prog.total}
        </p>
        <p className="micro-label mt-1 text-txt-faint">papers mastered</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {lane.map((p) => {
            const done = papers[p.slug]?.mastered === true;
            return (
              <span
                key={p.slug}
                title={p.title}
                className="flex size-8 items-center justify-center rounded-full border"
                style={{
                  borderColor: done ? track.color : 'var(--line)',
                  backgroundColor: done ? `${track.color}14` : 'transparent',
                }}
              >
                {done ? (
                  <Check className="size-3.5" style={{ color: track.color }} />
                ) : (
                  <span className="font-mono text-[10px] text-txt-faint">{p.num}</span>
                )}
              </span>
            );
          })}
        </div>
        <Link
          to="/map"
          className="mt-8 inline-block rounded-lg border border-danger bg-danger/15 px-6 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-danger transition-colors hover:bg-danger/25"
        >
          return to map
        </Link>
      </CornerPanel>
    </div>
  );
}

function UnknownBoss() {
  return (
    <div className="mx-auto flex max-w-shell flex-col items-center px-4 py-24 sm:px-6">
      <CornerPanel cornerColor="#FB7185" className="w-full max-w-[520px] p-10 text-center">
        <TriangleAlert className="mx-auto size-8 text-danger" />
        <span className="micro-label mt-4 block text-txt-faint">// unknown track signature</span>
        <h1 className="mt-3 font-display text-3xl font-bold text-txt">no guardian here</h1>
        <p className="mt-3 font-mono text-[13px] lowercase text-txt-dim">
          five bosses exist: /boss/t1 … /boss/t5
        </p>
        <Link
          to="/map"
          className="mt-8 inline-block rounded-lg border border-danger bg-danger/15 px-6 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-danger transition-colors hover:bg-danger/25"
        >
          return to map
        </Link>
      </CornerPanel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// screen machine
// ---------------------------------------------------------------------------

function BossFlow({ track, boss }: { track: Track; boss: BossDef }) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('reveal');
  const [fightKey, setFightKey] = useState(0);
  const [result, setResult] = useState<FightResult | null>(null);
  const [firstClear, setFirstClear] = useState(false);
  const [replay, setReplay] = useState(false);
  const [wipe, setWipe] = useState(false);
  const wipeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // session time bookkeeping (boss pages feed stats.totalTimeMs)
  useEffect(() => {
    if (screen !== 'battle') return;
    const start = Date.now();
    return () => {
      useSaveStore.getState().addTime(Date.now() - start);
    };
  }, [screen, fightKey]);

  useEffect(
    () => () => {
      if (wipeTimer.current) clearTimeout(wipeTimer.current);
    },
    [],
  );

  const startFight = useCallback(() => {
    const cleared = useSaveStore.getState().bosses[track.id]?.cleared === true;
    setReplay(cleared);
    setWipe(true); // red wipe into battle
    wipeTimer.current = setTimeout(() => {
      setScreen('battle');
      setFightKey((k) => k + 1);
      wipeTimer.current = setTimeout(() => setWipe(false), 60);
    }, 260);
  }, [track.id]);

  const handleFinish = useCallback(
    (won: boolean, r: FightResult) => {
      const store = useSaveStore.getState();
      const wasCleared = store.bosses[track.id]?.cleared === true;
      store.recordBossResult(track.id, won, r.heartsLeft);
      setFirstClear(won && !wasCleared);
      setResult(r);
      setScreen(won ? 'victory' : 'defeat');
    },
    [track.id],
  );

  const handleRetreat = useCallback(
    (heartsLeft: number) => {
      // retreat keeps the attempt count, forfeits the fight, no penalty
      useSaveStore.getState().recordBossResult(track.id, false, heartsLeft);
      navigate('/map');
    },
    [track.id, navigate],
  );

  return (
    <div className="relative">
      {/* red wipe transition */}
      <AnimatePresence>
        {wipe && (
          <motion.div
            key="wipe"
            className="pointer-events-none fixed inset-0 z-[80] bg-danger/90"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>

      {screen === 'reveal' && <BossReveal key={`r${fightKey}`} boss={boss} track={track} onFight={startFight} />}
      {screen === 'battle' && (
        <BossBattle
          key={`b${fightKey}`}
          boss={boss}
          track={track}
          isReplay={replay}
          onFinish={handleFinish}
          onRetreat={handleRetreat}
        />
      )}
      {screen === 'victory' && result && (
        <BossVictory
          boss={boss}
          track={track}
          result={result}
          firstClear={firstClear}
          isReplay={replay}
          onReplay={startFight}
        />
      )}
      {screen === 'defeat' && result && <BossDefeat boss={boss} result={result} onRetry={startFight} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// default export — the page
// ---------------------------------------------------------------------------

export default function Boss() {
  const { trackId } = useParams();
  const track = TRACKS.find((t) => t.id === trackId);
  const unlocked = useSaveStore((s) => (track ? isBossUnlocked(s, track.id) : false));

  if (!track) return <UnknownBoss />;
  const boss = BOSSES[track.id];
  if (!unlocked) return <LockedBoss track={track} boss={boss} />;
  return <BossFlow track={track} boss={boss} />;
}
