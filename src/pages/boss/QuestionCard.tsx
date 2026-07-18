/**
 * QuestionCard — one boss question (boss.md battle zone). Supports the four
 * shapes (mcq / tf / order / fill), keyboard play (1–4 select, Enter lock
 * in), and the post-answer reveal states (green flash / red shake / why line).
 * Interaction state resets per question — the parent keys this by question id.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CornerDownLeft, MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BossQuestion } from '@/data/bosses';
import type { AnswerPayload } from './combat';

export type QuestionResult = 'correct' | 'wrong' | 'timeout' | null;

const LETTERS = ['A', 'B', 'C', 'D'] as const;

function shuffleIdx(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuestionCard({
  q,
  locked,
  lastResult,
  onSubmit,
}: {
  q: BossQuestion;
  locked: boolean;
  lastResult: QuestionResult;
  onSubmit: (payload: AnswerPayload) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null); // mcq / tf
  const [perm] = useState(() => (q.type === 'order' ? shuffleIdx(q.items.length) : []));
  const [seq, setSeq] = useState<number[]>([]); // order: original indices placed
  const [fillPick, setFillPick] = useState<string | null>(null); // fill

  const optionCount = q.type === 'mcq' ? q.options.length : q.type === 'tf' ? 2 : 0;

  const submittable = useMemo(() => {
    if (locked) return false;
    if (q.type === 'mcq' || q.type === 'tf') return selected !== null;
    if (q.type === 'order') return seq.length === q.items.length;
    return fillPick !== null;
  }, [locked, q, selected, seq, fillPick]);

  const trySubmit = () => {
    if (!submittable) return;
    if (q.type === 'mcq' && selected !== null) onSubmit({ kind: 'mcq', index: selected });
    else if (q.type === 'tf' && selected !== null) onSubmit({ kind: 'tf', index: selected });
    else if (q.type === 'order') onSubmit({ kind: 'order', seq });
    else if (q.type === 'fill' && fillPick !== null) onSubmit({ kind: 'fill', token: fillPick });
  };

  const handleNumber = (i: number) => {
    if (locked) return;
    if (q.type === 'mcq' || q.type === 'tf') {
      if (i < optionCount) setSelected((cur) => (cur === i ? null : i));
    } else if (q.type === 'order') {
      const orig = perm[i];
      if (orig === undefined) return;
      setSeq((cur) => (cur.includes(orig) ? cur.filter((x) => x !== orig) : [...cur, orig]));
    } else if (q.type === 'fill') {
      const token = q.bank[i];
      if (token) setFillPick((cur) => (cur === token ? null : token));
    }
  };

  // keyboard: 1–4 select / place, Enter lock in
  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        handleNumber(Number(e.key) - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        trySubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, submittable, selected, seq, fillPick, q]);

  // ---------- option state styling (reveal after lock) ----------
  const optionState = (i: number): 'default' | 'selected' | 'correct' | 'wrong' | 'dim' => {
    if (!locked) return selected === i ? 'selected' : 'default';
    const correctIdx = q.type === 'mcq' ? q.answer : q.type === 'tf' ? (q.answer ? 0 : 1) : -1;
    if (i === correctIdx) return 'correct';
    if (selected === i) return 'wrong';
    return 'dim';
  };

  const optionCls = (state: string) =>
    cn(
      'group flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors duration-200',
      'focus-visible:outline-none',
      state === 'default' && 'border-line bg-surface-2/60 text-txt hover:border-danger/60 hover:bg-surface-2',
      state === 'selected' && 'border-danger bg-danger/10 text-txt',
      state === 'correct' && 'border-success bg-success/15 text-success',
      state === 'wrong' && 'border-danger bg-danger/15 text-danger',
      state === 'dim' && 'border-line bg-surface-2/40 text-txt-faint',
      locked && 'pointer-events-none',
    );

  return (
    <div>
      {/* paper tag */}
      <p className="micro-label text-txt-faint">// {q.paper}</p>

      {/* prompt */}
      <div className="mt-2 text-[17px] font-medium leading-relaxed text-txt sm:text-[19px]">
        {q.type === 'fill' ? (
          <p>
            {q.before}{' '}
            <span
              className={cn(
                'mx-1 inline-block min-w-[90px] rounded border-b-2 px-2 text-center font-mono text-[0.9em]',
                fillPick ? 'border-danger text-danger' : 'border-line text-txt-faint',
                locked && 'border-success text-success',
              )}
            >
              {locked ? q.answer : (fillPick ?? '____')}
            </span>{' '}
            {q.after}
          </p>
        ) : (
          <p>{q.prompt}</p>
        )}
      </div>

      {/* body per type */}
      <div className="mt-5">
        {(q.type === 'mcq' || q.type === 'tf') && (
          <div className={cn('grid gap-2.5', q.type === 'mcq' ? 'sm:grid-cols-2' : 'grid-cols-2')}>
            {(q.type === 'mcq' ? q.options : ['TRUE', 'FALSE']).map((opt, i) => {
              const state = optionState(i);
              const btn = (
                <button
                  key={i}
                  type="button"
                  disabled={locked}
                  onClick={() => handleNumber(i)}
                  onDoubleClick={trySubmit}
                  className={optionCls(state)}
                >
                  <span
                    className={cn(
                      'rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold',
                      state === 'correct'
                        ? 'border-success/60 text-success'
                        : state === 'wrong'
                          ? 'border-danger/60 text-danger'
                          : 'border-line text-txt-dim group-hover:border-danger/60 group-hover:text-danger',
                    )}
                  >
                    {q.type === 'tf' ? (i === 0 ? 'T' : 'F') : LETTERS[i]}
                  </span>
                  <span className="text-[14px] leading-snug">{opt}</span>
                </button>
              );
              // wrong pick: red shake 300 ms
              return locked && state === 'wrong' ? (
                <motion.div key={i} animate={{ x: [0, -6, 6, -4, 0] }} transition={{ duration: 0.3 }}>
                  {btn}
                </motion.div>
              ) : (
                <div key={i}>{btn}</div>
              );
            })}
          </div>
        )}

        {q.type === 'order' && (
          <div>
            {/* placed sequence slots */}
            <div className="flex flex-wrap items-center gap-2">
              {q.items.map((_, slot) => {
                const orig = seq[slot];
                const placed = orig !== undefined;
                const slotCorrect = locked && placed && orig === slot;
                const slotWrong = locked && placed && orig !== slot;
                return (
                  <span
                    key={slot}
                    className={cn(
                      'flex min-h-[38px] min-w-[52px] items-center justify-center rounded-lg border border-dashed px-3 py-2 font-mono text-[12px]',
                      !placed && 'border-line text-txt-faint',
                      placed && !locked && 'border-danger/60 bg-danger/10 text-txt',
                      slotCorrect && 'border-success bg-success/15 text-success',
                      slotWrong && 'border-danger bg-danger/15 text-danger',
                    )}
                  >
                    {placed ? `${slot + 1}. ${q.items[orig]}` : slot + 1}
                  </span>
                );
              })}
            </div>
            {/* pool */}
            <div className="mt-4 grid gap-2">
              {perm.map((orig, dispIdx) => {
                const used = seq.includes(orig);
                return (
                  <button
                    key={orig}
                    type="button"
                    disabled={locked}
                    onClick={() => handleNumber(dispIdx)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-[14px] transition-colors',
                      used
                        ? 'border-line bg-surface-2/40 text-txt-faint line-through'
                        : 'border-line bg-surface-2/60 text-txt hover:border-danger/60 hover:bg-surface-2',
                      locked && 'pointer-events-none',
                    )}
                  >
                    <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[11px] font-bold text-txt-dim">
                      {dispIdx + 1}
                    </span>
                    {q.items[orig]}
                  </button>
                );
              })}
            </div>
            {locked && lastResult !== 'correct' && (
              <p className="mt-3 font-mono text-[12px] leading-relaxed text-txt-dim">
                <span className="text-success">correct order:</span> {q.items.join(' → ')}
              </p>
            )}
          </div>
        )}

        {q.type === 'fill' && (
          <div className="flex flex-wrap gap-2.5">
            {q.bank.map((token, i) => {
              const isPick = fillPick === token;
              const isAnswer = token === q.answer;
              const state = locked
                ? isAnswer
                  ? 'correct'
                  : isPick
                    ? 'wrong'
                    : 'dim'
                : isPick
                  ? 'selected'
                  : 'default';
              return (
                <button
                  key={token}
                  type="button"
                  disabled={locked}
                  onClick={() => handleNumber(i)}
                  className={cn(
                    'rounded-lg border px-4 py-2.5 font-mono text-[14px] transition-colors',
                    state === 'default' && 'border-line bg-surface-2/60 text-txt hover:border-danger/60 hover:bg-surface-2',
                    state === 'selected' && 'border-danger bg-danger/10 text-danger',
                    state === 'correct' && 'border-success bg-success/15 text-success',
                    state === 'wrong' && 'border-danger bg-danger/15 text-danger',
                    state === 'dim' && 'border-line bg-surface-2/40 text-txt-faint',
                    locked && 'pointer-events-none',
                  )}
                >
                  <span className="mr-2 font-mono text-[11px] text-txt-faint">{i + 1}</span>
                  {token}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* footer: hints / lock-in / why line */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <span className="micro-label flex items-center gap-2 text-txt-faint">
          <MousePointerClick className="size-3.5" />
          1–4 select · <CornerDownLeft className="size-3.5" /> lock in
        </span>
        {!locked && (
          <button
            type="button"
            onClick={trySubmit}
            disabled={!submittable}
            className={cn(
              'rounded-lg border px-5 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition-colors',
              submittable
                ? 'border-danger bg-danger/15 text-danger hover:bg-danger/25'
                : 'cursor-not-allowed border-line text-txt-faint',
            )}
          >
            lock in ↵
          </button>
        )}
      </div>

      {locked && lastResult !== 'correct' && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mt-4 border-t border-line pt-4 font-mono text-[12px] leading-relaxed text-txt-dim"
        >
          {lastResult === 'timeout' && <span className="mr-2 font-bold text-danger">time out.</span>}
          <span className="font-bold text-danger">why:</span> {q.why}
        </motion.p>
      )}
    </div>
  );
}
