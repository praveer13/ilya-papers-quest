import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LabBtn, LabSlider, MiniBars, Readout, type LabProps } from './shared';
import { useTicker } from '@/hooks/useTicker';
import { cn } from '@/lib/utils';

/**
 * TRACK 1 labs — one bespoke interactive per paper (paper.md §8 lab specs).
 * Each calls onComplete() when its completion rule is met.
 */

// ---------------------------------------------------------------------------
// 01 · char-rnn — n-gram sampler with temperature slider
// ---------------------------------------------------------------------------

const CORPUS =
  'To be, or not to be, that is the question: whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles, and by opposing end them. To die, to sleep no more; and by a sleep to say we end the heartache and the thousand natural shocks that flesh is heir to. Tis a consummation devoutly to be wished. To die, to sleep; to sleep, perchance to dream. ' +
  'Shall I compare thee to a summers day? Thou art more lovely and more temperate. Rough winds do shake the darling buds of may, and summers lease hath all too short a date. ' +
  'All the worlds a stage, and all the men and women merely players. They have their exits and their entrances, and one man in his time plays many parts.';

type NGram = Map<string, Map<string, number>>;

function buildModel(order: number): NGram {
  const m: NGram = new Map();
  for (let i = 0; i + order < CORPUS.length; i++) {
    const ctx = CORPUS.slice(i, i + order);
    const next = CORPUS[i + order];
    if (!m.has(ctx)) m.set(ctx, new Map());
    const row = m.get(ctx)!;
    row.set(next, (row.get(next) ?? 0) + 1);
  }
  return m;
}

function sampleNext(row: Map<string, number>, temp: number): string {
  let total = 0;
  const weights: [string, number][] = [];
  for (const [ch, c] of row) {
    const w = Math.pow(c, 1 / Math.max(0.05, temp));
    weights.push([ch, w]);
    total += w;
  }
  let r = Math.random() * total;
  for (const [ch, w] of weights) {
    r -= w;
    if (r <= 0) return ch;
  }
  return weights[weights.length - 1][0];
}

export function CharRnnLab({ color, onComplete }: LabProps) {
  const model = useMemo(() => buildModel(3), []);
  const [temp, setTemp] = useState(0.8);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ gens: 0, low: false, high: false });
  const doneRef = useRef(false);

  const outRef = useRef('');
  const tick = useCallback(() => {
    const prev = outRef.current;
    if (prev.length >= 220) {
      setRunning(false);
      return;
    }
    const ctx = prev.slice(-3);
    const row = model.get(ctx);
    const next = prev + (row ? sampleNext(row, temp) : ' ');
    outRef.current = next;
    setOutput(next);
  }, [model, temp]);

  useTicker(tick, running ? 24 : null);

  const generate = () => {
    const seed = CORPUS.slice(0, 3);
    outRef.current = seed;
    setOutput(seed);
    setRunning(true);
    const next = {
      gens: stats.gens + 1,
      low: stats.low || temp < 0.7,
      high: stats.high || temp > 1.1,
    };
    setStats(next);
    if (!doneRef.current && next.gens >= 3 && next.low && next.high) {
      doneRef.current = true;
      onComplete();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <LabSlider
          label="temperature"
          min={0.2}
          max={2.0}
          step={0.05}
          value={temp}
          onChange={setTemp}
          format={(v) => v.toFixed(2)}
          color={color}
        />
        <LabBtn color={color} onClick={generate} active={running}>
          {stats.gens === 0 ? 'generate' : 'regenerate'}
        </LabBtn>
        <Readout color={color}>
          order-3 char model · corpus: shakespeare · {stats.gens} runs
        </Readout>
      </div>
      <div className="min-h-36 rounded-lg border border-line bg-void p-4 font-mono text-[13px] leading-relaxed">
        <span className="text-txt-faint">$ sample --temp {temp.toFixed(2)}</span>
        <br />
        <span style={{ color }}>{output || '· press generate ·'}</span>
        {running && <span className="animate-pulse text-txt">▮</span>}
      </div>
      <p className="font-mono text-[11px] text-txt-faint">
        try temp 0.3 (frozen, repetitive) then temp 1.6 (melting, chaotic). the model is real — a tiny
        n-gram, the char-rnn&apos;s simple cousin.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 02 · bengio-1994 — vanishing/exploding chain
// ---------------------------------------------------------------------------

export function BengioLab({ color, onComplete }: LabProps) {
  const [steps, setSteps] = useState(25);
  const [gain, setGain] = useState(0.95);
  const [regimes, setRegimes] = useState({ vanish: false, explode: false });
  const doneRef = useRef(false);

  const gradientAtInput = Math.pow(gain, steps);
  const grads = useMemo(
    () => Array.from({ length: steps }, (_, t) => Math.pow(gain, steps - t)),
    [gain, steps],
  );

  const updateGain = (v: number) => {
    setGain(v);
    const next = { vanish: regimes.vanish || v < 0.98, explode: regimes.explode || v > 1.02 };
    setRegimes(next);
    if (!doneRef.current && next.vanish && next.explode) {
      doneRef.current = true;
      onComplete();
    }
  };

  const regime =
    gradientAtInput < 1e-6
      ? { label: 'VANISHED — the past hears nothing', cls: 'text-danger' }
      : gradientAtInput > 1e6
        ? { label: 'EXPLODED — the signal is noise', cls: 'text-xp' }
        : { label: 'alive (barely)', cls: 'text-success' };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <LabSlider label="time steps T" min={2} max={50} step={1} value={steps} onChange={setSteps} format={(v) => String(Math.round(v))} color={color} />
        <LabSlider label="per-step gain |J|" min={0.8} max={1.2} step={0.005} value={gain} onChange={updateGain} format={(v) => v.toFixed(3)} color={color} />
      </div>
      <div>
        <div className="mb-1 flex items-baseline justify-between font-mono text-[11px] text-txt-faint">
          <span>|∂L/∂h_t| per step (log scale) — loss is at the right</span>
          <span>h_0 → h_T</span>
        </div>
        <div className="rounded-lg border border-line bg-void p-3">
          <MiniBars values={grads} color={color} log height={80} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 font-mono text-[12px]">
        <Readout color={color}>
          |∂L/∂h_0| = {gain.toFixed(3)}^{steps} = {gradientAtInput.toExponential(2)}
        </Readout>
        <span className={cn('font-bold', regime.cls)}>{regime.label}</span>
      </div>
      <p className="font-mono text-[11px] text-txt-faint">
        drag |J| below 0.98 and above 1.02 — the two regimes from the 1994 paper. {regimes.vanish ? '✓ vanishing seen ' : ''}
        {regimes.explode ? '✓ exploding seen' : ''}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 03 · pascanu-2013 — gradient clipping playground
// ---------------------------------------------------------------------------

interface Pt {
  x: number;
  y: number;
}

function cliffGrad(p: Pt): Pt {
  // f = 0.5x² + 0.025y² + 40·max(0, y-1.5)²  → a valley with a cliff at y = 1.5
  return { x: p.x, y: 0.05 * p.y + (p.y > 1.5 ? 80 * (p.y - 1.5) : 0) };
}

export function PascanuLab({ color, onComplete }: LabProps) {
  const W = 460;
  const H = 280;
  const X = (x: number) => W / 2 + x * 40;
  const Y = (y: number) => H - 30 - y * 40;
  const IX = (px: number) => (px - W / 2) / 40;
  const IY = (py: number) => (H - 30 - py) / 40;

  const [pos, setPos] = useState<Pt>({ x: -4, y: 0.4 });
  const [traj, setTraj] = useState<Pt[]>([{ x: -4, y: 0.4 }]);
  const [clip, setClip] = useState(false);
  const [used, setUsed] = useState({ steps: 0, on: false, off: false });
  const doneRef = useRef(false);

  const LR = 0.9;
  const TAU = 1.0;

  const step = (n: number) => {
    let p = pos;
    const path = [p];
    for (let i = 0; i < n; i++) {
      let g = cliffGrad(p);
      const norm = Math.hypot(g.x, g.y);
      if (clip && norm > TAU) g = { x: (g.x * TAU) / norm, y: (g.y * TAU) / norm };
      p = { x: p.x - LR * g.x, y: p.y - LR * g.y };
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) break;
      path.push(p);
      if (Math.abs(p.x) > 12 || p.y > 15 || p.y < -4) break; // launched
    }
    setPos(p);
    setTraj((t) => [...t, ...path.slice(1)]);
    const next = { steps: used.steps + n, on: used.on || clip, off: used.off || !clip };
    setUsed(next);
    if (!doneRef.current && next.steps >= 6 && next.on && next.off) {
      doneRef.current = true;
      onComplete();
    }
  };

  const reset = (p: Pt) => {
    setPos(p);
    setTraj([p]);
  };

  const loss = (p: Pt) => 0.5 * p.x * p.x + 0.025 * p.y * p.y + 40 * Math.max(0, p.y - 1.5) ** 2;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <LabBtn color={color} active={clip} onClick={() => setClip((c) => !c)}>
          clipping {clip ? 'ON' : 'OFF'}
        </LabBtn>
        <LabBtn color={color} onClick={() => step(1)}>
          step
        </LabBtn>
        <LabBtn color={color} onClick={() => step(10)}>
          step ×10
        </LabBtn>
        <LabBtn color={color} onClick={() => reset({ x: -4, y: 0.4 })}>
          reset
        </LabBtn>
        <span className="font-mono text-[11px] text-txt-faint">click the map to relocate · τ = {TAU.toFixed(1)}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair rounded-lg border border-line bg-void"
        onClick={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const py = ((e.clientY - rect.top) / rect.height) * H;
          reset({ x: IX(px), y: Math.max(-1, IY(py)) });
        }}
      >
        {/* contours */}
        {[1, 2, 3, 5, 8, 12].map((r) => (
          <ellipse key={r} cx={X(0)} cy={Y(0)} rx={r * 40 * 0.62} ry={r * 40 * 1.35} fill="none" stroke="#24243A" strokeWidth={1} />
        ))}
        {/* the cliff */}
        <rect x={0} y={0} width={W} height={Y(1.5)} fill="#FB7185" opacity={0.08} />
        <line x1={0} y1={Y(1.5)} x2={W} y2={Y(1.5)} stroke="#FB7185" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
        <text x={8} y={Y(1.5) - 6} fontSize={10} fill="#FB7185" fontFamily="monospace" opacity={0.8}>
          cliff: gradient ×80 above this line
        </text>
        {/* minimum */}
        <circle cx={X(0)} cy={Y(0)} r={4} fill="#34D399" opacity={0.9} />
        {/* trajectory */}
        <polyline
          points={traj.map((p) => `${X(Math.max(-6, Math.min(6, p.x)))},${Math.max(0, Math.min(H, Y(p.y)))}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0.85}
        />
        <circle cx={X(Math.max(-6, Math.min(6, pos.x)))} cy={Math.max(0, Math.min(H, Y(pos.y)))} r={5} fill={color} stroke="#07070D" strokeWidth={2} />
      </svg>
      <div className="flex flex-wrap gap-3 font-mono text-[11px] text-txt-dim">
        <Readout color={color}>
          θ = ({pos.x.toFixed(2)}, {pos.y.toFixed(2)}) · loss {loss(pos).toExponential(2)}
        </Readout>
        <Readout>steps: {used.steps}</Readout>
        {Math.abs(pos.x) > 10 || pos.y > 14 || pos.y < -3 ? (
          <span className="text-danger">launched into orbit — that was a cliff step. turn clipping on.</span>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 04 · lstm-1997 — gate flow playground
// ---------------------------------------------------------------------------

export function LstmLab({ color, onComplete }: LabProps) {
  const [forget, setForget] = useState(0.9);
  const [input, setInput] = useState(0.5);
  const [outputGate, setOutputGate] = useState(0.8);
  const [curve, setCurve] = useState<number[] | null>(null);
  const [hCurve, setHCurve] = useState<number[] | null>(null);
  const [runs, setRuns] = useState(0);
  const doneRef = useRef(false);

  const run = () => {
    const T = 20;
    const c: number[] = [];
    const h: number[] = [];
    let cv = 0;
    for (let t = 0; t < T; t++) {
      const x = t === 0 ? 7 : (Math.sin(t * 12.9898) * 43758.5453) % 1 * 0.6 - 0.3; // the 7, then noise
      cv = forget * cv + input * x;
      c.push(cv);
      h.push(outputGate * Math.tanh(cv));
    }
    setCurve(c);
    setHCurve(h);
    const next = runs + 1;
    setRuns(next);
    if (!doneRef.current && next >= 2) {
      doneRef.current = true;
      onComplete();
    }
  };

  const retention = curve ? (Math.pow(forget, 15) * 7) / Math.max(1e-9, 7) : 0;
  const maxAbs = curve ? Math.max(1, ...curve.map((v) => Math.abs(v))) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <LabSlider label="forget gate f" min={0} max={1} step={0.05} value={forget} onChange={setForget} color={color} />
        <LabSlider label="input gate i" min={0} max={1} step={0.05} value={input} onChange={setInput} color={color} />
        <LabSlider label="output gate o" min={0} max={1} step={0.05} value={outputGate} onChange={setOutputGate} color={color} />
        <LabBtn color={color} onClick={run} active>
          run 20 steps
        </LabBtn>
      </div>
      <div className="rounded-lg border border-line bg-void p-3">
        {curve ? (
          <svg viewBox="0 0 400 110" className="block w-full">
            <line x1={0} y1={55} x2={400} y2={55} stroke="#24243A" strokeWidth={1} />
            <polyline
              points={curve.map((v, t) => `${(t / 19) * 390 + 5},${55 - (v / maxAbs) * 48}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
            {hCurve && (
              <polyline
                points={hCurve.map((v, t) => `${(t / 19) * 390 + 5},${55 - (v / maxAbs) * 48}`).join(' ')}
                fill="none"
                stroke="#9AA1B8"
                strokeWidth={1.2}
                strokeDasharray="3 3"
              />
            )}
            {curve.map((v, t) => (
              <circle key={t} cx={(t / 19) * 390 + 5} cy={55 - (v / maxAbs) * 48} r={2.4} fill={color} />
            ))}
          </svg>
        ) : (
          <div className="flex h-24 items-center justify-center font-mono text-[12px] text-txt-faint">
            press run — a 7 is written at step 0, then only noise arrives
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 font-mono text-[12px]">
        {curve && (
          <>
            <Readout color={color}>
              cell state at step 15: {curve[15]?.toFixed(2)} (wrote 7.00)
            </Readout>
            <span className={retention > 0.5 ? 'text-success' : 'text-danger'}>
              {retention > 0.5 ? '✓ the 7 survived — f≈1 keeps the highway open' : '✗ the 7 died — low f closes the carousel'}
            </span>
          </>
        )}
        <span className="text-txt-faint">runs: {runs} · solid = cell state c · dashed = output h</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 05 · gru-2014 — lstm → gru diff view
// ---------------------------------------------------------------------------

const LSTM_LINES = [
  'f = σ(W_f · [h, x])   # forget gate',
  'i = σ(W_i · [h, x])   # input gate',
  'o = σ(W_o · [h, x])   # output gate',
  'c = f·c_prev + i·tanh(W_c·[h, x])',
  'h = o·tanh(c)',
];

const GRU_LINES = [
  'z = σ(W_z · [h, x])   # update gate',
  'r = σ(W_r · [h, x])   # reset gate',
  'h̃ = tanh(W_h · [r·h, x])',
  'h = (1−z)·h_prev + z·h̃',
];

export function GruLab({ color, onComplete }: LabProps) {
  const [view, setView] = useState<'lstm' | 'gru' | 'diff'>('diff');
  const [z, setZ] = useState(0.3);
  const progRef = useRef({ views: new Set<string>(['diff']), zMoved: false });
  const doneRef = useRef(false);

  const bump = (v: string, zm: boolean) => {
    const p = progRef.current;
    p.views.add(v);
    p.zMoved = p.zMoved || zm;
    if (!doneRef.current && p.views.size >= 2 && p.zMoved) {
      doneRef.current = true;
      onComplete();
    }
  };

  const oldState = 0.8;
  const candidate = -0.45;
  const blended = (1 - z) * oldState + z * candidate;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['diff', 'lstm', 'gru'] as const).map((v) => (
          <LabBtn
            key={v}
            color={color}
            active={view === v}
            onClick={() => {
              setView(v);
              bump(v, false);
            }}
          >
            {v === 'diff' ? 'diff view' : v}
          </LabBtn>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(view === 'diff' ? (['lstm', 'gru'] as const) : [view]).map((side) => (
          <div key={side} className="rounded-lg border border-line bg-void p-3">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider" style={{ color: side === 'lstm' ? '#9AA1B8' : color }}>
              {side === 'lstm' ? '− lstm.py (3 gates, 2 states)' : '+ gru.py (2 gates, 1 state)'}
            </div>
            <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-txt-dim">
              {(side === 'lstm' ? LSTM_LINES : GRU_LINES).join('\n')}
            </pre>
            <div className="mt-2 font-mono text-[11px] text-txt-faint">
              {side === 'lstm' ? '~4 weight matrices per gate set' : '~25% fewer params · same job'}
            </div>
          </div>
        ))}
      </div>

      {/* blend playground */}
      <div className="rounded-lg border border-line bg-void p-4">
        <div className="mb-3 flex flex-wrap items-end gap-4">
          <LabSlider label="update gate z" min={0} max={1} step={0.05} value={z} onChange={(v) => { setZ(v); bump(view, true); }} color={color} />
          <Readout color={color}>h = (1−z)·old + z·new = {blended.toFixed(2)}</Readout>
        </div>
        <div className="space-y-2 font-mono text-[11px]">
          {[
            { label: `(1−z)·h_old = ${((1 - z) * oldState).toFixed(2)}`, frac: Math.abs((1 - z) * oldState), c: '#9AA1B8' },
            { label: `z·h̃ = ${(z * candidate).toFixed(2)}`, frac: Math.abs(z * candidate), c: color },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-44 shrink-0 text-txt-faint">{row.label}</span>
              <div className="h-3 rounded-sm" style={{ width: `${Math.min(100, row.frac * 100)}%`, backgroundColor: row.c, opacity: 0.8 }} />
            </div>
          ))}
          <div className="pt-1 text-txt-dim">
            z≈0 → remember everything · z≈1 → overwrite. one dial, both ends of the keep/replace trade-off.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 06 · rnn-dropout-2014 — dropout placement
// ---------------------------------------------------------------------------

type DropConfig = 'none' | 'ff' | 'rec' | 'both';

const CURVES: Record<DropConfig, { train: number[]; val: number[]; note: string }> = {
  none: {
    train: [4.5, 3.4, 2.6, 2.0, 1.5, 1.2, 1.0, 0.9],
    val: [4.5, 3.6, 3.1, 2.8, 2.6, 2.5, 2.5, 2.5],
    note: 'no dropout: train keeps falling, val stalls — classic overfit gap.',
  },
  ff: {
    train: [4.5, 3.6, 2.9, 2.4, 2.0, 1.7, 1.5, 1.4],
    val: [4.5, 3.5, 2.9, 2.4, 2.1, 1.9, 1.8, 1.75],
    note: 'feed-forward only (the paper): val drops hard, gap nearly closed. ✓',
  },
  rec: {
    train: [4.5, 4.1, 3.9, 3.7, 3.6, 3.5, 3.4, 3.4],
    val: [4.5, 4.2, 4.0, 3.9, 3.8, 3.8, 3.75, 3.7],
    note: 'recurrent dropout: memory corrupted each step — both curves stuck high.',
  },
  both: {
    train: [4.5, 4.2, 4.05, 3.95, 3.85, 3.8, 3.75, 3.7],
    val: [4.5, 4.3, 4.15, 4.05, 4.0, 3.95, 3.9, 3.85],
    note: 'drop everything: the photocopy-of-a-photocopy regime. worst of all.',
  },
};

export function RnnDropoutLab({ color, onComplete }: LabProps) {
  const [cfg, setCfg] = useState<DropConfig>('none');
  const seenRef = useRef<Set<DropConfig>>(new Set(['none']));
  const doneRef = useRef(false);

  const pick = (c: DropConfig) => {
    setCfg(c);
    const seen = seenRef.current;
    seen.add(c);
    if (!doneRef.current && seen.size >= 2 && seen.has('ff')) {
      doneRef.current = true;
      onComplete();
    }
  };

  const curve = CURVES[cfg];
  const dropped = (kind: 'ff' | 'rec') => cfg === kind || cfg === 'both';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['none', 'no dropout'],
            ['ff', 'feed-forward only ✓'],
            ['rec', 'recurrent only'],
            ['both', 'both'],
          ] as [DropConfig, string][]
        ).map(([c, label]) => (
          <LabBtn key={c} color={color} active={cfg === c} onClick={() => pick(c)}>
            {label}
          </LabBtn>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* network diagram */}
        <svg viewBox="0 0 200 130" className="w-full rounded-lg border border-line bg-void">
          {[0, 1, 2].map((t) => (
            <g key={t}>
              <circle cx={35 + t * 65} cy={100} r={7} fill="none" stroke="#9AA1B8" strokeWidth={1.2} />
              <text x={35 + t * 65} y={118} textAnchor="middle" fontSize={7} fill="#5B6178" fontFamily="monospace">
                x_{t + 1}
              </text>
              {[75, 40].map((y, li) => (
                <rect key={li} x={26 + t * 65} y={y - 9} width={18} height={18} rx={3} fill="rgba(26,26,44,0.9)" stroke={color} strokeWidth={1} />
              ))}
              {/* vertical ff edges */}
              <line x1={35 + t * 65} y1={93} x2={35 + t * 65} y2={84} stroke={dropped('ff') ? '#FB7185' : '#9AA1B8'} strokeWidth={dropped('ff') ? 2 : 1} strokeDasharray={dropped('ff') ? '2 2' : undefined} />
              <line x1={35 + t * 65} y1={66} x2={35 + t * 65} y2={49} stroke={dropped('ff') ? '#FB7185' : '#9AA1B8'} strokeWidth={dropped('ff') ? 2 : 1} strokeDasharray={dropped('ff') ? '2 2' : undefined} />
              {/* recurrent edges */}
              {t < 2 && (
                <>
                  <line x1={44 + t * 65} y1={75} x2={91 + t * 65} y2={75} stroke={dropped('rec') ? '#FB7185' : color} strokeWidth={dropped('rec') ? 2 : 1.4} strokeDasharray={dropped('rec') ? '2 2' : undefined} />
                  <line x1={44 + t * 65} y1={40} x2={91 + t * 65} y2={40} stroke={dropped('rec') ? '#FB7185' : color} strokeWidth={dropped('rec') ? 2 : 1.4} strokeDasharray={dropped('rec') ? '2 2' : undefined} />
                </>
              )}
            </g>
          ))}
          <text x={10} y={14} fontSize={7.5} fill="#5B6178" fontFamily="monospace">
            red dashed = dropped edges · horizontal = memory bus
          </text>
        </svg>

        {/* loss curves */}
        <div className="rounded-lg border border-line bg-void p-3">
          <svg viewBox="0 0 200 100" className="block w-full">
            {[0, 1, 2, 3, 4].map((g) => (
              <line key={g} x1={0} y1={g * 25} x2={200} y2={g * 25} stroke="#1A1A2C" strokeWidth={1} />
            ))}
            <polyline
              points={curve.train.map((v, i) => `${(i / 7) * 190 + 5},${95 - (v / 4.8) * 88}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
            <polyline
              points={curve.val.map((v, i) => `${(i / 7) * 190 + 5},${95 - (v / 4.8) * 88}`).join(' ')}
              fill="none"
              stroke="#FB7185"
              strokeWidth={1.6}
              strokeDasharray="4 3"
            />
          </svg>
          <div className="mt-1 flex gap-4 font-mono text-[10px] text-txt-faint">
            <span style={{ color }}>— train loss</span>
            <span className="text-danger">- - val loss</span>
            <span className="ml-auto">epochs →</span>
          </div>
        </div>
      </div>
      <p className="font-mono text-[12px] text-txt-dim">{curve.note}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 07 · complexodynamics — coffee automaton + complextropy curves
// ---------------------------------------------------------------------------

const CA_N = 48; // grid NxN
const CA_STEPS = 260;

function initCoffee(): Float32Array {
  const g = new Float32Array(CA_N * CA_N);
  for (let y = 0; y < CA_N; y++) {
    for (let x = 0; x < CA_N; x++) {
      const dx = x - CA_N / 2;
      const dy = y - CA_N / 2;
      const inBlob = dx * dx + dy * dy < (CA_N / 4.5) ** 2;
      g[y * CA_N + x] = inBlob ? 1 : 0;
    }
  }
  return g;
}

function coffeeStep(g: Float32Array): Float32Array {
  const next = Float32Array.from(g);
  const swaps = CA_N * CA_N * 2;
  for (let s = 0; s < swaps; s++) {
    const x = (Math.random() * CA_N) | 0;
    const y = (Math.random() * CA_N) | 0;
    const dx = ((Math.random() * 3) | 0) - 1;
    const dy = ((Math.random() * 3) | 0) - 1;
    const nx = Math.min(CA_N - 1, Math.max(0, x + dx));
    const ny = Math.min(CA_N - 1, Math.max(0, y + dy));
    const a = y * CA_N + x;
    const b = ny * CA_N + nx;
    const alpha = 0.5; // partial mix per contact
    const m = (next[a] + next[b]) / 2;
    next[a] = next[a] * (1 - alpha) + m * alpha;
    next[b] = next[b] * (1 - alpha) + m * alpha;
  }
  return next;
}

function metrics(g: Float32Array): { H: number; K: number } {
  // entropy of the value distribution (16 bins), 0..log2(16)
  const bins = new Array<number>(16).fill(0);
  for (const v of g) bins[Math.min(15, Math.floor(v * 16))]++;
  let H = 0;
  for (const b of bins) {
    if (b === 0) continue;
    const p = b / g.length;
    H -= p * Math.log2(p);
  }
  // apparent complexity proxy: interface length (edges with sharp contrast)
  let K = 0;
  for (let y = 0; y < CA_N - 1; y++) {
    for (let x = 0; x < CA_N - 1; x++) {
      const i = y * CA_N + x;
      if (Math.abs(g[i] - g[i + 1]) > 0.4) K++;
      if (Math.abs(g[i] - g[i + CA_N]) > 0.4) K++;
    }
  }
  return { H: H / 4, K: K / (CA_N * CA_N * 1.2) };
}

export function ComplexodynamicsLab({ color, onComplete }: LabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Float32Array>(initCoffee());
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [series, setSeries] = useState<{ H: number[]; K: number[] }>({ H: [], K: [] });
  const doneRef = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(CA_N, CA_N);
    const g = gridRef.current;
    for (let i = 0; i < g.length; i++) {
      const v = Math.round(g[i] * 235) + 10;
      img.data[i * 4] = v * 0.92;
      img.data[i * 4 + 1] = v * 0.82;
      img.data[i * 4 + 2] = v * 0.66;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, []);

  // initial paint
  useEffect(() => {
    draw();
  }, [draw]);

  useTicker(() => {
    gridRef.current = coffeeStep(gridRef.current);
    const m = metrics(gridRef.current);
    const next = t + 1;
    setT(next);
    setSeries((s) => ({ H: [...s.H, m.H], K: [...s.K, m.K] }));
    draw();
    if (next >= CA_STEPS) {
      setRunning(false);
      if (!doneRef.current) {
        doneRef.current = true;
        onComplete();
      }
    }
  }, running && t < CA_STEPS ? 60 : null);

  const reset = () => {
    gridRef.current = initCoffee();
    setT(0);
    setSeries({ H: [], K: [] });
    setRunning(true);
  };

  const maxK = Math.max(0.01, ...series.K);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <LabBtn color={color} onClick={reset} active={running}>
          {t === 0 ? 'pour the cream' : running ? 'mixing…' : 'run again'}
        </LabBtn>
        <Readout color={color}>
          t = {t}/{CA_STEPS}
        </Readout>
        <span className="font-mono text-[11px] text-txt-faint">cells mix with random neighbors (the coffee automaton)</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <canvas
          ref={canvasRef}
          width={CA_N}
          height={CA_N}
          style={{ width: '100%', aspectRatio: '1', imageRendering: 'pixelated' }}
          className="rounded-lg border border-line bg-void"
        />
        <div className="rounded-lg border border-line bg-void p-3">
          <svg viewBox="0 0 200 100" className="block w-full">
            {[0, 1, 2, 3].map((g) => (
              <line key={g} x1={0} y1={g * 33} x2={200} y2={g * 33} stroke="#1A1A2C" strokeWidth={1} />
            ))}
            {series.H.length > 1 && (
              <polyline
                points={series.H.map((v, i) => `${(i / CA_STEPS) * 195 + 2},${96 - v * 90}`).join(' ')}
                fill="none"
                stroke="#9AA1B8"
                strokeWidth={1.6}
              />
            )}
            {series.K.length > 1 && (
              <polyline
                points={series.K.map((v, i) => `${(i / CA_STEPS) * 195 + 2},${96 - (v / maxK) * 88}`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={2}
              />
            )}
          </svg>
          <div className="mt-1 flex flex-wrap gap-3 font-mono text-[10px] text-txt-faint">
            <span className="text-txt-dim">— entropy H(t): only rises</span>
            <span style={{ color }}>— complexity proxy K(t): humps</span>
          </div>
        </div>
      </div>
      <p className="font-mono text-[11px] text-txt-faint">
        the swirl phase (max interfaces, mid-entropy) is where the interesting structure lives — before
        equilibrium makes everything uniformly boring.
      </p>
    </div>
  );
}
