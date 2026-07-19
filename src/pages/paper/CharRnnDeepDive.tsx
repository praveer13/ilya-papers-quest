import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Database, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { BlockMath } from 'react-katex';
import { cn } from '@/lib/utils';

type Mode = 'training' | 'generation';

const TRAIN_CHARS = ['h', 'e', 'l', 'l', 'o'];
const SAMPLE_PATH = ['h', 'e', 'l', 'l', 'o', '\n'];
const TEMPERATURE_LOGITS = [2.4, 1.2, 0.4, -0.2];
const TEMPERATURE_LABELS = ['e', 'a', 'space', 'x'];
const PRIMER_LABELS = ['h', 'e', 'l', 'o'];
const PRIMER_LOGITS = [0.2, 2.0, 0.8, -0.4];

function softmax(logits: number[], temperature: number): number[] {
  const scaled = logits.map((value) => value / temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map((value) => Math.exp(value - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

function charLabel(char: string): string {
  return char === '\n' ? '↵' : char;
}

function VocabularyPrimer({ color }: { color: string }) {
  const probabilities = softmax(PRIMER_LOGITS, 1);
  const targetIndex = 1;
  const loss = -Math.log(probabilities[targetIndex]);
  const outputError = probabilities.map((probability, index) => probability - (index === targetIndex ? 1 : 0));
  const terms = [
    {
      name: 'vector',
      plain: 'A fixed-length list of numbers. The hidden state h is a vector: for example [0.2, −0.7, 0.1].',
    },
    {
      name: 'one-hot',
      plain: 'A way to name one item with numbers. For alphabet [h,e,l,o], h becomes [1,0,0,0] and e becomes [0,1,0,0].',
    },
    {
      name: 'matrix / weights',
      plain: 'A table of adjustable numbers. Multiplying by it makes weighted sums. Training changes these numbers; they are the model’s learned memory rules.',
    },
    {
      name: 'hidden state h',
      plain: 'The RNN’s running memory vector. It is recalculated after each character and carried into the next step.',
    },
    {
      name: 'logits',
      plain: 'Raw preference scores for the possible outputs. They may be negative and do not need to add to 1, so they are not probabilities yet.',
    },
    {
      name: 'softmax',
      plain: 'A conversion from logits to probabilities: make every score positive, then divide by the total so all chances add to 100%.',
    },
    {
      name: 'loss',
      plain: 'One number measuring how wrong the prediction was. High probability on the real answer gives a small loss; low probability gives a large loss.',
    },
    {
      name: 'gradient',
      plain: 'For each weight, the local slope: “if this weight rises a tiny amount, which way and how much does the loss move?”',
    },
    {
      name: 'backpropagation',
      plain: 'An efficient chain-rule procedure that starts at the loss and sends those responsibility signals backward through each calculation.',
    },
    {
      name: 'optimizer',
      plain: 'The update rule. It uses gradients to nudge the weights toward lower loss. SGD and Adam are two optimizer recipes.',
    },
    {
      name: 'tanh',
      plain: '“Hyperbolic tangent,” a smooth function that compresses any number into the range −1 to 1. It is not ordinary trigonometric tan.',
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border bg-surface" style={{ borderColor: `${color}66` }}>
      <div className="border-b border-line bg-surface-2/60 p-4 sm:p-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
          Start here // the vocabulary this page will use
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-txt-dim">
          None of these words names magic. Each is a small numerical operation. Read this once, then the training loop below is
          just these operations connected together.
        </p>
      </div>

      <div className="grid gap-px bg-line sm:grid-cols-2">
        {terms.map((term) => (
          <div key={term.name} className="bg-surface p-3.5">
            <code className="font-mono text-[12px] font-bold" style={{ color }}>{term.name}</code>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-txt-dim">{term.plain}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-line bg-[#0A0A14] p-4 sm:p-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-txt">
          One prediction with actual numbers
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-txt-dim">
          Suppose the model has read <code className="text-txt">h</code> and must predict the next character. The real answer in
          the training text is <code className="text-txt">e</code>.
        </p>
        <div className="mt-4 grid gap-2 lg:grid-cols-4">
          <div className="rounded-lg border border-line bg-void p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-txt-faint">1 · encode input</div>
            <div className="mt-2 font-mono text-[12px] text-txt">alphabet = [h,e,l,o]</div>
            <div className="mt-1 font-mono text-[12px]" style={{ color }}>h → [1,0,0,0]</div>
            <p className="mt-2 text-[11px] leading-relaxed text-txt-faint">That is the one-hot vector for h.</p>
          </div>
          <div className="rounded-lg border border-line bg-void p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-txt-faint">2 · raw output</div>
            <div className="mt-2 font-mono text-[12px] text-txt">logits</div>
            <div className="mt-1 font-mono text-[12px]" style={{ color }}>[0.2, 2.0, 0.8, −0.4]</div>
            <p className="mt-2 text-[11px] leading-relaxed text-txt-faint">e has the highest score, but these are not chances yet.</p>
          </div>
          <div className="rounded-lg border border-line bg-void p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-txt-faint">3 · softmax</div>
            <div className="mt-2 space-y-1.5">
              {probabilities.map((probability, index) => (
                <div key={PRIMER_LABELS[index]} className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="w-3 text-txt">{PRIMER_LABELS[index]}</span>
                  <span className="w-12 text-right text-txt-faint">{(probability * 100).toFixed(1)}%</span>
                  <span className="h-1.5 rounded-full" style={{ width: `${probability * 70}px`, backgroundColor: color }} />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-txt-faint">Now they are probabilities and total 100%.</p>
          </div>
          <div className="rounded-lg border border-line bg-void p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-txt-faint">4 · score answer</div>
            <div className="mt-2 font-mono text-[12px] text-txt">real target e → [0,1,0,0]</div>
            <div className="mt-1 font-mono text-[12px]" style={{ color }}>loss = −ln(0.642) = {loss.toFixed(3)}</div>
            <p className="mt-2 text-[11px] leading-relaxed text-txt-faint">64.2% on the truth is decent, so the penalty is modest.</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-line bg-void p-3 text-[12.5px] leading-relaxed text-txt-dim">
          The first backward signal is simply <code className="text-txt">probabilities − target</code>:{' '}
          <code style={{ color }}>[{outputError.map((value) => value.toFixed(3)).join(', ')}]</code>. The negative entry for e says
          “raise e&apos;s score”; the positive entries say “lower these competing scores.” Backprop carries that concrete correction
          into the earlier calculations and their weights.
        </div>
      </div>
    </div>
  );
}

function TimelineCard({
  input,
  target,
  active,
  complete,
  backward,
  training,
  source,
  color,
}: {
  input: string;
  target: string;
  active: boolean;
  complete: boolean;
  backward: boolean;
  training: boolean;
  source: string;
  color: string;
}) {
  return (
    <motion.div
      animate={{ y: active ? -4 : 0, opacity: complete || active ? 1 : 0.48 }}
      transition={{ duration: 0.2 }}
      className="min-w-[128px] flex-1 rounded-lg border bg-void p-3"
      style={{
        borderColor: active ? color : '#24243A',
        boxShadow: active ? `0 0 18px ${color}22` : 'none',
      }}
    >
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-txt-faint">
        <span>same weights</span>
        <span style={active ? { color } : undefined}>{backward ? '← correction' : 'forward →'}</span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3 font-mono">
        <span className="rounded border border-line bg-surface px-2 py-1 text-lg text-txt">{charLabel(input)}</span>
        <ArrowRight className="size-4 text-txt-faint" />
        <span className="rounded border px-2 py-1 text-lg" style={{ borderColor: color, color }}>
          {charLabel(target)}
        </span>
      </div>
      <div className="mt-3 space-y-1 font-mono text-[10px] leading-relaxed text-txt-faint">
        <div>input: {source}</div>
        <div>new h from input + old h</div>
        <div>
          {backward
            ? 'add blame to shared weights'
            : training
              ? `score target “${charLabel(target)}”`
              : `sampled “${charLabel(target)}” from p`}
        </div>
      </div>
    </motion.div>
  );
}

function LoopTrace({ color }: { color: string }) {
  const [mode, setMode] = useState<Mode>('training');
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const totalFrames = mode === 'training' ? 9 : SAMPLE_PATH.length - 1;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setFrame((current) => (current + 1) % totalFrames);
    }, 1100);
    return () => window.clearInterval(id);
  }, [playing, totalFrames]);

  const chooseMode = (next: Mode) => {
    setMode(next);
    setFrame(0);
    setPlaying(false);
  };

  const trainingPhase = frame < 4 ? 'forward' : frame < 8 ? 'backward' : 'update';
  const activeTrainingStep = frame < 4 ? frame : frame < 8 ? 7 - frame : -1;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2/60 p-3">
        {(['training', 'generation'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => chooseMode(value)}
            className={cn(
              'rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors',
              mode === value ? 'text-txt' : 'border-line text-txt-faint hover:text-txt',
            )}
            style={mode === value ? { borderColor: color, color } : undefined}
          >
            {value === 'training' ? '1 · train on real text' : '2 · generate new text'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-txt-faint hover:text-txt"
          >
            {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
            {playing ? 'pause' : 'play'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFrame(0);
              setPlaying(true);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-txt-faint hover:text-txt"
          >
            <RotateCcw className="size-3" /> replay
          </button>
          <button
            type="button"
            onClick={() => setFrame((current) => (current + 1) % totalFrames)}
            className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-txt-faint hover:text-txt"
          >
            step <ArrowRight className="size-3" />
          </button>
        </div>
      </div>

      <div className="space-y-5 bg-[#0A0A14] p-4 sm:p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mode}-${mode === 'training' ? trainingPhase : 'sample'}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-lg border border-line bg-void px-4 py-3"
          >
            {mode === 'training' ? (
              trainingPhase === 'forward' ? (
                <p className="text-[13.5px] leading-relaxed text-txt-dim">
                  <span className="font-mono font-bold" style={{ color }}>FORWARD PASS:</span>{' '}
                  the dataset supplies both the real input and the real next-character answer. Save each intermediate hidden
                  state for later, and add this position&apos;s wrongness score to the total loss.
                </p>
              ) : trainingPhase === 'backward' ? (
                <p className="text-[13.5px] leading-relaxed text-txt-dim">
                  <span className="font-mono font-bold" style={{ color }}>BACKPROP THROUGH TIME:</span>{' '}
                  walk the saved calculations right-to-left. Work out how every adjustable weight contributed to the errors,
                  including errors that arrived through later hidden states.
                </p>
              ) : (
                <p className="text-[13.5px] leading-relaxed text-txt-dim">
                  <span className="font-mono font-bold" style={{ color }}>ONE UPDATE:</span>{' '}
                  add the suggested weight corrections from every position. An optimizer—the update rule—then nudges all
                  weights toward making the real next characters more probable. Repeat on many text windows.
                </p>
              )
            ) : (
              <p className="text-[13.5px] leading-relaxed text-txt-dim">
                <span className="font-mono font-bold" style={{ color }}>FREE-RUNNING GENERATION:</span>{' '}
                there is no target, loss, backward pass, or weight update. The sampled output becomes the next input. This is
                one possible sample path, not a memorized answer.
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {mode === 'training' ? (
          <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
            {TRAIN_CHARS.slice(0, -1).map((input, index) => (
              <TimelineCard
                key={`${input}-${index}`}
                input={input}
                target={TRAIN_CHARS[index + 1]}
                active={activeTrainingStep === index}
                complete={trainingPhase === 'update' || (trainingPhase === 'forward' ? index < frame : index > activeTrainingStep)}
                backward={trainingPhase === 'backward' && activeTrainingStep === index}
                training
                source="dataset"
                color={color}
              />
            ))}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
            {SAMPLE_PATH.slice(0, -1).map((input, index) => (
              <TimelineCard
                key={`${input}-${index}`}
                input={input}
                target={SAMPLE_PATH[index + 1]}
                active={frame === index}
                complete={index < frame}
                backward={false}
                training={false}
                source={index === 0 ? 'seed/prompt' : 'previous sample'}
                color={color}
              />
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-void p-3">
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
              <Database className="size-3.5" /> teacher forcing
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-txt-dim">
              At position t, input is the real character cₜ and the label is real cₜ₊₁. The model&apos;s guess is scored, but it
              is <em>not</em> used as the next training input.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-void p-3">
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
              <Sparkles className="size-3.5" /> sampling
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-txt-dim">
              At generation step t, input is the previous sampled character. There is no known correct next character, so the
              loop only runs forward.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface/50 p-3 text-[12.5px] leading-relaxed text-txt-dim">
          <strong className="font-mono text-txt">What “replay” means here:</strong> the button merely reruns this animation.
          During real training, an epoch means one pass over the training data, so later epochs revisit text windows with updated
          weights. BPTT does not use a special replay buffer: it saves the forward pass&apos;s intermediate numbers, then traces
          responsibility backward through those recorded calculations.
        </div>
      </div>
    </div>
  );
}

function TanhExplorer({ color }: { color: string }) {
  const [input, setInput] = useState(1.5);
  const output = Math.tanh(input);
  const derivative = 1 - output * output;
  const curve = useMemo(
    () =>
      Array.from({ length: 81 }, (_, index) => {
        const x = -4 + (index / 80) * 8;
        const y = Math.tanh(x);
        return `${(index / 80) * 320},${60 - y * 52}`;
      }).join(' '),
    [],
  );
  const pointX = ((input + 4) / 8) * 320;
  const pointY = 60 - output * 52;

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
            tanh, from the definition—not magic
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-[#0A0A14] px-3 py-2 text-center">
            <BlockMath math={'\\tanh(a)=\\frac{e^a-e^{-a}}{e^a+e^{-a}}'} />
          </div>
          <div className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-txt-dim">
            <p>
              This is <strong className="text-txt">hyperbolic tangent</strong>, not the angle function tan. “Hyperbolic” is a
              historical geometry name; to use the function, only the formula matters. The constant e is about 2.718, and eᵃ
              means raise e to the power a.
            </p>
            <p>
              To see the range, rename <code className="mx-1 text-txt">eᵃ</code> as u and
              <code className="mx-1 text-txt">e⁻ᵃ</code> as v. Both are positive, so the difference
              <code className="mx-1 text-txt">|u−v|</code> is always smaller than the sum
              <code className="mx-1 text-txt">u+v</code>. A smaller number divided by a larger positive number must be between −1
              and 1. At a=0 the numerator is 1−1=0; for huge positive a the ratio approaches +1; for huge negative a it approaches −1.
            </p>
            <p>
              RNNs used tanh because it has no sudden jumps, preserves negative and positive signs, maps zero to zero, and stops
              each hidden-memory number from growing without bound. Near zero it is almost a straight line. Far from zero it
              <strong className="text-txt"> saturates</strong>—the output is pinned near ±1. Its derivative, meaning local slope,
              is <code className="mx-1 text-txt">1−tanh²(a)</code>; that slope approaches zero near ±1, so backward corrections
              struggle to pass through saturated steps.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-[#0A0A14] p-3">
          <svg viewBox="0 0 320 120" className="w-full" role="img" aria-label="Interactive tanh curve from negative one to one">
            <line x1="0" y1="60" x2="320" y2="60" stroke="#24243A" />
            <line x1="160" y1="0" x2="160" y2="120" stroke="#24243A" />
            <line x1="0" y1="8" x2="320" y2="8" stroke="#24243A" strokeDasharray="4 4" />
            <line x1="0" y1="112" x2="320" y2="112" stroke="#24243A" strokeDasharray="4 4" />
            <polyline points={curve} fill="none" stroke={color} strokeWidth="2" />
            <circle cx={pointX} cy={pointY} r="5" fill={color} stroke="#07070D" strokeWidth="2" />
            <text x="4" y="7" fill="#5B6178" fontSize="9" fontFamily="monospace">+1</text>
            <text x="4" y="118" fill="#5B6178" fontSize="9" fontFamily="monospace">−1</text>
          </svg>
          <label className="mt-2 block font-mono text-[10px] uppercase tracking-wider text-txt-faint">
            raw input to tanh, a = {input.toFixed(2)}
            <input
              type="range"
              min={-4}
              max={4}
              step={0.05}
              value={input}
              onChange={(event) => setInput(Number(event.target.value))}
              className="mt-2 block w-full"
              style={{ accentColor: color }}
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="rounded border border-line bg-void p-2 text-txt-faint">
              tanh(a)<span className="mt-1 block text-base" style={{ color }}>{output.toFixed(4)}</span>
            </div>
            <div className="rounded border border-line bg-void p-2 text-txt-faint">
              slope<span className="mt-1 block text-base text-txt">{derivative.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GradientDerivation({ color }: { color: string }) {
  const plainSteps = [
    {
      title: 'Compare prediction with truth',
      body: 'At each character, subtract the one-hot real answer from the predicted probabilities. This says which output scores were too high or too low.',
    },
    {
      title: 'Assign responsibility to the output weights',
      body: 'Ask which connections from hidden state h produced those output scores. Each connection receives a correction proportional to the hidden value that flowed through it.',
    },
    {
      title: 'Send responsibility into hidden state h',
      body: 'The output error is sent backward through the output-weight table. Now we know which hidden-state numbers should have been a little higher or lower.',
    },
    {
      title: 'Undo the local tanh step',
      body: 'Multiply by tanh’s local slope. If tanh was near ±1, its slope is near zero, so very little correction gets through—this is the seed of vanishing gradients.',
    },
    {
      title: 'Continue into the previous timestep',
      body: 'Because h_t depended on h_(t−1), part of the correction travels through the recurrent weights into the prior hidden state. Repeat right-to-left until the start of the text window.',
    },
    {
      title: 'Add corrections, then update once',
      body: 'Every position used the same weight tables, so add all their suggested corrections together. The optimizer then makes one small weight update intended to lower the total loss.',
    },
  ];

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
        How learning moves backward // BPTT in plain English
      </p>
      <p className="mt-3 text-[13.5px] leading-relaxed text-txt-dim">
        “Backpropagation through time” is ordinary backpropagation applied to the RNN&apos;s recorded sequence of calculations.
        It answers one question: <strong className="text-txt">which adjustable weights contributed to the prediction error, and
        in which direction should each move?</strong>
      </p>

      <ol className="mt-4 grid gap-2 sm:grid-cols-2">
        {plainSteps.map((step, index) => (
          <li key={step.title} className="rounded-lg border border-line bg-void p-3">
            <div className="font-mono text-[11px] font-bold" style={{ color }}>
              {index + 1} · {step.title}
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-txt-dim">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-4 rounded-lg border border-line bg-[#0A0A14] p-3 text-[12.5px] leading-relaxed text-txt-dim">
        <strong className="font-mono text-txt">Why start at the end?</strong> A loss is produced after a forward calculation.
        To find causes, follow that calculation&apos;s arrows in reverse: output → hidden state → previous hidden state. “Through
        time” just means the reverse walk crosses the hₜ₋₁ → hₜ connection repeatedly.
      </div>

      <details className="group mt-4 rounded-lg border border-line bg-surface-2/40">
        <summary className="cursor-pointer px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-txt-dim hover:text-txt">
          Optional advanced math · show the equations and every symbol
        </summary>
        <div className="space-y-4 border-t border-line p-4">
          <p className="text-[12.5px] leading-relaxed text-txt-dim">
            You can safely skip this block. It is the compact notation for the six plain-English steps above—not an additional
            mechanism. Read the symbol key first.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ['t', 'Which character position we are processing.'],
              ['δ (delta)', 'An error signal: how the loss changes when an intermediate number changes.'],
              ['G', 'A gradient accumulator: a table where we add suggested changes for every weight.'],
              ['⊙', 'Element-by-element multiply: first number with first, second with second, and so on.'],
              ['ᵀ (transpose)', 'Flip a table’s rows and columns so a forward mapping can carry an error backward.'],
              ['←', 'Replace the value on the left with the newly calculated value on the right.'],
              ['onehot(y)', 'A vector with 1 at the real answer’s position and 0 everywhere else.'],
              ['1−h²', 'The local slope of tanh, calculated separately for every hidden-state coordinate.'],
            ].map(([symbol, meaning]) => (
              <div key={symbol} className="flex gap-2 rounded border border-line bg-void p-2.5">
                <code className="shrink-0 font-mono text-[11px]" style={{ color }}>{symbol}</code>
                <span className="text-[11.5px] leading-relaxed text-txt-dim">{meaning}</span>
              </div>
            ))}
          </div>

          <p className="text-[12.5px] leading-relaxed text-txt-dim">
            V is the number of possible characters and H is the number of hidden-memory slots. A notation such as
            <code className="mx-1 text-txt">Wₓₕ: H × V</code> only states the table size: H rows by V columns.
          </p>

          <div className="space-y-2 overflow-x-auto rounded-lg border border-line bg-[#0A0A14] px-3 py-3 text-center">
            <BlockMath math={'\\delta^z_t=p_t-\\operatorname{onehot}(y_t)'} />
            <p className="text-left text-[11.5px] text-txt-faint">Output error = predicted probabilities − real-answer vector.</p>
            <BlockMath math={'\\delta^h_t=W_{hy}^{\\top}\\delta^z_t+W_{hh}^{\\top}\\delta^a_{t+1}'} />
            <p className="text-left text-[11.5px] text-txt-faint">Hidden error = current output error + error arriving from the next timestep.</p>
            <BlockMath math={'\\delta^a_t=\\delta^h_t\\odot(1-h_t\\odot h_t)'} />
            <p className="text-left text-[11.5px] text-txt-faint">Pass that error through tanh&apos;s local slope.</p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-[#0A0A14] px-3 py-3 text-center">
            <BlockMath
              math={
                '\\begin{aligned}' +
                'G_{hy}&\\leftarrow G_{hy}+\\delta^z_t h_t^{\\top}, & G_{b_y}&\\leftarrow G_{b_y}+\\delta^z_t \\\\' +
                'G_{xh}&\\leftarrow G_{xh}+\\delta^a_t x_t^{\\top}, & G_{b_h}&\\leftarrow G_{b_h}+\\delta^a_t \\\\' +
                'G_{hh}&\\leftarrow G_{hh}+\\delta^a_t h_{t-1}^{\\top}' +
                '\\end{aligned}'
              }
            />
            <p className="text-left text-[11.5px] leading-relaxed text-txt-faint">
              Add this timestep&apos;s suggested changes to the shared weight and bias accumulators. After all timesteps, the
              simplest optimizer update is <code className="text-txt">weight ← weight − learning_rate × G</code>.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}

function TemperatureExplorer({ color }: { color: string }) {
  const [temperature, setTemperature] = useState(1);
  const probabilities = softmax(TEMPERATURE_LOGITS, temperature);

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
            temperature changes selection, not learning
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-txt-dim">
            The output layer produces logits: raw preference scores that may be any number and need not total anything. Softmax
            exponentiates each score, making it positive, then divides by the sum so the results total 1 (100%). Temperature T
            rescales the logits first: T&lt;1 magnifies score gaps; T&gt;1 shrinks them. The learned weights and score ranking do not
            change—only how concentrated the sampling probabilities are.
          </p>
          <div className="mt-3 overflow-x-auto rounded border border-line bg-[#0A0A14] px-2 py-1 text-center text-[12px]">
            <BlockMath math={'p_i=\\frac{e^{z_i/T}}{\\sum_j e^{z_j/T}}'} />
          </div>
        </div>
        <label className="block w-full max-w-[260px] font-mono text-[10px] uppercase tracking-wider text-txt-faint">
          temperature T = {temperature.toFixed(2)}
          <input
            type="range"
            min={0.2}
            max={2.5}
            step={0.05}
            value={temperature}
            onChange={(event) => setTemperature(Number(event.target.value))}
            className="mt-2 block w-full"
            style={{ accentColor: color }}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {probabilities.map((probability, index) => (
          <div key={TEMPERATURE_LABELS[index]} className="rounded-lg border border-line bg-[#0A0A14] p-3">
            <div className="flex items-baseline justify-between font-mono text-[11px]">
              <span className="text-txt">{TEMPERATURE_LABELS[index]}</span>
              <span style={{ color }}>{(probability * 100).toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
              <motion.div
                animate={{ width: `${probability * 100}%` }}
                transition={{ duration: 0.25 }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
            <div className="mt-2 font-mono text-[10px] text-txt-faint">logit {TEMPERATURE_LOGITS[index].toFixed(1)}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-txt-faint">
        argmax always chooses “e” here. sampling draws according to the bars: usually “e”, sometimes a plausible alternative.
        deterministic argmax can fall into cycles; sampling can escape them, but it does not guarantee good text.
      </p>
    </div>
  );
}

export default function CharRnnDeepDive({ color }: { color: string }) {
  return (
    <div className="space-y-6 pt-4">
      <VocabularyPrimer color={color} />

      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
          The goal and scoring rule // what training is trying to achieve
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-txt-dim">
          Given real text <code className="text-txt">c₀,c₁,…,cₙ</code>, adjust one shared set of weights so it assigns high
          probability to every real next character. In the equation below, P means “probability,” the vertical bar means “given,”
          and θ is just a short name for all the model&apos;s adjustable weights. The chance of a whole string can be written as the
          product of its next-character chances:
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-[#0A0A14] px-3 py-2 text-center">
          <BlockMath math={'P_\\theta(c_1,\\ldots,c_n\\mid c_0)=\\prod_{t=0}^{n-1}P_\\theta(c_{t+1}\\mid c_0,\\ldots,c_t)'} />
          <BlockMath math={'\\mathcal L(\\theta)=-\\sum_{t=0}^{n-1}\\log p_t[c_{t+1}]'} />
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-txt-dim">
          The second line defines the total loss. For each real next character, look up the probability the model assigned to it;
          <code className="mx-1 text-txt">−log(probability)</code> turns a confident correct prediction into a small penalty and a
          low-probability correct answer into a large penalty. Add those penalties across the text window. “Negative
          log-likelihood” is simply the standard name for this score.
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-txt-dim">
          Teacher forcing is the efficient way to calculate every prediction using the known real prefix. It does not reveal the
          answer before the prediction: the real next character is used afterward to score the prediction and calculate weight
          corrections.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-void p-3 text-[12.5px] leading-relaxed text-txt-dim">
            <strong className="font-mono text-txt">What h actually does:</strong> because x is one-hot,
            <code className="mx-1 text-txt">Wₓₕx</code> selects a learned column for the current character. W is conventional
            shorthand for a weight matrix.
            <code className="mx-1 text-txt">Wₕₕhₜ₋₁</code> mixes the old memory. Add them, add a bias, apply tanh to each
            coordinate, and that resulting vector becomes hₜ for the next step.
          </div>
          <div className="rounded-lg border border-line bg-void p-3 text-[12.5px] leading-relaxed text-txt-dim">
            <strong className="font-mono text-txt">How meaning appears:</strong> the matrices start as small random numbers, so
            predictions begin near random. If a hidden coordinate helps predict quotes, indentation, or spelling, the loss sends
            gradients that strengthen the paths creating and reading that coordinate. h has no hand-written fields; useful state
            structure is selected by repeated prediction error.
          </div>
        </div>
      </div>

      <LoopTrace color={color} />
      <TanhExplorer color={color} />
      <TemperatureExplorer color={color} />
      <GradientDerivation color={color} />

      <div className="rounded-xl border border-line bg-[#0A0A14] p-4 sm:p-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
          Why this can work at all
        </p>
        <ol className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-txt-dim">
          <li><strong className="font-mono text-txt">1 · A local signal exists.</strong> Every character supplies a label for the previous prefix, so one text window provides many supervised examples.</li>
          <li><strong className="font-mono text-txt">2 · Weights are shared through time.</strong> The same weight tables process every position, so a useful pattern learned anywhere—quotes, indentation, spelling—can apply everywhere.</li>
          <li><strong className="font-mono text-txt">3 · Hidden state makes predictions depend on context.</strong> hₜ is a learned summary of the prefix, allowing the same input character to imply different next characters in different contexts.</li>
          <li><strong className="font-mono text-txt">4 · Every operation has a usable local slope.</strong> Matrix multiplication, tanh, softmax, and the loss can each report how a small input change affects their output. Backprop connects those slopes to assign responsibility to earlier weights.</li>
          <li><strong className="font-mono text-txt">5 · Generation uses the learned conditionals.</strong> Repeated sampling approximately draws a new sequence from the product of next-character distributions the model learned.</li>
        </ol>
        <p className="mt-4 border-t border-line pt-3 font-mono text-[11px] leading-relaxed text-txt-faint">
          limitation: teacher forcing trains on clean real prefixes, while generation eventually sees its own imperfect samples.
          That train/test mismatch is exposure bias; it explains why one early mistake can cascade.
        </p>
      </div>
    </div>
  );
}
