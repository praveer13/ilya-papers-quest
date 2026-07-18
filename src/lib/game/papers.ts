import type { TrackId } from './types';

/**
 * Paper roster — the 32-level content spine (design.md §13).
 * `hook` is the one-line briefing flavor used by cards; `stars` = 1..5 difficulty.
 * Bonus papers (★, num 31–32) sit outside the canonical 30.
 */

export interface Paper {
  num: number; // 1..32 (file number)
  slug: string;
  title: string;
  authors: string;
  year: number;
  source: string; // arXiv id / venue
  track: TrackId;
  xp: number; // max earnable XP on the level
  lab: string; // lab concept summary
  hook: string; // one-line mission hook
  stars: 1 | 2 | 3 | 4 | 5;
  minutes: number; // estimated completion time
  bonus: boolean;
}

export const PAPERS: Paper[] = [
  { num: 1, slug: 'char-rnn', title: 'The Unreasonable Effectiveness of Recurrent Neural Networks', authors: 'Karpathy', year: 2015, source: 'karpathy.github.io', track: 't1', xp: 420, lab: 'Temperature sampling toy: n-gram text generator with a temperature slider', hook: 'The blog post that made everyone believe RNNs could dream.', stars: 2, minutes: 25, bonus: false },
  { num: 2, slug: 'bengio-1994', title: 'Learning Long-Term Dependencies with Gradient Descent is Difficult', authors: 'Bengio, Simard, Frasconi', year: 1994, source: 'IEEE TNN', track: 't1', xp: 420, lab: 'Vanishing/exploding chain: depth slider, watch ∂ shrink or blow up across time steps', hook: 'The 1994 paper that explained why your gradients vanish into nothing.', stars: 3, minutes: 30, bonus: false },
  { num: 3, slug: 'pascanu-2013', title: 'On the Difficulty of Training Recurrent Neural Networks', authors: 'Pascanu, Mikolov, Bengio', year: 2013, source: 'arXiv:1211.5063', track: 't1', xp: 420, lab: 'Gradient clipping playground: loss-surface with cliffs, toggle clipping', hook: 'Loss surfaces have cliffs. This paper brought the climbing gear.', stars: 3, minutes: 30, bonus: false },
  { num: 4, slug: 'lstm-1997', title: 'Long Short-Term Memory', authors: 'Hochreiter & Schmidhuber', year: 1997, source: 'Neural Computation 9(8)', track: 't1', xp: 460, lab: 'Gate flow diagram: drag forget/input/output sliders, watch cell state survive 20 steps', hook: 'The gated memory cell that kept gradients alive for 20+ steps.', stars: 4, minutes: 35, bonus: false },
  { num: 5, slug: 'gru-2014', title: 'Learning Phrase Representations using RNN Encoder–Decoder', authors: 'Cho et al.', year: 2014, source: 'arXiv:1406.1078', track: 't1', xp: 420, lab: 'LSTM→GRU diff view: gates merge/reset animated as a code diff', hook: 'Same idea, fewer gates — the GRU refactor that stuck.', stars: 3, minutes: 30, bonus: false },
  { num: 6, slug: 'rnn-dropout-2014', title: 'Recurrent Neural Network Regularization', authors: 'Zaremba, Sutskever, Vinyals', year: 2014, source: 'arXiv:1409.2329', track: 't1', xp: 420, lab: 'Dropout placement: toggle dropout on recurrent vs feed-forward edges, watch val-loss curve', hook: 'Where you drop matters — regularizing RNNs without breaking memory.', stars: 2, minutes: 25, bonus: false },
  { num: 7, slug: 'complexodynamics', title: 'The First Law of Complexodynamics', authors: 'Aaronson', year: 2011, source: 'scottaaronson.blog', track: 't1', xp: 380, lab: 'Coffee-automaton complextropy curve: cellular automaton + complexity-vs-entropy plot', hook: 'Why complexity rises, then falls — the coffee-cup law of the universe.', stars: 3, minutes: 25, bonus: false },
  { num: 8, slug: 'seq2seq-2014', title: 'Sequence to Sequence Learning with Neural Networks', authors: 'Sutskever, Vinyals, Le', year: 2014, source: 'arXiv:1409.3215', track: 't2', xp: 460, lab: 'Encoder→context vector→decoder step-through animation, token by token', hook: 'Two LSTMs, one context vector — the blueprint that started it all.', stars: 3, minutes: 30, bonus: false },
  { num: 9, slug: 'bahdanau-2014', title: 'Neural Machine Translation by Jointly Learning to Align and Translate', authors: 'Bahdanau, Cho, Bengio', year: 2014, source: 'arXiv:1409.0473', track: 't2', xp: 460, lab: 'Attention heatmap: hover a French output word, see alignment weights over English input', hook: 'The paper that taught networks where to look. Attention is born.', stars: 4, minutes: 35, bonus: false },
  { num: 10, slug: 'neural-conv-2015', title: 'A Neural Conversational Model', authors: 'Vinyals, Le', year: 2015, source: 'arXiv:1506.05869', track: 't2', xp: 380, lab: 'Replica of the paper\u2019s IT-helpdesk dialogue samples; weaknesses explorer', hook: 'The IT-helpdesk bot that hinted chat might be a learning problem.', stars: 2, minutes: 20, bonus: false },
  { num: 11, slug: 'graves-handwriting-2013', title: 'Generating Sequences with Recurrent Neural Networks', authors: 'Graves', year: 2013, source: 'arXiv:1308.0850', track: 't2', xp: 420, lab: 'Handwriting synthesis: mixture-density pen strokes drawn live on canvas', hook: 'Mixture density nets make an RNN\u2019s pen dance across the page.', stars: 3, minutes: 30, bonus: false },
  { num: 12, slug: 'order-matters-2015', title: 'Order Matters: Sequence to Sequence for Sets', authors: 'Vinyals, Bengio, Kudlur', year: 2015, source: 'arXiv:1511.06391', track: 't2', xp: 420, lab: 'Shuffle-the-input: set-input task where read/attention order changes difficulty', hook: 'Sets have no order — but your model secretly needs one.', stars: 3, minutes: 25, bonus: false },
  { num: 13, slug: 'pointer-networks-2015', title: 'Pointer Networks', authors: 'Vinyals, Fortunato, Jaitly', year: 2015, source: 'arXiv:1506.03134', track: 't2', xp: 460, lab: 'Click points on a plane → watch pointer-attention build a convex hull step by step', hook: 'When the output is positions in the input, point instead of generate.', stars: 4, minutes: 30, bonus: false },
  { num: 14, slug: 'transformer-2017', title: 'Attention Is All You Need', authors: 'Vaswani et al.', year: 2017, source: 'arXiv:1706.03762', track: 't2', xp: 500, lab: 'Self-attention playground: hover tokens, see Q·K attention lines + multi-head split', hook: 'The architecture that ate the world. Eight heads, zero recurrence.', stars: 5, minutes: 45, bonus: false },
  { num: 15, slug: 'annotated-transformer', title: 'The Annotated Transformer', authors: 'Rush (Harvard NLP)', year: 2018, source: 'nlp.seas.harvard.edu', track: 't2', xp: 380, lab: 'Line-by-line annotated code walkthrough with linked diagram highlights', hook: 'The Transformer, but as commented code you can actually run.', stars: 3, minutes: 35, bonus: false },
  { num: 16, slug: 'relational-rnn-2018', title: 'Relational Recurrent Neural Networks', authors: 'Santoro et al.', year: 2018, source: 'arXiv:1806.01822', track: 't2', xp: 420, lab: 'Memory slots attending to each other: RMC vs LSTM on a sequence recall toy', hook: 'Give memory slots self-attention and recall gets relational.', stars: 4, minutes: 30, bonus: false },
  { num: 17, slug: 'relational-reasoning-2017', title: 'A Simple Neural Network Module for Relational Reasoning', authors: 'Santoro et al.', year: 2017, source: 'arXiv:1706.01427', track: 't2', xp: 420, lab: 'Sort-of-CLEVR mini: answer relational questions over a generated object grid', hook: 'A tiny MLP over object pairs that learns to reason about relations.', stars: 3, minutes: 25, bonus: false },
  { num: 18, slug: 'ntm-2014', title: 'Neural Turing Machines', authors: 'Graves, Wayne, Danihelka', year: 2014, source: 'arXiv:1410.5401', track: 't2', xp: 460, lab: 'Memory matrix read/write head heat animation stepping through a copy task', hook: 'A neural net with malloc — differentiable memory you can address.', stars: 4, minutes: 35, bonus: false },
  { num: 19, slug: 'alexnet-2012', title: 'ImageNet Classification with Deep Convolutional Neural Networks', authors: 'Krizhevsky, Sutskever, Hinton', year: 2012, source: 'NeurIPS 2012', track: 't3', xp: 500, lab: 'Conv explorer: apply real kernels (edge/blur/sharpen) to an image on canvas', hook: 'The 2012 Big Bang: GPUs, ReLUs, and deep learning\u2019s decade begins.', stars: 3, minutes: 35, bonus: false },
  { num: 20, slug: 'resnet-2015', title: 'Deep Residual Learning for Image Recognition', authors: 'He, Zhang, Ren, Sun', year: 2015, source: 'arXiv:1512.03385', track: 't3', xp: 460, lab: 'Skip-highway: toggle residual connections at depth 50, watch gradient magnitude by layer', hook: 'One skip connection to rule depth — 152 layers and still trainable.', stars: 4, minutes: 35, bonus: false },
  { num: 21, slug: 'identity-mappings-2016', title: 'Identity Mappings in Deep Residual Networks', authors: 'He et al.', year: 2016, source: 'arXiv:1603.05027', track: 't3', xp: 420, lab: 'Pre-activation vs post-activation block AB test; signal propagation tracer', hook: 'Keep the highway clean: why identity shortcuts must stay untouched.', stars: 3, minutes: 30, bonus: false },
  { num: 22, slug: 'dilated-conv-2015', title: 'Multi-Scale Context Aggregation by Dilated Convolutions', authors: 'Yu, Koltun', year: 2015, source: 'arXiv:1511.07122', track: 't3', xp: 420, lab: 'Dilation slider 1→2→4→8: receptive field expands exponentially on a grid', hook: 'See more without shrinking: holes in the kernel, exponential reach.', stars: 3, minutes: 25, bonus: false },
  { num: 23, slug: 'batchnorm-2015', title: 'Batch Normalization', authors: 'Ioffe, Szegedy', year: 2015, source: 'arXiv:1502.03167', track: 't4', xp: 460, lab: 'Internal covariate shift: drag batch mean/var, watch normalized activations stabilize', hook: 'Normalize every layer\u2019s inputs and training stops fighting itself.', stars: 3, minutes: 30, bonus: false },
  { num: 24, slug: 'he-init-2015', title: 'Delving Deep into Rectifiers', authors: 'He, Zhang, Ren, Sun', year: 2015, source: 'arXiv:1502.01852', track: 't4', xp: 420, lab: 'Init scale slider: activation histograms across 20 layers — dying vs exploding', hook: 'One sqrt(2/n) that decides if your signal survives 20 layers.', stars: 3, minutes: 30, bonus: false },
  { num: 25, slug: 'dropout-2014', title: 'Dropout: A Simple Way to Prevent Neural Networks from Overfitting', authors: 'Srivastava et al.', year: 2014, source: 'arXiv:1207.0580', track: 't4', xp: 420, lab: 'Click neurons to drop; ensemble/weight-shrink intuition with live train/val gap', hook: 'Train an exponential ensemble by randomly silencing neurons.', stars: 2, minutes: 25, bonus: false },
  { num: 26, slug: 'adam-2014', title: 'Adam: A Method for Stochastic Optimization', authors: 'Kingma, Ba', year: 2014, source: 'arXiv:1412.6980', track: 't4', xp: 460, lab: 'Optimizer race: SGD vs momentum vs Adam balls on a ravine loss surface', hook: 'The default optimizer — momentum with a per-parameter learning rate.', stars: 3, minutes: 30, bonus: false },
  { num: 27, slug: 'mdl-1993', title: 'Keeping Neural Networks Simple by Minimizing the Description Length of the Weights', authors: 'Hinton, van Camp', year: 1993, source: 'COLT 1993', track: 't4', xp: 420, lab: 'Description-length budget bars: bits for model vs bits for errors, gzip analogy', hook: 'Occam as an objective: count the bits in your weights.', stars: 4, minutes: 30, bonus: false },
  { num: 28, slug: 'deep-speech-2014', title: 'Deep Speech: Scaling up End-to-End Speech Recognition', authors: 'Hannun et al.', year: 2014, source: 'arXiv:1412.5567', track: 't5', xp: 460, lab: 'Spectrogram + CTC alignment: watch characters align to audio frames', hook: 'End-to-end speech: spectrogram in, characters out, no phoneme pipeline.', stars: 4, minutes: 35, bonus: false },
  { num: 29, slug: 'vlae-2016', title: 'Variational Lossy Autoencoder', authors: 'Chen et al.', year: 2016, source: 'arXiv:1611.02731', track: 't5', xp: 460, lab: 'Latent-space walk: drag a point in 2D latent space, decode procedural shapes', hook: 'Lossy on purpose — choose what the latent code should remember.', stars: 4, minutes: 35, bonus: false },
  { num: 30, slug: 'scaling-laws-2020', title: 'Scaling Laws for Neural Language Models', authors: 'Kaplan et al.', year: 2020, source: 'arXiv:2001.08361', track: 't5', xp: 500, lab: 'Power-law playground: sliders for params/data/compute on log-log loss curves', hook: 'Loss falls as a power law — the physics equation of modern AI.', stars: 4, minutes: 40, bonus: false },
  { num: 31, slug: 'gpipe-2018', title: 'GPipe: Easy Scaling with Micro-Batch Pipeline Parallelism', authors: 'Huang et al.', year: 2018, source: 'arXiv:1811.06965', track: 't5', xp: 380, lab: 'Pipeline Gantt: micro-batches flowing through 4 accelerators, bubble visualization', hook: 'Bonus level: slice batches into micro-batches and fill the pipeline.', stars: 3, minutes: 25, bonus: true },
  { num: 32, slug: 'mpnn-2017', title: 'Neural Message Passing for Quantum Chemistry', authors: 'Gilmer et al.', year: 2017, source: 'arXiv:1704.01212', track: 't5', xp: 380, lab: 'Molecule graph: click an atom, watch message passing aggregate over 3 steps', hook: 'Bonus level: graph nets that predict chemistry by passing messages.', stars: 4, minutes: 30, bonus: true },
];

export const CANONICAL_COUNT = 30; // canonical papers (bonus excluded)

export function paperBySlug(slug: string): Paper | undefined {
  return PAPERS.find((p) => p.slug === slug);
}

export function papersByTrack(track: TrackId): Paper[] {
  return PAPERS.filter((p) => p.track === track);
}

/** file label, e.g. "FILE 014" */
export function fileLabel(p: Paper): string {
  return `FILE ${String(p.num).padStart(3, '0')}`;
}
