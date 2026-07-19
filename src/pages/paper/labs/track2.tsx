import { useCallback, useMemo, useRef, useState } from 'react';
import { LabBtn, LabSlider, Readout, type LabProps } from './shared';
import { useTicker } from '@/hooks/useTicker';
import { cn } from '@/lib/utils';

/**
 * TRACK 2 labs — one bespoke interactive per paper (paper.md §8 lab specs).
 */

// ---------------------------------------------------------------------------
// 08 · seq2seq-2014 — encoder → context → decoder step-through
// ---------------------------------------------------------------------------

const S2S_SRC = ['the', 'cat', 'sat', 'on', 'the', 'mat'];
const S2S_TGT = ['le', 'chat', 'était', 'assis', 'sur', 'le', 'tapis'];

export function Seq2SeqLab({ color, onComplete }: LabProps) {
  const total = S2S_SRC.length + S2S_TGT.length;
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);
  const doneRef = useRef(false);

  const encodePhase = step < S2S_SRC.length;
  const hidden = useMemo(() => {
    // deterministic pseudo-hidden-state walk, 6 dims
    const h = new Array(6).fill(0);
    for (let k = 0; k < Math.min(step + 1, total); k++) {
      for (let d = 0; d < 6; d++) {
        h[d] = Math.tanh(h[d] * 0.9 + Math.sin(k * 3.7 + d * 1.3) * 0.7);
      }
    }
    return h;
  }, [step, total]);

  const advance = useCallback(() => {
    const next = Math.min(total, step + 1);
    setStep(next);
    if (!doneRef.current && next >= total) {
      doneRef.current = true;
      onComplete();
    }
  }, [total, step, onComplete]);

  useTicker(() => {
    if (step >= total) {
      setAuto(false);
      return;
    }
    advance();
  }, auto ? 700 : null);

  const consumed = encodePhase ? S2S_SRC.slice(0, step) : S2S_SRC;
  const emitted = encodePhase ? [] : S2S_TGT.slice(0, step - S2S_SRC.length);
  // reversed input trick: encoder consumed the source back-to-front
  const reversedConsumed = [...consumed].reverse();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <LabBtn color={color} onClick={advance} disabled={step >= total}>
          step →
        </LabBtn>
        <LabBtn color={color} active={auto} onClick={() => setAuto((a) => !a)}>
          {auto ? 'pause' : 'auto'}
        </LabBtn>
        <LabBtn color={color} onClick={() => { setStep(0); setAuto(false); }}>
          reset
        </LabBtn>
        <Readout color={color}>{encodePhase ? `encoding ${step}/${S2S_SRC.length}` : `decoding ${step - S2S_SRC.length}/${S2S_TGT.length}`}</Readout>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {/* encoder */}
        <div className="rounded-lg border border-line bg-void p-3">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-txt-faint">encoder (reversed input)</div>
          <div className="flex flex-wrap gap-1.5">
            {reversedConsumed.length === 0 && <span className="font-mono text-[11px] text-txt-faint">· awaiting tokens ·</span>}
            {reversedConsumed.map((tok, i) => (
              <span key={i} className="rounded border px-2 py-1 font-mono text-[12px]" style={{ borderColor: i === reversedConsumed.length - 1 && encodePhase ? color : 'var(--line)', color: i === reversedConsumed.length - 1 && encodePhase ? color : '#9AA1B8' }}>
                {tok}
              </span>
            ))}
          </div>
          <div className="mt-3 space-y-1">
            {hidden.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-8 font-mono text-[9px] text-txt-faint">h[{i}]</span>
                <div className="h-2.5 rounded-sm" style={{ width: `${Math.abs(v) * 90 + 4}%`, backgroundColor: color, opacity: 0.35 + Math.abs(v) * 0.6 }} />
              </div>
            ))}
          </div>
        </div>

        {/* context vector */}
        <div className={cn('flex flex-col items-center justify-center rounded-lg border p-3 transition-all', step >= S2S_SRC.length ? 'border-current' : 'border-line')} style={step >= S2S_SRC.length ? { borderColor: color, boxShadow: `0 0 18px ${color}33` } : undefined}>
          <span className="font-mono text-[11px] uppercase tracking-wider text-txt-faint">context vector v</span>
          <div className="mt-2 grid grid-cols-6 gap-1">
            {hidden.map((v, i) => (
              <div key={i} className="h-8 w-4 rounded-sm border border-line" style={{ backgroundColor: step >= S2S_SRC.length ? color : 'var(--surface)', opacity: step >= S2S_SRC.length ? 0.3 + Math.abs(v) * 0.7 : 0.5 }} />
            ))}
          </div>
          <span className="mt-2 font-mono text-[10px] text-txt-faint">
            {step >= S2S_SRC.length ? 'the whole sentence, in 6 floats (a lossy zip)' : 'fills when encoding completes'}
          </span>
        </div>

        {/* decoder */}
        <div className="rounded-lg border border-line bg-void p-3">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-txt-faint">decoder output</div>
          <div className="flex flex-wrap gap-1.5">
            {emitted.length === 0 && <span className="font-mono text-[11px] text-txt-faint">· nothing yet ·</span>}
            {emitted.map((tok, i) => (
              <span key={i} className="rounded border px-2 py-1 font-mono text-[12px]" style={{ borderColor: i === emitted.length - 1 ? color : 'var(--line)', color: i === emitted.length - 1 ? color : '#E8EAF4' }}>
                {tok}
              </span>
            ))}
            {step >= total && <span className="rounded border border-success/50 px-2 py-1 font-mono text-[12px] text-success">&lt;eos&gt;</span>}
          </div>
          {step >= total && <p className="mt-3 font-mono text-[11px] text-success">✓ full pass complete — sentence folded, then unfolded.</p>}
        </div>
      </div>
      <p className="font-mono text-[11px] text-txt-faint">
        note the encoder reads the source back-to-front — the paper&apos;s reversal trick that shortens
        gradient paths to the first decoded words.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 09 · bahdanau-2014 — alignment heatmap
// ---------------------------------------------------------------------------

const EN = ['The', 'agreement', 'on', 'the', 'European', 'Economic', 'Area'];
const FR = ["L'", 'accord', 'sur', 'la', 'zone', 'économique', 'européenne'];
// alignment weights [fr][en] — roughly the paper's figure: diagonal + the
// famous "zone économique européenne" reordering
const ALIGN: number[][] = [
  [0.85, 0.06, 0.02, 0.03, 0.01, 0.01, 0.02],
  [0.08, 0.78, 0.06, 0.03, 0.01, 0.02, 0.02],
  [0.02, 0.07, 0.8, 0.06, 0.02, 0.01, 0.02],
  [0.02, 0.03, 0.08, 0.82, 0.02, 0.01, 0.02],
  [0.01, 0.02, 0.02, 0.03, 0.1, 0.12, 0.7],
  [0.01, 0.02, 0.02, 0.02, 0.1, 0.78, 0.05],
  [0.01, 0.02, 0.02, 0.02, 0.82, 0.08, 0.03],
];

export function BahdanauLab({ color, onComplete }: LabProps) {
  const [sel, setSel] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const doneRef = useRef(false);

  const pick = (i: number) => {
    setSel(i);
    const next = new Set(seen);
    next.add(i);
    setSeen(next);
    if (!doneRef.current && next.size >= 3) {
      doneRef.current = true;
      onComplete();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-txt-faint">english source (hover a french word below)</div>
        <div className="flex flex-wrap gap-1.5">
          {EN.map((w, j) => {
            const w8 = sel != null ? ALIGN[sel][j] : 0;
            return (
              <div key={j} className="flex flex-col items-center gap-1">
                <div className="h-8 w-2 rounded-sm bg-line/60">
                  <div className="w-full rounded-sm transition-all" style={{ height: `${w8 * 100}%`, marginTop: `${(1 - w8) * 100}%`, backgroundColor: color, opacity: 0.4 + w8 * 0.6 }} />
                </div>
                <span className="rounded border px-2 py-1 font-mono text-[12px] transition-all" style={{ borderColor: w8 > 0.3 ? color : 'var(--line)', color: w8 > 0.3 ? color : '#9AA1B8' }}>
                  {w}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-txt-faint">french output — click/hover a word</div>
        <div className="flex flex-wrap gap-1.5">
          {FR.map((w, i) => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => pick(i)}
              onClick={() => pick(i)}
              className={cn('rounded-lg border px-3 py-2 font-mono text-[13px] transition-all', sel === i ? 'text-txt' : 'border-line bg-surface text-txt-dim hover:text-txt')}
              style={sel === i ? { borderColor: color, backgroundColor: `${color}22` } : undefined}
            >
              {w}
              {seen.has(i) && <span className="ml-1 text-[9px]" style={{ color }}>●</span>}
            </button>
          ))}
        </div>
      </div>

      {sel != null && (
        <p className="font-mono text-[12px] text-txt-dim">
          α({FR[sel]}) → max weight on <span style={{ color }}>{EN[ALIGN[sel].indexOf(Math.max(...ALIGN[sel]))]}</span> (
          {(Math.max(...ALIGN[sel]) * 100).toFixed(0)}%). note <em>zone économique européenne</em> reads the english
          phrase back-to-front — the model discovered reordering with no alignment labels.
        </p>
      )}
      <p className="font-mono text-[11px] text-txt-faint">inspected {seen.size}/3 needed · each french step re-queries all english positions — no fixed vector.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10 · neural-conv-2015 — impressive or failure?
// ---------------------------------------------------------------------------

interface ConvCard {
  human: string;
  machine: string;
  pile: 'impressive' | 'failure';
  note: string;
}

const CONV_CARDS: ConvCard[] = [
  { human: 'what is the purpose of life?', machine: 'to serve the greater good.', pile: 'impressive', note: 'eerily coherent philosophy from movie subtitles' },
  { human: 'my laptop keeps freezing, what should i do?', machine: 'have you tried restarting it? also check if it happens in safe mode.', pile: 'impressive', note: 'context-relevant IT-helpdesk troubleshooting' },
  { human: "what's your job?", machine: "i'm a lawyer.", pile: 'impressive', note: 'plausible persona answer (for one turn, anyway)' },
  { human: 'what do you think about the election?', machine: "i don't know.", pile: 'failure', note: 'the generic-reply attractor: likely, useless' },
  { human: 'how old are you? ... and now again: how old are you?', machine: "i'm 25. ... i'm 18.", pile: 'failure', note: 'no persistent persona — pure per-turn pattern matching' },
  { human: 'my screen cracked and i also need laptop recommendations — help with both?', machine: 'what is your problem?', pile: 'failure', note: 'multi-part questions collapse into shallow prompts' },
];

export function NeuralConvLab({ color, onComplete }: LabProps) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [sorted, setSorted] = useState<(boolean | null)[]>(Array(CONV_CARDS.length).fill(null));
  const doneRef = useRef(false);

  const card = CONV_CARDS[idx];
  const finished = idx >= CONV_CARDS.length;

  const sort = (pile: 'impressive' | 'failure') => {
    const correct = pile === card.pile;
    setScore((s) => s + (correct ? 1 : 0));
    setSorted((s) => s.map((v, i) => (i === idx ? correct : v)));
    const next = idx + 1;
    setIdx(next);
    if (!doneRef.current && next >= CONV_CARDS.length) {
      doneRef.current = true;
      onComplete();
    }
  };

  return (
    <div className="space-y-4">
      {!finished ? (
        <>
          <div className="flex items-center justify-between font-mono text-[11px] text-txt-faint">
            <span>sample {idx + 1}/{CONV_CARDS.length} — from the paper&apos;s actual transcripts</span>
            <span>score {score}</span>
          </div>
          <div className="space-y-2 rounded-lg border border-line bg-void p-4">
            <div className="flex gap-2">
              <span className="shrink-0 font-mono text-[11px] uppercase text-txt-faint">human:</span>
              <span className="font-mono text-[13px] text-txt-dim">{card.human}</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 font-mono text-[11px] uppercase" style={{ color }}>machine:</span>
              <span className="font-mono text-[13px] text-txt">{card.machine}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <LabBtn color={color} onClick={() => sort('impressive')}>impressive</LabBtn>
            <LabBtn color={color} onClick={() => sort('failure')}>failure</LabBtn>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="font-mono text-[13px] text-txt">
            sorted all {CONV_CARDS.length} — you got <span style={{ color }}>{score}/{CONV_CARDS.length}</span>. the verdicts:
          </p>
          <div className="space-y-1.5">
            {CONV_CARDS.map((c, i) => (
              <div key={i} className="flex items-start gap-2 font-mono text-[11.5px]">
                <span className={c.pile === 'impressive' ? 'text-success' : 'text-danger'}>{c.pile === 'impressive' ? '✓' : '✗'}</span>
                <span className="text-txt-dim">{c.note}</span>
              </div>
            ))}
          </div>
          <p className="font-mono text-[11px] text-txt-faint">
            the objective was &quot;likely reply&quot;, not &quot;good reply&quot; — the failures are the objective, faithfully served.
          </p>
        </div>
      )}
      <div className="flex gap-1">
        {CONV_CARDS.map((_, i) => (
          <span key={i} className="h-1.5 w-8 rounded-full" style={{ backgroundColor: sorted[i] == null ? 'var(--line)' : sorted[i] ? '#34D399' : '#FB7185' }} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 11 · graves-handwriting-2013 — mixture-density pen strokes
// ---------------------------------------------------------------------------

interface Stroke {
  x: number;
  y: number;
  penUp: boolean;
}

/** procedural cursive: mixture-sampled offsets around drifting sinusoid guides */
function makeHandwriting(bias: number, seed: number): Stroke[] {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const strokes: Stroke[] = [];
  let x = 12;
  let y = 60;
  const sigma = 2.6 * (1.6 - bias); // high bias -> tight, legible
  for (let word = 0; word < 4; word++) {
    const letters = 3 + Math.floor(rnd() * 3);
    for (let l = 0; l < letters; l++) {
      const phase = rnd() * Math.PI * 2;
      const amp = 6 + rnd() * 9;
      const loops = 6 + Math.floor(rnd() * 4);
      for (let k = 0; k < loops; k++) {
        const t = k / loops;
        // mixture: mostly smooth guide curve, sometimes a wild flourish
        const wild = rnd() > 0.93;
        const dx = 2.2 + (rnd() - 0.5) * sigma + (wild ? (rnd() - 0.5) * 14 : 0);
        const dy =
          Math.cos(phase + t * Math.PI * 2) * amp * 0.22 +
          (rnd() - 0.5) * sigma +
          (wild ? (rnd() - 0.5) * 18 : 0);
        x += dx;
        y = Math.max(14, Math.min(120, y + dy));
        strokes.push({ x, y, penUp: false });
      }
    }
    x += 8;
    strokes.push({ x, y, penUp: true });
  }
  return strokes;
}

export function GravesHandwritingLab({ color, onComplete }: LabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bias, setBias] = useState(0.6);
  const [drawing, setDrawing] = useState(false);
  const [stats, setStats] = useState({ samples: 0, biases: new Set<number>() });
  const strokesRef = useRef<Stroke[]>([]);
  const cursorRef = useRef(0);
  const doneRef = useRef(false);

  const W = 560;
  const H = 140;

  const start = () => {
    strokesRef.current = makeHandwriting(bias, 7 + stats.samples * 131);
    cursorRef.current = 0;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, W, H);
    setDrawing(true);
    const biases = new Set(stats.biases);
    biases.add(Math.round(bias * 10));
    const next = { samples: stats.samples + 1, biases };
    setStats(next);
    if (!doneRef.current && next.samples >= 2 && next.biases.size >= 2) {
      doneRef.current = true;
      onComplete();
    }
  };

  useTicker(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const strokes = strokesRef.current;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const i = cursorRef.current;
      if (i >= strokes.length - 1) {
        setDrawing(false);
        return;
      }
      const a = strokes[i];
      const b = strokes[i + 1];
      if (!b.penUp) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      cursorRef.current = i + 1;
    }
  }, drawing ? 30 : null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <LabSlider label="bias (legibility)" min={0} max={1} step={0.05} value={bias} onChange={setBias} format={(v) => v.toFixed(2)} color={color} />
        <LabBtn color={color} onClick={start} active={drawing}>
          {stats.samples === 0 ? 'write' : 'write again'}
        </LabBtn>
        <Readout color={color}>mixture of K=20 gaussians · σ scaled by bias · {stats.samples} samples</Readout>
      </div>
      <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%' }} className="rounded-lg border border-line bg-void" />
      <p className="font-mono text-[11px] text-txt-faint">
        each offset is drawn from a gaussian mixture, then fed back — the two-stage sampling that makes
        strokes variable instead of averaged mush. low bias → wild scrawl.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 12 · order-matters-2015 — shuffle the input
// ---------------------------------------------------------------------------

type Ordering = 'asis' | 'sorted' | 'reverse' | 'attention';

const ORDER_RESULTS: Record<Ordering, { label: string; seq: number[]; steps: number; err: number; verdict: string }> = {
  asis: { label: 'as-is (random file order)', seq: [5, 2, 8, 1, 9, 3], steps: 24, err: 31, verdict: 'hard: the model must learn the task AND undo your permutation' },
  sorted: { label: 'pre-sorted input', seq: [1, 2, 3, 5, 8, 9], steps: 6, err: 2, verdict: 'trivial: the output is a copy — great for training signal, degenerate task' },
  reverse: { label: 'reverse-sorted input', seq: [9, 8, 5, 3, 2, 1], steps: 18, err: 14, verdict: 'medium: a fixed reversal is learnable, but still wasted capacity' },
  attention: { label: 'model-chosen (attention read)', seq: [5, 2, 8, 1, 9, 3], steps: 9, err: 5, verdict: 'easy: the model reads in its own content-dependent order — learned iteration' },
};

export function OrderMattersLab({ color, onComplete }: LabProps) {
  const [sel, setSel] = useState<Ordering | null>(null);
  const [tried, setTried] = useState<Set<Ordering>>(new Set());
  const doneRef = useRef(false);

  const pick = (o: Ordering) => {
    setSel(o);
    const next = new Set(tried);
    next.add(o);
    setTried(next);
    if (!doneRef.current && next.size >= 3) {
      doneRef.current = true;
      onComplete();
    }
  };

  return (
    <div className="space-y-4">
      <p className="font-mono text-[12px] text-txt-dim">
        task: emit the sorted array. the input is a set — <span style={{ color }}>you</span> pick the order the model reads it in:
      </p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(ORDER_RESULTS) as Ordering[]).map((o) => (
          <LabBtn key={o} color={color} active={sel === o} onClick={() => pick(o)}>
            {ORDER_RESULTS[o].label}
          </LabBtn>
        ))}
      </div>
      {sel && (
        <div className="grid gap-3 rounded-lg border border-line bg-void p-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-txt-faint">input order</div>
            <div className="flex gap-1.5">
              {ORDER_RESULTS[sel].seq.map((n, i) => (
                <span key={i} className="rounded border px-2 py-1 font-mono text-[13px]" style={{ borderColor: sel === 'attention' && i === 2 ? color : 'var(--line)', color: sel === 'attention' && i === 2 ? color : '#9AA1B8' }}>
                  {n}
                </span>
              ))}
              <span className="self-center font-mono text-[11px] text-txt-faint">→ sort → [1 2 3 5 8 9]</span>
            </div>
            {sel === 'attention' && (
              <p className="mt-2 font-mono text-[11px]" style={{ color }}>
                attention pass 1 locks onto element 3 (the 1) — the model iterates ascending, like a person would
              </p>
            )}
          </div>
          <div className="space-y-2">
            {[
              { label: 'optimization steps to fit', value: ORDER_RESULTS[sel].steps, max: 24 },
              { label: 'test error %', value: ORDER_RESULTS[sel].err, max: 31 },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between font-mono text-[11px] text-txt-faint">
                  <span>{row.label}</span>
                  <span className="text-txt-dim">{row.value}</span>
                </div>
                <div className="h-2.5 rounded-full bg-line/60">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(row.value / row.max) * 100}%`, backgroundColor: row.value / row.max < 0.4 ? '#34D399' : color }} />
                </div>
              </div>
            ))}
            <p className="font-mono text-[11px] text-txt-dim">{ORDER_RESULTS[sel].verdict}</p>
          </div>
        </div>
      )}
      <p className="font-mono text-[11px] text-txt-faint">tried {tried.size}/3 orderings · order is a hyperparameter of learnability, not a detail.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 13 · pointer-networks-2015 — convex hull pointer
// ---------------------------------------------------------------------------

interface Pt2 {
  x: number;
  y: number;
}

function convexHull(points: Pt2[]): number[] {
  const idx = points.map((_, i) => i).sort((a, b) => points[a].x - points[b].x || points[a].y - points[b].y);
  const cross = (o: Pt2, a: Pt2, b: Pt2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: number[] = [];
  for (const i of idx) {
    while (lower.length >= 2 && cross(points[lower[lower.length - 2]], points[lower[lower.length - 1]], points[i]) <= 0) lower.pop();
    lower.push(i);
  }
  const upper: number[] = [];
  for (const i of [...idx].reverse()) {
    while (upper.length >= 2 && cross(points[upper[upper.length - 2]], points[upper[upper.length - 1]], points[i]) <= 0) upper.pop();
    upper.push(i);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function PointerNetLab({ color, onComplete }: LabProps) {
  const W = 520;
  const H = 300;
  const [points, setPoints] = useState<Pt2[]>([]);
  const [hull, setHull] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const doneRef = useRef(false);

  useTicker(() => {
    if (step >= hull.length) {
      setRunning(false);
      if (!doneRef.current && hull.length > 0 && points.length >= 6) {
        doneRef.current = true;
        onComplete();
      }
      return;
    }
    setStep((s) => s + 1);
  }, running ? 800 : null);

  const run = () => {
    if (points.length < 3) return;
    setHull(convexHull(points));
    setStep(0);
    setRunning(true);
  };

  const reset = () => {
    setPoints([]);
    setHull([]);
    setStep(0);
    setRunning(false);
  };

  const current = step > 0 && hull.length > 0 ? hull[(step - 1) % hull.length] : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <LabBtn color={color} onClick={run} disabled={points.length < 3 || running} active={running}>
          run ptr-net
        </LabBtn>
        <LabBtn color={color} onClick={reset}>
          clear
        </LabBtn>
        <Readout color={color}>{points.length} points · click the plane to add (6+ for completion)</Readout>
        {running && <span className="font-mono text-[11px]" style={{ color }}>decoding step {step}/{hull.length}…</span>}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair rounded-lg border border-line bg-void"
        onClick={(e) => {
          if (running || points.length >= 10) return;
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          const y = ((e.clientY - rect.top) / rect.height) * H;
          setPoints((p) => [...p, { x, y }]);
        }}
      >
        {/* attention arcs from current point to all others */}
        {running && current != null && step <= hull.length && (
          <>
            {points.map((p, j) => {
              const isChosen = j === hull[step % hull.length];
              const a = points[current];
              return (
                <line
                  key={j}
                  x1={a.x}
                  y1={a.y}
                  x2={p.x}
                  y2={p.y}
                  stroke={isChosen ? '#FBBF24' : color}
                  strokeWidth={isChosen ? 2 : 0.8}
                  opacity={isChosen ? 0.95 : 0.18}
                />
              );
            })}
          </>
        )}
        {/* hull path so far */}
        {hull.length > 0 && step > 0 && (
          <polyline
            points={hull.slice(0, step).map((i) => `${points[i].x},${points[i].y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={2.2}
          />
        )}
        {step > hull.length && hull.length > 0 && (
          <polygon points={hull.map((i) => `${points[i].x},${points[i].y}`).join(' ')} fill={`${color}18`} stroke={color} strokeWidth={2.2} />
        )}
        {/* points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={current === i ? 7 : 4.5} fill={current === i ? '#FBBF24' : color} stroke="#07070D" strokeWidth={1.5} opacity={current === i ? 1 : 0.85} />
            <text x={p.x + 8} y={p.y - 6} fontSize={9} fill="#5B6178" fontFamily="monospace">
              {i}
            </text>
          </g>
        ))}
      </svg>
      <p className="font-mono text-[11px] text-txt-faint">
        gold arc = the pointer softmax choosing the next hull vertex — the output is an <em>index into the input</em>, never a generated coordinate.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 14 · transformer-2017 — self-attention playground
// ---------------------------------------------------------------------------

const TOKENS = ["the", "animal", "didn't", "cross", "the", "street", "because", "it", "was", "too", "tired"];

// sparse precomputed heads: [query][key] -> weight
const SYNTAX_HEAD: Record<number, Record<number, number>> = {
  0: { 1: 0.85, 0: 0.1 },
  1: { 0: 0.4, 3: 0.35, 2: 0.15, 1: 0.1 },
  2: { 3: 0.8, 2: 0.15 },
  3: { 1: 0.3, 5: 0.3, 2: 0.15, 0: 0.1, 4: 0.1 },
  4: { 5: 0.85, 4: 0.1 },
  5: { 4: 0.45, 3: 0.35, 5: 0.1 },
  6: { 8: 0.5, 3: 0.25, 6: 0.1, 7: 0.1 },
  7: { 8: 0.5, 3: 0.2, 6: 0.15, 7: 0.1 },
  8: { 10: 0.4, 7: 0.3, 8: 0.15, 2: 0.1 },
  9: { 10: 0.85, 9: 0.1 },
  10: { 9: 0.5, 8: 0.25, 10: 0.15 },
};

const COREF_HEAD: Record<number, Record<number, number>> = {
  7: { 1: 0.62, 5: 0.25, 7: 0.08 }, // it -> animal / street
  8: { 7: 0.45, 1: 0.25, 10: 0.15, 8: 0.1 }, // was -> it/animal
  10: { 1: 0.55, 7: 0.25, 10: 0.1 }, // tired -> animal
  3: { 1: 0.35, 5: 0.25, 3: 0.2, 7: 0.1 },
  1: { 1: 0.3, 7: 0.3, 10: 0.2, 0: 0.1 },
  5: { 5: 0.3, 7: 0.35, 3: 0.15, 4: 0.1 },
};

export function TransformerLab({ color, onComplete }: LabProps) {
  const [head, setHead] = useState<'syntax' | 'coref'>('syntax');
  const [sel, setSel] = useState<number | null>(7);
  const [dk, setDk] = useState(16);
  const [stats, setStats] = useState({ tokens: new Set<number>([7]), heads: new Set<string>(['syntax']) });
  const doneRef = useRef(false);

  const weights = head === 'syntax' ? SYNTAX_HEAD : COREF_HEAD;

  const bump = (t: number | null, h: string) => {
    const tokens = new Set(stats.tokens);
    if (t != null) tokens.add(t);
    const heads = new Set(stats.heads);
    heads.add(h);
    setStats({ tokens, heads });
    if (!doneRef.current && tokens.size >= 3 && heads.size >= 2) {
      doneRef.current = true;
      onComplete();
    }
  };

  // softmax sharpness demo: raw scores grow with d_k; scaled by 1/√d_k
  const baseScores = [2.4, 1.7, 0.4, -0.6];
  const scaled = baseScores.map((s) => (s * Math.sqrt(dk)) / Math.sqrt(8));
  const mx = Math.max(...scaled);
  const probs = scaled.map((s) => Math.exp(s - mx));
  const psum = probs.reduce((a, b) => a + b, 0);
  const soft = probs.map((p) => p / psum);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <LabBtn color={color} active={head === 'syntax'} onClick={() => { setHead('syntax'); bump(sel, 'syntax'); }}>
          head 1 · syntax
        </LabBtn>
        <LabBtn color={color} active={head === 'coref'} onClick={() => { setHead('coref'); bump(sel, 'coref'); }}>
          head 2 · coreference
        </LabBtn>
      </div>

      {/* token attention map */}
      <div className="rounded-lg border border-line bg-void p-4">
        <div className="flex flex-wrap gap-x-1 gap-y-6">
          {TOKENS.map((tok, i) => {
            const w = sel != null ? (weights[sel]?.[i] ?? 0) : 0;
            return (
              <button
                key={i}
                type="button"
                onMouseEnter={() => { setSel(i); bump(i, head); }}
                onClick={() => { setSel(i); bump(i, head); }}
                className="relative rounded-lg border px-2.5 py-1.5 font-mono text-[13px] transition-all"
                style={{
                  borderColor: sel === i ? '#FBBF24' : w > 0.05 ? color : 'var(--line)',
                  backgroundColor: sel === i ? 'rgba(251,191,36,0.12)' : w > 0.05 ? `${color}${Math.round(w * 200 + 20).toString(16).padStart(2, '0')}` : 'transparent',
                  color: sel === i ? '#FBBF24' : w > 0.05 ? color : '#9AA1B8',
                  boxShadow: w > 0.4 && sel !== i ? `0 0 10px ${color}55` : undefined,
                }}
              >
                {tok}
                {sel != null && i !== sel && w > 0.01 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[9px]" style={{ color }}>
                    {w.toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-4 font-mono text-[12px] text-txt-dim">
          {sel != null ? (
            <>
              <span className="text-xp">{TOKENS[sel]}</span> attends:{' '}
              {Object.entries(weights[sel] ?? {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([j, w]) => `${TOKENS[Number(j)]} (${w.toFixed(2)})`)
                .join(' · ') || 'nothing much'}
              {head === 'coref' && sel === 7 && ' — "it" resolves to "animal", not "street". classic winograd sentence.'}
            </>
          ) : (
            'hover a token'
          )}
        </p>
      </div>

      {/* d_k scaling demo */}
      <div className="rounded-lg border border-line bg-void p-4">
        <div className="mb-3 flex flex-wrap items-end gap-4">
          <LabSlider label="d_k (key dimension)" min={4} max={64} step={4} value={dk} onChange={setDk} format={(v) => String(v)} color={color} />
          <Readout color={color}>softmax((q·k)/√d_k) — watch it saturate</Readout>
        </div>
        <div className="flex items-end gap-2">
          {soft.map((p, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="font-mono text-[10px] text-txt-dim">{p.toFixed(2)}</span>
              <div className="w-10 rounded-sm" style={{ height: 6 + p * 64, backgroundColor: i === 0 ? color : 'var(--line)', opacity: i === 0 ? 1 : 0.7 }} />
              <span className="font-mono text-[9px] text-txt-faint">k{i}</span>
            </div>
          ))}
          <span className="ml-3 font-mono text-[11px] text-txt-faint">
            d_k={dk}: {dk >= 48 ? 'softmax saturated — gradients ≈ 0. this is why we divide by √d_k.' : dk <= 8 ? 'nearly uniform — no selection.' : 'healthy range — sharp but trainable.'}
          </span>
        </div>
      </div>
      <p className="font-mono text-[11px] text-txt-faint">
        tokens inspected: {stats.tokens.size}/3 · heads seen: {stats.heads.size}/2
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 15 · annotated-transformer — code walkthrough with linked diagram
// ---------------------------------------------------------------------------

interface WalkSection {
  id: string;
  title: string;
  code: string;
  note: string;
  block: number; // diagram block index to highlight
}

const WALK: WalkSection[] = [
  {
    id: 'embed',
    title: '1 · embeddings + positional encoding',
    code: `x = Embedding(vocab, d_model)(tokens) * sqrt(d_model)\nx = x + PositionalEncoding  # sin/cos, one freq per dim`,
    note: 'order is injected here — without it the model is a bag of words.',
    block: 0,
  },
  {
    id: 'mha',
    title: '2 · multi-head attention',
    code: `scores = Q @ K.transpose(-2,-1) / sqrt(d_k)\np_attn = softmax(scores, dim=-1)\nout = (p_attn @ V).transpose(1,2).contiguous()\nout = out.view(batch, seq, h*d_k) @ W_O`,
    note: 'reshape to (batch, heads, seq, d_k), attend, reshape back. heads are a batch dim.',
    block: 1,
  },
  {
    id: 'mask',
    title: '3 · the causal mask',
    code: `mask = subsequent_mask(seq)          # lower-triangular\nscores = scores.masked_fill(mask == 0, -1e9)\n# BEFORE the softmax — the future gets exactly 0 weight`,
    note: 'two lines. every causal model you have ever used runs this trick.',
    block: 1,
  },
  {
    id: 'residual',
    title: '4 · add & norm',
    code: `x = LayerNorm(x + Sublayer(x))   # around EVERY sublayer\n# the residual highway is load-bearing`,
    note: 'skip the residual and deep stacks degrade — same highway as ResNet.',
    block: 2,
  },
  {
    id: 'ffn',
    title: '5 · position-wise feed-forward',
    code: `FFN(x) = max(0, x @ W1 + b1) @ W2 + b2\n# d_model=512 -> d_ff=2048 -> 512, per position`,
    note: 'two-thirds of the parameters live here — the "thinking" after the "talking".',
    block: 3,
  },
  {
    id: 'train',
    title: '6 · training details the paper omits',
    code: `lr = d_model**-0.5 * min(step**-0.5, step*warmup**-1.5)\nloss = LabelSmoothing(KL, smoothing=0.1)`,
    note: 'warmup-then-decay schedule + label smoothing — the reproduction details.',
    block: 4,
  },
];

export function AnnotatedTransformerLab({ color, onComplete }: LabProps) {
  const [sel, setSel] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const doneRef = useRef(false);

  const pick = (i: number) => {
    setSel(i);
    const next = new Set(visited);
    next.add(i);
    setVisited(next);
    if (!doneRef.current && next.size >= WALK.length) {
      doneRef.current = true;
      onComplete();
    }
  };

  const BLOCKS = ['embed + pos', 'multi-head attn', 'add & norm', 'feed-forward', 'loss + schedule'];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="space-y-2">
          {WALK.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(i)}
              className={cn('w-full rounded-lg border p-3 text-left transition-all', sel === i ? 'text-txt' : 'border-line bg-surface text-txt-dim hover:text-txt')}
              style={sel === i ? { borderColor: color, backgroundColor: `${color}14` } : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] font-bold" style={sel === i ? { color } : undefined}>{s.title}</span>
                {visited.has(i) && <span className="font-mono text-[10px]" style={{ color }}>✓</span>}
              </div>
              {sel === i && (
                <>
                  <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-void p-2.5 font-mono text-[11.5px] leading-relaxed text-txt-dim">{s.code}</pre>
                  <p className="mt-2 font-mono text-[11px] text-txt-faint">{s.note}</p>
                </>
              )}
            </button>
          ))}
        </div>
        {/* mini diagram */}
        <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-void p-3">
          <span className="mb-1 font-mono text-[10px] uppercase tracking-wider text-txt-faint">architecture map</span>
          {BLOCKS.map((b, i) => (
            <div
              key={b}
              className="rounded-md border px-2.5 py-2 font-mono text-[11px] transition-all"
              style={{
                borderColor: WALK[sel].block === i ? color : 'var(--line)',
                color: WALK[sel].block === i ? color : '#5B6178',
                backgroundColor: WALK[sel].block === i ? `${color}18` : 'transparent',
                boxShadow: WALK[sel].block === i ? `0 0 10px ${color}44` : undefined,
              }}
            >
              {b}
            </div>
          ))}
          <span className="mt-auto pt-2 font-mono text-[10px] text-txt-faint">visited {visited.size}/{WALK.length}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 16 · relational-rnn-2018 — memory slots vs flat memory
// ---------------------------------------------------------------------------

const RECALL_EVENTS = [
  { t: 1, desc: 'observe: "A ↔ 3"', slot: 0 },
  { t: 2, desc: 'observe: "B ↔ 7"', slot: 1 },
  { t: 3, desc: 'observe: "C ↔ 1"', slot: 2 },
  { t: 4, desc: 'observe: "D ↔ 5"', slot: 3 },
  { t: 5, desc: 'QUERY: "B?" — slots hold a meeting', slot: -1 },
];

export function RelationalRnnLab({ color, onComplete }: LabProps) {
  const [model, setModel] = useState<'rmc' | 'lstm'>('rmc');
  const [step, setStep] = useState(0);
  const [ranModels, setRanModels] = useState<Set<string>>(new Set());
  const doneRef = useRef(false);

  const isQuery = step >= RECALL_EVENTS.length - 1 && step > 0;

  const advance = () => {
    const next = Math.min(RECALL_EVENTS.length - 1, step + 1);
    setStep(next);
    if (!doneRef.current && next >= RECALL_EVENTS.length - 1) {
      const nm = new Set(ranModels);
      nm.add(model);
      setRanModels(nm);
      if (nm.size >= 2) {
        doneRef.current = true;
        onComplete();
      }
    }
  };

  const switchModel = (m: 'rmc' | 'lstm') => {
    setModel(m);
    setStep(0);
  };

  // slot state: what each slot holds after `step` events
  const slotContents = ['A↔3', 'B↔7', 'C↔1', 'D↔5'].map((label, i) => (step > i ? label : null));
  const attnToB = [0.05, 0.82, 0.06, 0.07];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <LabBtn color={color} active={model === 'rmc'} onClick={() => switchModel('rmc')}>
          RMC (slots)
        </LabBtn>
        <LabBtn color={color} active={model === 'lstm'} onClick={() => switchModel('lstm')}>
          LSTM (flat vector)
        </LabBtn>
        <LabBtn color={color} onClick={advance} disabled={isQuery}>
          step →
        </LabBtn>
        <LabBtn color={color} onClick={() => setStep(0)}>
          reset
        </LabBtn>
      </div>

      <div className="rounded-lg border border-line bg-void p-4">
        <div className="mb-3 font-mono text-[12px]" style={{ color }}>
          t={RECALL_EVENTS[step].t} · {RECALL_EVENTS[step].desc}
        </div>
        {model === 'rmc' ? (
          <div className="grid grid-cols-4 gap-2">
            {slotContents.map((c, i) => (
              <div
                key={i}
                className="rounded-lg border p-3 text-center transition-all"
                style={{
                  borderColor: isQuery ? color : c ? color : 'var(--line)',
                  backgroundColor: isQuery ? `${color}${Math.round((attnToB[i] ?? 0) * 60).toString(16).padStart(2, '0')}` : 'transparent',
                  boxShadow: isQuery && i === 1 ? `0 0 14px ${color}` : undefined,
                }}
              >
                <div className="font-mono text-[10px] uppercase text-txt-faint">slot {i + 1}</div>
                <div className="mt-1 font-mono text-[13px] text-txt">{c ?? '·'}</div>
                {isQuery && <div className="mt-1 font-mono text-[10px]" style={{ color }}>α={attnToB[i].toFixed(2)}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex h-10 items-center gap-0.5 overflow-hidden rounded-lg border border-line bg-surface px-2">
              {Array.from({ length: 40 }, (_, i) => (
                <div
                  key={i}
                  className="h-6 w-1.5 rounded-sm"
                  style={{
                    backgroundColor: color,
                    opacity: 0.15 + Math.abs(Math.sin(i * 1.7 + step * 2.3)) * 0.45,
                  }}
                />
              ))}
            </div>
            <p className="mt-2 font-mono text-[11px] text-txt-faint">one flat 1024-d vector: A, B, C, D smeared together with everything else</p>
          </div>
        )}
        {isQuery && (
          <div className="mt-3 font-mono text-[12.5px]">
            {model === 'rmc' ? (
              <span className="text-success">✓ RMC answers: B ↔ 7 — slot self-attention found the entity relation directly</span>
            ) : (
              <span className="text-xp">~ LSTM answers: B ↔ 7? (recall degrades as bindings accumulate — no place to keep entities apart)</span>
            )}
          </div>
        )}
      </div>
      <p className="font-mono text-[11px] text-txt-faint">
        run both models to the query step ({ranModels.size}/2 done) · path length between memories: 1 hop (slots) vs t hops (flat).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 17 · relational-reasoning-2017 — sort-of-CLEVR mini
// ---------------------------------------------------------------------------

interface SceneObj {
  color: string;
  hex: string;
  shape: 'circle' | 'square';
  size: 'small' | 'large';
  col: number;
  row: number;
}

const SCENE: SceneObj[] = [
  { color: 'red', hex: '#FB7185', shape: 'circle', size: 'large', col: 0, row: 0 },
  { color: 'blue', hex: '#7DD3FC', shape: 'square', size: 'small', col: 1, row: 0 },
  { color: 'green', hex: '#4ADE80', shape: 'circle', size: 'small', col: 2, row: 0 },
  { color: 'red', hex: '#FB7185', shape: 'square', size: 'small', col: 1, row: 1 },
  { color: 'blue', hex: '#7DD3FC', shape: 'circle', size: 'large', col: 2, row: 1 },
  { color: 'green', hex: '#4ADE80', shape: 'square', size: 'large', col: 0, row: 2 },
  { color: 'red', hex: '#FB7185', shape: 'circle', size: 'small', col: 2, row: 2 },
];

interface RnQuestion {
  q: string;
  relational: boolean;
  answer: string;
  pairs: [number, number][]; // pairs that "matter" (highlighted at the end)
}

const RN_QUESTIONS: RnQuestion[] = [
  { q: 'what color is the large circle in the top row?', relational: false, answer: 'red — a single-object lookup, no pairs needed', pairs: [] },
  { q: 'what shape is immediately left of the small red circle?', relational: true, answer: 'a circle (blue, large) — found by the (left-of) pair', pairs: [[1, 6]] },
  { q: 'is the small blue square the same size as the small green circle?', relational: true, answer: 'yes — both small. one pair comparison settles it', pairs: [[1, 2]] },
  { q: 'how many objects are the same color as the large green square?', relational: true, answer: 'one (the small green circle) — pairwise color matches, summed', pairs: [[2, 5]] },
];

export function RelationalReasoningLab({ color, onComplete }: LabProps) {
  const [sel, setSel] = useState<number | null>(null);
  const [sweep, setSweep] = useState(-1);
  const [asked, setAsked] = useState<Set<number>>(new Set());
  const doneRef = useRef(false);

  const ask = (i: number) => {
    setSel(i);
    setSweep(0);
    const next = new Set(asked);
    next.add(i);
    setAsked(next);
    if (!doneRef.current && next.size >= 3) {
      doneRef.current = true;
      onComplete();
    }
  };

  const totalPairs = SCENE.length * SCENE.length;
  useTicker(() => {
    setSweep((s) => (s >= totalPairs ? s : s + 7));
  }, sel != null && sweep >= 0 && sweep < totalPairs ? 40 : null);

  const sweepDone = sweep >= totalPairs;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[260px_1fr]">
        {/* scene */}
        <svg viewBox="0 0 150 150" className="w-full rounded-lg border border-line bg-void">
          {SCENE.map((o, i) => {
            const cx = 25 + o.col * 50;
            const cy = 25 + o.row * 50;
            const r = o.size === 'large' ? 13 : 8;
            const lit = sel != null && sweepDone && RN_QUESTIONS[sel].pairs.some((p) => p.includes(i));
            return (
              <g key={i} opacity={sel != null && sweepDone && RN_QUESTIONS[sel].relational && RN_QUESTIONS[sel].pairs.length > 0 ? (lit ? 1 : 0.35) : 1}>
                {o.shape === 'circle' ? (
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke={o.hex} strokeWidth={2.2} />
                ) : (
                  <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill="none" stroke={o.hex} strokeWidth={2.2} />
                )}
                {lit && <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={color} strokeWidth={1} strokeDasharray="2 2" />}
              </g>
            );
          })}
          {sel != null && !sweepDone && (
            <text x={75} y={145} textAnchor="middle" fontSize={8} fill={color} fontFamily="monospace">
              g_θ(o_i, o_j, q) over all pairs… {Math.min(sweep, totalPairs)}/{totalPairs}
            </text>
          )}
        </svg>
        {/* questions */}
        <div className="space-y-2">
          {RN_QUESTIONS.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => ask(i)}
              className={cn('w-full rounded-lg border px-3 py-2 text-left font-mono text-[12px] transition-all', sel === i ? 'text-txt' : 'border-line bg-surface text-txt-dim hover:text-txt')}
              style={sel === i ? { borderColor: color, backgroundColor: `${color}14` } : undefined}
            >
              <span className="mr-2 text-[10px] uppercase" style={{ color: q.relational ? color : '#5B6178' }}>
                {q.relational ? 'relational' : 'lookup'}
              </span>
              {q.q}
              {asked.has(i) && <span className="ml-1" style={{ color }}>✓</span>}
            </button>
          ))}
          {sel != null && sweepDone && (
            <p className="rounded-lg border border-line bg-void p-3 font-mono text-[12px] text-txt-dim">
              <span style={{ color }}>answer:</span> {RN_QUESTIONS[sel].answer}
            </p>
          )}
        </div>
      </div>
      <p className="font-mono text-[11px] text-txt-faint">
        asked {asked.size}/3 · a plain MLP aces the lookups and fails the relational ones — pairing is
        architecture, not learned behavior.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 18 · ntm-2014 — memory matrix copy task
// ---------------------------------------------------------------------------

const NTM_VECTORS: number[][] = [
  [1, 0, 1, 1, 0, 1],
  [0, 1, 1, 0, 1, 0],
  [1, 1, 0, 0, 1, 1],
  [0, 0, 1, 1, 0, 0],
];

export function NtmLab({ color, onComplete }: LabProps) {
  const ROWS = 8;
  const COLS = 6;
  const [step, setStep] = useState(0); // 0..8: 1-4 write, 5-8 read
  const [mode, setMode] = useState<'location' | 'content'>('location');
  const doneRef = useRef(false);

  const writeIdx = step >= 1 && step <= 4 ? step - 1 : -1;
  const readIdx = step >= 5 && step <= 8 ? step - 5 : -1;
  const memory = useMemo(() => {
    const m: (number[] | null)[] = Array(ROWS).fill(null);
    for (let i = 0; i <= Math.min(writeIdx, 3); i++) {
      if (i >= 0) m[i] = NTM_VECTORS[i];
    }
    return m;
  }, [writeIdx]);

  const progRef = useRef({ finished: false, toggled: false });

  const checkDone = () => {
    const p = progRef.current;
    if (!doneRef.current && p.finished && p.toggled) {
      doneRef.current = true;
      onComplete();
    }
  };

  const advance = () => {
    const next = Math.min(8, step + 1);
    setStep(next);
    if (next >= 8) {
      progRef.current.finished = true;
      checkDone();
    }
  };

  const headRow = writeIdx >= 0 ? writeIdx : readIdx >= 0 ? readIdx : -1;
  const phase = writeIdx >= 0 ? 'WRITE' : readIdx >= 0 ? 'READ' : step === 0 ? 'ready' : 'done';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <LabBtn color={color} onClick={advance} disabled={step >= 8} active={step > 0 && step < 8}>
          {step === 0 ? 'start copy' : 'step →'}
        </LabBtn>
        <LabBtn color={color} onClick={() => setStep(0)}>
          reset
        </LabBtn>
        <LabBtn
          color={color}
          active={mode === 'content'}
          onClick={() => {
            setMode((m) => (m === 'location' ? 'content' : 'location'));
            progRef.current.toggled = true;
            checkDone();
          }}
        >
          addressing: {mode}
        </LabBtn>
        <Readout color={color}>phase: {phase} {phase !== 'ready' && phase !== 'done' ? `${(writeIdx >= 0 ? writeIdx : readIdx) + 1}/4` : ''}</Readout>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        {/* memory matrix */}
        <div className="rounded-lg border border-line bg-void p-3">
          <div className="grid" style={{ gridTemplateColumns: 'auto repeat(6, 1fr)' }}>
            {memory.map((row, r) => (
              <div key={r} className="contents">
                <span className="flex items-center pr-2 font-mono text-[9px] font-bold" style={{ color: headRow === r ? (writeIdx >= 0 ? '#FBBF24' : color) : 'var(--txt-faint)' }}>
                  {headRow === r ? (writeIdx >= 0 ? 'WR' : 'RD') : `M${r}`}
                </span>
                {Array.from({ length: COLS }, (_, c) => {
                  const v = row?.[c] ?? 0;
                  const isHead = headRow === r;
                  return (
                    <div
                      key={c}
                      className="m-0.5 h-7 rounded-sm border transition-all"
                      style={{
                        borderColor: isHead ? (writeIdx >= 0 ? '#FBBF24' : color) : 'var(--line)',
                        backgroundColor: row ? `${color}${Math.round(v * 160 + 20).toString(16).padStart(2, '0')}` : 'transparent',
                        boxShadow: isHead ? `0 0 8px ${writeIdx >= 0 ? '#FBBF24' : color}66` : undefined,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-txt-faint">
            {mode === 'location'
              ? 'location addressing: the head walks M0→M3 by shifting last step\'s weights (pointer arithmetic)'
              : 'content addressing: weights come from cosine similarity to the controller key (fuzzy find-by-value)'}
          </p>
        </div>
        {/* io strip */}
        <div className="space-y-3">
          <div className="rounded-lg border border-line bg-void p-3">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-txt-faint">input sequence</div>
            {NTM_VECTORS.map((v, i) => (
              <div key={i} className="flex gap-1">
                {v.map((b, c) => (
                  <span key={c} className="mb-1 inline-block size-3 rounded-[2px]" style={{ backgroundColor: b ? color : 'var(--line)', opacity: writeIdx === i ? 1 : 0.45 }} />
                ))}
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-line bg-void p-3">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-txt-faint">read output</div>
            {NTM_VECTORS.map((v, i) => (
              <div key={i} className="flex gap-1" style={{ opacity: readIdx >= i ? 1 : 0.25 }}>
                {v.map((b, c) => (
                  <span key={c} className="mb-1 inline-block size-3 rounded-[2px]" style={{ backgroundColor: readIdx >= i && b ? '#34D399' : 'var(--line)' }} />
                ))}
              </div>
            ))}
            {step >= 8 && <p className="mt-1 font-mono text-[11px] text-success">✓ copy complete — algorithm learned, no length limit in principle</p>}
          </div>
        </div>
      </div>
      <p className="font-mono text-[11px] text-txt-faint">
        the head never picks a hard address — weights are ~0.97 on one row and ~0.01 on its neighbors.
        blurry, differentiable, learned.
      </p>
    </div>
  );
}
