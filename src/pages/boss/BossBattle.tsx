/**
 * Screen 2 — Battle (boss.md): boss HP bar + reacting glyph, hearts, combo,
 * question timer ring, QuizEngine-style card, combat feedback (damage
 * numbers, screen shake, edge flash, heart pops), phase 2 at HP ≤ 50%
 * (deeper red, glyph jitter, taunt 2, 35 s timer), Esc pause drawer.
 *
 * Victory = boss HP to 0 (10 hits). Defeat = 0 hearts. Wrong answers consume
 * the question without dealing damage; if the round runs out while the boss
 * still stands, overtime questions are drawn (the guardian refuses to fall).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Pause, Play, LogOut } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import ComboMeter from '@/components/game/ComboMeter';
import { useSaveStore } from '@/lib/game/save';
import { pushToast } from '@/lib/game/ui';
import { sfx } from '@/lib/game/sound';
import { XP, answerXp } from '@/lib/game/xp';
import { useReducedMotion } from '@/lib/game/format';
import type { Track } from '@/lib/game/tracks';
import {
  BOSS_HEARTS_MAX,
  BOSS_HP_CHUNKS,
  BOSS_ROUND_SIZE,
  BOSS_TIME_SEC,
  BOSS_TIME_SEC_P2,
  REPLAY_XP_CAP,
  drawBossQuestions,
  drawOvertimeQuestions,
  type BossDef,
  type BossQuestion,
} from '@/data/bosses';
import QuestionCard from './QuestionCard';
import {
  BossGlyph,
  BossHpBar,
  DamageNumbers,
  Hearts,
  TimerRing,
  Typewriter,
} from './widgets';
import type { AnswerPayload, DamageNum, FightResult } from './combat';

function grade(q: BossQuestion, p: AnswerPayload | null): boolean {
  if (p === null) return false;
  switch (q.type) {
    case 'mcq':
      return p.kind === 'mcq' && p.index === q.answer;
    case 'tf':
      return p.kind === 'tf' && (p.index === 0) === q.answer;
    case 'order':
      return p.kind === 'order' && p.seq.length === q.items.length && p.seq.every((v, i) => v === i);
    case 'fill':
      return p.kind === 'fill' && p.token === q.answer;
  }
}

interface BattleProps {
  boss: BossDef;
  track: Track;
  isReplay: boolean;
  onFinish: (won: boolean, result: FightResult) => void;
  onRetreat: (heartsLeft: number) => void;
}

export default function BossBattle({ boss, track, isReplay, onFinish, onRetreat }: BattleProps) {
  const reduced = useReducedMotion();

  // round state
  const [questions, setQuestions] = useState<BossQuestion[]>(() =>
    drawBossQuestions(track.id, useSaveStore.getState()),
  );
  const [qIndex, setQIndex] = useState(0);
  const [hearts, setHearts] = useState(BOSS_HEARTS_MAX);
  const [hp, setHp] = useState(BOSS_HP_CHUNKS);
  const [combo, setCombo] = useState(0);
  const [breakKey, setBreakKey] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const [timeLeft, setTimeLeft] = useState(BOSS_TIME_SEC);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hitKey, setHitKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [phase2Shown, setPhase2Shown] = useState(false);
  const [dmg, setDmg] = useState<DamageNum[]>([]);

  // refs mirroring state for use inside timeouts
  const heartsRef = useRef(hearts);
  const hpRef = useRef(hp);
  const qIndexRef = useRef(0);
  const questionsRef = useRef(questions);
  const usedIdsRef = useRef(new Set(questions.map((q) => q.id)));
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);
  const streakTouchedRef = useRef(false);
  const overtimeRef = useRef(false);
  const replayXpRef = useRef(0);
  const dmgSeq = useRef(0);
  const statsRef = useRef({
    correct: 0,
    wrong: 0,
    timeouts: 0,
    answerXp: 0,
    bestCombo: 0,
    missed: [] as string[],
  });

  const shakeCtl = useAnimationControls();

  const phase2 = hp <= BOSS_HP_CHUNKS / 2;
  const timeTotal = phase2 ? BOSS_TIME_SEC_P2 : BOSS_TIME_SEC;
  const q = questions[qIndex];

  // -------------------------------------------------------------------------
  // damage numbers
  // -------------------------------------------------------------------------
  const spawnDmg = useCallback((text: string, color: string, anchor: 'hp' | 'hearts' | 'xp') => {
    const anchors = { hp: { x: 58, y: 7 }, hearts: { x: 14, y: 15 }, xp: { x: 72, y: 38 } } as const;
    const id = ++dmgSeq.current;
    const jx = (Math.random() - 0.5) * 14;
    const jy = (Math.random() - 0.5) * 4;
    const item: DamageNum = { id, text, color, x: anchors[anchor].x + jx, y: anchors[anchor].y + jy };
    setDmg((list) => [...list.slice(-5), item]);
    setTimeout(() => setDmg((list) => list.filter((d) => d.id !== id)), 800);
  }, []);

  // -------------------------------------------------------------------------
  // scoring (save-store actions only — never raw localStorage / XP math)
  // -------------------------------------------------------------------------
  const awardCorrect = useCallback(
    (slug: string, comboNow: number): number => {
      const store = useSaveStore.getState();
      if (!streakTouchedRef.current) {
        streakTouchedRef.current = true;
        store.touchStreak();
      }
      const target = answerXp(XP.BOSS_CORRECT, comboNow); // 30 × combo multiplier
      if (isReplay) {
        // replay anti-grind cap (boss.md): per-correct XP capped at +150/fight
        const allowed = Math.max(0, Math.min(target, REPLAY_XP_CAP - replayXpRef.current));
        if (allowed > 0) {
          store.awardXp(allowed, `boss(${track.id}) hit +${allowed}`, 'boss');
          replayXpRef.current += allowed;
        }
        return allowed;
      }
      // first-clear fight: quiz channel records stats/combo (20×), top up to 30×
      const base = store.recordQuizAnswer(slug, true, comboNow);
      const topup = Math.max(0, target - base);
      if (topup > 0) store.awardXp(topup, `boss(${track.id}) hit +${target}`, 'boss');
      return target;
    },
    [isReplay, track.id],
  );

  // -------------------------------------------------------------------------
  // fight end
  // -------------------------------------------------------------------------
  const finishFight = useCallback(
    (won: boolean, finalHearts: number) => {
      if (finished) return;
      setFinished(true);
      if (advanceRef.current) clearTimeout(advanceRef.current);
      const s = statsRef.current;
      onFinish(won, {
        won,
        correct: s.correct,
        wrong: s.wrong,
        timeouts: s.timeouts,
        answerXp: s.answerXp,
        comboBonus: Math.max(0, s.answerXp - s.correct * XP.BOSS_CORRECT),
        bestCombo: s.bestCombo,
        heartsLeft: finalHearts,
        missedSlugs: [...new Set(s.missed)].slice(0, 5),
        durationMs: Date.now() - startRef.current,
      });
    },
    [finished, onFinish],
  );

  // -------------------------------------------------------------------------
  // overtime-aware question advance
  // -------------------------------------------------------------------------
  const advanceQuestion = useCallback(
    (hpNow: number) => {
      const nextIdx = qIndexRef.current + 1;
      if (nextIdx >= questionsRef.current.length) {
        const more = drawOvertimeQuestions(track.id, usedIdsRef.current, 3);
        for (const m of more) usedIdsRef.current.add(m.id);
        questionsRef.current = [...questionsRef.current, ...more];
        setQuestions(questionsRef.current);
        if (!overtimeRef.current) {
          overtimeRef.current = true;
          pushToast('overtime — the guardian refuses to fall', 'info');
        }
      }
      qIndexRef.current = nextIdx;
      setQIndex(nextIdx);
      setLocked(false);
      setLastResult(null);
      setTimeLeft(hpNow <= BOSS_HP_CHUNKS / 2 ? BOSS_TIME_SEC_P2 : BOSS_TIME_SEC);
    },
    [track.id],
  );

  // -------------------------------------------------------------------------
  // answer handling
  // -------------------------------------------------------------------------
  const submit = useCallback(
    (payload: AnswerPayload | null) => {
      if (locked || finished) return;
      const question = questionsRef.current[qIndexRef.current];
      const correct = grade(question, payload);
      const comboNow = combo;
      setLocked(true);

      if (correct) {
        const gained = awardCorrect(question.paper, comboNow);
        const newCombo = comboNow + 1;
        const newHp = Math.max(0, hpRef.current - 1);
        statsRef.current.correct += 1;
        statsRef.current.answerXp += gained;
        statsRef.current.bestCombo = Math.max(statsRef.current.bestCombo, newCombo);
        hpRef.current = newHp;
        setHp(newHp);
        setCombo(newCombo);
        setHitKey((k) => k + 1);
        sfx.correct();
        sfx.bossHit();
        sfx.combo(newCombo);
        spawnDmg('-10', '#FB7185', 'hp');
        if (gained > 0) spawnDmg(`+${gained} xp`, '#FBBF24', 'xp');
        setLastResult('correct');
        advanceRef.current = setTimeout(() => {
          if (newHp <= 0) finishFight(true, heartsRef.current);
          else advanceQuestion(newHp);
        }, 1000);
      } else {
        const timeout = payload === null;
        if (!isReplay) useSaveStore.getState().recordQuizAnswer(question.paper, false, comboNow);
        const newHearts = Math.max(0, heartsRef.current - 1);
        statsRef.current.wrong += 1;
        if (timeout) statsRef.current.timeouts += 1;
        statsRef.current.missed.push(question.paper);
        heartsRef.current = newHearts;
        setHearts(newHearts);
        setCombo(0);
        setBreakKey((k) => k + 1);
        setShakeKey((k) => k + 1);
        setFlashKey((k) => k + 1);
        sfx.wrong();
        spawnDmg(timeout ? 'time out' : '-1 ♥', '#FB7185', 'hearts');
        setLastResult(timeout ? 'timeout' : 'wrong');
        advanceRef.current = setTimeout(() => {
          if (newHearts <= 0) finishFight(false, 0);
          else advanceQuestion(hpRef.current);
        }, 2600);
      }
    },
    [locked, finished, combo, isReplay, awardCorrect, spawnDmg, finishFight, advanceQuestion],
  );

  // keep a live ref to submit for the timer-expiry effect
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  // -------------------------------------------------------------------------
  // per-question timer (pauses on lock, pause drawer, hidden tab)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (locked || paused || finished) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      setTimeLeft((v) => Math.max(0, v - 0.1));
    }, 100);
    return () => clearInterval(t);
  }, [locked, paused, finished, qIndex]);

  // timer expiry = wrong answer (with "time out" label)
  useEffect(() => {
    if (timeLeft <= 0 && !locked && !paused && !finished) submitRef.current(null);
  }, [timeLeft, locked, paused, finished]);

  // phase-2 one-shot taunt (render-phase state adjustment)
  if (phase2 && !phase2Shown) setPhase2Shown(true);

  // screen shake (skipped under reduced motion — edge flash still fires)
  useEffect(() => {
    if (shakeKey > 0 && !reduced) {
      shakeCtl.start({ x: [0, 6, -6, 3, 0], y: [0, -4, 4, -2, 0], transition: { duration: 0.22 } });
    }
  }, [shakeKey, reduced, shakeCtl]);

  // Esc opens/closes the pause drawer (not during answer reveal)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked && !finished) setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, finished]);

  // fight clock + cleanup of pending advance on unmount
  useEffect(() => {
    startRef.current = Date.now();
    return () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, []);

  const qLabel =
    qIndex < BOSS_ROUND_SIZE ? `Q ${qIndex + 1}/${BOSS_ROUND_SIZE}` : `OVERTIME +${qIndex - BOSS_ROUND_SIZE + 1}`;

  if (!q) return null;

  return (
    <div className="relative min-h-[calc(100dvh-64px)] overflow-hidden">
      {/* textures */}
      <div className="grid-texture pointer-events-none absolute inset-0" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />
      <div className="vignette pointer-events-none absolute inset-0" />
      {/* phase-2 deeper red hue */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={false}
        animate={{ opacity: phase2 ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        style={{
          background:
            'radial-gradient(ellipse 75% 60% at 50% 30%, rgba(251,113,133,.14), rgba(120,10,25,.12) 100%)',
        }}
      />
      {/* boss-attack edge flash */}
      {flashKey > 0 && (
        <motion.div
          key={flashKey}
          className="pointer-events-none absolute inset-0 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.3 }}
          style={{ boxShadow: 'inset 0 0 0 3px rgba(251,113,133,.85), inset 0 0 90px rgba(251,113,133,.30)' }}
        />
      )}
      <DamageNumbers items={dmg} />

      <motion.div animate={shakeCtl} className="relative z-10 mx-auto max-w-[880px] px-4 py-8 sm:px-6">
        {/* row 1 — boss HP */}
        <div className="flex items-center gap-3 sm:gap-4">
          <BossGlyph src={boss.emblem} hueRotate={boss.hueRotate} hitKey={hitKey} phase2={phase2} size={48} />
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="micro-label truncate text-danger">{boss.name}</span>
              <span className="stat-numeral text-[13px] text-danger">
                HP {Math.round((hp / BOSS_HP_CHUNKS) * 100)}%
              </span>
            </div>
            <BossHpBar chunks={BOSS_HP_CHUNKS} filled={hp} />
          </div>
          <button
            type="button"
            onClick={() => !locked && setPaused(true)}
            aria-label="pause"
            className="rounded-lg border border-line p-2 text-txt-dim transition-colors hover:border-danger/60 hover:text-danger disabled:opacity-40"
            disabled={locked}
          >
            <Pause className="size-4" />
          </button>
        </div>

        {/* phase-2 taunt */}
        {phase2Shown && (
          <p className="mt-3 font-mono text-[12px] lowercase text-danger/80">
            &gt; &quot;<Typewriter text={boss.taunts[1]} />&quot;
          </p>
        )}

        {/* row 2 — player */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <Hearts hearts={hearts} max={BOSS_HEARTS_MAX} />
          <ComboMeter combo={combo} color={track.color} breakKey={breakKey} />
          <span className="hud-label text-txt-dim">{qLabel}</span>
          <TimerRing total={timeTotal} left={timeLeft} />
        </div>

        {/* question zone */}
        <CornerPanel cornerColor="#FB7185" cornerSize={14} className="mt-5 p-5 sm:p-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={qIndex}
              initial={{ x: 60, rotateY: 6, opacity: 0 }}
              animate={{ x: 0, rotateY: 0, opacity: 1 }}
              exit={{ x: -60, rotateY: -6, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <QuestionCard key={q.id} q={q} locked={locked} lastResult={lastResult} onSubmit={submit} />
            </motion.div>
          </AnimatePresence>
        </CornerPanel>

        <p className="mt-4 text-center font-mono text-[11px] lowercase text-txt-faint">
          1–4 select · enter lock in · esc pause
        </p>
      </motion.div>

      {/* pause drawer */}
      <AnimatePresence>
        {paused && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-void/85 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <CornerPanel cornerColor="#FB7185" raised className="w-[min(420px,90vw)] p-8 text-center">
                <p className="hud-label text-danger">paused</p>
                <p className="micro-label mt-2 text-txt-faint">the guardian waits. the timer does not move.</p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setPaused(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-danger bg-danger/15 px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-danger transition-colors hover:bg-danger/25"
                  >
                    <Play className="size-4" /> resume
                  </button>
                  <button
                    type="button"
                    onClick={() => onRetreat(heartsRef.current)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.12em] text-txt-dim transition-colors hover:border-danger/50 hover:text-txt"
                  >
                    <LogOut className="size-4" /> retreat to map
                  </button>
                </div>
                <p className="mt-4 font-mono text-[11px] lowercase text-txt-faint">
                  retreat counts as an attempt. nothing is lost.
                </p>
              </CornerPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
