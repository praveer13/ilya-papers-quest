/**
 * Boss data — the 5 end-of-track guardians (boss.md).
 */
import type { SaveFile, TrackId } from '@/lib/game/types';
import { papersByTrack } from '@/lib/game/papers';

export type BossQuestionType = 'mcq' | 'tf' | 'order' | 'fill';

interface QBase {
  id: string;
  paper: string; // paper slug this question belongs to
  why: string; // explanation shown on a miss
}

export interface McqQ extends QBase {
  type: 'mcq';
  prompt: string;
  options: [string, string, string, string];
  answer: number; // index into options
}

export interface TfQ extends QBase {
  type: 'tf';
  prompt: string;
  answer: boolean;
}

export interface OrderQ extends QBase {
  type: 'order';
  prompt: string;
  items: [string, string, string, string]; // stored in CORRECT order
}

export interface FillQ extends QBase {
  type: 'fill';
  before: string; // prompt text before the blank
  after: string; // prompt text after the blank
  bank: [string, string, string, string]; // includes the answer
  answer: string;
}

export type BossQuestion = McqQ | TfQ | OrderQ | FillQ;

export interface BossDef {
  trackId: TrackId;
  slug: string; // e.g. ECHO-7
  name: string; // e.g. ECHO-7, THE VANISHING
  tagline: string; // one-line combat flavor
  emblem: string; // track emblem, danger-tinted via CSS filter
  hueRotate: number; // degrees: retint track hue to danger red
  taunts: [string, string]; // intro, phase-2
}

export const BOSS_ROUND_SIZE = 10;
export const BOSS_HEARTS_MAX = 3;
export const BOSS_TIME_SEC = 45;
export const BOSS_TIME_SEC_P2 = 35;
export const BOSS_HP_CHUNKS = 10;
/** per-correct XP on replay fights is capped (anti grind exploit, boss.md) */
export const REPLAY_XP_CAP = 150;

export const BOSSES: Record<TrackId, BossDef> = {
  t1: {
    trackId: 't1',
    slug: 'ECHO-7',
    name: 'ECHO-7, THE VANISHING',
    tagline: 'the demon of dying gradients',
    emblem: '/emblem-foundations.png',
    hueRotate: 164,
    taunts: [
      'your gradients will die before they reach me.',
      'impressive. phase two — watch your signal decay.',
    ],
  },
  t2: {
    trackId: 't2',
    slug: 'ATTENTION PRIME',
    name: 'ATTENTION PRIME',
    tagline: 'the bottleneck between encoder and decoder',
    emblem: '/emblem-attention.png',
    hueRotate: 93,
    taunts: [
      'every token attends to me. you will attend to nothing else.',
      'softmax over my wrath. your attention: zeroed.',
    ],
  },
  t3: {
    trackId: 't3',
    slug: 'MAXPOOL HYDRA',
    name: 'MAXPOOL HYDRA',
    tagline: 'the devourer of spatial resolution',
    emblem: '/emblem-vision.png',
    hueRotate: 212,
    taunts: [
      'cut off one head of features, i downsample two more.',
      'you prune one head; two more feature maps rise.',
    ],
  },
  t4: {
    trackId: 't4',
    slug: 'OVERFIT',
    name: 'OVERFIT',
    tagline: 'the demon that memorized your training set',
    emblem: '/emblem-optimization.png',
    hueRotate: -35,
    taunts: [
      'i have memorized your training set. all of it.',
      'your validation loss just diverged. feel it.',
    ],
  },
  t5: {
    trackId: 't5',
    slug: 'THE SCALING COLOSSUS',
    name: 'THE SCALING COLOSSUS',
    tagline: 'the monster that grows by power laws',
    emblem: '/emblem-scaling.png',
    hueRotate: 21,
    taunts: [
      'i grow by power laws. you do not.',
      'i double my parameters. you remain the same size.',
    ],
  },
};

// ---------------------------------------------------------------------------
// TRACK 1 — Foundations & Recurrent Nets
// ---------------------------------------------------------------------------

const T1_POOL: BossQuestion[] = [
  // — char-rnn (Karpathy 2015)
  {
    id: 't1-charrnn-1', paper: 'char-rnn', type: 'mcq',
    prompt: "Karpathy's char-rnn learns to generate text one ___ at a time, with no explicit notion of words or grammar.",
    options: ['character', 'word', 'sentence', 'paragraph'],
    answer: 0,
    why: 'the model is trained purely on next-character prediction; words and syntax emerge implicitly from the data.',
  },
  {
    id: 't1-charrnn-2', paper: 'char-rnn', type: 'mcq',
    prompt: 'When sampling from a trained char-rnn, lowering the temperature…',
    options: [
      'makes the output more conservative and repetitive',
      'makes the output more random and diverse',
      'speeds up training',
      'increases the effective learning rate',
    ],
    answer: 0,
    why: 'temperature divides the logits before softmax; T < 1 sharpens the distribution toward the most likely characters.',
  },
  {
    id: 't1-charrnn-3', paper: 'char-rnn', type: 'tf',
    prompt: 'The blog shows a char-rnn producing plausible-looking C code — functions, comments, indentation — with no hard-coded grammar anywhere.',
    answer: true,
    why: 'trained on the Linux source tree, the model imitated C syntax and even invented plausible identifiers.',
  },
  {
    id: 't1-charrnn-4', paper: 'char-rnn', type: 'fill',
    before: 'The temperature knob scales the network’s',
    after: 'before the softmax, controlling how wild the samples get.',
    bank: ['logits', 'weights', 'gradients', 'biases'],
    answer: 'logits',
    why: 'dividing logits by T reshapes the probability distribution used for sampling.',
  },
  {
    id: 't1-charrnn-5', paper: 'char-rnn', type: 'order',
    prompt: 'Arrange the sampling loop for generating text from a trained char-rnn:',
    items: [
      'feed the seed text through the network',
      'read the softmax distribution over the next character',
      'sample a character from that distribution',
      'append it to the input and repeat',
    ],
    why: 'generation is autoregressive: each sampled character becomes part of the next input.',
  },
  // — bengio-1994
  {
    id: 't1-bengio-1', paper: 'bengio-1994', type: 'mcq',
    prompt: 'According to Bengio et al. (1994), why is learning long-term dependencies with gradient descent difficult?',
    options: [
      'gradient information decays exponentially as it propagates back through many time steps',
      'RNNs have too few parameters to store the past',
      'the datasets of 1994 were too small to tell',
      'sigmoid activations cannot represent long sequences',
    ],
    answer: 0,
    why: 'repeated multiplication by the recurrent Jacobian shrinks (or blows up) the error signal over time.',
  },
  {
    id: 't1-bengio-2', paper: 'bengio-1994', type: 'mcq',
    prompt: 'Gradients explode across time steps when the recurrent weight matrix’s largest singular value is…',
    options: ['greater than 1', 'exactly 1', 'between 0 and 1', 'exactly 0'],
    answer: 0,
    why: 'a spectral radius above 1 makes the product of Jacobians grow exponentially; below 1 it vanishes.',
  },
  {
    id: 't1-bengio-3', paper: 'bengio-1994', type: 'tf',
    prompt: 'The 1994 analysis showed the vanishing/exploding effect gets worse as the time span of the dependency grows.',
    answer: true,
    why: 'the Jacobian product is applied once per time step, so the effect compounds with distance.',
  },
  {
    id: 't1-bengio-4', paper: 'bengio-1994', type: 'fill',
    before: 'When gradients shrink exponentially as they flow backward through time, this is called the',
    after: 'gradient problem.',
    bank: ['vanishing', 'exploding', 'dead', 'saturated'],
    answer: 'vanishing',
    why: 'long-range error signals shrink toward zero, so early time steps barely get trained.',
  },
  {
    id: 't1-bengio-5', paper: 'bengio-1994', type: 'order',
    prompt: 'Order the flow of backpropagation through time (BPTT):',
    items: [
      'compute the loss at the output steps',
      'propagate the error backward step by step',
      'multiply by each step’s recurrent Jacobian',
      'accumulate the gradients of the shared weights',
    ],
    why: 'BPTT unrolls the RNN over time and runs standard backprop on the unfolded graph.',
  },
  // — pascanu-2013
  {
    id: 't1-pascanu-1', paper: 'pascanu-2013', type: 'mcq',
    prompt: 'What failure does gradient clipping (Pascanu et al., 2013) address?',
    options: [
      'exploding gradients that catapult parameters off steep loss cliffs',
      'dead ReLU units',
      'overfitting on small datasets',
      'slow convergence of plain SGD',
    ],
    answer: 0,
    why: 'RNN loss surfaces have cliffs; one huge gradient step can undo long training progress.',
  },
  {
    id: 't1-pascanu-2', paper: 'pascanu-2013', type: 'mcq',
    prompt: 'Gradient clipping rescales the update whenever…',
    options: [
      'the gradient norm exceeds a threshold',
      'the training loss increases',
      'the learning rate decays',
      'validation error plateaus',
    ],
    answer: 0,
    why: 'if the gradient norm exceeds the threshold, it is rescaled down to the threshold — direction preserved, step size tamed.',
  },
  {
    id: 't1-pascanu-3', paper: 'pascanu-2013', type: 'tf',
    prompt: 'Gradient clipping changes the direction of the update, not just its magnitude.',
    answer: false,
    why: 'rescaling keeps the direction identical — only the step size shrinks.',
  },
  {
    id: 't1-pascanu-4', paper: 'pascanu-2013', type: 'fill',
    before: 'The paper’s geometric picture: RNN loss landscapes contain steep',
    after: 'where the gradient norm suddenly spikes.',
    bank: ['cliffs', 'valleys', 'plateaus', 'saddles'],
    answer: 'cliffs',
    why: 'near a cliff, a small parameter change produces a huge change in loss — and a huge gradient.',
  },
  {
    id: 't1-pascanu-5', paper: 'pascanu-2013', type: 'order',
    prompt: 'Arrange the exploding-gradient disaster the paper describes:',
    items: [
      'the model approaches a steep region of the loss surface',
      'the gradient norm spikes by orders of magnitude',
      'an unclipped SGD step leaps far from the minimum',
      'the loss jumps and training progress is destroyed',
    ],
    why: 'this is exactly the sequence that gradient clipping prevents.',
  },
  // — lstm-1997
  {
    id: 't1-lstm-1', paper: 'lstm-1997', type: 'mcq',
    prompt: 'The core of the 1997 LSTM is the “constant error carousel”, which…',
    options: [
      'gives errors a linear, unscaled path back through the cell state',
      'clips all gradients to ±1',
      'stores activations in an external table',
      'removes the need for backpropagation',
    ],
    answer: 0,
    why: 'the cell’s self-connection has weight 1.0, so error neither decays nor explodes across steps.',
  },
  {
    id: 't1-lstm-2', paper: 'lstm-1997', type: 'mcq',
    prompt: 'Which gates did the original 1997 LSTM introduce?',
    options: [
      'input and output gates',
      'input, forget, and output gates',
      'update and reset gates',
      'only a forget gate',
    ],
    answer: 0,
    why: 'the forget gate came later (Gers et al., 1999); Hochreiter & Schmidhuber gated writes and reads of the cell.',
  },
  {
    id: 't1-lstm-3', paper: 'lstm-1997', type: 'tf',
    prompt: 'LSTM memory cells were designed to bridge long time lags — error signals can survive across 1000+ steps.',
    answer: true,
    why: 'that was the paper’s headline: constant error flow defeats the vanishing gradient on long lags.',
  },
  {
    id: 't1-lstm-4', paper: 'lstm-1997', type: 'fill',
    before: 'In an LSTM, the',
    after: 'state runs through the cell like a conveyor belt, with gates adding or reading information.',
    bank: ['cell', 'hidden', 'gradient', 'embedding'],
    answer: 'cell',
    why: 'the cell state c_t is the linear memory highway; h_t is the gated, readable output.',
  },
  {
    id: 't1-lstm-5', paper: 'lstm-1997', type: 'order',
    prompt: 'Order the LSTM cell update (modern form):',
    items: [
      'decide what to forget from the cell state',
      'decide what new information to write in',
      'combine old and new into the updated cell state',
      'gate the cell state to produce the output',
    ],
    why: 'forget → write → update → read: gates modulate each stage of the conveyor.',
  },
  // — gru-2014
  {
    id: 't1-gru-1', paper: 'gru-2014', type: 'mcq',
    prompt: 'The GRU simplifies the LSTM by…',
    options: [
      'merging the forget and input gates into one update gate and dropping the separate cell state',
      'adding a fourth gate',
      'removing all gating',
      'replacing recurrence with convolutions',
    ],
    answer: 0,
    why: 'a GRU has two gates (update, reset) and one hidden state — fewer parameters, comparable results.',
  },
  {
    id: 't1-gru-2', paper: 'gru-2014', type: 'mcq',
    prompt: 'What does the GRU’s reset gate control?',
    options: [
      'how much of the previous hidden state to expose when computing the new candidate',
      'when the sequence ends',
      'the per-step learning rate',
      'the softmax temperature',
    ],
    answer: 0,
    why: 'the reset gate multiplies the previous hidden state inside the candidate; near zero lets the unit ignore the past.',
  },
  {
    id: 't1-gru-3', paper: 'gru-2014', type: 'tf',
    prompt: 'The 2014 paper also introduced the RNN encoder–decoder framework that seq2seq later scaled up.',
    answer: true,
    why: 'Cho et al. built the encoder–decoder for phrase representations; Sutskever et al. extended it to translation.',
  },
  {
    id: 't1-gru-4', paper: 'gru-2014', type: 'fill',
    before: 'A GRU’s update gate interpolates between the previous hidden state and the new',
    after: 'state.',
    bank: ['candidate', 'cell', 'embedding', 'attention'],
    answer: 'candidate',
    why: 'h_t = (1−z)·h_(t−1) + z·h̃_t — a gated convex mix of past and proposal.',
  },
  {
    id: 't1-gru-5', paper: 'gru-2014', type: 'order',
    prompt: 'Order a GRU update step:',
    items: [
      'compute the reset and update gates',
      'reset the previous hidden state for the candidate',
      'compute the candidate activation',
      'mix old state and candidate using the update gate',
    ],
    why: 'gates first, candidate second, interpolation last.',
  },
  // — rnn-dropout-2014
  {
    id: 't1-rnndrop-1', paper: 'rnn-dropout-2014', type: 'mcq',
    prompt: 'Zaremba, Sutskever & Vinyals found dropout works in LSTMs when applied…',
    options: [
      'only on the non-recurrent (feed-forward) connections',
      'on every connection including the recurrent ones',
      'only on the input embeddings',
      'nowhere — dropout always breaks RNNs',
    ],
    answer: 0,
    why: 'dropping recurrent edges corrupts the memory trace; restricting dropout to feed-forward paths keeps it intact.',
  },
  {
    id: 't1-rnndrop-2', paper: 'rnn-dropout-2014', type: 'tf',
    prompt: 'Applying dropout to the recurrent connections degrades the LSTM’s ability to store information across time.',
    answer: true,
    why: 'that is precisely the failure mode the paper diagnoses and carefully avoids.',
  },
  {
    id: 't1-rnndrop-3', paper: 'rnn-dropout-2014', type: 'mcq',
    prompt: 'The paper’s headline result was a large perplexity improvement on…',
    options: [
      'Penn Treebank language modeling',
      'ImageNet classification',
      'Atari game playing',
      'speech recognition',
    ],
    answer: 0,
    why: 'properly regularized LSTMs cut word-level perplexity dramatically on PTB.',
  },
  {
    id: 't1-rnndrop-4', paper: 'rnn-dropout-2014', type: 'fill',
    before: 'Dropout on the',
    after: 'connections corrupts the signal the RNN must carry across many time steps.',
    bank: ['recurrent', 'input', 'output', 'bias'],
    answer: 'recurrent',
    why: 'memory lives in the recurrent pathway; noise injected there compounds every step.',
  },
  {
    id: 't1-rnndrop-5', paper: 'rnn-dropout-2014', type: 'mcq',
    prompt: 'Why does dropout help the large LSTM language model generalize?',
    options: [
      'it prevents co-adaptation of units, like training an ensemble of thinned networks',
      'it increases the model’s capacity',
      'it speeds up matrix multiplication',
      'it replaces the need for weight decay',
    ],
    answer: 0,
    why: 'the same ensemble argument as the original dropout paper, applied to deep LSTMs.',
  },
  // — complexodynamics (Aaronson 2011)
  {
    id: 't1-coffee-1', paper: 'complexodynamics', type: 'mcq',
    prompt: '“Complextropy” describes the observation that, as a closed system’s entropy rises, its apparent complexity…',
    options: [
      'first increases, then decreases',
      'only ever increases',
      'only ever decreases',
      'stays perfectly constant',
    ],
    answer: 0,
    why: 'the “first law of complexodynamics”: complexity peaks at intermediate entropy — the coffee-and-cream swirl.',
  },
  {
    id: 't1-coffee-2', paper: 'complexodynamics', type: 'tf',
    prompt: 'Aaronson uses a cellular automaton of a coffee cup to show structured filaments appearing mid-mix, then dissolving away.',
    answer: true,
    why: 'the coffee automaton’s complextropy curve rises with the swirls, then falls as the cup turns uniform.',
  },
  {
    id: 't1-coffee-3', paper: 'complexodynamics', type: 'mcq',
    prompt: 'Why does “complexity rises, then falls” not contradict the second law of thermodynamics?',
    options: [
      'the second law governs entropy, not apparent complexity — the two peak at different times',
      'the second law does not apply to coffee',
      'complexity is conserved in closed systems',
      'it does contradict it — the essay says so',
    ],
    answer: 0,
    why: 'entropy grows monotonically; complexity is non-monotonic. There is no conflict.',
  },
  {
    id: 't1-coffee-4', paper: 'complexodynamics', type: 'fill',
    before: 'Complexity peaks at',
    after: 'entropy — between the sterile extremes of perfect order and total chaos.',
    bank: ['intermediate', 'zero', 'maximum', 'negative'],
    answer: 'intermediate',
    why: 'structured, interesting patterns live in the middle of the entropy range.',
  },
  {
    id: 't1-coffee-5', paper: 'complexodynamics', type: 'order',
    prompt: 'Order the coffee cup’s journey:',
    items: [
      'cream and coffee sit in separate layers',
      'swirls and filaments of mixing appear',
      'the mixture approaches uniform beige',
      'all visible structure dissolves',
    ],
    why: 'low complexity → peak complexity → low complexity as entropy climbs monotonically.',
  },
];

// ---------------------------------------------------------------------------
// TRACK 2 — Sequences, Attention, Transformers
// ---------------------------------------------------------------------------

const T2_POOL: BossQuestion[] = [
  // — seq2seq-2014
  {
    id: 't2-seq2seq-1', paper: 'seq2seq-2014', type: 'mcq',
    prompt: 'The seq2seq model translates by…',
    options: [
      'compressing the source sentence into one fixed vector with an encoder LSTM, then unpacking it with a decoder LSTM',
      'aligning source words to target words with attention',
      'matching sentence templates from a lookup table',
      'fine-tuning a bag-of-words classifier',
    ],
    answer: 0,
    why: 'two LSTMs: the encoder’s final hidden state is the sentence’s entire representation.',
  },
  {
    id: 't2-seq2seq-2', paper: 'seq2seq-2014', type: 'mcq',
    prompt: 'Which surprising data trick significantly improved the paper’s English→French results?',
    options: [
      'reversing the order of the source sentences',
      'shuffling all training sentences',
      'translating every sentence twice',
      'lowercasing the entire corpus',
    ],
    answer: 0,
    why: 'reversal introduces many short-term dependencies between corresponding words, making optimization much easier.',
  },
  {
    id: 't2-seq2seq-3', paper: 'seq2seq-2014', type: 'tf',
    prompt: 'A single fixed-dimensional vector carried enough information for the decoder to translate long sentences competitively with phrase-based systems.',
    answer: true,
    why: 'the LSTM’s context vector preserved word order and meaning well enough to beat a mature SMT baseline (with rescoring).',
  },
  {
    id: 't2-seq2seq-4', paper: 'seq2seq-2014', type: 'order',
    prompt: 'Order seq2seq inference:',
    items: [
      'feed the source tokens into the encoder LSTM',
      'take the encoder’s final hidden state as the context vector',
      'generate target tokens one at a time with the decoder',
      'stop when the decoder emits the end-of-sequence token',
    ],
    why: 'encode → hand off the vector → autoregressive decode → <EOS>.',
  },
  // — bahdanau-2014
  {
    id: 't2-bahdanau-1', paper: 'bahdanau-2014', type: 'mcq',
    prompt: 'Bahdanau attention fixed which bottleneck of the basic encoder–decoder?',
    options: [
      'forcing the entire source sentence into one fixed-length vector',
      'the lack of sufficiently large vocabularies',
      'the softmax computation cost',
      'dropout placement inside the decoder',
    ],
    answer: 0,
    why: 'the decoder now forms a fresh, weighted context from all encoder states at every output step.',
  },
  {
    id: 't2-bahdanau-2', paper: 'bahdanau-2014', type: 'mcq',
    prompt: 'The encoder in Bahdanau et al. is…',
    options: [
      'a bidirectional RNN whose per-position annotations mix past and future context',
      'a deep convolutional network',
      'a plain left-to-right LSTM',
      'an early transformer',
    ],
    answer: 0,
    why: 'each annotation h_j concatenates the forward and backward hidden states around position j.',
  },
  {
    id: 't2-bahdanau-3', paper: 'bahdanau-2014', type: 'tf',
    prompt: 'The alignment score between a decoder state and an encoder annotation is computed by a small feed-forward network, learned jointly with everything else.',
    answer: true,
    why: 'e_ij = a(s_(i−1), h_j) — a one-hidden-layer MLP trained end-to-end, not a hand-designed metric.',
  },
  {
    id: 't2-bahdanau-4', paper: 'bahdanau-2014', type: 'order',
    prompt: 'Order one attention step:',
    items: [
      'score each encoder annotation against the decoder state',
      'turn the scores into weights with a softmax',
      'sum the annotations weighted by those weights',
      'feed the context vector into the decoder’s next step',
    ],
    why: 'score → softmax → weighted sum → decode. A fresh context for every output word.',
  },
  // — neural-conv-2015
  {
    id: 't2-conv-1', paper: 'neural-conv-2015', type: 'mcq',
    prompt: 'Vinyals & Le (2015) trained their conversational model on…',
    options: [
      'movie subtitles and an IT helpdesk chat log with a plain seq2seq LSTM',
      'handwritten dialogue trees',
      'rule-based conversation templates',
      'search-engine query logs',
    ],
    answer: 0,
    why: 'OpenSubtitles plus an IT support dataset — no hand-crafted features anywhere in the pipeline.',
  },
  {
    id: 't2-conv-2', paper: 'neural-conv-2015', type: 'mcq',
    prompt: 'A well-known weakness the authors note is the model’s tendency to…',
    options: [
      'give short, generic, or inconsistent replies — it has no stable persona or facts',
      'refuse to answer any question',
      'crash on punctuation',
      'respond only in French',
    ],
    answer: 0,
    why: 'next-utterance prediction optimizes for plausibility, not consistency or factual grounding.',
  },
  {
    id: 't2-conv-3', paper: 'neural-conv-2015', type: 'tf',
    prompt: 'Despite having no rules, the model produced sensible troubleshooting dialogue, like asking whether a machine was plugged in.',
    answer: true,
    why: 'the IT-helpdesk transcripts in the paper show emergent multi-turn problem solving.',
  },
  {
    id: 't2-conv-4', paper: 'neural-conv-2015', type: 'fill',
    before: 'The model is trained end-to-end to predict each utterance given the preceding',
    after: '.',
    bank: ['conversation', 'document', 'embedding', 'keyword'],
    answer: 'conversation',
    why: 'pure sequence-to-sequence: dialogue history in, reply out.',
  },
  // — graves-handwriting-2013
  {
    id: 't2-graves-1', paper: 'graves-handwriting-2013', type: 'mcq',
    prompt: 'To synthesize handwriting, Graves’s RNN predicts…',
    options: [
      'a mixture of bivariate Gaussians for the pen offset, plus a Bernoulli pen-up flag',
      'one exact pen coordinate per step',
      'ASCII art of the letters',
      'a bitmap image of the word directly',
    ],
    answer: 0,
    why: 'mixture density networks output distribution parameters, letting the sampler draw varied strokes.',
  },
  {
    id: 't2-graves-2', paper: 'graves-handwriting-2013', type: 'mcq',
    prompt: 'Why predict a probability distribution instead of a single next point?',
    options: [
      'handwriting is inherently variable; sampling a learned density produces natural-looking variation',
      'distributions train faster than points',
      'single points are not differentiable',
      'GPUs handle distributions better',
    ],
    answer: 0,
    why: 'the same letter can be drawn many ways — a point estimate would average them into mush.',
  },
  {
    id: 't2-graves-3', paper: 'graves-handwriting-2013', type: 'tf',
    prompt: 'The synthesis network conditions on an input sentence through a soft “window” mechanism that slides over the text.',
    answer: true,
    why: 'the window is an early form of attention: it focuses the pen on the next characters to write.',
  },
  {
    id: 't2-graves-4', paper: 'graves-handwriting-2013', type: 'fill',
    before: 'A mixture density network replaces the network’s direct output with the parameters of several',
    after: 'distributions.',
    bank: ['Gaussian', 'uniform', 'Poisson', 'exponential'],
    answer: 'Gaussian',
    why: 'the MDN outputs mixture weights, means, variances, and correlations per component.',
  },
  // — order-matters-2015
  {
    id: 't2-order-1', paper: 'order-matters-2015', type: 'mcq',
    prompt: '“Order Matters” studies sequence-to-sequence models on inputs that are…',
    options: [
      'sets, which have no natural order',
      'images',
      'audio waveforms',
      'relational databases',
    ],
    answer: 0,
    why: 'feeding a set to a sequence model forces an arbitrary order — and the choice measurably changes results.',
  },
  {
    id: 't2-order-2', paper: 'order-matters-2015', type: 'tf',
    prompt: 'The paper shows the order in which set elements are read can make the same task easier or harder.',
    answer: true,
    why: 'e.g. sorting is easier when the input arrives in a favorable order; read order is a hidden variable.',
  },
  {
    id: 't2-order-3', paper: 'order-matters-2015', type: 'mcq',
    prompt: 'Which mechanism lets the model pick a useful reading order over the input set?',
    options: [
      'attention — content-based addressing over the set',
      'dropout',
      'batch normalization',
      'weight tying',
    ],
    answer: 0,
    why: 'an attention “glimpse” process can select the next element to read instead of taking them as given.',
  },
  {
    id: 't2-order-4', paper: 'order-matters-2015', type: 'fill',
    before: 'For set inputs, the model must choose an',
    after: 'in which to read the elements — and good choices improve accuracy.',
    bank: ['order', 'embedding', 'alphabet', 'axis'],
    answer: 'order',
    why: 'the paper’s central finding: orderings are a hidden hyperparameter for set problems.',
  },
  // — pointer-networks-2015
  {
    id: 't2-ptr-1', paper: 'pointer-networks-2015', type: 'mcq',
    prompt: 'Pointer Networks solve which limitation of standard seq2seq decoders?',
    options: [
      'the output vocabulary is fixed, but the desired outputs are positions of the input sequence',
      'they cannot process batched data',
      'they always need too much training data',
      'they are not differentiable',
    ],
    answer: 0,
    why: 'outputs like “the 3rd point” cannot come from a fixed softmax — the dictionary size varies with the input length.',
  },
  {
    id: 't2-ptr-2', paper: 'pointer-networks-2015', type: 'mcq',
    prompt: 'A Ptr-Net produces its output by…',
    options: [
      'using attention weights as pointers to select one input element per step',
      'averaging all input embeddings',
      'sorting the inputs numerically',
      'sampling random indices',
    ],
    answer: 0,
    why: 'attention over inputs, selecting instead of blending — pointing, not mixing.',
  },
  {
    id: 't2-ptr-3', paper: 'pointer-networks-2015', type: 'tf',
    prompt: 'The paper demonstrates Ptr-Nets learning convex hulls, Delaunay triangulations, and traveling salesman tours.',
    answer: true,
    why: 'all three are geometric problems whose answers are ordered subsets of the input points.',
  },
  {
    id: 't2-ptr-4', paper: 'pointer-networks-2015', type: 'order',
    prompt: 'Order a Ptr-Net decoding step for a convex hull:',
    items: [
      'encode the input points',
      'compute attention over the not-yet-chosen points',
      'select the highest-attention point as the next output',
      'append it to the partial hull and repeat',
    ],
    why: 'each step points at one input; the output is a sequence of indices into the input.',
  },
  // — transformer-2017
  {
    id: 't2-transformer-1', paper: 'transformer-2017', type: 'mcq',
    prompt: 'The Transformer replaces recurrence entirely with…',
    options: [
      'multi-head self-attention plus position-wise feed-forward layers',
      'deeper LSTM stacks',
      '1D convolutions only',
      'tree-structured recursive networks',
    ],
    answer: 0,
    why: '“Attention is all you need”: stacked self-attention and FFNs in both the encoder and decoder.',
  },
  {
    id: 't2-transformer-2', paper: 'transformer-2017', type: 'mcq',
    prompt: 'Why is self-attention more parallelizable than recurrence?',
    options: [
      'all positions attend to all positions in one shot — no sequential dependency across time steps',
      'it always uses fewer FLOPs',
      'it needs no optimizer',
      'GPUs cannot run RNNs',
    ],
    answer: 0,
    why: 'the path length between any two positions is O(1), and the whole sequence is computed at once.',
  },
  {
    id: 't2-transformer-3', paper: 'transformer-2017', type: 'tf',
    prompt: 'Because self-attention is permutation-invariant, the model injects positional information via sinusoidal encodings added to the embeddings.',
    answer: true,
    why: 'without a position signal, attention alone cannot tell token order.',
  },
  {
    id: 't2-transformer-4', paper: 'transformer-2017', type: 'fill',
    before: 'Scaled dot-product attention divides Q·Kᵀ by',
    after: 'before the softmax to keep gradients healthy.',
    bank: ['√d_k', 'd_model', '2', 'h'],
    answer: '√d_k',
    why: 'for large d_k the dot products grow in magnitude, pushing the softmax into saturated regions.',
  },
  {
    id: 't2-transformer-5', paper: 'transformer-2017', type: 'order',
    prompt: 'Order scaled dot-product attention:',
    items: [
      'project the inputs into queries, keys, and values',
      'compute Q·Kᵀ and scale by 1/√d_k',
      'apply softmax to get attention weights',
      'take the weighted sum of the values',
    ],
    why: 'scores → weights → mixture of values; multi-head runs this h times in parallel.',
  },
  // — annotated-transformer
  {
    id: 't2-annotated-1', paper: 'annotated-transformer', type: 'mcq',
    prompt: 'The Annotated Transformer (Rush, 2018) is best described as…',
    options: [
      'the paper re-presented as line-by-line, runnable PyTorch code with commentary',
      'a new attention variant',
      'a benchmark suite for translation',
      'a hardware accelerator design',
    ],
    answer: 0,
    why: 'Harvard NLP’s walkthrough implements every equation of the original paper as working code.',
  },
  {
    id: 't2-annotated-2', paper: 'annotated-transformer', type: 'tf',
    prompt: 'Each Transformer sub-layer is wrapped as LayerNorm(x + Sublayer(x)) — a residual connection followed by normalization.',
    answer: true,
    why: 'residual + layer norm around the attention and FFN sub-layers is the standard pattern shown in the code.',
  },
  {
    id: 't2-annotated-3', paper: 'annotated-transformer', type: 'mcq',
    prompt: 'What did the walkthrough famously demystify about the decoder?',
    options: [
      'masked self-attention, which blocks positions from attending to future tokens',
      'dropout scheduling',
      'the optimizer choice',
      'BPE tokenization',
    ],
    answer: 0,
    why: 'the subsequent mask keeps decoding autoregressive during parallel training.',
  },
  {
    id: 't2-annotated-4', paper: 'annotated-transformer', type: 'fill',
    before: 'Rush’s implementation pairs every equation of the paper with',
    after: 'code you can run.',
    bank: ['PyTorch', 'TensorFlow', 'NumPy', 'CUDA'],
    answer: 'PyTorch',
    why: 'the article is a literate PyTorch program.',
  },
  // — relational-rnn-2018
  {
    id: 't2-rmc-1', paper: 'relational-rnn-2018', type: 'mcq',
    prompt: 'The Relational Memory Core upgrades the recurrent architecture by…',
    options: [
      'replacing the single memory vector with multiple slots that interact via multi-head self-attention each step',
      'removing memory entirely',
      'doubling the hidden size',
      'adding convolutional readout',
    ],
    answer: 0,
    why: 'slot-to-slot attention lets memories reason about each other before the next update.',
  },
  {
    id: 't2-rmc-2', paper: 'relational-rnn-2018', type: 'tf',
    prompt: 'In the RMC, memory slots attend to each other — the memory itself performs relational reasoning.',
    answer: true,
    why: 'that is the “relational” in the name: interactions among memory elements, not just input→memory.',
  },
  {
    id: 't2-rmc-3', paper: 'relational-rnn-2018', type: 'mcq',
    prompt: 'The paper evaluates the RMC on tasks like…',
    options: [
      'Nth-farthest vector recall, program evaluation, and mini-bAbI',
      'ImageNet classification',
      'Atari game playing',
      'speech recognition',
    ],
    answer: 0,
    why: 'all require holding and relating information over long horizons — where the RMC beat LSTMs.',
  },
  {
    id: 't2-rmc-4', paper: 'relational-rnn-2018', type: 'fill',
    before: 'Where an LSTM keeps one memory vector, the RMC keeps several memory',
    after: 'that exchange information through attention.',
    bank: ['slots', 'gates', 'heads', 'channels'],
    answer: 'slots',
    why: 'slots are the RMC’s addressable, interacting memory elements.',
  },
  // — relational-reasoning-2017
  {
    id: 't2-rn-1', paper: 'relational-reasoning-2017', type: 'mcq',
    prompt: 'A Relation Network answers relational questions by…',
    options: [
      'applying one shared MLP to every pair of objects, summing the results, and passing the sum through a second MLP',
      'sorting objects by color first',
      'running an LSTM over raw pixels',
      'parsing a hand-coded scene graph',
    ],
    answer: 0,
    why: 'RN(O) = f( Σ g(o_i, o_j) ) — reasoning as pairwise function composition.',
  },
  {
    id: 't2-rn-2', paper: 'relational-reasoning-2017', type: 'tf',
    prompt: 'On CLEVR, a simple RN plugged into standard features achieved superhuman-level question answering.',
    answer: true,
    why: 'the paper reported accuracy above the human baseline on the benchmark.',
  },
  {
    id: 't2-rn-3', paper: 'relational-reasoning-2017', type: 'mcq',
    prompt: 'The RN’s design bakes in which inductive bias?',
    options: [
      'relations are pairwise and order-invariant — the sum over pairs is symmetric',
      'objects have absolute positions',
      'time flows backward',
      'features must be sparse',
    ],
    answer: 0,
    why: 'summing g over all pairs is permutation-invariant by construction.',
  },
  {
    id: 't2-rn-4', paper: 'relational-reasoning-2017', type: 'fill',
    before: 'The RN computes g(o_i, o_j) for all object pairs, then',
    after: 'the results before the final network.',
    bank: ['sums', 'multiplies', 'sorts', 'masks'],
    answer: 'sums',
    why: 'aggregation by summation makes the module invariant to object order and count.',
  },
  // — ntm-2014
  {
    id: 't2-ntm-1', paper: 'ntm-2014', type: 'mcq',
    prompt: 'A Neural Turing Machine augments a neural controller with…',
    options: [
      'an external memory matrix it reads and writes through soft, differentiable attention',
      'a literal hard disk',
      'an extra softmax output layer',
      'a retrieval search engine',
    ],
    answer: 0,
    why: 'blurry read/write heads address all locations to different degrees — hence end-to-end gradient training.',
  },
  {
    id: 't2-ntm-2', paper: 'ntm-2014', type: 'mcq',
    prompt: 'Which two addressing modes do NTM heads combine?',
    options: [
      'content-based similarity and location-based shifting',
      'random and sequential access',
      'sparse and dense lookup',
      'read-only and write-only modes',
    ],
    answer: 0,
    why: 'content lookup is interpolated with the previous weights, then a shift kernel moves the head.',
  },
  {
    id: 't2-ntm-3', paper: 'ntm-2014', type: 'tf',
    prompt: 'Because every memory operation is differentiable, the NTM learns algorithms — like copying sequences — directly from examples.',
    answer: true,
    why: 'the paper trains it to copy, repeat, and sort, and it generalizes to longer inputs than it saw in training.',
  },
  {
    id: 't2-ntm-4', paper: 'ntm-2014', type: 'order',
    prompt: 'Order the NTM’s head-weighting pipeline:',
    items: [
      'compute content similarity to each memory row',
      'interpolate with the previous step’s weights via a gate',
      'apply the convolutional shift',
      'sharpen the weights for the final distribution',
    ],
    why: 'content → blend → shift → sharpen; then read, or erase-and-add.',
  },
];

// ---------------------------------------------------------------------------
// TRACK 3 — Vision & ConvNets
// ---------------------------------------------------------------------------

const T3_POOL: BossQuestion[] = [
  // — alexnet-2012
  {
    id: 't3-alexnet-1', paper: 'alexnet-2012', type: 'mcq',
    prompt: 'Which combination powered AlexNet’s 2012 breakthrough?',
    options: [
      'deep CNN + ReLU + GPU training + dropout + data augmentation',
      'SVMs on raw pixels',
      'handcrafted SIFT features with a linear classifier',
      'recurrent networks over image rows',
    ],
    answer: 0,
    why: '5 conv + 3 fc layers trained on two GTX 580s, with ReLU, dropout, and aggressive augmentation.',
  },
  {
    id: 't3-alexnet-2', paper: 'alexnet-2012', type: 'mcq',
    prompt: 'Why did ReLUs matter so much for training speed?',
    options: [
      'they do not saturate, so SGD runs several times faster than with tanh units',
      'they use less GPU memory',
      'they remove the need for labels',
      'they prevent all overfitting',
    ],
    answer: 0,
    why: 'the paper shows deep ReLU nets reaching 25% training error about six times faster than tanh equivalents.',
  },
  {
    id: 't3-alexnet-3', paper: 'alexnet-2012', type: 'tf',
    prompt: 'AlexNet won ILSVRC 2012 with a top-5 error of 15.3%, nearly 11 points ahead of the runner-up.',
    answer: true,
    why: 'the margin over the best handcrafted-feature system shocked the vision community.',
  },
  {
    id: 't3-alexnet-4', paper: 'alexnet-2012', type: 'fill',
    before: 'To control overfitting in its fully connected layers, AlexNet relied heavily on',
    after: '.',
    bank: ['dropout', 'batchnorm', 'weight sharing', 'pooling'],
    answer: 'dropout',
    why: 'dropout (keep p = 0.5) in the fc layers roughly doubled convergence time but was essential.',
  },
  {
    id: 't3-alexnet-5', paper: 'alexnet-2012', type: 'order',
    prompt: 'Order the early AlexNet pipeline for one image:',
    items: [
      'conv1 with ReLU over the 224×224 crop',
      'response normalization and max-pooling',
      'conv2 with ReLU, normalization, pooling',
      'stacked conv3–5, then the fully connected head',
    ],
    why: 'normalize-and-pool after each early conv; dense reasoning happens in the fc tail.',
  },
  // — resnet-2015
  {
    id: 't3-resnet-1', paper: 'resnet-2015', type: 'mcq',
    prompt: 'ResNet’s residual blocks reformulate the layer mapping as…',
    options: [
      'F(x) + x — learn the residual against an identity shortcut',
      'F(x) · x — multiplicative gating',
      'F(F(x)) — recursive application',
      'x with the layer removed entirely',
    ],
    answer: 0,
    why: 'if identity is near-optimal, pushing F(x) toward zero is easier than fitting identity with stacked layers.',
  },
  {
    id: 't3-resnet-2', paper: 'resnet-2015', type: 'mcq',
    prompt: 'What problem did residual learning solve?',
    options: [
      'the degradation problem — deeper plain networks had higher training error, not just test error',
      'exploding vocabulary size',
      'lack of labeled data',
      'GPU memory limits',
    ],
    answer: 0,
    why: '56-layer plain nets train worse than 20-layer ones — an optimization failure that shortcuts fix.',
  },
  {
    id: 't3-resnet-3', paper: 'resnet-2015', type: 'tf',
    prompt: 'Identity shortcuts add no extra parameters, yet let ResNet train 152-layer networks to state-of-the-art accuracy.',
    answer: true,
    why: 'ResNet-152 won ILSVRC 2015 while being far deeper than VGG with lower complexity.',
  },
  {
    id: 't3-resnet-4', paper: 'resnet-2015', type: 'fill',
    before: 'Inside a residual block, the shortcut adds the block’s input x to the stacked layers’ output',
    after: '.',
    bank: ['F(x)', 'x²', '0', 'γ'],
    answer: 'F(x)',
    why: 'y = F(x, {W_i}) + x; the +x is the identity highway for signal and gradient.',
  },
  {
    id: 't3-resnet-5', paper: 'resnet-2015', type: 'order',
    prompt: 'Order a post-activation residual block (ResNet v1):',
    items: [
      'conv → BN → ReLU',
      'conv → BN',
      'add the identity shortcut',
      'final ReLU',
    ],
    why: 'the original block applies the second ReLU after the addition; the 2016 paper later moved the activations.',
  },
  // — identity-mappings-2016
  {
    id: 't3-identity-1', paper: 'identity-mappings-2016', type: 'mcq',
    prompt: 'The 2016 follow-up argues the cleanest ResNet keeps…',
    options: [
      'both the shortcut and the activation path as pure identities',
      'a learned gate on every shortcut',
      'dropout on the shortcut path',
      'a tanh after each addition',
    ],
    answer: 0,
    why: 'any scaling or gating on the identity path hampers signal propagation; keep the highway clean.',
  },
  {
    id: 't3-identity-2', paper: 'identity-mappings-2016', type: 'tf',
    prompt: 'The “pre-activation” block (BN → ReLU → conv, twice) trains more easily and generalizes better than the original post-activation block.',
    answer: true,
    why: 'with BN+ReLU before the convs, the skip path is a strict identity — easing optimization of 1000-layer nets.',
  },
  {
    id: 't3-identity-3', paper: 'identity-mappings-2016', type: 'mcq',
    prompt: 'What happens when the shortcut is multiplied by a constant like 0.5?',
    options: [
      'the forward signal shrinks exponentially with depth and training fails',
      'nothing changes',
      'accuracy doubles',
      'gradients explode immediately',
    ],
    answer: 0,
    why: 'the paper’s ablations show scaling or exclusive gating on shortcuts degrades very deep nets.',
  },
  {
    id: 't3-identity-4', paper: 'identity-mappings-2016', type: 'fill',
    before: 'In pre-activation form, BN and ReLU move',
    after: 'their conv layer.',
    bank: ['before', 'after', 'inside', 'around'],
    answer: 'before',
    why: 'BN → ReLU → conv ordering makes each block’s skip path a strict identity.',
  },
  {
    id: 't3-identity-5', paper: 'identity-mappings-2016', type: 'order',
    prompt: 'Order a pre-activation residual block:',
    items: [
      'BN → ReLU',
      'conv',
      'BN → ReLU → conv',
      'add the identity input',
    ],
    why: 'activations first, weights second, addition last — the v2 block.',
  },
  // — dilated-conv-2015
  {
    id: 't3-dilated-1', paper: 'dilated-conv-2015', type: 'mcq',
    prompt: 'Dilated (à trous) convolutions expand the receptive field by…',
    options: [
      'spacing the kernel’s taps apart — exponential field growth with no extra parameters',
      'making the input image smaller',
      'stacking more pooling layers',
      'training on bigger images',
    ],
    answer: 0,
    why: 'dilation r inserts r−1 gaps between taps; a 3×3 kernel at r = 2 spans 5×5.',
  },
  {
    id: 't3-dilated-2', paper: 'dilated-conv-2015', type: 'mcq',
    prompt: 'The paper targets which task family?',
    options: [
      'dense prediction like semantic segmentation, where pooling destroys needed resolution',
      'machine translation',
      'speech synthesis',
      'recommender systems',
    ],
    answer: 0,
    why: 'keep full resolution and aggregate multi-scale context — exactly what segmentation needs.',
  },
  {
    id: 't3-dilated-3', paper: 'dilated-conv-2015', type: 'tf',
    prompt: 'A 3×3 dilated conv with dilation 2 covers a 5×5 region while still using only 9 parameters.',
    answer: true,
    why: 'the kernel elements land every other pixel — span grows, parameter count does not.',
  },
  {
    id: 't3-dilated-4', paper: 'dilated-conv-2015', type: 'fill',
    before: 'Stacking dilated convs with dilation 1, 2, 4, 8 makes the receptive field grow',
    after: 'with depth.',
    bank: ['exponentially', 'linearly', 'not at all', 'logarithmically'],
    answer: 'exponentially',
    why: 'each layer multiplies the span, so context balloons without any downsampling.',
  },
  {
    id: 't3-dilated-5', paper: 'dilated-conv-2015', type: 'order',
    prompt: 'Order the context module’s dilation schedule:',
    items: [
      'conv with dilation 1',
      'conv with dilation 2',
      'conv with dilation 4',
      'conv with dilation 8',
    ],
    why: 'doubling dilation each layer expands the field 2×, 4×, 8×… at full resolution.',
  },
];

// ---------------------------------------------------------------------------
// TRACK 4 — Training & Optimization
// ---------------------------------------------------------------------------

const T4_POOL: BossQuestion[] = [
  // — batchnorm-2015
  {
    id: 't4-bn-1', paper: 'batchnorm-2015', type: 'mcq',
    prompt: 'Batch Normalization normalizes each layer’s inputs to…',
    options: [
      'zero mean and unit variance over the mini-batch, then applies a learned scale γ and shift β',
      'values strictly between −1 and 1',
      'unit length per sample',
      'small integers',
    ],
    answer: 0,
    why: 'γ and β let the network undo the normalization if that is optimal — BN is a reparameterization.',
  },
  {
    id: 't4-bn-2', paper: 'batchnorm-2015', type: 'mcq',
    prompt: 'Which practical benefits did BN bring to deep nets?',
    options: [
      'much higher learning rates, relaxed initialization, and faster convergence',
      'smaller model files',
      'no need for labels',
      'exact gradients',
    ],
    answer: 0,
    why: 'BN stabilizes activation distributions so training can take bigger steps without diverging.',
  },
  {
    id: 't4-bn-3', paper: 'batchnorm-2015', type: 'tf',
    prompt: 'At inference time, BN replaces batch statistics with running averages of mean and variance collected during training.',
    answer: true,
    why: 'evaluation must be deterministic; the moving averages act as population statistics.',
  },
  {
    id: 't4-bn-4', paper: 'batchnorm-2015', type: 'fill',
    before: 'BN was motivated by “internal',
    after: 'shift” — the changing distribution of each layer’s inputs during training.',
    bank: ['covariate', 'gradient', 'weight', 'label'],
    answer: 'covariate',
    why: 'each layer keeps adapting to shifting inputs from below; normalization pins the distribution.',
  },
  {
    id: 't4-bn-5', paper: 'batchnorm-2015', type: 'order',
    prompt: 'Order the BN transform on a training batch:',
    items: [
      'compute the batch mean',
      'compute the batch variance',
      'normalize each activation',
      'scale by γ and shift by β',
    ],
    why: 'standardize first, then let the learned affine restore whatever scale the layer needs.',
  },
  // — he-init-2015
  {
    id: 't4-heinit-1', paper: 'he-init-2015', type: 'mcq',
    prompt: 'He initialization draws weights with variance…',
    options: [
      '2/n_in, tuned for ReLU activations',
      '1/n_in for all activations',
      'exactly 1 in every layer',
      '0 — all zeros',
    ],
    answer: 0,
    why: 'ReLU zeroes half the signal, so Xavier’s 1/n under-scales; doubling keeps variance stable across layers.',
  },
  {
    id: 't4-heinit-2', paper: 'he-init-2015', type: 'mcq',
    prompt: 'The paper also introduced PReLU, which is…',
    options: [
      'a ReLU with a learnable slope on the negative side',
      'a periodic activation',
      'a pooling method',
      'a pruning trick',
    ],
    answer: 0,
    why: 'Parametric ReLU learns the negative slope, improving accuracy at negligible cost.',
  },
  {
    id: 't4-heinit-3', paper: 'he-init-2015', type: 'tf',
    prompt: 'Poor initialization can make activations shrink or explode exponentially across layers, stalling training from the very start.',
    answer: true,
    why: 'the paper’s variance analysis shows the response of layer L is the product of per-layer gains.',
  },
  {
    id: 't4-heinit-4', paper: 'he-init-2015', type: 'fill',
    before: 'For ReLU networks, He et al. scale the initialization variance by a factor of',
    after: 'over the fan-in.',
    bank: ['2', '0.5', 'π', '10'],
    answer: '2',
    why: 'Var[w] = 2/n_in compensates for ReLU discarding half of its input mass.',
  },
  {
    id: 't4-heinit-5', paper: 'he-init-2015', type: 'mcq',
    prompt: 'The same paper’s human-level headline was…',
    options: [
      'surpassing human-level performance on ImageNet classification for the first time',
      'beating the world chess champion',
      'training ImageNet on one GPU',
      'fully unsupervised ImageNet',
    ],
    answer: 0,
    why: 'PReLU plus He init pushed a deep net past the reported human error rate on ILSVRC.',
  },
  // — dropout-2014
  {
    id: 't4-dropout-1', paper: 'dropout-2014', type: 'mcq',
    prompt: 'During training, dropout…',
    options: [
      'zeroes each unit’s output with probability 1−p, independently, every step',
      'deletes neurons permanently',
      'adds Gaussian noise to the labels',
      'halves the learning rate each epoch',
    ],
    answer: 0,
    why: 'each update trains a different “thinned” subnetwork with shared weights.',
  },
  {
    id: 't4-dropout-2', paper: 'dropout-2014', type: 'mcq',
    prompt: 'Why does dropout reduce overfitting?',
    options: [
      'it prevents complex co-adaptations — like averaging an exponential ensemble of thinned networks',
      'it increases model capacity',
      'it removes outliers from the data',
      'it normalizes the gradients',
    ],
    answer: 0,
    why: 'a unit cannot rely on specific others being present, so it must be useful in many contexts.',
  },
  {
    id: 't4-dropout-3', paper: 'dropout-2014', type: 'tf',
    prompt: 'At test time dropout is disabled and weights are scaled so expected activations match training.',
    answer: true,
    why: 'the original paper scales by p at test time; modern frameworks use inverted dropout at train time instead.',
  },
  {
    id: 't4-dropout-4', paper: 'dropout-2014', type: 'fill',
    before: 'Dropout approximates training an exponential number of “thinned” networks that share',
    after: '.',
    bank: ['weights', 'data', 'labels', 'optimizers'],
    answer: 'weights',
    why: 'every mask defines a subnet; weight sharing makes the ensemble trainable.',
  },
  {
    id: 't4-dropout-5', paper: 'dropout-2014', type: 'order',
    prompt: 'Order one dropout training step:',
    items: [
      'sample a Bernoulli mask for the layer',
      'zero the masked activations',
      'run the forward and backward passes',
      'update the shared weights',
    ],
    why: 'mask → thin → backprop → update; the next step draws a fresh mask.',
  },
  // — adam-2014
  {
    id: 't4-adam-1', paper: 'adam-2014', type: 'mcq',
    prompt: 'Adam combines…',
    options: [
      'momentum (first moment) with per-parameter adaptive learning rates from squared gradients (second moment)',
      'two different datasets',
      'SGD with grid search',
      'dropout with batchnorm',
    ],
    answer: 0,
    why: 'm and v are exponential moving averages of g and g² — momentum plus RMSProp-style scaling.',
  },
  {
    id: 't4-adam-2', paper: 'adam-2014', type: 'mcq',
    prompt: 'Why does Adam include bias correction for m and v?',
    options: [
      'the moving averages start at zero and are biased small early in training',
      'to make iterations faster',
      'to handle NaN gradients',
      'GPUs require it',
    ],
    answer: 0,
    why: 'dividing by (1 − β^t) undoes the zero-initialization bias of both moments.',
  },
  {
    id: 't4-adam-3', paper: 'adam-2014', type: 'tf',
    prompt: 'Adam’s update divides the (bias-corrected) first moment by the square root of the second moment plus ε.',
    answer: true,
    why: 'θ ← θ − α·m̂/(√v̂ + ε): a signal-to-noise scaled step per parameter.',
  },
  {
    id: 't4-adam-4', paper: 'adam-2014', type: 'fill',
    before: 'Adam keeps exponential moving averages of the gradient and its',
    after: '.',
    bank: ['square', 'sign', 'rank', 'logarithm'],
    answer: 'square',
    why: 'the second raw moment tracks E[g²], approximating per-parameter gradient scale.',
  },
  {
    id: 't4-adam-5', paper: 'adam-2014', type: 'order',
    prompt: 'Order an Adam update:',
    items: [
      'compute the gradient g_t',
      'update the m (β₁) and v (β₂) moving averages',
      'bias-correct m̂ and v̂',
      'step by −α·m̂/(√v̂ + ε)',
    ],
    why: 'moments first, correction second, scaled step last.',
  },
  // — mdl-1993
  {
    id: 't4-mdl-1', paper: 'mdl-1993', type: 'mcq',
    prompt: 'The minimum description length principle says the best model…',
    options: [
      'minimizes the total bits to describe the model plus the data’s misfit under it',
      'has the most parameters',
      'trains the longest',
      'uses the biggest batch size',
    ],
    answer: 0,
    why: 'MDL = Occam’s razor as an objective: cost = bits(weights) + bits(errors | weights).',
  },
  {
    id: 't4-mdl-2', paper: 'mdl-1993', type: 'mcq',
    prompt: 'Hinton & van Camp’s key trick for keeping networks simple was…',
    options: [
      'adding noise to the weights, so coarse few-bit descriptions of them suffice',
      'deleting every other layer',
      'rounding all training data',
      'training without gradients',
    ],
    answer: 0,
    why: 'noisy weights tolerate quantization — you pay fewer bits to communicate them.',
  },
  {
    id: 't4-mdl-3', paper: 'mdl-1993', type: 'tf',
    prompt: 'Under the MDL view, minimizing description length is equivalent to minimizing a regularized training loss.',
    answer: true,
    why: 'the coding argument yields an objective with two terms: error cost plus model complexity cost.',
  },
  {
    id: 't4-mdl-4', paper: 'mdl-1993', type: 'fill',
    before: 'In MDL bookkeeping, total cost = bits to describe the weights + bits to describe the',
    after: 'given those weights.',
    bank: ['errors', 'inputs', 'code', 'hyperparameters'],
    answer: 'errors',
    why: 'the residual misfit is the second term; simpler weights can leave more error bits.',
  },
  {
    id: 't4-mdl-5', paper: 'mdl-1993', type: 'order',
    prompt: 'Order the MDL thought experiment for communicating a dataset:',
    items: [
      'send the model (weights) for a cost in bits',
      'encode the data’s errors under that model',
      'sum both bit counts',
      'prefer the model with the smallest total',
    ],
    why: 'model bits + error bits = description length; minimize the sum.',
  },
];

// ---------------------------------------------------------------------------
// TRACK 5 — Speech, Generative & Scaling
// ---------------------------------------------------------------------------

const T5_POOL: BossQuestion[] = [
  // — deep-speech-2014
  {
    id: 't5-deepspeech-1', paper: 'deep-speech-2014', type: 'mcq',
    prompt: 'Deep Speech replaced the traditional speech pipeline (phonemes, HMMs, hand-tuned features) with…',
    options: [
      'one deep recurrent network trained end-to-end from spectrograms to characters',
      'a bigger phoneme lookup table',
      'a rule-based grammar engine',
      'template matching over audio clips',
    ],
    answer: 0,
    why: 'spectrogram frames in, character probabilities out — the alignment is learned, not labeled.',
  },
  {
    id: 't5-deepspeech-2', paper: 'deep-speech-2014', type: 'mcq',
    prompt: 'What problem does the CTC loss solve?',
    options: [
      'training when audio frames and output characters have an unknown, variable-length alignment',
      'overfitting on small vocabularies',
      'GPU memory limits',
      'text tokenization',
    ],
    answer: 0,
    why: 'CTC marginalizes over all valid alignments between the audio frames and the transcript.',
  },
  {
    id: 't5-deepspeech-3', paper: 'deep-speech-2014', type: 'tf',
    prompt: 'Deep Speech scaled training with parallelism and large datasets, and proved notably robust to background noise.',
    answer: true,
    why: 'the system learned noise invariance from data instead of relying on engineered features.',
  },
  {
    id: 't5-deepspeech-4', paper: 'deep-speech-2014', type: 'fill',
    before: 'Deep Speech’s network emits per-frame probabilities over',
    after: '(letters, space, blank), decoded by CTC.',
    bank: ['characters', 'phonemes', 'words', 'morphemes'],
    answer: 'characters',
    why: 'end-to-end means characters directly — no phoneme inventory in the loop.',
  },
  {
    id: 't5-deepspeech-5', paper: 'deep-speech-2014', type: 'order',
    prompt: 'Order the Deep Speech forward pipeline:',
    items: [
      'slice the audio into spectral frames',
      'run conv and recurrent layers over the frames',
      'produce per-frame character probabilities',
      'decode the most likely transcript with CTC',
    ],
    why: 'spectrogram → deep RNN → character posteriors → CTC decode.',
  },
  {
    id: 't5-deepspeech-6', paper: 'deep-speech-2014', type: 'mcq',
    prompt: 'Why is end-to-end speech recognition attractive?',
    options: [
      'one learned system replaces a fragile chain of hand-engineered components and scales with data',
      'it needs no training data',
      'it runs without GPUs',
      'it avoids optimization entirely',
    ],
    answer: 0,
    why: 'every stage is optimized jointly for the final metric instead of independent sub-goals.',
  },
  // — vlae-2016
  {
    id: 't5-vlae-1', paper: 'vlae-2016', type: 'mcq',
    prompt: 'The Variational Lossy Autoencoder is “lossy” on purpose because…',
    options: [
      'a too-powerful autoregressive decoder would ignore the latent code, so the decoder is restricted and the latent must carry global structure',
      'lossless compression was too slow',
      'VAEs cannot decode images',
      'latent vectors are too small for pixels',
    ],
    answer: 0,
    why: 'PixelCNN-style decoders model local detail so well they can bypass z entirely; the VLAE forces the latent to matter.',
  },
  {
    id: 't5-vlae-2', paper: 'vlae-2016', type: 'mcq',
    prompt: 'The VLAE combines which two modeling families?',
    options: [
      'variational autoencoders with autoregressive (PixelCNN-style) decoders',
      'GANs with support vector machines',
      'RNNs with hidden Markov models',
      'k-means with PCA',
    ],
    answer: 0,
    why: 'a VAE’s latent prior plus an autoregressive likelihood, with the decoder’s receptive field deliberately limited.',
  },
  {
    id: 't5-vlae-3', paper: 'vlae-2016', type: 'tf',
    prompt: 'By limiting what the decoder can condition on, the VLAE learns latents that capture global features like shape and layout.',
    answer: true,
    why: 'the latent code becomes responsible for information the decoder cannot see — global structure.',
  },
  {
    id: 't5-vlae-4', paper: 'vlae-2016', type: 'fill',
    before: 'A PixelCNN-style decoder predicts each pixel from the',
    after: 'pixels already generated.',
    bank: ['previous', 'future', 'random', 'padding'],
    answer: 'previous',
    why: 'autoregressive factorization: p(x) = Π p(x_i | x_<i).',
  },
  {
    id: 't5-vlae-5', paper: 'vlae-2016', type: 'order',
    prompt: 'Order the VLAE generative pass:',
    items: [
      'sample a latent code from the prior',
      'decode with the restricted autoregressive network',
      'fill in local detail pixel by pixel',
      'obtain the final image',
    ],
    why: 'global latent first, autoregressive detailing second.',
  },
  {
    id: 't5-vlae-6', paper: 'vlae-2016', type: 'mcq',
    prompt: 'In the lossy view, the latent code is judged by…',
    options: [
      'what it usefully encodes, not by reconstructing every pixel exactly',
      'the compressed file size only',
      'pixel color accuracy',
      'decoding speed',
    ],
    answer: 0,
    why: 'VLAE embraces controlled information loss so the latent holds semantically meaningful content.',
  },
  // — scaling-laws-2020
  {
    id: 't5-scaling-1', paper: 'scaling-laws-2020', type: 'mcq',
    prompt: 'Kaplan et al. (2020) found language model loss follows…',
    options: [
      'smooth power laws in model size, dataset size, and compute',
      'random noise',
      'a U-shaped curve',
      'discontinuous step functions',
    ],
    answer: 0,
    why: 'log-log plots of loss vs N, D, and C are straight lines across many orders of magnitude.',
  },
  {
    id: 't5-scaling-2', paper: 'scaling-laws-2020', type: 'mcq',
    prompt: 'The compute-optimal recipe says to…',
    options: [
      'train very large models on a modest amount of data and stop far short of convergence',
      'train tiny models for as long as possible',
      'pair the biggest dataset with the smallest model',
      'never stop training',
    ],
    answer: 0,
    why: 'big models are more sample-efficient; for fixed compute, size matters more than training steps.',
  },
  {
    id: 't5-scaling-3', paper: 'scaling-laws-2020', type: 'tf',
    prompt: 'The paper found architectural details (depth vs width) matter much less than overall scale for the loss.',
    answer: true,
    why: 'the power-law exponents depend weakly on shape; N, D, and C dominate.',
  },
  {
    id: 't5-scaling-4', paper: 'scaling-laws-2020', type: 'fill',
    before: 'On a log-log plot, a power law L(x) ∝ x^(−α) appears as a straight',
    after: '.',
    bank: ['line', 'parabola', 'circle', 'spike'],
    answer: 'line',
    why: 'log L = −α·log x + const — linear in log space.',
  },
  {
    id: 't5-scaling-5', paper: 'scaling-laws-2020', type: 'order',
    prompt: 'Order the compute-optimal scaling recipe:',
    items: [
      'fix the compute budget',
      'use the power laws to pick the optimal model size',
      'train on enough tokens for that size',
      'stop early — don’t train to convergence',
    ],
    why: 'budget → size → tokens → early stop: the paper’s compute-optimal frontier.',
  },
  {
    id: 't5-scaling-6', paper: 'scaling-laws-2020', type: 'mcq',
    prompt: '“Larger models are more sample-efficient” means…',
    options: [
      'they reach the same loss with fewer optimization steps and fewer data points',
      'they generate samples faster at inference',
      'they need less GPU memory',
      'they avoid sampling entirely',
    ],
    answer: 0,
    why: 'the loss curves of big models drop faster per token seen.',
  },
];

export const BOSS_POOLS: Record<TrackId, BossQuestion[]> = {
  t1: T1_POOL,
  t2: T2_POOL,
  t3: T3_POOL,
  t4: T4_POOL,
  t5: T5_POOL,
};

// ---------------------------------------------------------------------------
// draw logic (boss.md — data model)
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function weightedIndex(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/** phase-2 bias: order/fill questions sort toward the back half of the round */
function phaseOrder(qs: BossQuestion[]): BossQuestion[] {
  const isLateType = (q: BossQuestion) => q.type === 'order' || q.type === 'fill';
  const early = shuffle(qs.filter((q) => !isLateType(q)));
  const late = shuffle(qs.filter(isLateType));
  const half = Math.ceil(qs.length / 2);
  const first = [...early, ...late].slice(0, half);
  const used = new Set(first.map((q) => q.id));
  const rest = qs.filter((q) => !used.has(q.id));
  const restLate = shuffle(rest.filter(isLateType));
  const restEarly = shuffle(rest.filter((q) => !isLateType(q)));
  return [...first, ...restLate, ...restEarly];
}

/**
 * Draw the round of 10 (boss.md): sampled without replacement across the
 * track's pools, min 1 per canonical paper, weighted up to ×1.5 toward the
 * player's lowest-accuracy papers (quizBest from the save file).
 */
export function drawBossQuestions(track: TrackId, save: SaveFile, count = BOSS_ROUND_SIZE): BossQuestion[] {
  const pool = BOSS_POOLS[track];
  const byPaper = new Map<string, BossQuestion[]>();
  for (const q of pool) {
    const list = byPaper.get(q.paper) ?? [];
    list.push(q);
    byPaper.set(q.paper, list);
  }
  // min 1 per paper — t2 has 11 papers > round size, so a random 10 of 11
  // papers is covered per fight (which one rests rotates between fights)
  const canonical = shuffle(papersByTrack(track).filter((p) => !p.bonus)).slice(0, count);
  const chosen: BossQuestion[] = [];
  const used = new Set<string>();

  // guaranteed one per (covered) paper
  for (const p of canonical) {
    const qs = (byPaper.get(p.slug) ?? []).filter((q) => !used.has(q.id));
    if (qs.length === 0) continue;
    const q = qs[Math.floor(Math.random() * qs.length)];
    chosen.push(q);
    used.add(q.id);
  }

  // weights: ×1 (perfect paper) … ×1.5 (lowest-accuracy paper)
  const weights = canonical.map(
    (p) => 1 + 0.5 * (1 - Math.min(100, save.papers[p.slug]?.quizBest ?? 0) / 100),
  );

  let guard = 0;
  while (chosen.length < count && guard++ < 200) {
    const p = canonical[weightedIndex(weights)];
    const qs = (byPaper.get(p.slug) ?? []).filter((q) => !used.has(q.id));
    if (qs.length === 0) {
      if (pool.every((q) => used.has(q.id))) break;
      continue;
    }
    const q = qs[Math.floor(Math.random() * qs.length)];
    chosen.push(q);
    used.add(q.id);
  }

  return phaseOrder(chosen);
}

/**
 * Overtime draw: the boss still has HP when the round runs out. Pull fresh
 * questions (excluding ones already used this fight); if the pool runs dry,
 * reshuffle the full pool.
 */
export function drawOvertimeQuestions(
  track: TrackId,
  exclude: ReadonlySet<string>,
  n = 3,
): BossQuestion[] {
  const pool = BOSS_POOLS[track];
  const fresh = shuffle(pool.filter((q) => !exclude.has(q.id)));
  if (fresh.length >= n) return fresh.slice(0, n);
  // pool running dry: serve what's fresh, then reshuffle the used remainder
  const rest = shuffle(pool.filter((q) => exclude.has(q.id)));
  return [...fresh, ...rest].slice(0, n);
}
