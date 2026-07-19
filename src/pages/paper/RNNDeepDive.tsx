import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, RotateCcw, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/lib/game/format';

/**
 * RNNDeepDive — step-by-step char-RNN algorithm walkthrough.
 *
 * 6 interactive scenes:
 *  1. What is h?           — the hidden state as a living vector
 *  2. The update equation  — h_t = tanh(W·[x_t, h_{t-1}] + b)
 *  3. Teacher forcing      — training mode (real chars in)
 *  4. Autoregressive gen   — generation mode (sampled chars in)
 *  5. Why tanh?            — squashing visualized
 *  6. The full loop        — side-by-side training vs generation
 */

const STEPS = [
  'the hidden state',
  'the update equation',
  'teacher forcing',
  'autoregressive generation',
  'why tanh?',
  'the full picture',
] as const;

type StepIdx = 0 | 1 | 2 | 3 | 4 | 5;

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

function VectorBar({ values, label, highlightIdx }: { values: number[]; label: string; highlightIdx?: number }) {
  return (
    <div className="space-y-1">
      <div className="font-mono text-[10px] text-txt-faint">{label}</div>
      <div className="flex items-end gap-[2px] h-16">
        {values.map((v, i) => (
          <motion.div
            key={i}
            className={cn(
              'w-3 rounded-sm',
              i === highlightIdx ? 'bg-cyan-400' : 'bg-cyan-400/40',
            )}
            initial={{ height: 0 }}
            animate={{ height: `${(Math.abs(v) / 2) * 100}%` }}
            transition={{ duration: 0.4, delay: i * 0.03 }}
          />
        ))}
      </div>
      <div className="flex gap-[2px]">
        {values.map((_, i) => (
          <div key={i} className="w-3 text-center font-mono text-[8px] text-txt-faint">{i}</div>
        ))}
      </div>
    </div>
  );
}

function FormulaLine({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={cn(
        'font-mono text-[14px] md:text-[16px] py-2 px-3 rounded-lg border transition-all',
        highlight
          ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
          : 'border-line bg-[#0A0A14] text-txt-dim',
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* scene 1: what is h?                                                */
/* ------------------------------------------------------------------ */

function SceneHiddenState() {
  const [t, setT] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setT((p) => (p + 1) % 8), 800);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Simulate h evolving as it reads "hello"
  const chars = ['h', 'e', 'l', 'l', 'o', ' ', 'w', 'o'];
  const hValues = [
    [0.3, -0.1, 0.5, -0.2, 0.1],
    [0.4, 0.2, 0.3, -0.4, 0.6],
    [-0.1, 0.5, 0.2, 0.3, -0.2],
    [-0.3, 0.4, 0.1, 0.5, 0.2],
    [0.2, -0.3, 0.4, 0.1, 0.5],
    [0.1, 0.2, -0.1, 0.3, 0.4],
    [-0.2, 0.1, 0.3, -0.1, 0.2],
    [0.3, 0.4, -0.2, 0.1, 0.3],
  ];

  return (
    <div className="space-y-6">
      <p className="text-[15px] leading-relaxed text-txt-dim">
        The hidden state <code className="text-cyan-400">h</code> is not magic. It is a{' '}
        <strong className="text-txt">fixed-size vector of numbers</strong> — typically 128, 256, or 512
        values between -1 and 1. Think of it as the model&apos;s only scratchpad. At each step, it
        reads one character, updates this vector, and uses it to predict the next character.
      </p>

      <div className="rounded-lg border border-line bg-[#0A0A14] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] text-txt-faint">reading: &quot;{chars.slice(0, t + 1).join('')}&quot;</span>
          <span className="font-mono text-[12px] text-cyan-400">step {t + 1}/8</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center font-mono text-xl text-cyan-400">
            {chars[t]}
          </div>
          <ArrowRight className="size-4 text-txt-faint" />
          <VectorBar values={hValues[t]} label="h (5-dim for demo)" />
        </div>

        <p className="text-[13px] text-txt-faint">
          Watch: each new character nudges the values in h. The model must compress everything it has
          seen so far into these few numbers. That fixed size is why long-range dependencies get
          forgotten — there is only so much room.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* scene 2: the update equation                                       */
/* ------------------------------------------------------------------ */

function SceneEquation() {
  const [phase, setPhase] = useState(0);
  const phases = ['input', 'recurrent', 'sum', 'tanh', 'output'];

  return (
    <div className="space-y-6">
      <p className="text-[15px] leading-relaxed text-txt-dim">
        Here is the exact computation at every time step. No abstraction. No hand-waving. Just
        matrix multiplication, addition, and a squashing function.
      </p>

      <div className="space-y-2">
        <FormulaLine highlight={phase === 0}>
          <span className="text-txt-faint">1. encode input:</span>{' '}
          <code className="text-cyan-400">x_t</code> = one-hot(char) → vector of length{' '}
          <code className="text-violet-400">INPUT_SIZE</code>
        </FormulaLine>
        <FormulaLine highlight={phase === 1}>
          <span className="text-txt-faint">2. recurrent path:</span>{' '}
          <code className="text-cyan-400">W_hh</code> @ <code className="text-cyan-400">h_{'{t-1}'}</code> → how memory transforms itself
        </FormulaLine>
        <FormulaLine highlight={phase === 1}>
          <span className="text-txt-faint">3. input path:</span>{' '}
          <code className="text-cyan-400">W_xh</code> @ <code className="text-cyan-400">x_t</code> → how the new character writes into memory
        </FormulaLine>
        <FormulaLine highlight={phase === 2}>
          <span className="text-txt-faint">4. sum + bias:</span>{' '}
          <code className="text-cyan-400">z</code> = (recurrent + input) + <code className="text-cyan-400">b</code>
        </FormulaLine>
        <FormulaLine highlight={phase === 3}>
          <span className="text-txt-faint">5. squash:</span>{' '}
          <code className="text-cyan-400">h_t</code> = tanh(<code className="text-cyan-400">z</code>) → clamp to (-1, 1)
        </FormulaLine>
        <FormulaLine highlight={phase === 4}>
          <span className="text-txt-faint">6. predict:</span>{' '}
          <code className="text-cyan-400">logits</code> = <code className="text-cyan-400">W_hy</code> @ <code className="text-cyan-400">h_t</code> → scores over alphabet
        </FormulaLine>
      </div>

      <div className="flex gap-2">
        {phases.map((p, i) => (
          <button
            key={p}
            onClick={() => setPhase(i)}
            className={cn(
              'px-3 py-1.5 rounded-md font-mono text-[11px] transition-all',
              phase === i
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-surface text-txt-faint border border-line hover:border-txt-faint',
            )}
          >
            {i + 1}. {p}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-surface p-4">
        <p className="text-[13px] text-txt-dim">
          <strong className="text-txt">Why this order?</strong> The recurrent path (step 2) lets the
          model &quot;remember&quot; by carrying forward the previous state. The input path (step 3) lets it
          &quot;see&quot; the new character. The sum (step 4) blends them. tanh (step 5) keeps values bounded so
          they don&apos;t explode. The output (step 6) converts memory into predictions.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* scene 3: teacher forcing                                           */
/* ------------------------------------------------------------------ */

function SceneTeacherForcing() {
  const [pos, setPos] = useState(0);
  const text = 'hello';
  const targets = 'ello<';

  return (
    <div className="space-y-6">
      <p className="text-[15px] leading-relaxed text-txt-dim">
        During <strong className="text-txt">training</strong>, the model never eats its own guesses.
        You feed it the <em>real</em> text and ask it to predict the next character at every
        position. This is called{' '}
        <strong className="text-cyan-400">teacher forcing</strong>.
      </p>

      <div className="rounded-lg border border-line bg-[#0A0A14] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] text-success">mode: TRAINING</span>
          <div className="flex gap-1">
            {text.split('').map((_, i) => (
              <button
                key={i}
                onClick={() => setPos(i)}
                className={cn(
                  'w-6 h-6 rounded font-mono text-[10px]',
                  i === pos ? 'bg-success/20 text-success' : 'bg-surface text-txt-faint',
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-txt-faint w-16">input</span>
            <div className="flex gap-1">
              {text.split('').map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-8 h-10 rounded flex items-center justify-center font-mono text-lg border',
                    i === pos
                      ? 'border-success bg-success/10 text-success'
                      : i < pos
                        ? 'border-line bg-surface text-txt-faint'
                        : 'border-line/50 bg-surface/50 text-txt-faint/50',
                  )}
                >
                  {c}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-txt-faint w-16">target</span>
            <div className="flex gap-1">
              {targets.split('').map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-8 h-10 rounded flex items-center justify-center font-mono text-lg border',
                    i === pos
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                      : i < pos
                        ? 'border-line bg-surface text-txt-faint'
                        : 'border-line/50 bg-surface/50 text-txt-faint/50',
                  )}
                >
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-md bg-surface p-3 font-mono text-[12px]">
          <span className="text-txt-faint">step {pos + 1}: </span>
          <span className="text-txt">&quot;{text.slice(0, pos + 1)}&quot;</span>
          <span className="text-txt-faint"> → predict </span>
          <span className="text-cyan-400">&quot;{targets[pos]}&quot;</span>
          <span className="text-txt-faint"> → loss = cross_entropy(pred, </span>
          <span className="text-cyan-400">&quot;{targets[pos]}&quot;</span>
          <span className="text-txt-faint">)</span>
        </div>
      </div>

      <p className="text-[13px] text-txt-faint">
        <strong className="text-txt">Why this works:</strong> Teacher forcing turns sequence generation
        into ordinary supervised classification. At every position, the task is &quot;given this prefix,
        predict the next character.&quot; The model learns patterns from real data, not from its own
        hallucinations.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* scene 4: autoregressive generation                                 */
/* ------------------------------------------------------------------ */

function SceneGeneration() {
  const [generated, setGenerated] = useState<string[]>(['h']);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const chars = 'abcdefghijklmnopqrstuvwxyz ';
  const generateNext = () => {
    setGenerated((prev) => {
      if (prev.length >= 20) return prev;
      // Deterministic "fake" generation for demo
      const nextChar = chars[Math.floor(Math.random() * chars.length)];
      return [...prev, nextChar];
    });
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(generateNext, 400);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  return (
    <div className="space-y-6">
      <p className="text-[15px] leading-relaxed text-txt-dim">
        During <strong className="text-txt">generation</strong>, there is no target string. The model
        must <em>dream</em> one character at a time, feeding each prediction back as the next input.
        This is the <strong className="text-violet-400">autoregressive loop</strong>.
      </p>

      <div className="rounded-lg border border-line bg-[#0A0A14] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] text-violet-400">mode: GENERATION</span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-400 font-mono text-[11px] hover:bg-violet-500/20 transition-colors"
            >
              {isRunning ? <Pause className="size-3" /> : <Play className="size-3" />}
              {isRunning ? 'pause' : 'generate'}
            </button>
            <button
              onClick={() => { setIsRunning(false); setGenerated(['h']); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-line text-txt-faint font-mono text-[11px] hover:border-txt-faint transition-colors"
            >
              <RotateCcw className="size-3" />
              reset
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {generated.map((c, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                'w-8 h-10 rounded flex items-center justify-center font-mono text-lg border',
                i === generated.length - 1
                  ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                  : 'border-line bg-surface text-txt-dim',
              )}
            >
              {c}
            </motion.div>
          ))}
          <div className="w-8 h-10 rounded flex items-center justify-center border border-dashed border-txt-faint/30">
            <span className="text-txt-faint/30">?</span>
          </div>
        </div>

        <div className="rounded-md bg-surface p-3 space-y-1 font-mono text-[12px]">
          <div className="text-txt-faint">loop:</div>
          <div className="text-txt">
            1. h + &quot;{generated[generated.length - 1]}&quot; → predict distribution
          </div>
          <div className="text-txt">
            2. sample from distribution (not argmax!)
          </div>
          <div className="text-cyan-400">
            3. feed sample back as next input → repeat
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
        <p className="text-[13px] text-txt-dim">
          <strong className="text-txt">Why sampling matters:</strong> Always picking the highest
          probability (argmax) collapses into repetitive loops (&quot;the the the&quot;). Sampling introduces
          controlled randomness — the model explores the distribution rather than greedily exploiting
          it.
        </p>
        <p className="text-[13px] text-txt-dim">
          <strong className="text-txt">Temperature:</strong> Dividing logits by T before softmax
          controls how flat the distribution is. Low T = conservative. High T = creative/chaotic.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* scene 5: why tanh?                                                 */
/* ------------------------------------------------------------------ */

function SceneTanh() {
  const [inputVal, setInputVal] = useState(0);

  const tanh = (x: number) => Math.tanh(x);
  const points = Array.from({ length: 41 }, (_, i) => {
    const x = (i - 20) / 4;
    return { x, y: tanh(x) };
  });

  return (
    <div className="space-y-6">
      <p className="text-[15px] leading-relaxed text-txt-dim">
        <code className="text-cyan-400">tanh</code> is not mystical. It is a squashing function that
        takes any real number and maps it to the range <strong className="text-txt">(-1, 1)</strong>.
        Without it, values would explode or vanish as they get multiplied through time.
      </p>

      <div className="rounded-lg border border-line bg-[#0A0A14] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] text-txt-faint">tanh(x) = (e^x - e^-x) / (e^x + e^-x)</span>
        </div>

        <svg viewBox="-6 -1.5 12 3" className="w-full h-48">
          {/* grid */}
          <line x1="-5" y1="0" x2="5" y2="0" stroke="#334155" strokeWidth="0.02" />
          <line x1="0" y1="-1.2" x2="0" y2="1.2" stroke="#334155" strokeWidth="0.02" />
          <text x="4.8" y="0.15" fill="#64748B" fontSize="0.15" textAnchor="end">x</text>
          <text x="0.1" y="-1.1" fill="#64748B" fontSize="0.15">tanh(x)</text>

          {/* tanh curve */}
          <polyline
            fill="none"
            stroke="#22D3EE"
            strokeWidth="0.04"
            points={points.map((p) => `${p.x},${-p.y}`).join(' ')}
          />

          {/* asymptotes */}
          <line x1="-5" y1="-1" x2="5" y2="-1" stroke="#334155" strokeWidth="0.02" strokeDasharray="0.1 0.1" />
          <line x1="-5" y1="1" x2="5" y2="1" stroke="#334155" strokeWidth="0.02" strokeDasharray="0.1 0.1" />

          {/* current point */}
          <circle
            cx={inputVal}
            cy={-tanh(inputVal)}
            r="0.08"
            fill="#A78BFA"
            stroke="#A78BFA"
          />
          <line x1={inputVal} y1="0" x2={inputVal} y2={-tanh(inputVal)} stroke="#A78BFA" strokeWidth="0.02" strokeDasharray="0.05 0.05" />
          <line x1="0" y1={-tanh(inputVal)} x2={inputVal} y2={-tanh(inputVal)} stroke="#A78BFA" strokeWidth="0.02" strokeDasharray="0.05 0.05" />
        </svg>

        <div className="space-y-2">
          <label className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-txt-faint w-12">input</span>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={inputVal}
              onChange={(e) => setInputVal(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="font-mono text-[12px] text-cyan-400 w-12 text-right">{inputVal.toFixed(1)}</span>
          </label>
          <label className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-txt-faint w-12">tanh</span>
            <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full bg-violet-400 transition-all"
                style={{ width: `${((tanh(inputVal) + 1) / 2) * 100}%` }}
              />
            </div>
            <span className="font-mono text-[12px] text-violet-400 w-12 text-right">{tanh(inputVal).toFixed(3)}</span>
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-4">
          <h4 className="font-mono text-[12px] text-danger mb-2">without tanh</h4>
          <p className="text-[13px] text-txt-dim">
            Values grow unbounded: 0.5 → 1.2 → 3.1 → 8.7 → <strong className="text-danger">overflow</strong>.
            After a few time steps, h becomes NaN. Training collapses.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <h4 className="font-mono text-[12px] text-success mb-2">with tanh</h4>
          <p className="text-[13px] text-txt-dim">
            Values stay in (-1, 1): 0.5 → 0.76 → 0.91 → <strong className="text-success">0.96</strong>.
            The state remains stable no matter how many steps you unroll.
          </p>
        </div>
      </div>

      <p className="text-[13px] text-txt-faint">
        <strong className="text-txt">Why (-1, 1) specifically?</strong> Symmetric around zero means
        positive and negative signals are treated equally. The gradients flow better than with sigmoid
        (0, 1), which is always positive and can cause zig-zag updates.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* scene 6: the full picture                                          */
/* ------------------------------------------------------------------ */

function SceneFullPicture() {
  return (
    <div className="space-y-6">
      <p className="text-[15px] leading-relaxed text-txt-dim">
        Here is the complete picture. Two modes, one architecture. The only difference is what feeds
        in at each step.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* training */}
        <div className="rounded-lg border border-success/30 bg-success/5 p-5 space-y-4">
          <div className="font-mono text-[12px] text-success uppercase tracking-wider">training</div>

          <div className="space-y-2 font-mono text-[12px]">
            <div className="text-txt">input = real text</div>
            <div className="text-txt">target = next char</div>
            <div className="text-txt-faint">loss = cross_entropy(pred, target)</div>
          </div>

          <div className="space-y-1">
            {['h → e', 'e → l', 'l → l', 'l → o'].map((pair, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px]">
                <span className="text-txt-faint">{i + 1}.</span>
                <span className="text-txt">&quot;{pair.split(' → ')[0]}&quot;</span>
                <ArrowRight className="size-3 text-success" />
                <span className="text-success">&quot;{pair.split(' → ')[1]}&quot;</span>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-txt-faint">
            Teacher forcing: the model learns from ground truth. No compounding errors.
          </p>
        </div>

        {/* generation */}
        <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-5 space-y-4">
          <div className="font-mono text-[12px] text-violet-400 uppercase tracking-wider">generation</div>

          <div className="space-y-2 font-mono text-[12px]">
            <div className="text-txt">input = seed + previous output</div>
            <div className="text-txt">target = none</div>
            <div className="text-txt-faint">stop when done</div>
          </div>

          <div className="space-y-1">
            {['h → e', 'e → l', 'l → l', 'l → o'].map((pair, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px]">
                <span className="text-txt-faint">{i + 1}.</span>
                <span className="text-txt">&quot;{pair.split(' → ')[0]}&quot;</span>
                <ArrowRight className="size-3 text-violet-400" />
                <span className="text-violet-400">&quot;{pair.split(' → ')[1]}&quot;</span>
                <span className="text-[10px] text-txt-faint">(sampled)</span>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-txt-faint">
            Autoregressive: the model dreams by feeding on its own dreams.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface p-4">
        <p className="text-[13px] text-txt-dim">
          <strong className="text-txt">The insight:</strong> Both modes use the exact same forward
          pass. The only difference is the source of{' '}
          <code className="text-cyan-400">x_t</code>. During training, it is ground truth. During
          generation, it is the model&apos;s own sample. This is why char-RNN (and modern LLMs) can
          be trained with simple cross-entropy loss, yet generate creative text.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* main component                                                     */
/* ------------------------------------------------------------------ */

const SCENE_COMPONENTS = [
  SceneHiddenState,
  SceneEquation,
  SceneTeacherForcing,
  SceneGeneration,
  SceneTanh,
  SceneFullPicture,
];

export default function RNNDeepDive({ color }: { color: string }) {
  const [step, setStep] = useState<StepIdx>(0);
  const reduced = useReducedMotion();

  const Scene = SCENE_COMPONENTS[step];

  return (
    <div className="space-y-6">
      {/* stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i as StepIdx)}
            className={cn(
              'px-3 py-1.5 rounded-md font-mono text-[11px] whitespace-nowrap transition-all',
              step === i
                ? 'text-txt border'
                : 'text-txt-faint hover:text-txt-dim',
            )}
            style={step === i ? { borderColor: color, backgroundColor: `${color}15` } : undefined}
          >
            {String(i + 1).padStart(2, '0')}. {label}
          </button>
        ))}
      </div>

      {/* scene */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={reduced ? undefined : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          <Scene />
        </motion.div>
      </AnimatePresence>

      {/* nav */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1) as StepIdx)}
          disabled={step === 0}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[11px] transition-all',
            step === 0
              ? 'text-txt-faint/30 cursor-not-allowed'
              : 'text-txt-faint hover:text-txt border border-line hover:border-txt-faint',
          )}
        >
          <ArrowLeft className="size-3" />
          prev
        </button>
        <span className="font-mono text-[11px] text-txt-faint">
          {step + 1} / {STEPS.length}
        </span>
        <button
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1) as StepIdx)}
          disabled={step === STEPS.length - 1}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[11px] transition-all',
            step === STEPS.length - 1
              ? 'text-txt-faint/30 cursor-not-allowed'
              : 'text-txt-faint hover:text-txt border border-line hover:border-txt-faint',
          )}
        >
          next
          <ArrowRight className="size-3" />
        </button>
      </div>
    </div>
  );
}
