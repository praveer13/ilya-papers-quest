import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Map as MapIcon, RotateCcw, X } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import ComboMeter from '@/components/game/ComboMeter';
import { useSaveStore } from '@/lib/game/save';
import { sfx } from '@/lib/game/sound';
import { fireQuizPass } from '@/lib/game/confetti';
import { QUIZ_DRAW, QUIZ_PASS_PCT } from '@/lib/game/xp';
import { useReducedMotion } from '@/lib/game/format';
import type { Paper } from '@/lib/game/papers';
import type { PaperContent, QuizQuestion, SectionId } from '@/data/papers/schema';
import { SECTION_LABELS } from '@/data/papers/schema';
import { cn } from '@/lib/utils';

/**
 * QuizEngine — the checkpoint organism (paper.md §4 + design.md §12).
 * Draws 5 from the paper's pool each attempt (reshuffled), supports
 * mcq / tf / order / fill question types, combo meter + damage numbers,
 * XP ledger result screen, pass → confetti + mastered, fail → weakest-section
 * review links + free retry. All progress goes through the save store.
 */

type Phase = 'idle' | 'running' | 'result';

interface AnswerRec {
  correct: boolean;
  xp: number;
  tag: SectionId;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function QuizEngine({
  paper,
  content,
  color,
  nextSlug,
  onSectionLink,
}: {
  paper: Paper;
  content: PaperContent;
  color: string;
  nextSlug: string | null;
  onSectionLink: (id: SectionId) => void;
}) {
  const slug = paper.slug;
  const reduced = useReducedMotion();
  const progress = useSaveStore((s) => s.papers[slug]);
  const mastered = progress?.mastered ?? false;
  const attempts = progress?.quizAttempts ?? 0;
  const best = progress?.quizBest ?? 0;

  const [phase, setPhase] = useState<Phase>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [combo, setCombo] = useState(0);
  const [breakKey, setBreakKey] = useState(0);
  const [answers, setAnswers] = useState<AnswerRec[]>([]);
  const [answered, setAnswered] = useState(false);
  const [picked, setPicked] = useState<number | boolean | null>(null);
  const [damage, setDamage] = useState<{ id: number; text: string; ok: boolean } | null>(null);
  const [result, setResult] = useState<{ score: number; pct: number; passed: boolean; xpBase: number; xpBonus: number } | null>(null);

  // order-question state: sequence of chosen original indices
  const [orderSeq, setOrderSeq] = useState<number[]>([]);
  // fill-question state: chosen tokens per blank
  const [fillSeq, setFillSeq] = useState<string[]>([]);
  // shuffled display data per question
  const [displayOrder, setDisplayOrder] = useState<number[]>([]);
  const [displayTokens, setDisplayTokens] = useState<string[]>([]);

  const damageSeq = useRef(0);
  const answeredRef = useRef(false);
  const q = questions[qIndex] as QuizQuestion | undefined;
  const firstTryRef = useRef(true);

  const start = useCallback(() => {
    const draw = shuffle(content.quiz).slice(0, Math.min(QUIZ_DRAW, content.quiz.length));
    setQuestions(draw);
    setQIndex(0);
    setCombo(0);
    setAnswers([]);
    setAnswered(false);
    setPicked(null);
    setResult(null);
    setPhase('running');
    firstTryRef.current = attempts === 0;
  }, [content.quiz, attempts]);

  // per-question setup: shuffle order items / fill tokens
  // Defer state reset to avoid cascading renders (setState in effect body).
  useEffect(() => {
    if (!q) return;
    answeredRef.current = false;
    const handle = requestAnimationFrame(() => {
      setAnswered(false);
      setPicked(null);
      setOrderSeq([]);
      setFillSeq([]);
      if (q.type === 'order') setDisplayOrder(shuffle(q.items.map((_, i) => i)));
      if (q.type === 'fill') setDisplayTokens(shuffle(q.tokens));
    });
    return () => cancelAnimationFrame(handle);
  }, [q]);

  const blankCount = q?.type === 'fill' ? (q.q.split('___').length - 1 || 1) : 0;

  const commitAnswer = useCallback(
    (correct: boolean) => {
      if (!q || answeredRef.current) return;
      answeredRef.current = true;
      setAnswered(true);
      const gained = useSaveStore.getState().recordQuizAnswer(slug, correct, combo);
      if (correct) {
        sfx.correct();
        sfx.combo(combo + 1);
        setCombo((c) => c + 1);
        damageSeq.current += 1;
        setDamage({ id: damageSeq.current, text: `+${gained} XP`, ok: true });
      } else {
        sfx.wrong();
        setCombo(0);
        setBreakKey((k) => k + 1);
        damageSeq.current += 1;
        setDamage({ id: damageSeq.current, text: 'combo lost', ok: false });
      }
      setAnswers((a) => [...a, { correct, xp: gained, tag: q.tag }]);
    },
    [q, slug, combo],
  );

  const finish = useCallback(
    (recs: AnswerRec[]) => {
      const total = questions.length || 1;
      const score = recs.filter((r) => r.correct).length;
      const pct = Math.round((score / total) * 100);
      const passed = pct >= QUIZ_PASS_PCT;
      const before = useSaveStore.getState().papers[slug];
      const wasMastered = before?.mastered ?? false;
      const wasPerfect = before?.perfectQuiz ?? false;
      useSaveStore.getState().recordQuizResult(slug, pct, { firstTry: firstTryRef.current });
      const xpBase = recs.reduce((s, r) => s + r.xp, 0);
      let xpBonus = 0;
      if (passed && !wasMastered) xpBonus += 100;
      if (pct >= 100 && !wasPerfect && firstTryRef.current) xpBonus += 50;
      setResult({ score, pct, passed, xpBase, xpBonus });
      setPhase('result');
      if (passed) fireQuizPass(color);
    },
    [questions.length, slug, color],
  );

  const next = useCallback(() => {
    if (qIndex + 1 >= questions.length) {
      finish(answers);
    } else {
      setQIndex((i) => i + 1);
    }
  }, [qIndex, questions.length, finish, answers]);

  // keyboard: 1-4 select (mcq/tf), Enter = next
  useEffect(() => {
    if (phase !== 'running') return;
    const onKey = (e: KeyboardEvent) => {
      if (!q) return;
      if (e.key === 'Enter' && answered) {
        e.preventDefault();
        next();
        return;
      }
      if (answered) return;
      const n = Number(e.key);
      if (q.type === 'mcq' && n >= 1 && n <= q.options.length) {
        setPicked(n - 1);
        commitAnswer(n - 1 === q.answer);
      } else if (q.type === 'tf' && (n === 1 || n === 2)) {
        const val = n === 1;
        setPicked(val);
        commitAnswer(val === q.answer);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, q, answered, commitAnswer, next]);

  // weakest sections from missed tags (top 2 by misses)
  const weakest = useMemo(() => {
    const misses = new Map<SectionId, number>();
    for (const a of answers) if (!a.correct) misses.set(a.tag, (misses.get(a.tag) ?? 0) + 1);
    return [...misses.entries()].sort((x, y) => y[1] - x[1]).slice(0, 2).map(([tag]) => tag);
  }, [answers]);

  const submitStructured = () => {
    if (!q || answered) return;
    if (q.type === 'order' && orderSeq.length === q.items.length) {
      commitAnswer(q.answer.every((v, i) => v === orderSeq[i]));
    } else if (q.type === 'fill' && fillSeq.length === blankCount) {
      commitAnswer(q.answer.every((v, i) => v === fillSeq[i]));
    }
  };

  // -------------------------------------------------------------------------
  // idle / trigger zone
  // -------------------------------------------------------------------------
  if (phase === 'idle') {
    return (
      <CornerPanel cornerColor="#FBBF24" className="p-6 sm:p-8" raised>
        <span className="hud-label text-xp">checkpoint</span>
        <h2 className="mt-2 font-display text-3xl font-bold text-txt">prove it.</h2>
        <p className="mt-2 font-mono text-[13px] lowercase text-txt-dim">
          {Math.min(QUIZ_DRAW, content.quiz.length)} questions · need{' '}
          {Math.ceil((QUIZ_PASS_PCT / 100) * Math.min(QUIZ_DRAW, content.quiz.length))}/
          {Math.min(QUIZ_DRAW, content.quiz.length)} to master this paper · reshuffled every attempt
        </p>
        {mastered && (
          <p className="mt-1 font-mono text-[12px] text-success">
            mastered ✓ — retake for fun · best {Math.round(best / 20)}/5
          </p>
        )}
        <button
          type="button"
          onClick={start}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-xp/60 bg-xp/10 px-5 py-2.5 font-mono text-[13px] font-bold uppercase tracking-[0.14em] text-xp transition-all hover:bg-xp/20 hover:shadow-[0_0_24px_rgba(251,191,36,0.25)]"
        >
          {attempts > 0 ? 'retry checkpoint' : 'begin checkpoint'}
          <ArrowRight className="size-4" />
        </button>
      </CornerPanel>
    );
  }

  // -------------------------------------------------------------------------
  // result screen
  // -------------------------------------------------------------------------
  if (phase === 'result' && result) {
    const ledger: { label: string; xp: number }[] = [
      { label: `correct answers ${result.score}/${questions.length} (combo-adjusted)`, xp: result.xpBase },
      ...(result.xpBonus >= 150
        ? [
            { label: 'perfect quiz bonus — first try 100%', xp: 50 },
            { label: 'paper mastered', xp: 100 },
          ]
        : result.xpBonus >= 100
          ? [{ label: 'paper mastered', xp: 100 }]
          : result.xpBonus >= 50
            ? [{ label: 'perfect quiz bonus — first try 100%', xp: 50 }]
            : []),
    ];
    return (
      <CornerPanel cornerColor={result.passed ? '#FBBF24' : color} className="p-6 sm:p-8" raised>
        <span className="hud-label" style={{ color: result.passed ? '#FBBF24' : color }}>
          {result.passed ? 'checkpoint reached' : 'checkpoint failed'}
        </span>
        {result.passed ? (
          <>
            <h2 className="mt-2 font-display text-3xl font-bold text-txt">
              {mastered ? 'paper mastered' : 'understanding merged to main'}
            </h2>
            <p className="mt-1 font-mono text-[13px] text-txt-dim">
              score {result.score}/{questions.length} · {result.pct}%
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2 font-display text-2xl font-bold text-txt">not yet. the diff is small:</h2>
            <p className="mt-1 font-mono text-[13px] text-txt-dim">
              score {result.score}/{questions.length} · need {Math.ceil((QUIZ_PASS_PCT / 100) * questions.length)} · review:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {weakest.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSectionLink(tag)}
                  className="rounded-full border px-3 py-1.5 font-mono text-[12px] uppercase tracking-wider transition-colors hover:bg-surface-2"
                  style={{ borderColor: color, color }}
                >
                  § {SECTION_LABELS[tag]}
                </button>
              ))}
            </div>
          </>
        )}

        {/* XP ledger */}
        <div className="mt-6 space-y-1.5 border-t border-line pt-4">
          {ledger.map((line, i) => (
            <motion.div
              key={line.label}
              initial={reduced ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: reduced ? 0 : 0.2 + i * 0.12 }}
              className="flex items-baseline justify-between font-mono text-[13px]"
            >
              <span className="text-txt-dim">{line.label}</span>
              <span className="stat-numeral text-xp">+{line.xp}</span>
            </motion.div>
          ))}
          <div className="flex items-baseline justify-between border-t border-line pt-2 font-mono text-[14px] font-bold">
            <span className="text-txt">total this attempt</span>
            <span className="stat-numeral text-xp">+{result.xpBase + result.xpBonus}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {result.passed && nextSlug && (
            <Link
              to={`/paper/${nextSlug}`}
              className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 font-mono text-[13px] font-bold uppercase tracking-[0.14em] transition-all hover:bg-surface-2"
              style={{ borderColor: color, color }}
            >
              next paper
              <ArrowRight className="size-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-5 py-2.5 font-mono text-[13px] uppercase tracking-[0.14em] text-txt-dim transition-colors hover:border-focus hover:text-txt"
          >
            <RotateCcw className="size-4" />
            {result.passed ? 'retake for fun' : 'retry (free)'}
          </button>
          <Link
            to="/map"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-5 py-2.5 font-mono text-[13px] uppercase tracking-[0.14em] text-txt-dim transition-colors hover:border-focus hover:text-txt"
          >
            <MapIcon className="size-4" />
            back to map
          </Link>
        </div>
      </CornerPanel>
    );
  }

  // -------------------------------------------------------------------------
  // running
  // -------------------------------------------------------------------------
  if (!q) return null;
  const correctCount = answers.filter((a) => a.correct).length;

  const optionState = (i: number): 'idle' | 'picked-correct' | 'picked-wrong' | 'reveal' => {
    if (!answered) return 'idle';
    if (q.type === 'mcq') {
      if (i === q.answer && picked === i) return 'picked-correct';
      if (picked === i) return 'picked-wrong';
      if (i === q.answer) return 'reveal';
    }
    return 'idle';
  };

  const tfState = (val: boolean): 'idle' | 'picked-correct' | 'picked-wrong' | 'reveal' => {
    if (!answered || q.type !== 'tf') return 'idle';
    if (val === q.answer && picked === val) return 'picked-correct';
    if (picked === val) return 'picked-wrong';
    if (val === q.answer) return 'reveal';
    return 'idle';
  };

  const stateClass = (s: 'idle' | 'picked-correct' | 'picked-wrong' | 'reveal') =>
    cn(
      'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left font-mono text-[13.5px] transition-all',
      s === 'idle' && !answered && 'border-line bg-surface text-txt-dim hover:border-focus hover:text-txt',
      s === 'idle' && answered && 'border-line bg-surface text-txt-faint',
      s === 'picked-correct' && 'border-success bg-success/15 text-success',
      s === 'picked-wrong' && 'border-danger bg-danger/15 text-danger',
      s === 'reveal' && 'border-success/60 bg-success/5 text-success/90',
    );

  return (
    <CornerPanel cornerColor={color} className="p-5 sm:p-7" raised>
      {/* progress + combo */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="hud-label text-txt-dim">
          Q {qIndex + 1}/{questions.length}
        </span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-6 rounded-full"
              style={{
                backgroundColor:
                  i < answers.length
                    ? answers[i].correct
                      ? '#34D399'
                      : '#FB7185'
                    : i === qIndex
                      ? color
                      : 'var(--line)',
              }}
            />
          ))}
        </div>
        <ComboMeter combo={combo} color={color} breakKey={breakKey} className="ml-auto" />
      </div>

      {/* question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={qIndex}
          initial={reduced ? false : { opacity: 0, x: 60, rotateY: 6 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          exit={reduced ? undefined : { opacity: 0, x: -40, rotateY: -4 }}
          transition={{ duration: 0.3 }}
          className="relative mt-5"
        >
          {/* damage number */}
          <AnimatePresence>
            {damage && (
              <motion.span
                key={damage.id}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: -48 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
                className={cn(
                  'pointer-events-none absolute right-2 top-0 z-10 font-mono text-[15px] font-bold',
                  damage.ok ? 'text-xp' : 'text-danger',
                )}
                onAnimationComplete={() => setDamage(null)}
              >
                {damage.text}
              </motion.span>
            )}
          </AnimatePresence>

          <p className="text-[16px] font-medium leading-relaxed text-txt">{renderQuestionText(q, fillSeq)}</p>

          {/* options */}
          <div className="mt-4 space-y-2">
            {q.type === 'mcq' &&
              q.options.map((opt, i) => (
                <motion.button
                  key={i}
                  type="button"
                  disabled={answered}
                  onClick={() => {
                    setPicked(i);
                    commitAnswer(i === q.answer);
                  }}
                  animate={
                    optionState(i) === 'picked-wrong' && !reduced
                      ? { x: [0, -6, 6, -6, 6, 0] }
                      : { x: 0 }
                  }
                  transition={{ duration: 0.24 }}
                  className={stateClass(optionState(i))}
                >
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded border border-current font-mono text-[11px] font-bold">
                    {LETTERS[i]}
                  </span>
                  <span>{opt}</span>
                  {optionState(i) === 'picked-correct' && <Check className="ml-auto size-4" />}
                  {optionState(i) === 'picked-wrong' && <X className="ml-auto size-4" />}
                </motion.button>
              ))}

            {q.type === 'tf' &&
              [true, false].map((val) => (
                <motion.button
                  key={String(val)}
                  type="button"
                  disabled={answered}
                  onClick={() => {
                    setPicked(val);
                    commitAnswer(val === q.answer);
                  }}
                  animate={tfState(val) === 'picked-wrong' && !reduced ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
                  transition={{ duration: 0.24 }}
                  className={stateClass(tfState(val))}
                >
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded border border-current font-mono text-[11px] font-bold">
                    {val ? 'T' : 'F'}
                  </span>
                  <span>{val ? 'true' : 'false'}</span>
                  {tfState(val) === 'picked-correct' && <Check className="ml-auto size-4" />}
                  {tfState(val) === 'picked-wrong' && <X className="ml-auto size-4" />}
                </motion.button>
              ))}

            {q.type === 'order' && (
              <OrderQuestion
                q={q}
                displayOrder={displayOrder}
                seq={orderSeq}
                setSeq={setOrderSeq}
                answered={answered}
                color={color}
              />
            )}

            {q.type === 'fill' && (
              <FillQuestion
                q={q}
                displayTokens={displayTokens}
                seq={fillSeq}
                setSeq={setFillSeq}
                blankCount={blankCount}
                answered={answered}
                color={color}
              />
            )}
          </div>

          {/* submit for structured questions */}
          {(q.type === 'order' || q.type === 'fill') && !answered && (
            <button
              type="button"
              onClick={submitStructured}
              disabled={(q.type === 'order' && orderSeq.length < q.items.length) || (q.type === 'fill' && fillSeq.length < blankCount)}
              className="mt-4 rounded-lg border px-5 py-2.5 font-mono text-[13px] font-bold uppercase tracking-[0.14em] transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderColor: color, color }}
            >
              submit
            </button>
          )}

          {/* why + next */}
          <AnimatePresence>
            {answered && (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: reduced ? 0 : 0.15 }}
                className="mt-4 rounded-lg border border-line bg-[#0A0A14] px-4 py-3"
              >
                <p className="font-mono text-[13px] leading-relaxed text-txt-dim">
                  <span className={answers[answers.length - 1]?.correct ? 'text-success' : 'text-danger'}>
                    {answers[answers.length - 1]?.correct ? 'correct. ' : 'why: '}
                  </span>
                  {q.why}
                </p>
                <button
                  type="button"
                  onClick={next}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.14em] transition-colors hover:bg-surface-2"
                  style={{ borderColor: color, color }}
                >
                  {qIndex + 1 >= questions.length ? 'see results' : 'next'}
                  <ArrowRight className="size-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 font-mono text-[11px] text-txt-faint">
        <span>
          {correctCount} correct so far · combo ×{Math.min(2, 1 + 0.25 * combo).toFixed(2)}
        </span>
        <span className="hidden sm:inline">keys: 1–4 select · enter next</span>
      </div>
    </CornerPanel>
  );
}

// ---------------------------------------------------------------------------
// question text (fill-in renders the blanks live)
// ---------------------------------------------------------------------------

function renderQuestionText(q: QuizQuestion, fillSeq: string[]) {
  if (q.type !== 'fill') return q.q;
  const parts = q.q.split('___');
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="mx-1 inline-block min-w-16 rounded border border-dashed border-xp/60 bg-xp/10 px-2 py-0.5 text-center font-mono text-[13px] text-xp">
              {fillSeq[i] ?? '· · ·'}
            </span>
          )}
        </span>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// ordering question: tap-to-sequence chips
// ---------------------------------------------------------------------------

function OrderQuestion({
  q,
  displayOrder,
  seq,
  setSeq,
  answered,
  color,
}: {
  q: Extract<QuizQuestion, { type: 'order' }>;
  displayOrder: number[];
  seq: number[];
  setSeq: (s: number[]) => void;
  answered: boolean;
  color: string;
}) {
  const remaining = displayOrder.filter((i) => !seq.includes(i));
  const chipClass = (origIdx: number, inSeq: boolean) => {
    if (!answered)
      return cn(
        'rounded-lg border px-3 py-2 font-mono text-[12.5px] transition-all',
        inSeq ? 'text-txt' : 'border-line bg-surface text-txt-dim hover:border-focus hover:text-txt',
      );
    const correctPos = q.answer.indexOf(origIdx);
    const pickedPos = seq.indexOf(origIdx);
    const ok = correctPos === pickedPos;
    return cn(
      'rounded-lg border px-3 py-2 font-mono text-[12.5px]',
      ok ? 'border-success bg-success/15 text-success' : 'border-danger bg-danger/15 text-danger',
    );
  };
  return (
    <div className="space-y-3">
      {/* ordered row */}
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-dashed border-line bg-[#0A0A14] p-2">
        {seq.length === 0 && <span className="px-2 font-mono text-[11px] text-txt-faint">tap chips below in order →</span>}
        {seq.map((origIdx, pos) => (
          <motion.button
            key={origIdx}
            layout
            type="button"
            disabled={answered}
            onClick={() => setSeq(seq.filter((x) => x !== origIdx))}
            className={chipClass(origIdx, true)}
            style={!answered ? { borderColor: color, backgroundColor: 'rgba(26,26,44,0.6)' } : undefined}
          >
            <span className="mr-1.5 text-[10px] text-txt-faint">{pos + 1}.</span>
            {q.items[origIdx]}
          </motion.button>
        ))}
      </div>
      {/* pool */}
      <div className="flex flex-wrap gap-2">
        {remaining.map((origIdx) => (
          <motion.button
            key={origIdx}
            layout
            type="button"
            disabled={answered}
            onClick={() => setSeq([...seq, origIdx])}
            className={chipClass(origIdx, false)}
          >
            {q.items[origIdx]}
          </motion.button>
        ))}
      </div>
      {answered && (
        <p className="font-mono text-[11px] text-txt-faint">
          correct order: {q.answer.map((i) => q.items[i]).join(' → ')}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// fill-in question: token bank
// ---------------------------------------------------------------------------

function FillQuestion({
  q,
  displayTokens,
  seq,
  setSeq,
  blankCount,
  answered,
  color,
}: {
  q: Extract<QuizQuestion, { type: 'fill' }>;
  displayTokens: string[];
  seq: string[];
  setSeq: (s: string[]) => void;
  blankCount: number;
  answered: boolean;
  color: string;
}) {
  const usedCounts = new Map<string, number>();
  for (const s of seq) usedCounts.set(s, (usedCounts.get(s) ?? 0) + 1);
  const available = displayTokens.filter((t) => {
    const total = displayTokens.filter((d) => d === t).length;
    const used = usedCounts.get(t) ?? 0;
    return used < total;
  });

  return (
    <div className="space-y-3">
      {/* chosen tokens */}
      {seq.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {seq.map((tok, i) => {
            const ok = answered ? q.answer[i] === tok : true;
            return (
              <button
                key={`${tok}-${i}`}
                type="button"
                disabled={answered}
                onClick={() => setSeq(seq.filter((_, j) => j !== i))}
                className={cn(
                  'rounded-lg border px-3 py-1.5 font-mono text-[12.5px] transition-all',
                  answered
                    ? ok
                      ? 'border-success bg-success/15 text-success'
                      : 'border-danger bg-danger/15 text-danger'
                    : 'text-txt hover:opacity-80',
                )}
                style={!answered ? { borderColor: color, backgroundColor: 'rgba(26,26,44,0.6)' } : undefined}
              >
                {tok}
                {!answered && <X className="ml-1.5 inline size-3" />}
              </button>
            );
          })}
        </div>
      )}
      {/* token bank */}
      <div className="flex flex-wrap gap-2">
        {available.map((tok, i) => (
          <button
            key={`${tok}-${i}`}
            type="button"
            disabled={answered || seq.length >= blankCount}
            onClick={() => setSeq([...seq, tok])}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 font-mono text-[12.5px] text-txt-dim transition-all hover:border-focus hover:text-txt disabled:opacity-40"
          >
            {tok}
          </button>
        ))}
      </div>
      {answered && (
        <p className="font-mono text-[11px] text-txt-faint">
          correct: {q.answer.join(' · ')}
        </p>
      )}
    </div>
  );
}
