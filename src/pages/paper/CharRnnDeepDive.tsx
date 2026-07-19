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
        <span>same RNN θ</span>
        <span style={active ? { color } : undefined}>{backward ? '← grad' : 'forward →'}</span>
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
        <div>h ← tanh(Wₓₕx + Wₕₕh)</div>
        <div>
          {backward
            ? 'accumulate ∂L/∂θ'
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
                  the dataset supplies both the real input and the next-character label. Cache every hidden state and add
                  <code className="mx-1 text-txt">−log p(target)</code> to the loss.
                </p>
              ) : trainingPhase === 'backward' ? (
                <p className="text-[13.5px] leading-relaxed text-txt-dim">
                  <span className="font-mono font-bold" style={{ color }}>BACKPROP THROUGH TIME:</span>{' '}
                  walk the cached computation right-to-left. Each step contributes gradients to the same shared matrices;
                  future losses also flow through the recurrent connection.
                </p>
              ) : (
                <p className="text-[13.5px] leading-relaxed text-txt-dim">
                  <span className="font-mono font-bold" style={{ color }}>ONE UPDATE:</span>{' '}
                  sum the gradients from every position, then SGD/Adam nudges θ in the direction that makes all real next
                  characters more probable. Repeat on many text windows.
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
          During real training, an epoch revisits text windows with updated weights. BPTT does not use a replay buffer: it keeps
          the forward pass&apos;s intermediate states, then applies the chain rule backward through that recorded computation.
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
            <BlockMath math={'\\tanh(a)=\\frac{e^a-e^{-a}}{e^a+e^{-a}}=2\\,\\sigma(2a)-1'} />
          </div>
          <div className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-txt-dim">
            <p>
              This is <strong className="text-txt">hyperbolic tangent</strong>, not the angle function tan. Let
              <code className="mx-1 text-txt">u=eᵃ</code> and <code className="mx-1 text-txt">v=e⁻ᵃ</code>. Both are positive,
              so <code className="mx-1 text-txt">|u−v| &lt; u+v</code>. Therefore their ratio must stay strictly between −1 and 1.
            </p>
            <p>
              RNNs used it because it is smooth, signed, zero-centered, and bounds every hidden-state coordinate. Near zero it is
              almost linear, so small signals pass through. Its cost is saturation: the derivative
              <code className="mx-1 text-txt">1−tanh²(a)</code> approaches zero near ±1, which helps cause vanishing gradients.
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
            raw pre-activation a = {input.toFixed(2)}
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
  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
        The exact backward pass // BPTT
      </p>
      <p className="mt-3 text-[13.5px] leading-relaxed text-txt-dim">
        Let V be alphabet size and H hidden size. Then x∈ℝⱽ, h∈ℝᴴ, Wₓₕ∈ℝᴴˣⱽ,
        Wₕₕ∈ℝᴴˣᴴ, and Wₕᵧ∈ℝⱽˣᴴ. Start at the final position and run these equations for
        <code className="mx-1 text-txt">t = L−1 … 0</code>:
      </p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-[#0A0A14] px-3 py-2 text-center">
        <BlockMath
          math={
            '\\begin{aligned}' +
            '\\delta^z_t &= p_t-\\operatorname{onehot}(y_t) \\\\' +
            '\\delta^h_t &= W_{hy}^{\\top}\\delta^z_t + W_{hh}^{\\top}\\delta^a_{t+1} \\\\' +
            '\\delta^a_t &= \\delta^h_t \\odot (1-h_t\\odot h_t) \\\\' +
            '\\nabla W_{hy} &\\mathrel{+}= \\delta^z_t h_t^{\\top} \\\\' +
            '\\nabla W_{xh} &\\mathrel{+}= \\delta^a_t x_t^{\\top} \\\\' +
            '\\nabla W_{hh} &\\mathrel{+}= \\delta^a_t h_{t-1}^{\\top}' +
            '\\end{aligned}'
          }
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-void p-3 text-[12.5px] leading-relaxed text-txt-dim">
          <strong className="font-mono text-txt">Where the first line comes from:</strong> softmax plus cross-entropy has the
          clean derivative <code className="text-txt">prediction − target</code>. An over-predicted character gets a positive
          gradient; the real character gets a negative one, so gradient descent raises its relative logit.
        </div>
        <div className="rounded-lg border border-line bg-void p-3 text-[12.5px] leading-relaxed text-txt-dim">
          <strong className="font-mono text-txt">Where “through time” appears:</strong> δʰₜ contains both the current output
          error and <code className="text-txt">Wₕₕᵀδᵃₜ₊₁</code>, the error arriving from the future. That recursive term is the
          chain rule crossing the recurrent edge.
        </div>
      </div>
      <p className="mt-3 border-t border-line pt-3 font-mono text-[11px] leading-relaxed text-txt-faint">
        “+=” matters: every timestep used the same matrices, so every timestep contributes to their gradients. After the loop,
        an optimizer applies θ ← θ − η∇θL (or Adam&apos;s scaled version). That weight update is the actual learning.
      </p>
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
            The output layer produces raw scores called logits. Divide those scores by T, then softmax. T&lt;1 magnifies score
            gaps; T&gt;1 shrinks them. The weights and ranking do not change—only how concentrated the sampling probabilities are.
          </p>
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
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
          Exact objective // what training is trying to achieve
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-txt-dim">
          Given real text <code className="text-txt">c₀,c₁,…,cₙ</code>, learn one shared set of weights θ that assigns high
          probability to every real next character. The chain rule of probability turns the probability of the whole string into
          next-character terms:
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-[#0A0A14] px-3 py-2 text-center">
          <BlockMath math={'P_\\theta(c_1,\\ldots,c_n\\mid c_0)=\\prod_{t=0}^{n-1}P_\\theta(c_{t+1}\\mid c_0,\\ldots,c_t)'} />
          <BlockMath math={'\\mathcal L(\\theta)=-\\sum_{t=0}^{n-1}\\log p_t[c_{t+1}]'} />
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-txt-dim">
          Minimizing this negative log-likelihood is equivalent to maximizing the probability assigned to the training text.
          Teacher forcing is simply the efficient way to evaluate every factor above using the known real prefix. It is not a
          separate learning rule and it does not reveal the answer before the prediction—the target is used only to score the
          prediction and compute a gradient.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-void p-3 text-[12.5px] leading-relaxed text-txt-dim">
            <strong className="font-mono text-txt">What h actually does:</strong> because x is one-hot,
            <code className="mx-1 text-txt">Wₓₕx</code> selects a learned column for the current character.
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
      <GradientDerivation color={color} />
      <TanhExplorer color={color} />
      <TemperatureExplorer color={color} />

      <div className="rounded-xl border border-line bg-[#0A0A14] p-4 sm:p-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
          Why this can work at all
        </p>
        <ol className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-txt-dim">
          <li><strong className="font-mono text-txt">1 · A local signal exists.</strong> Every character supplies a label for the previous prefix, so one text window provides many supervised examples.</li>
          <li><strong className="font-mono text-txt">2 · Parameters are shared through time.</strong> The same matrices process every position, so a useful pattern learned anywhere—quotes, indentation, spelling—can apply everywhere.</li>
          <li><strong className="font-mono text-txt">3 · The hidden state makes the prediction conditional.</strong> hₜ is a learned summary of the prefix, allowing the same input character to imply different next characters in different contexts.</li>
          <li><strong className="font-mono text-txt">4 · The computation is differentiable.</strong> tanh, matrix multiplication, softmax, and cross-entropy all have derivatives, so BPTT can assign credit to weights that influenced later predictions.</li>
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
