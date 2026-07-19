import type { PaperContent } from './schema';

/**
 * TRACK 1 - Foundations & Recurrent Nets (papers 1-7, cyan).
 * Content per paper.md §8 briefs, expanded to full §6 depth.
 */

export const track1Papers: PaperContent[] = [
  // -----------------------------------------------------------------------
  // 01 · char-rnn
  // -----------------------------------------------------------------------
  {
    slug: 'char-rnn',
    venue: 'karpathy.github.io (blog post)',
    sourceUrl: 'https://karpathy.github.io/2015/05/21/rnn-effectiveness/',
    briefing: {
      paragraphs: [
        'In 2015 Andrej Karpathy trained a character-level recurrent neural network on Shakespeare, Wikipedia, LaTeX and Linux source code - and showed the samples to the internet. The model invented plausible character names, mostly-balanced XML tags, and C code with fake comments and plausible-but-wrong variable names. It was the first public demonstration that a neural net could learn the *statistical structure* of text well enough to dream in it.',
        'Under the hood the idea is almost insultingly simple: predict the next character from the previous characters, train by gradient descent, then sample one character at a time and feed the sample back as the next input. No tokenizer, no features, no rules - just a loop, a hidden state, and a lot of text.',
        'This post turned a niche technique into a movement. A generation of engineers (and more than a few researchers) got their start by training char-rnn on their own text dumps. The specific architecture is now obsolete, but the loop - predict next token, sample, feed back - is exactly how every modern LLM generates text today.',
      ],
      stakes: 'without this demo, "neural nets can write" stays a research rumor. this is the post that made it obvious.',
    },
    eliEngineer: {
      prose: [
        'Think of an RNN as a `while` loop that carries one piece of mutable state — the hidden vector h — between iterations. A vector is just a fixed-length list of numbers. Each step reads one character, updates that list, and emits a probability distribution: a list of chances for every possible next character, adding to 100%. h is the model\'s entire memory, a compressed summary of everything seen so far.',
        'The exact goal is to learn P(next character | every character seen so far). Take a real slice such as `hello`. It creates four supervised cases at once: read `h`, label `e`; read `e` after `h`, label `l`; read the first `l` after `he`, label the second `l`; read the second `l` after `hel`, label `o`. The model is rewarded when it assigns high probability to each real label.',
        'Teacher forcing names where the training inputs come from: at step t, x_t is the real character c_t from the dataset, and the label is the real next character c_{t+1}. The model still predicts before seeing that label. Its guess receives a loss—a wrongness score based on the probability assigned to the real answer—but its guessed character is not fed into the next training step; the next real character is.',
        'One training update has two passes. First run left-to-right, saving each intermediate result and wrongness score. Then backpropagation through time (BPTT) walks those recorded calculations right-to-left and works out how each adjustable weight contributed to the errors. Finally an optimizer such as SGD or Adam changes the weights once. Long text is split into shorter windows and revisited over multiple passes called epochs. There is no special replay buffer: “replay” usually just means rerunning a window or this page\'s animation.',
        'Generation is not training in reverse; it is the same forward recurrence with the targets, loss, backward pass, and optimizer removed. Run the prompt through the RNN to initialize h, sample one next character from p, feed that sampled character back in, update h, and repeat. Because future real characters are unknown, the model is now free-running on its own outputs.',
        'Argmax always chooses the highest-probability character. It is deterministic and can fall into repetitive cycles, although it does not literally loop for every model. Sampling chooses according to the full list of chances. Before those chances exist, the model produces logits—raw preference scores—and softmax converts them into probabilities totaling 100%. A `temperature` T rescales the logits first: T<1 sharpens the probabilities, T=1 leaves them unchanged, and T>1 flattens them. Temperature changes decoding randomness, not what the network learned.',
      ],
      code: {
        lang: 'python',
        file: 'char_rnn.py',
        snippet: `# TRAIN ONE TEXT WINDOW c[0:L+1]
h = zeros(HIDDEN)
loss = 0
cache = []
for t in range(L):
    x = onehot(c[t])                        # real current character
    y = index(c[t + 1])                     # real next-character label
    a = W_xh @ x + W_hh @ h + b_h          # raw state update
    h = tanh(a)                             # bounded, signed memory
    z = W_hy @ h + b_y                      # logits: one score / character
    p = softmax(z)                          # training uses T = 1
    loss += -log(p[y])                      # cross-entropy for this position
    cache.append((x, a, h, p, y))           # needed by chain rule

grads = backprop_through_time(cache)         # walk cached steps right → left
optimizer.step([W_xh, W_hh, W_hy, b_h, b_y], grads)

# GENERATE: forward only; no labels, loss, gradients, or weight updates
h = zeros(HIDDEN)
for ch in prompt:                           # warm up state on the real prompt
    h = tanh(W_xh @ onehot(ch) + W_hh @ h + b_h)

for _ in range(500):
    z = W_hy @ h + b_y
    p = softmax(z / temperature)
    ch = sample(p)                          # draw, do not always take argmax
    yield ch
    h = tanh(W_xh @ onehot(ch) + W_hh @ h + b_h)`,
      },
    },
    intuitions: [
      {
        title: 'The hidden state is a running accumulator',
        body: 'h is updated every step by adding new input into an old memory. Like a hand-rolled aggregate in a reduce loop, it must compress everything seen so far into a fixed-size vector. That fixed size is why long-range facts get squeezed out - the motivation for LSTMs and, later, attention.',
        more: 'Karpathy visualized individual neurons in h and found interpretable ones: a cell tracking whether the text is inside quotes, another tracking line length, another tracking nesting depth of code. The accumulator learns *features* because they help prediction.',
      },
      {
        title: 'Temperature is a creativity dial',
        body: 'Dividing logits by T before softmax sharpens (T<1) or flattens (T>1) the distribution. T→0 is greedy decoding: deterministic, repetitive. T=1 samples honestly. T>1 flattens toward uniform - more surprise, more typos. Every "creativity" slider in modern LLM UIs is this exact knob.',
        more: 'Mathematically: p_i ∝ exp(logit_i / T). Temperature can\'t add quality - it only trades diversity against precision. The sweet spot for char-rnn Shakespeare was around 0.5-0.8.',
      },
      {
        title: 'The model learns syntax before semantics',
        body: 'Watch samples as training progresses: first it learns spaces and vowels, then words, then local grammar, then balanced parentheses and LaTeX environments - long before any meaning appears. Structure is a cheaper signal than semantics, so it is learned first.',
        more: 'The famous Linux-kernel samples had correct-looking includes, indentation, and even matching braces - but hallucinated function names. It\'s a compiler-front-end\'s dream and a semanticist\'s nightmare.',
      },
      {
        title: 'Characters were a feature, not a limitation',
        body: 'Working at character level meant no tokenizer, no out-of-vocabulary problem, and a tiny output alphabet (~100 classes). The model had to *discover* words from scratch - proving the learning signal alone could find them. The price: it must spend capacity learning spelling that word-level models get for free.',
      },
    ],
    mechanism: {
      latex: '\\begin{aligned} a_t &= W_{xh}x_t + W_{hh}h_{t-1} + b_h \\\\ h_t &= \\tanh(a_t) \\\\ z_t &= W_{hy}h_t + b_y \\\\ p_t &= \\operatorname{softmax}(z_t) \\\\ \\mathcal L &= -\\sum_t \\log p_t[y_t] \\\\ p_t^{(T)} &= \\operatorname{softmax}(z_t/T) \\quad \\text{(generation only)} \\end{aligned}',
      terms: [
        { symbol: 'x_t', meaning: 'one-hot vector for the character read at position t' },
        { symbol: 'a_t', meaning: 'raw pre-activation: input evidence plus transformed previous memory and a bias' },
        { symbol: 'h_t', meaning: 'new hidden vector; every coordinate is between -1 and 1 after tanh' },
        { symbol: 'W_{xh}', meaning: 'learned input matrix: how each character writes into hidden state' },
        { symbol: 'W_{hh}', meaning: 'learned recurrent matrix: how the previous hidden state affects the next one' },
        { symbol: 'z_t', meaning: 'logits - unrestricted scores over the whole character vocabulary' },
        { symbol: 'p_t', meaning: 'softmax turns logits into non-negative probabilities that sum to 1' },
        { symbol: 'y_t', meaning: 'index of the real next character during training: y_t = c_{t+1}' },
        { symbol: '\\mathcal L', meaning: 'negative log-likelihood / cross-entropy summed across the text window' },
        { symbol: 'T', meaning: 'generation-time temperature; rescales logits before sampling but does not retrain weights' },
      ],
      diagram: {
        height: 54,
        nodes: [
          { id: 'x', x: 10, y: 30, label: 'x_t', sub: 'one-hot real character in training; prior sample in generation', kind: 'io', w: 13 },
          { id: 'hprev', x: 27, y: 9, label: 'h_{t-1}', sub: 'prefix memory from the previous step', kind: 'mem', w: 16 },
          { id: 'cell', x: 30, y: 30, label: 'tanh cell', sub: 'a_t = W_xh x_t + W_hh h_prev + b; h_t = tanh(a_t)', kind: 'box', w: 21 },
          { id: 'h', x: 48, y: 9, label: 'h_t', sub: 'cached for BPTT and carried to the next time step', kind: 'mem', w: 14 },
          { id: 'logits', x: 55, y: 30, label: 'logits z_t', sub: 'one unrestricted score per possible next character', kind: 'box', w: 18 },
          { id: 'prob', x: 77, y: 30, label: 'softmax p_t', sub: 'probabilities over the next character', kind: 'box', w: 19 },
          { id: 'target', x: 55, y: 47, label: 'real y_t', sub: 'dataset next character; training only', kind: 'io', w: 15 },
          { id: 'loss', x: 77, y: 47, label: '-log p[y]', sub: 'per-position training loss; gradients flow backward', kind: 'op', w: 18 },
          { id: 'sample', x: 93, y: 12, label: 'sample', sub: 'generation only: draw a character and feed it back', kind: 'io', w: 13 },
        ],
        edges: [
          { from: 'x', to: 'cell', label: 'input' },
          { from: 'hprev', to: 'cell', label: 'memory' },
          { from: 'cell', to: 'h', label: 'carry' },
          { from: 'cell', to: 'logits' },
          { from: 'logits', to: 'prob' },
          { from: 'prob', to: 'loss', label: 'prediction' },
          { from: 'target', to: 'loss', label: 'label' },
          { from: 'prob', to: 'sample', label: 'draw', dashed: true },
          { from: 'sample', to: 'x', label: 'next input', dashed: true },
          { from: 'loss', to: 'cell', label: 'BPTT updates shared θ', dashed: true },
        ],
      },
      caption: 'Training uses the solid dataset path and a loss; BPTT follows the loss backward into the shared cell weights. Generation removes the target/loss and uses the dashed sample-feedback path. "Unrolling" draws repeated uses of this one shared cell across time-it does not create different weights per position.',
    },
    lab: {
      name: 'temperature sampling toy',
      hint: 'drag the temperature slider · generate · watch text melt and refreeze',
      completion: 'generate at least 3 samples across both low and high temperature ranges',
    },
    bugs: [
      {
        title: 'argmax decoding "should" be best - it often enters cycles',
        fix: 'greedy decoding picks the single most likely next character at every step. that deterministic state/output loop can become repetitive ("the the the"). sampling preserves likely choices while occasionally taking an alternative; it reduces this failure mode but cannot guarantee good text.',
      },
      {
        title: 'temperature > 1 doesn\'t make the model smarter',
        fix: 'high T only flattens the output distribution - it samples more rare tokens, including the mistakes. creativity ↑, correctness ↓. there is no free lunch in the softmax.',
      },
      {
        title: 'teacher forcing is not "cheating"',
        fix: 'the model predicts before the real next-character label is used. feeding the known real prefix evaluates the exact likelihood factors in the training text and gives a differentiable loss at every position. the real limitation is exposure bias: generation later runs on prefixes containing its own mistakes.',
      },
    ],
    fieldNotes: {
      buildsOn: ['lstm-1997', 'bengio-1994'],
      unlocks: ['seq2seq-2014', 'graves-handwriting-2013'],
      further: [
        { label: 'the original post - karpathy.github.io', url: 'https://karpathy.github.io/2015/05/21/rnn-effectiveness/' },
        { label: 'karpathy\'s char-rnn code (torch)', url: 'https://github.com/karpathy/char-rnn' },
        { label: 'companion lecture: CS231n RNN notes', url: 'https://cs231n.github.io/rnn/' },
      ],
      citation: `@misc{karpathy2015unreasonable,\n  author = {Karpathy, Andrej},\n  title = {The Unreasonable Effectiveness of Recurrent Neural Networks},\n  year = {2015},\n  howpublished = {\\url{https://karpathy.github.io/2015/05/21/rnn-effectiveness/}}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'In a char-RNN, what is the hidden state h?',
        options: [
          'A fixed-size vector that carries a compressed memory of all characters seen so far',
          'The one-hot encoding of the current character',
          'A cache of the last 100 characters, stored explicitly',
          'The gradient accumulator used during backprop',
        ],
        answer: 0,
        why: 'h is the model\'s only memory: updated every step, fixed size, and everything long-range must be squeezed into it.',
        tag: 'eli-engineer',
      },
      {
        type: 'mcq',
        q: 'What is "teacher forcing"?',
        options: [
          'Feeding the model the real previous character during training and asking it to predict the real next one',
          'Forcing the learning rate to decay on a schedule',
          'Clipping gradients that exceed a threshold',
          'Feeding the model its own samples during training',
        ],
        answer: 0,
        why: 'Teacher forcing turns sequence prediction into per-step supervised classification with ground-truth context.',
        tag: 'eli-engineer',
      },
      {
        type: 'mcq',
        q: 'For the training slice `hello`, what are the first input and label?',
        options: [
          'Input `h`, label `e`',
          'Input `e`, label `h`',
          'Input the whole word, label `hello`',
          'Input a sampled character, with no label',
        ],
        answer: 0,
        why: 'Next-character training shifts the same real sequence by one position: inputs `hell`, labels `ello`.',
        tag: 'eli-engineer',
      },
      {
        type: 'mcq',
        q: 'What does backpropagation through time do after the forward pass?',
        options: [
          'Walks cached timesteps right-to-left and accumulates gradients for the shared weights',
          'Feeds sampled characters back until the model writes the training text',
          'Creates a different set of RNN weights for every position',
          'Replays the audio pronunciation of every character',
        ],
        answer: 0,
        why: 'Unrolling exposes the repeated computation graph; BPTT applies the chain rule backward through it, summing contributions into the same matrices.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Why is every coordinate of tanh(a) between -1 and 1?',
        options: [
          '|e^a - e^(-a)| is always smaller than e^a + e^(-a)',
          'The optimizer clips tanh after every update',
          'Softmax normalizes the hidden state',
          'One-hot inputs can only contain zeros and ones',
        ],
        answer: 0,
        why: 'tanh is a difference of two positive exponentials divided by their sum, so the numerator can never exceed the denominator in magnitude.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'What does lowering the sampling temperature (T < 1) do?',
        options: [
          'Sharpens the output distribution - safer, more repetitive text',
          'Flattens the output distribution - wilder, more error-prone text',
          'Speeds up training convergence',
          'Reduces the size of the hidden state',
        ],
        answer: 0,
        why: 'Dividing logits by T<1 amplifies differences, so sampling concentrates on likely characters.',
        tag: 'mechanism',
      },
      {
        type: 'tf',
        q: 'True or false: greedy (argmax) decoding tends to produce repetitive loops.',
        answer: true,
        why: 'Argmax is deterministic given the state, so it can fall into cycles like "the the the"; sampling sometimes takes lower-ranked alternatives and can break a cycle.',
        tag: 'bugs',
      },
      {
        type: 'order',
        q: 'Order the generation loop for one character:',
        items: [
          'update hidden state h from current character',
          'compute logits W_hy · h',
          'apply softmax with temperature',
          'sample a character and feed it back as the next input',
        ],
        answer: [0, 1, 2, 3],
        why: 'State first, then scores, then distribution, then the sample that becomes the next step\'s input.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Why did character-level modeling matter in 2015?',
        options: [
          'It proved a pure learning signal could discover words and syntax from raw characters - no tokenizer or hand features',
          'It was the first model to use GPUs',
          'It outperformed all word-level models on translation',
          'Characters have fewer classes, so training needs no gradients',
        ],
        answer: 0,
        why: 'No tokenization, no OOV, ~100 output classes - and the model still discovered words, grammar, even code indentation.',
        tag: 'briefing',
      },
      {
        type: 'tf',
        q: 'True or false: char-RNN samples typically show correct syntax (balanced brackets, indentation) before any real semantics.',
        answer: true,
        why: 'Local structure is a cheaper statistical signal than meaning, so it is learned earlier in training.',
        tag: 'intuitions',
      },
      {
        type: 'fill',
        q: 'p = softmax( (W_hy · h) / ___ ) - the dial that trades diversity against precision',
        tokens: ['temperature', 'learning_rate', 'hidden_size', 'dropout'],
        answer: ['temperature'],
        why: 'Temperature rescales logits before softmax; it is the same knob behind modern LLM "creativity" sliders.',
        tag: 'mechanism',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 02 · bengio-1994
  // -----------------------------------------------------------------------
  {
    slug: 'bengio-1994',
    venue: 'IEEE Transactions on Neural Networks 5(2)',
    sourceUrl: 'https://doi.org/10.1109/72.279181',
    briefing: {
      paragraphs: [
        'By the early 1990s recurrent networks could be trained with backpropagation through time (BPTT) - in theory. In practice they stubbornly failed to learn dependencies more than a few steps apart. Bengio, Simard and Frasconi showed why, with math that is now the standard diagnosis: gradients propagated backwards through time are products of many small matrices, and long products do one of two things - collapse to zero or blow up.',
        'The paper frames training as a dynamical-systems problem. When the recurrent weight matrix has eigenvalues below 1, error signals shrink exponentially with the distance they travel; above 1, they grow exponentially. Either way, the gradient that reaches the distant past carries almost no useful signal relative to noise, so the network cannot learn to store and use long-term information.',
        'This is the founding document of the "vanishing/exploding gradients" research program. LSTMs (1997), gradient clipping (2013), careful initialization, residual connections, and eventually attention architectures are all, in part, answers to the problem this paper pinned down.',
      ],
      stakes: 'without this diagnosis, deep sequence modeling has no name for its core disease - every fix since is a treatment for it.',
    },
    eliEngineer: {
      prose: [
        'BPTT is what you get when you unroll a recursive function into a long stack and then run the chain rule down the stack. The gradient at step t is the gradient at the final step multiplied by the Jacobian of every step in between: a product of T-t matrices.',
        'Now think about multiplying 50 numbers together. If most are 0.9, the product is 0.005 - the signal dies. If most are 1.1, the product is 117 - the signal explodes. Matrices behave the same way, with eigenvalues in the role of "most numbers".',
        'Vanishing is the nastier failure in practice: exploding gradients are at least visible (NaNs, loss spikes), but vanishing gradients are silent. The network simply never learns long-range patterns, and you can\'t tell from the loss curve that the signal died 30 steps ago.',
      ],
      code: {
        lang: 'python',
        file: 'bptt_chain.py',
        snippet: `# backprop through time = chain rule over an unrolled stack
# dL/dh_t = dL/dh_T * Π (J_k)   for k = t+1 .. T
# where J_k = W^T · diag(φ'(h_{k-1}))

def grad_through_time(J: list[Matrix]) -> Matrix:
    g = identity()                    # start at the loss
    for J_k in reversed(J):           # walk backwards in time
        g = g @ J_k                   # one more factor per step
        # if ||J_k|| < 1:  g shrinks ~exponentially  -> vanishing
        # if ||J_k|| > 1:  g grows  ~exponentially  -> exploding
    return g

# distance 50, per-step factor 0.9: 0.9**50 ≈ 0.005  (signal dead)
# distance 50, per-step factor 1.1: 1.1**50 ≈ 117    (signal blown)`,
      },
    },
    intuitions: [
      {
        title: 'Gradients are a game of telephone',
        body: 'Each timestep re-transmits the error signal through one more multiplication. After 30 hops through a "lossy channel" with gain 0.9, the message is 4% of its original volume - and after 50 hops, half a percent. The past can\'t hear the future\'s corrections.',
        more: 'It\'s worse than telephone: the channel is *learned*. Early in training the recurrent weights are random, usually with spectral radius near 1 or below, so the channel starts lossy and the network never gets the signal it needs to fix it - a catch-22.',
      },
      {
        title: 'It\'s compounding rounding error, not "depth"',
        body: 'The failure isn\'t that there are many steps; it\'s that products of numbers below 1 collapse exponentially. The same math governs compound interest, feedback loops, and recursive filters. Time horizon, not layer count, is the killer - a 1000-step RNN is a 1000-deep network with *shared* weights.',
        more: 'Weight sharing is key: the same matrix is multiplied every step, so its eigenvalues dominate the product. In a plain deep net each layer has different weights and the product is less systematically aligned.',
      },
      {
        title: 'Vanishing is silent; exploding is loud',
        body: 'Exploding gradients announce themselves - loss spikes, NaNs, overflow. Vanishing gradients look like a model that just plateaus. That asymmetry shaped the next 20 years of research: clipping handles the loud failure in one line; the silent one needed new architectures (LSTM) or new priors (residual/attention).',
      },
      {
        title: 'Storing bits is easy; retrieving them is hard',
        body: 'The paper also analyzed the *storage* side: to remember a bit for T steps, the network must keep its dynamics on an "attractor" for that long while inputs keep arriving. Noise tolerance and long storage fight each other - robust latching needs saturated units, but saturated units have tiny derivatives, which worsens vanishing.',
        more: 'This is the "latching dilemma": σ and tanh saturate at their extremes, where φ\' ≈ 0 - exactly where you\'d want to park a memory. The LSTM\'s linear cell state was designed to escape this trap.',
      },
    ],
    mechanism: {
      latex: '\\frac{\\partial \\mathcal{L}}{\\partial h_t} = \\frac{\\partial \\mathcal{L}}{\\partial h_T} \\prod_{k=t+1}^{T} \\underbrace{W^{\\!\\top} \\mathrm{diag}\\!\\big(\\varphi\'(h_{k-1})\\big)}_{\\text{per-step Jacobian } J_k}',
      terms: [
        { symbol: '\\frac{\\partial \\mathcal{L}}{\\partial h_t}', meaning: 'error signal reaching step t - what the distant past gets to learn from' },
        { symbol: '\\prod_{k=t+1}^{T}', meaning: 'product over every timestep between t and the end - one matrix multiply per hop' },
        { symbol: 'W^{\\!\\top}', meaning: 'the recurrent weights, transposed - the same matrix every single step' },
        { symbol: '\\varphi\'(h_{k-1})', meaning: 'derivative of the activation (tanh/σ); ≤ 1 and ≈ 0 in saturated regions' },
        { symbol: 'J_k', meaning: 'the per-step Jacobian; its eigenvalues decide whether the product vanishes or explodes' },
        { symbol: 'T - t', meaning: 'the time distance - the exponent. long-range = long product' },
      ],
      diagram: {
        height: 48,
        nodes: [
          { id: 'h0', x: 10, y: 18, label: 'h_t', sub: 'the distant past', kind: 'mem', w: 12 },
          { id: 'h1', x: 32, y: 18, label: 'h_{t+1}', kind: 'mem', w: 14 },
          { id: 'h2', x: 54, y: 18, label: '···', sub: 'many steps later', kind: 'mem', w: 12 },
          { id: 'h3', x: 76, y: 18, label: 'h_T', sub: 'the end, near the loss', kind: 'mem', w: 12 },
          { id: 'L', x: 92, y: 18, label: 'L', sub: 'the loss', kind: 'io', w: 8 },
        ],
        edges: [
          { from: 'h0', to: 'h1', label: 'W' },
          { from: 'h1', to: 'h2', label: 'W' },
          { from: 'h2', to: 'h3', label: 'W' },
          { from: 'h3', to: 'L' },
          { from: 'L', to: 'h0', label: '∂ shrinks ×J each hop', dashed: true },
        ],
      },
      caption: 'Forward: the chain of hidden states. Backward (dashed): the gradient is re-multiplied by the per-step Jacobian at every hop - products of factors < 1 vanish, > 1 explode.',
    },
    lab: {
      name: 'vanishing/exploding chain',
      hint: 'drag the depth slider · watch the gradient die or blow up across time steps',
      completion: 'explore both regimes: a per-step gain below 1 (vanishing) and above 1 (exploding)',
    },
    bugs: [
      {
        title: '"just use a bigger learning rate" does not fix vanishing gradients',
        fix: 'the gradient is exponentially small *relative to noise* - scaling everything up scales the noise too, and explodes the near-term terms. the problem is the product structure, not the step size.',
      },
      {
        title: 'vanishing ≠ "the loss is small"',
        fix: 'the loss can look fine (the model fits short-range patterns well) while gradients to the distant past are exactly zero. silent failure: check the *norm of gradients per layer/time*, not the loss.',
      },
      {
        title: 'exploding gradients are not the main obstacle to long-term memory',
        fix: 'explosion is dramatic but easy to detect and cheap to patch (clipping). the 1994 result is that vanishing is the *default* regime in random-weight RNNs - and it blocks learning, not just stability.',
      },
    ],
    fieldNotes: {
      buildsOn: ['char-rnn'],
      unlocks: ['lstm-1997', 'pascanu-2013', 'resnet-2015'],
      further: [
        { label: 'original paper (IEEE Xplore, DOI)', url: 'https://doi.org/10.1109/72.279181' },
        { label: 'companion: Pascanu et al. 2013, "On the difficulty of training RNNs"', url: 'https://arxiv.org/abs/1211.5063' },
        { label: 'colah: understanding LSTM networks', url: 'https://colah.github.io/posts/2015-08-Understanding-LSTMs/' },
      ],
      citation: `@article{bengio1994learning,\n  author = {Bengio, Yoshua and Simard, Patrice and Frasconi, Paolo},\n  title = {Learning Long-Term Dependencies with Gradient Descent is Difficult},\n  journal = {IEEE Transactions on Neural Networks},\n  volume = {5}, number = {2}, pages = {157--166}, year = {1994},\n  doi = {10.1109/72.279181}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'Why do gradients vanish in long RNN chains?',
        options: [
          'The backward signal is a product of many per-step Jacobians; factors below 1 compound exponentially toward zero',
          'The learning rate decays to zero over long sequences',
          'Tanh outputs are bounded, so the loss cannot grow',
          'The hidden state runs out of capacity to store gradients',
        ],
        answer: 0,
        why: 'BPTT multiplies one Jacobian per timestep. Products of numbers < 1 collapse exponentially in the distance T-t.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Why is vanishing usually a *harder* problem than exploding?',
        options: [
          'It fails silently - the loss plateaus while long-range gradients carry no signal, so nothing looks broken',
          'There is no known fix for it even today',
          'It makes the weights overflow to NaN',
          'It only affects the first layer of the network',
        ],
        answer: 0,
        why: 'Explosion shows up as NaNs and spikes; vanishing just looks like a model that never learns long dependencies.',
        tag: 'intuitions',
      },
      {
        type: 'mcq',
        q: 'What property of the recurrent weight matrix W mainly decides vanish vs explode?',
        options: [
          'Its eigenvalues (spectral radius): below 1 shrinks the signal, above 1 amplifies it',
          'Its number of rows',
          'Whether it uses float32 or float64',
          'Its initialization seed',
        ],
        answer: 0,
        why: 'The same W multiplies every step, so its eigenvalues are raised to the power T-t in the gradient product.',
        tag: 'mechanism',
      },
      {
        type: 'tf',
        q: 'True or false: a 500-step RNN behaves, for gradient purposes, like a 500-layer network with shared weights.',
        answer: true,
        why: 'Unrolling time gives one "layer" per step, all using the same recurrent matrix - that sharing is what makes the product so systematic.',
        tag: 'eli-engineer',
      },
      {
        type: 'mcq',
        q: 'The "latching dilemma" described in the paper is:',
        options: [
          'Robust storage needs saturated units, but saturated units have ≈0 derivatives - which kills the gradient you need to learn storage',
          'Latches in digital circuits are too slow for neural networks',
          'The hidden state can only store one bit per neuron',
          'Dropout latches onto the wrong neurons during training',
        ],
        answer: 0,
        why: 'To hold a bit for long, dynamics must sit at an attractor (saturated σ/tanh, φ\'≈0) - exactly where gradients vanish hardest.',
        tag: 'intuitions',
      },
      {
        type: 'tf',
        q: 'True or false: increasing the learning rate is a reliable cure for vanishing gradients.',
        answer: false,
        why: 'The gradient vanishes relative to noise; scaling rescales noise too and destabilizes the well-conditioned short-range terms.',
        tag: 'bugs',
      },
      {
        type: 'order',
        q: 'Order the chain-rule steps for the gradient reaching h_t:',
        items: [
          'start with ∂L/∂h_T at the final step',
          'multiply by the Jacobian J_k of each later step',
          'repeat the multiplication T-t times',
          'the product lands at h_t - exponentially shrunk or grown',
        ],
        answer: [0, 1, 2, 3],
        why: 'BPTT is literally the chain rule unrolled: one Jacobian factor per timestep between the loss and the target step.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Which later invention most directly attacks the problem this paper diagnosed?',
        options: [
          'The LSTM cell state - a linear path that lets error flow across time without repeated shrinking',
          'Softmax output layers',
          'One-hot encodings',
          'Minibatching',
        ],
        answer: 0,
        why: 'LSTM\'s constant-error carousel keeps the recurrent derivative ≈1, so the product no longer collapses.',
        tag: 'field-notes',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 03 · pascanu-2013
  // -----------------------------------------------------------------------
  {
    slug: 'pascanu-2013',
    venue: 'ICML 2013 · arXiv:1211.5063',
    sourceUrl: 'https://arxiv.org/abs/1211.5063',
    briefing: {
      paragraphs: [
        'Nearly two decades after Bengio\'s 1994 diagnosis, Pascanu, Mikolov and Bengio revisited the difficulty of training RNNs with fresh experiments and a cleaner picture of the loss surface. Their key image: the error surface of a recurrent network contains "cliffs" - regions where the loss rises extremely steeply. A gradient step that lands near a cliff gets an enormous gradient and is catapulted far away, undoing many iterations of progress.',
        'For the exploding half of the problem they proposed an absurdly simple fix that is now standard issue: **gradient clipping**. Before the optimizer step, measure the norm of the gradient; if it exceeds a threshold, rescale it down. One `if` statement. Direction preserved, magnitude capped, cliffs defused.',
        'For the vanishing half they analyzed a structural fix: adding a regularization term that forces the recurrent Jacobian\'s norm toward 1, so error signals neither die nor blow up as they travel. Modern stacks use different machinery (LSTM/GRU cells, residual paths), but the paper\'s framing - *control the norm of what flows backward* - is the direct ancestor.',
      ],
      stakes: 'gradient clipping is why training deep sequence models stopped randomly detonating. it is one line of code, and it is everywhere.',
    },
    eliEngineer: {
      prose: [
        'Picture the loss surface as a hiking map. Most of it is a smooth valley, but there are cliffs - walls where the ground rises almost vertically. Gradient descent reads the local slope and steps downhill; near a cliff edge, "local slope" is enormous, so the step is enormous - you get launched into orbit.',
        'Gradient clipping is a speed limit. Compute the gradient as usual, but before applying it, check its total length (norm). Too long? Scale the whole vector down to the limit, keeping its direction. You still walk downhill, you just refuse to teleport.',
        'The subtlety: clip the *global* norm across all parameters (concatenate every gradient into one vector), not per-parameter. Clipping each parameter separately distorts the direction - it\'s the difference between slowing a car and dragging one wheel.',
      ],
      code: {
        lang: 'python',
        file: 'clip.py',
        snippet: `# clip-by-global-norm: one if statement, no more cliffs
THRESHOLD = 5.0

def clip_grad_norm(grads: list[Tensor], tau: float = THRESHOLD):
    total = sqrt(sum((g ** 2).sum() for g in grads))  # one big vector
    if total > tau:
        scale = tau / total            # keep direction, cap magnitude
        for g in grads:
            g *= scale
    return grads

# training loop
for batch in data:
    grads = backward(loss(batch))
    grads = clip_grad_norm(grads)      # <- the whole fix
    optimizer.step(grads)              # safe to step near cliffs now`,
      },
    },
    intuitions: [
      {
        title: 'RNN loss surfaces have cliffs',
        body: 'Because the same weights are reused every timestep, small changes can be amplified through time - the surface develops regions where the loss rises almost vertically. The paper visualized this directly: a smooth valley with a sudden wall, and an optimizer trajectory bouncing off it.',
        more: 'The cliffs exist because exploding modes in the Jacobian (eigenvalue > 1) make the loss hypersensitive along those directions. They are the geometric shadow of the 1994 exploding-gradient analysis.',
      },
      {
        title: 'Clipping keeps direction, caps speed',
        body: 'Rescaling g ← τ·g/‖g‖ preserves exactly which way you\'re walking and changes only how far. That\'s why it\'s safe: the learning signal (the direction) survives intact. Per-parameter clipping or naive clamping corrupts the direction and can stall learning.',
      },
      {
        title: 'The threshold is an alarm level, not a hyper-tweak',
        body: 'Clip thresholds are usually chosen by watching gradient norms for a while and setting τ just above the typical healthy range. Below it, nothing changes - clipping is inert most steps and only fires when a step would have been catastrophic.',
        more: 'In modern frameworks it\'s a one-liner: `torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)`. Transformers train with it by default; many "mystery" instabilities vanish the moment you add it.',
      },
      {
        title: 'Vanishing needs architecture, not band-aids',
        body: 'The paper is honest about the asymmetry: explosion has a cheap fix, vanishing does not. Their proposed regularizer pulls Jacobian norms toward 1 to keep signals alive - the same design pressure that produced LSTM\'s constant-error carousel and, much later, residual connections.',
      },
    ],
    mechanism: {
      latex: '\\text{if } \\|g\\| \\geq \\tau: \\quad g \\;\\leftarrow\\; \\tau\\, \\frac{g}{\\|g\\|}, \\qquad \\|g\\| = \\sqrt{\\textstyle\\sum_i g_i^2}',
      terms: [
        { symbol: 'g', meaning: 'the full gradient vector - every parameter\'s gradient concatenated' },
        { symbol: '\\|g\\|', meaning: 'global L2 norm: the total length of the step you were about to take' },
        { symbol: '\\tau', meaning: 'clip threshold - the speed limit (e.g. 1.0 or 5.0)' },
        { symbol: 'g / \\|g\\|', meaning: 'unit vector: the direction, preserved exactly' },
        { symbol: '\\tau \\cdot g/\\|g\\|', meaning: 'rescaled gradient: same direction, magnitude capped at τ' },
      ],
      diagram: {
        height: 50,
        nodes: [
          { id: 'start', x: 14, y: 12, label: 'θ0', sub: 'parameters before the step', kind: 'io', w: 10 },
          { id: 'grad', x: 42, y: 12, label: 'g = ∇L', sub: 'enormous near a cliff', kind: 'box', w: 16 },
          { id: 'gate', x: 68, y: 12, label: '‖g‖ ≥ τ ?', sub: 'the one-line guard', kind: 'op', w: 16 },
          { id: 'clip', x: 68, y: 34, label: 'g ← τ·g/‖g‖', sub: 'rescale, keep direction', kind: 'box', w: 18 },
          { id: 'step', x: 90, y: 34, label: 'θ1', sub: 'a safe step', kind: 'io', w: 10 },
        ],
        edges: [
          { from: 'start', to: 'grad' },
          { from: 'grad', to: 'gate' },
          { from: 'gate', to: 'clip', label: 'yes' },
          { from: 'gate', to: 'step', label: 'no', dashed: true },
          { from: 'clip', to: 'step' },
        ],
      },
      caption: 'Clip-by-global-norm as a control-flow diagram: measure the total gradient length; only if it exceeds the threshold, rescale the whole vector.',
    },
    lab: {
      name: 'gradient clipping playground',
      hint: 'click to place the optimizer · toggle clipping · step and watch trajectories',
      completion: 'run trajectories with clipping both off and on, and watch one bounce off the cliff',
    },
    bugs: [
      {
        title: 'clipping each parameter individually "should be the same" - it isn\'t',
        fix: 'per-parameter clamps distort the gradient direction (some components hit the cap, others don\'t). clip the *global* norm so the whole vector scales uniformly and direction survives.',
      },
      {
        title: 'clipping does not solve vanishing gradients',
        fix: 'clipping caps large gradients; it cannot amplify small ones. vanishing needs structural help: gating (LSTM/GRU), norm-preserving regularization, or residual paths.',
      },
      {
        title: 'a tiny threshold is not "extra safety"',
        fix: 'set τ too low and every step is clipped - you\'ve silently replaced your learning rate with τ/‖g‖ and slowed learning to a crawl. τ should sit just above normal gradient norms and fire rarely.',
      },
    ],
    fieldNotes: {
      buildsOn: ['bengio-1994'],
      unlocks: ['lstm-1997', 'gru-2014'],
      further: [
        { label: 'original paper - arXiv:1211.5063', url: 'https://arxiv.org/abs/1211.5063' },
        { label: 'pytorch: clip_grad_norm_ docs', url: 'https://pytorch.org/docs/stable/generated/torch.nn.utils.clip_grad_norm_.html' },
        { label: 'deep learning book, §10.11 (Goodfellow et al.)', url: 'https://www.deeplearningbook.org/' },
      ],
      citation: `@inproceedings{pascanu2013difficulty,\n  author = {Pascanu, Razvan and Mikolov, Tomas and Bengio, Yoshua},\n  title = {On the Difficulty of Training Recurrent Neural Networks},\n  booktitle = {ICML}, year = {2013},\n  eprint = {1211.5063}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'What is a "cliff" in an RNN loss surface?',
        options: [
          'A region where the loss rises extremely steeply, producing a huge gradient that launches the parameters far away',
          'A plateau where the gradient is exactly zero',
          'A discontinuity caused by the softmax',
          'A bug in the backprop implementation',
        ],
        answer: 0,
        why: 'Weight reuse across time creates directions of extreme sensitivity - walls on the surface. A step near one gets catapulted.',
        tag: 'briefing',
      },
      {
        type: 'mcq',
        q: 'Clip-by-global-norm rescales the gradient when:',
        options: [
          'The L2 norm of the *entire* gradient vector exceeds the threshold τ',
          'Any single parameter\'s gradient exceeds τ',
          'The loss increases between steps',
          'The learning rate schedule says so',
        ],
        answer: 0,
        why: 'All gradients are concatenated into one vector; if its total norm ‖g‖ ≥ τ, the whole vector is scaled to length τ.',
        tag: 'mechanism',
      },
      {
        type: 'tf',
        q: 'True or false: clipping preserves the direction of the gradient.',
        answer: true,
        why: 'g ← τ·g/‖g‖ scales every component by the same factor, so the unit direction g/‖g‖ is unchanged.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Why is clipping by global norm better than clamping each gradient element?',
        options: [
          'Per-element clamping changes some components but not others, distorting the descent direction',
          'Global norm is faster to compute',
          'Per-element clamping causes NaNs',
          'Global norm uses less memory',
        ],
        answer: 0,
        why: 'Direction is the learning signal; uniform scaling preserves it, per-element clamping does not.',
        tag: 'bugs',
      },
      {
        type: 'tf',
        q: 'True or false: gradient clipping also fixes vanishing gradients.',
        answer: false,
        why: 'Clipping only caps large gradients. Small (vanished) gradients need architectural fixes like LSTM cells or residual connections.',
        tag: 'bugs',
      },
      {
        type: 'mcq',
        q: 'How should the clip threshold τ be chosen?',
        options: [
          'Just above the typical healthy gradient norm, so clipping fires rarely - only on pathological steps',
          'As small as possible for maximum safety',
          'Equal to the learning rate',
          'Exactly 1.0, always',
        ],
        answer: 0,
        why: 'If τ is too low, every step gets clipped and learning silently slows; it should act as an emergency brake, not a governor.',
        tag: 'intuitions',
      },
      {
        type: 'fill',
        q: 'g ← τ · (g / ___) - rescale the gradient to length τ, direction unchanged',
        tokens: ['‖g‖', 'τ', 'learning_rate', 'batch_size'],
        answer: ['‖g‖'],
        why: 'Dividing by the global norm makes a unit vector; multiplying by τ caps the step length at the threshold.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'What structural fix did the paper explore for *vanishing* gradients?',
        options: [
          'A regularizer that pushes the recurrent Jacobian norm toward 1, keeping error signals alive over time',
          'A larger hidden state',
          'Removing the tanh nonlinearity entirely',
          'Training with bigger batches',
        ],
        answer: 0,
        why: 'Forcing per-step Jacobian norms near 1 stops the backward product from collapsing - the same idea behind gated memory cells.',
        tag: 'briefing',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 04 · lstm-1997
  // -----------------------------------------------------------------------
  {
    slug: 'lstm-1997',
    venue: 'Neural Computation 9(8)',
    sourceUrl: 'https://doi.org/10.1162/neco.1997.9.8.1735',
    briefing: {
      paragraphs: [
        'Hochreiter and Schmidhuber\'s 1997 paper is the most durable engineering answer to the vanishing gradient problem. Their idea: give the network a memory cell that information can flow through *unchanged* - an additively-updated cell state, the "constant error carousel" - and put learned multiplicative gates on every path in and out of it.',
        'Three gates, each a sigmoid between 0 and 1: a forget gate decides what fraction of the old memory survives, an input gate decides how much new information is written, and an output gate decides how much of the memory is exposed to the rest of the network. Because the cell state is updated by addition rather than repeated matrix multiplication, gradients can flow backwards across dozens of steps without shrinking.',
        'For twenty years this was *the* sequence model: speech recognition, machine translation, handwriting, captioning - nearly every state-of-the-art sequence result between roughly 2013 and 2017 ran on LSTMs. Even in the transformer era, the gating idea (learned, multiplicative control of information flow) is everywhere.',
      ],
      stakes: 'without LSTMs there is no seq2seq, no attention revolution to overthrow them - the entire deep-learning decade runs on this cell.',
    },
    eliEngineer: {
      prose: [
        'An LSTM is an RNN whose memory got an express lane. The cell state c runs through time like a conveyor belt: the only default operations on it are addition and elementwise multiplication by gate values. No repeated weight matrices - so nothing compounds and the gradient highway stays open.',
        'The gates are learned `if` statements. Each is a little classifier (sigmoid of a linear function of the input and previous output) whose output, between 0 and 1, acts as a mask: forget ≈ a `retention` flag per memory lane, input ≈ a `write-enable`, output ≈ a `read-enable`.',
        'Crucially, the gates are *learned from data*: the network discovers for itself when to remember (gates open) and when to ignore (gates closed). You don\'t hand-code the memory policy; you build the highway and gradient descent learns the traffic rules.',
      ],
      code: {
        lang: 'python',
        file: 'lstm_cell.py',
        snippet: `# gates = learned if-statements (sigmoid -> 0..1 mask)
f = sigmoid(W_f @ [h_prev, x] + b_f)   # forget: keep how much of c?
i = sigmoid(W_i @ [h_prev, x] + b_i)   # input: write how much?
o = sigmoid(W_o @ [h_prev, x] + b_o)   # output: read how much?

cand = tanh(W_c @ [h_prev, x] + b_c)   # candidate new content

c = f * c_prev + i * cand              # cell: ADD, don't re-multiply
h = o * tanh(c)                        # exposed memory

# backward: dc/dc_prev = f (a learned mask ~1), NOT W^k.
# the error highway stays open for tens of steps.`,
      },
    },
    intuitions: [
      {
        title: 'The cell state is an express lane',
        body: 'In a vanilla RNN, information crosses a full weight matrix every step; after 30 steps it\'s been transformed 30 times. The LSTM cell state is transformed only by elementwise add/multiply - information can ride 50+ steps nearly untouched. This is the same "highway" principle that ResNets later brought to deep feedforward nets.',
        more: 'With forget gate ≈ 1, the backward derivative through the cell is ≈ 1 per step: no exponential decay. Hochreiter & Schmidhuber called this the constant error carousel - error carousels around the cell without amplification or decay.',
      },
      {
        title: 'Gates are bouncers at every door',
        body: 'Each gate is a sigmoid squashing a learned score into (0,1): 0 = door shut, 1 = door open. Forget gates the old memory, input gates the write, output gates the read. Three small classifiers per cell, each trained end-to-end by the same loss as everything else.',
      },
      {
        title: 'Addition, not multiplication, is the trick',
        body: 'c_t = f·c_{t-1} + i·candidate. The update *adds* new content into memory instead of re-computing memory from scratch. Derivatives through addition split cleanly to both branches, so the error has a direct route back - the exact property residual connections exploit in feedforward nets two decades later.',
      },
      {
        title: 'It learned to count, quote, and nest',
        body: 'Trained LSTMs develop cells with legible behavior: one unit tracks whether text is inside quotes, another counts nesting depth of brackets. Nobody designed these features - gating gives the network a place to *store* them, and gradient descent finds them useful.',
        more: 'Karpathy\'s 2015 visualizations (paper 01) were run on an LSTM - the interpretable cells were direct evidence that the memory cell holds discrete, durable state, not just blurry averages.',
      },
    ],
    mechanism: {
      latex: 'c_t = f_t \\odot c_{t-1} + i_t \\odot \\tilde{c}_t, \\qquad h_t = o_t \\odot \\tanh(c_t)',
      terms: [
        { symbol: 'c_t', meaning: 'cell state - the long-term memory conveyor belt' },
        { symbol: 'f_t', meaning: 'forget gate ∈ (0,1): what fraction of the old memory survives' },
        { symbol: 'i_t', meaning: 'input gate ∈ (0,1): how much new content is written' },
        { symbol: '\\tilde{c}_t', meaning: 'candidate content (tanh): what *would* be written if the gate opens' },
        { symbol: 'o_t', meaning: 'output gate ∈ (0,1): how much of memory is exposed as h' },
        { symbol: 'h_t', meaning: 'hidden/output state - the readable slice of memory' },
        { symbol: '\\odot', meaning: 'elementwise multiply - gates act per-memory-lane, not via a matrix' },
      ],
      diagram: {
        height: 56,
        nodes: [
          { id: 'cprev', x: 8, y: 12, label: 'c_{t-1}', sub: 'memory arrives', kind: 'mem', w: 12 },
          { id: 'f', x: 26, y: 24, label: 'f_t', sub: 'forget gate σ', kind: 'op', w: 10 },
          { id: 'i', x: 44, y: 34, label: 'i_t', sub: 'input gate σ', kind: 'op', w: 10 },
          { id: 'cand', x: 62, y: 34, label: 'c̃_t', sub: 'candidate tanh', kind: 'op', w: 10 },
          { id: 'cnew', x: 84, y: 12, label: 'c_t', sub: 'memory continues', kind: 'mem', w: 12 },
          { id: 'o', x: 70, y: 46, label: 'o_t', sub: 'output gate σ', kind: 'op', w: 10 },
          { id: 'h', x: 92, y: 46, label: 'h_t', sub: 'exposed memory', kind: 'io', w: 10 },
        ],
        edges: [
          { from: 'cprev', to: 'f', label: '×' },
          { from: 'f', to: 'cnew', label: 'f·c' },
          { from: 'i', to: 'cand', label: '×' },
          { from: 'cand', to: 'cnew', label: '+ i·c̃' },
          { from: 'cnew', to: 'o', label: 'tanh(c)' },
          { from: 'o', to: 'h', label: '×' },
        ],
      },
      caption: 'The LSTM cell: the cell state flows left→right along the top, modulated by elementwise gates (forget, input) - new content is added in; the output gate controls what\'s readable.',
    },
    lab: {
      name: 'gate flow playground',
      hint: 'drag the gate sliders · run 20 steps · keep the 7 alive',
      completion: 'run at least 2 experiments with different gate settings',
    },
    bugs: [
      {
        title: 'LSTM does not "solve" long-term memory - it extends it',
        fix: 'gates are learned and imperfect; gradients still fade over hundreds of steps. LSTMs buy you tens of steps of reliable memory, not thousands. (that gap is part of why attention was invented.)',
      },
      {
        title: 'the forget gate was not in the 1997 paper',
        fix: 'the original LSTM had only input and output gates; the forget gate was added by Gers, Schmidhuber & Cummins in 2000. citing "Hochreiter & Schmidhuber (1997)" for f_t is a common anachronism.',
      },
      {
        title: 'sigmoid here is a gate, not an activation "choice"',
        fix: 'gates use sigmoid *because* (0,1) works as a mask and saturates cleanly open/closed. using relu or tanh for the gates breaks the masking semantics.',
      },
    ],
    fieldNotes: {
      buildsOn: ['bengio-1994'],
      unlocks: ['gru-2014', 'seq2seq-2014', 'char-rnn'],
      further: [
        { label: 'original paper (MIT Press, DOI)', url: 'https://doi.org/10.1162/neco.1997.9.8.1735' },
        { label: 'colah: understanding LSTM networks', url: 'https://colah.github.io/posts/2015-08-Understanding-LSTMs/' },
        { label: 'gers et al. 2000: learning to forget (the forget gate)', url: 'https://doi.org/10.1162/089976600300015015' },
      ],
      citation: `@article{hochreiter1997lstm,\n  author = {Hochreiter, Sepp and Schmidhuber, J{\\"u}rgen},\n  title = {Long Short-Term Memory},\n  journal = {Neural Computation}, volume = {9}, number = {8},\n  pages = {1735--1780}, year = {1997},\n  doi = {10.1162/neco.1997.9.8.1735}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'Why does the LSTM cell state resist vanishing gradients?',
        options: [
          'It is updated by addition and elementwise gating, so error can flow across steps without being repeatedly shrunk by a weight matrix',
          'It uses a larger hidden state than vanilla RNNs',
          'It removes the nonlinearity entirely',
          'It clips the gradients internally',
        ],
        answer: 0,
        why: '∂c_t/∂c_{t-1} = f_t (a learned mask ≈1), not W - nothing compounds, so the "constant error carousel" keeps gradients alive.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'What does the forget gate control?',
        options: [
          'What fraction of the previous cell state survives into the next step',
          'How much new content is written into the cell',
          'How much of the cell is exposed as the output',
          'The learning rate of the cell weights',
        ],
        answer: 0,
        why: 'f_t multiplies c_{t-1} elementwise: 1 = keep everything, 0 = wipe the lane.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Why sigmoid for the gates specifically?',
        options: [
          'Its (0,1) range acts as a multiplicative mask - closed at 0, open at 1 - and it saturates cleanly',
          'It is the only differentiable function',
          'It makes the cell state larger',
          'It prevents exploding gradients by construction',
        ],
        answer: 0,
        why: 'Gates are learned if-statements; you need a smooth 0→1 switch. tanh/relu don\'t have mask semantics.',
        tag: 'intuitions',
      },
      {
        type: 'tf',
        q: 'True or false: the forget gate was part of Hochreiter & Schmidhuber\'s original 1997 LSTM.',
        answer: false,
        why: 'The 1997 cell had input and output gates only; the forget gate was introduced by Gers et al. in 2000.',
        tag: 'bugs',
      },
      {
        type: 'order',
        q: 'Order the LSTM cell update:',
        items: [
          'compute gate values f, i, o from (h_prev, x)',
          'compute candidate content c̃ = tanh(·)',
          'c = f·c_prev + i·c̃ - modulate old memory, add new',
          'h = o·tanh(c) - expose a gated slice as output',
        ],
        answer: [0, 1, 2, 3],
        why: 'Gates first, then candidate, then the additive cell update, then the gated read-out.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Which later architecture uses the same "additive highway" principle as the LSTM cell state?',
        options: [
          'ResNet residual connections (y = F(x) + x)',
          'Max pooling',
          'Batch normalization',
          'Softmax attention',
        ],
        answer: 0,
        why: 'Both give gradients a direct additive path backwards; ResNet is essentially the feedforward version of the trick.',
        tag: 'field-notes',
      },
      {
        type: 'tf',
        q: 'True or false: LSTMs give networks effectively unlimited memory over thousands of timesteps.',
        answer: false,
        why: 'They extend reliable memory to tens of steps; over hundreds, gates still leak and gradients still fade. Attention was invented partly to close that gap.',
        tag: 'bugs',
      },
      {
        type: 'mcq',
        q: 'In the equation c_t = f_t ⊙ c_{t-1} + i_t ⊙ c̃_t, the ⊙ symbol means:',
        options: [
          'Elementwise multiplication - each memory lane is gated independently',
          'Matrix multiplication',
          'Convolution',
          'Outer product',
        ],
        answer: 0,
        why: 'Per-element gating is what lets individual memory lanes stay open or closed for different durations.',
        tag: 'mechanism',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 05 · gru-2014
  // -----------------------------------------------------------------------
  {
    slug: 'gru-2014',
    venue: 'EMNLP 2014 · arXiv:1406.1078',
    sourceUrl: 'https://arxiv.org/abs/1406.1078',
    briefing: {
      paragraphs: [
        'Cho and colleagues introduced the Gated Recurrent Unit inside a paper that was itself a landmark: the RNN encoder-decoder for neural machine translation (the same model family Bahdanau would add attention to months later). The GRU was almost a footnote - a simplification of the LSTM that turned out to work just as well.',
        'The refactor: merge the LSTM\'s forget and input gates into a single **update gate** that interpolates between the old state and a candidate state; add a **reset gate** that controls how much of the past to expose when computing the candidate. Two gates instead of three, no separate cell state - roughly 25% fewer parameters per layer.',
        'Empirically, GRUs matched LSTMs on many sequence tasks while being faster to train and simpler to implement. The GRU became the default "lightweight LSTM", and its interpolation formula h = (1-z)·h_old + z·h_new is one of the most reusable ideas in network design - a learned, differentiable blend between "keep" and "replace".',
      ],
      stakes: 'the GRU proves the value of the gate idea is the *idea*, not the specific LSTM plumbing - and its blend formula shows up everywhere.',
    },
    eliEngineer: {
      prose: [
        'Think of the LSTM as a class with three boolean flags and two member variables (c and h). The GRU is the refactor a senior engineer would ship: collapse the two memory variables into one (h), and merge the "keep old" and "write new" flags into a single dial z, because they were always two ends of the same decision.',
        'The update gate z performs an interpolation: h = (1-z)·h_old + z·h̃. When z≈0 the state is preserved verbatim (remember!); when z≈1 it\'s overwritten with the candidate h̃ (forget and replace). One parameter controls both ends of the trade-off.',
        'The reset gate r answers a different question: when computing the candidate h̃, how much of the old state should the candidate *see*? r≈0 means "compute the new state as if from scratch" - useful when the past just became irrelevant.',
      ],
      code: {
        lang: 'diff',
        file: 'lstm_to_gru.diff',
        snippet: `--- lstm.py
+++ gru.py
- f = sigmoid(W_f @ [h, x])   # forget gate
- i = sigmoid(W_i @ [h, x])   # input gate
- o = sigmoid(W_o @ [h, x])   # output gate
- c = f * c_prev + i * tanh(W_c @ [h, x])
- h = o * tanh(c)
+ z = sigmoid(W_z @ [h, x])   # update gate: keep vs replace
+ r = sigmoid(W_r @ [h, x])   # reset gate: how much past to show
+ h_tilde = tanh(W_h @ [r * h, x])
+ h = (1 - z) * h_prev + z * h_tilde   # learned blend

# 2 gates, 1 state vector, ~25% fewer params. same job.`,
      },
    },
    intuitions: [
      {
        title: 'One dial for keep-vs-replace',
        body: 'LSTM keeps and writes with separate gates, so it must learn the correlation f ≈ 1-i itself. GRU hard-codes it: (1-z) keeps, z writes. Fewer parameters, one less thing to learn - and empirically, rarely worse.',
        more: 'The formula is convex interpolation - the new state is a weighted average of old and candidate. That bounds the state (between the two) and gives gradients a clean additive path to both sides, like the LSTM cell did.',
      },
      {
        title: 'Reset controls the candidate\'s view of the past',
        body: 'When r≈0, the candidate h̃ = tanh(W·[r·h, x]) is computed almost only from the current input - the model "starts a new sentence" in state space. When r≈1, the candidate fully integrates history. The gate learns *when the past should stop influencing new content*.',
      },
      {
        title: 'A code diff, not a new theory',
        body: 'GRU\'s contribution is best read as an engineering refactor of the LSTM: same gating principle, simplified interface, fewer moving parts. It\'s evidence that what mattered was gated additive flow - the rest was negotiable.',
        more: 'This pattern recurs across deep learning: a complex mechanism wins, then a simplification (GRU, RMSNorm vs LayerNorm, MQA vs MHA) keeps 95% of the benefit at a fraction of the complexity.',
      },
    ],
    mechanism: {
      latex: 'h_t = (1 - z_t) \\odot h_{t-1} + z_t \\odot \\tilde{h}_t, \\qquad \\tilde{h}_t = \\tanh\\!\\big(W\\,[r_t \\odot h_{t-1},\\, x_t]\\big)',
      terms: [
        { symbol: 'h_t', meaning: 'the single state vector - GRU merges LSTM\'s cell and hidden states' },
        { symbol: 'z_t', meaning: 'update gate ∈ (0,1): 0 = keep old state, 1 = replace with candidate' },
        { symbol: '(1-z_t)', meaning: 'the "keep" weight - hard-wired complement of z' },
        { symbol: 'r_t', meaning: 'reset gate ∈ (0,1): how much of the past the candidate gets to see' },
        { symbol: '\\tilde{h}_t', meaning: 'candidate state (tanh): the proposed new memory content' },
        { symbol: '[r_t \\odot h_{t-1}, x_t]', meaning: 'concatenation of gated past and current input' },
      ],
      diagram: {
        height: 50,
        nodes: [
          { id: 'hprev', x: 10, y: 26, label: 'h_{t-1}', sub: 'old state', kind: 'mem', w: 12 },
          { id: 'r', x: 30, y: 40, label: 'r_t', sub: 'reset gate', kind: 'op', w: 10 },
          { id: 'cand', x: 52, y: 40, label: 'h̃_t', sub: 'candidate tanh', kind: 'op', w: 12 },
          { id: 'z', x: 74, y: 14, label: 'z_t', sub: 'update gate', kind: 'op', w: 10 },
          { id: 'blend', x: 90, y: 26, label: 'h_t', sub: '(1-z)·old + z·new', kind: 'io', w: 14 },
        ],
        edges: [
          { from: 'hprev', to: 'r', label: 'gated' },
          { from: 'r', to: 'cand' },
          { from: 'cand', to: 'blend', label: 'z' },
          { from: 'z', to: 'blend', label: 'blend' },
          { from: 'hprev', to: 'blend', label: '1-z', dashed: true },
        ],
      },
      caption: 'The GRU cell: a single state vector; the update gate z blends old state and candidate, while the reset gate r controls how much of the past shapes the candidate.',
    },
    lab: {
      name: 'lstm → gru diff view',
      hint: 'toggle the diff · drag the update gate · watch the blend',
      completion: 'compare both cells and drive the update gate through its full range',
    },
    bugs: [
      {
        title: 'gru is not "strictly better" than lstm',
        fix: 'head-to-head results are task- and tuning-dependent (chung et al. 2014 found no clear universal winner). choose by budget: fewer params/faster → gru; maximal control & separate cell state → lstm.',
      },
      {
        title: 'the update gate blends - it does not add',
        fix: 'h = (1-z)·h_old + z·h̃ is a convex interpolation, not an accumulation like the lstm cell. the gru state is bounded between old and candidate; the lstm cell can grow by adding.',
      },
      {
        title: 'confusing reset and update gates',
        fix: 'update z decides the *output* blend; reset r only shapes what the *candidate* sees of the past. r≈0 does not mean "forget the state" - the state survives via the (1-z) path.',
      },
    ],
    fieldNotes: {
      buildsOn: ['lstm-1997'],
      unlocks: ['seq2seq-2014', 'bahdanau-2014'],
      further: [
        { label: 'original paper - arXiv:1406.1078', url: 'https://arxiv.org/abs/1406.1078' },
        { label: 'chung et al. 2014: empirical evaluation of gated RNNs', url: 'https://arxiv.org/abs/1412.3555' },
        { label: 'colah: understanding LSTMs (GRU section)', url: 'https://colah.github.io/posts/2015-08-Understanding-LSTMs/' },
      ],
      citation: `@inproceedings{cho2014gru,\n  author = {Cho, Kyunghyun and van Merri{\\"e}nboer, Bart and Gulcehre, Caglar and Bahdanau, Dzmitry and Bougares, Fethi and Schwenk, Holger and Bengio, Yoshua},\n  title = {Learning Phrase Representations using RNN Encoder--Decoder for Statistical Machine Translation},\n  booktitle = {EMNLP}, year = {2014},\n  eprint = {1406.1078}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'The GRU update gate z performs:',
        options: [
          'A convex blend h = (1-z)·h_old + z·h̃ between the old state and the candidate',
          'An additive accumulation of all past states',
          'A hard reset of the state to zero',
          'A softmax over previous states',
        ],
        answer: 0,
        why: 'One learned dial interpolates: z≈0 remembers, z≈1 replaces. It merges the LSTM\'s forget and input decisions.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'What does the reset gate r control?',
        options: [
          'How much of the previous state the candidate h̃ gets to see',
          'Whether the cell state is wiped between sequences',
          'The output blend between old and new state',
          'The magnitude of the gradient',
        ],
        answer: 0,
        why: 'h̃ = tanh(W·[r⊙h_prev, x]): with r≈0 the candidate is computed almost from the input alone.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Compared to the LSTM, the GRU:',
        options: [
          'Merges forget+input into one update gate and uses a single state vector - fewer parameters, similar performance',
          'Adds a fourth gate for extra control',
          'Removes all gating to speed up training',
          'Uses convolution instead of recurrence',
        ],
        answer: 0,
        why: 'Two gates instead of three, no separate cell state - about 25% fewer parameters, empirically competitive.',
        tag: 'briefing',
      },
      {
        type: 'tf',
        q: 'True or false: the GRU was introduced in the same paper as the RNN encoder-decoder for machine translation.',
        answer: true,
        why: 'Cho et al. 2014 proposed both: the encoder-decoder framework and the GRU as its gated hidden unit.',
        tag: 'briefing',
      },
      {
        type: 'tf',
        q: 'True or false: GRUs empirically beat LSTMs on every benchmark.',
        answer: false,
        why: 'Chung et al. (2014) found no consistent winner - the choice is about parameter budget and task, not superiority.',
        tag: 'bugs',
      },
      {
        type: 'order',
        q: 'Order the GRU update:',
        items: [
          'compute update gate z and reset gate r from (h_prev, x)',
          'gate the past: r ⊙ h_prev',
          'compute candidate h̃ = tanh(W·[r⊙h_prev, x])',
          'blend: h = (1-z)·h_prev + z·h̃',
        ],
        answer: [0, 1, 2, 3],
        why: 'Gates first, then the gated-past candidate, then the convex interpolation that produces the new state.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Setting the update gate z ≈ 0 makes the GRU:',
        options: [
          'Preserve its previous state almost verbatim - long-term memory mode',
          'Overwrite its state with the candidate every step',
          'Compute the candidate without seeing the past',
          'Output zeros',
        ],
        answer: 0,
        why: 'h = (1-z)·h_old + z·h̃ with z≈0 leaves h ≈ h_old: the state rides forward unchanged, like an open LSTM forget gate.',
        tag: 'intuitions',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 06 · rnn-dropout-2014
  // -----------------------------------------------------------------------
  {
    slug: 'rnn-dropout-2014',
    venue: 'ICLR 2015 · arXiv:1409.2329',
    sourceUrl: 'https://arxiv.org/abs/1409.2329',
    briefing: {
      paragraphs: [
        'Dropout was already the standard regularizer for feedforward nets by 2014, but applying it naively to RNNs had consistently failed - in some cases it made things worse. Zaremba, Sutskever and Vinyals explained why and showed the correct placement: apply dropout **only to the non-recurrent connections** - the inputs and outputs of each LSTM layer - and never to the recurrent edges that carry memory through time.',
        'The intuition is information-theoretic: dropout injects noise wherever it\'s applied. Noise on a feed-forward edge is seen once and filtered; noise on a recurrent edge is re-injected every timestep, compounding like a photocopy of a photocopy, until the memory is corrupted beyond use. An RNN that can\'t trust its own memory learns not to use it.',
        'With the right placement, dropout gave large gains: their LSTM language models cut perplexity dramatically (from ~100 to ~78 on Penn Treebank at the time) and regularized LSTMs transferred better across tasks. It\'s a small paper with a durable lesson: *where* a regularizer acts matters as much as *that* it acts.',
      ],
      stakes: 'this paper is why every recurrent stack you\'ve ever used has "dropout between layers" - and why dropping memory itself stays a bad idea.',
    },
    eliEngineer: {
      prose: [
        'Think of the unrolled RNN as a grid: vertical edges carry data *up* through layers at one timestep (input → LSTM1 → LSTM2 → logits); horizontal edges carry memory *right* through time (h_{t-1} → h_t). The paper\'s rule in one line: **drop vertically, never horizontally**.',
        'Why? A vertical edge is used once per timestep - dropout noise there is a single corrupted reading, which the recurrent dynamics can average out. A horizontal edge is the memory bus itself: corrupt it at step t and the corrupted value is the *input* to step t+1, whose output feeds t+2... the noise compounds with interest.',
        'Later work (variational dropout, Gal & Ghahramani 2016) refined the recipe - same mask reused across time, applied even to recurrent edges, can work - but the 2014 rule remains the safe default and the cleanest lesson in regularizer placement.',
      ],
      code: {
        lang: 'python',
        file: 'rnn_dropout.py',
        snippet: `# unrolled view: vertical = through layers, horizontal = through time
for t in range(T):
    x = dropout(embed[t])              # <- OK: corrupt once, memory filters it
    h1 = lstm1(x, h1_prev)             # recurrent edge: NO dropout here
    h2 = lstm2(dropout(h1), h2_prev)   # <- OK: dropout between layers
    logits[t] = dropout(h2) @ W_out    # <- OK: dropout before the readout

# the rule: corrupt the *wires between layers*, never the
# *memory bus across time*. noise on the bus compounds:
#   h_t -> noisy h_t -> noisier h_{t+1} -> garbage h_{t+k}
# an RNN with a noisy memory learns to ignore its memory.`,
      },
    },
    intuitions: [
      {
        title: 'A photocopy of a photocopy',
        body: 'Noise on a recurrent edge is re-injected every step: the corrupted state becomes the input to the next corruption. After k steps the memory contains k compounding noise terms. Feed-forward noise, by contrast, is a one-shot event the dynamics can wash out.',
      },
      {
        title: 'Dropout where the information flows once',
        body: 'The safe spots are exactly the single-use wires: input embeddings, inter-layer connections, and the pre-softmax readout. There, dropout plays its usual role - preventing co-adaptation of features - without touching the time-carrying state.',
        more: 'Their recipe regularized both the inputs and outputs of each LSTM cell. The state-to-state transition (the LSTM\'s own weights) stayed deterministic, which is what let the memory stay trustworthy.',
      },
      {
        title: 'Regularization is architecture-aware',
        body: 'The same technique that rescued feedforward nets actively damaged recurrent ones - until someone looked at *which edges* it was applied to. The general lesson: a regularizer is a noise-injection policy, and where you inject noise into a dynamical system determines whether it helps or destroys.',
        more: 'The sequel - variational dropout (Gal & Ghahramani 2016) - showed recurrent dropout *can* work if you keep the same mask fixed across all timesteps, removing the compounding. Moon et al.\'s 2015 "RNNDROP" used a similar trick. Placement + correlation structure is everything.',
      },
    ],
    mechanism: {
      latex: '\\tilde{x}^{(l)}_t = x^{(l)}_t \\odot m^{(l)}_t, \\quad m^{(l)}_t \\sim \\mathrm{Bernoulli}(1-p) \\quad \\text{on feed-forward edges only}',
      terms: [
        { symbol: 'x^{(l)}_t', meaning: 'input to layer l at time t - the vertical (inter-layer) signal' },
        { symbol: 'm^{(l)}_t', meaning: 'dropout mask: 0 with prob p, 1 otherwise, redrawn each step' },
        { symbol: '\\tilde{x}^{(l)}_t', meaning: 'the corrupted (dropped-out) layer input' },
        { symbol: 'p', meaning: 'drop probability (e.g. 0.5 for their large models)' },
        { symbol: '\\text{feed-forward only}', meaning: 'the rule: recurrent h_{t-1}→h_t edges stay clean' },
      ],
      diagram: {
        height: 50,
        nodes: [
          { id: 'x0', x: 18, y: 40, label: 'x_t', sub: 'input at time t', kind: 'io', w: 10 },
          { id: 'l1a', x: 30, y: 26, label: 'LSTM1', kind: 'box', w: 14 },
          { id: 'l1b', x: 62, y: 26, label: 'LSTM1', kind: 'box', w: 14 },
          { id: 'l2a', x: 30, y: 10, label: 'LSTM2', kind: 'box', w: 14 },
          { id: 'l2b', x: 62, y: 10, label: 'LSTM2', kind: 'box', w: 14 },
          { id: 'y', x: 84, y: 10, label: 'ŷ', sub: 'readout', kind: 'io', w: 10 },
        ],
        edges: [
          { from: 'x0', to: 'l1a', label: 'drop ✓' },
          { from: 'l1a', to: 'l2a', label: 'drop ✓' },
          { from: 'l1a', to: 'l1b', label: 'NO drop', dashed: true },
          { from: 'l2a', to: 'l2b', label: 'NO drop', dashed: true },
          { from: 'l1b', to: 'l2b', label: 'drop ✓' },
          { from: 'l2b', to: 'y', label: 'drop ✓' },
        ],
      },
      caption: 'Two LSTM layers unrolled across time. Dropout (✓) goes on the vertical feed-forward edges; the horizontal memory-carrying edges (dashed) stay clean.',
    },
    lab: {
      name: 'dropout placement',
      hint: 'toggle dropout on the recurrent vs feed-forward edges · watch the val-loss curve',
      completion: 'compare at least the feed-forward-only and recurrent configurations',
    },
    bugs: [
      {
        title: '"dropout everywhere" works in feedforward nets - so it should work in rnns',
        fix: 'the unrolled rnn reuses its recurrent edge every step; dropout there compounds noise through time and destroys the memory signal. drop only on the non-recurrent edges.',
      },
      {
        title: 'fresh masks every step are not always required',
        fix: 'variational dropout (gal & ghahramani 2016) keeps one mask fixed across time - with that change, even recurrent-edge dropout can work. the 2014 rule is the safe default, not a law of physics.',
      },
      {
        title: 'dropout at test time is not "averaged by sampling"',
        fix: 'standard practice: disable dropout at test time and scale activations (or weights) by (1-p). mc-dropout exists as a separate technique for uncertainty estimates - it is not the default.',
      },
    ],
    fieldNotes: {
      buildsOn: ['lstm-1997', 'dropout-2014'],
      unlocks: ['char-rnn', 'seq2seq-2014'],
      further: [
        { label: 'original paper - arXiv:1409.2329', url: 'https://arxiv.org/abs/1409.2329' },
        { label: 'gal & ghahramani 2016: theoretically grounded dropout in RNNs', url: 'https://arxiv.org/abs/1512.05287' },
        { label: 'srivastava et al. 2014: the original dropout paper', url: 'https://arxiv.org/abs/1207.0580' },
      ],
      citation: `@inproceedings{zaremba2014recurrent,\n  author = {Zaremba, Wojciech and Sutskever, Ilya and Vinyals, Oriol},\n  title = {Recurrent Neural Network Regularization},\n  booktitle = {ICLR}, year = {2015},\n  eprint = {1409.2329}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'Where did Zaremba et al. apply dropout in their LSTM stacks?',
        options: [
          'Only on the non-recurrent (feed-forward) connections: inputs, between layers, and before the output',
          'On every connection including the recurrent state edges',
          'Only on the recurrent connections',
          'Only on the embedding matrix',
        ],
        answer: 0,
        why: 'The rule: corrupt the wires between layers, never the memory bus across time.',
        tag: 'briefing',
      },
      {
        type: 'mcq',
        q: 'Why does dropout on recurrent edges hurt?',
        options: [
          'Noise is re-injected every timestep and compounds, corrupting the memory the RNN depends on',
          'It makes the cell state too large to store',
          'It changes the vocabulary distribution',
          'It prevents backpropagation through time',
        ],
        answer: 0,
        why: 'A corrupted h_t is the input to the next corruption: a photocopy of a photocopy, degrading exponentially.',
        tag: 'eli-engineer',
      },
      {
        type: 'tf',
        q: 'True or false: in this paper, a different dropout mask is drawn at every timestep for each regularized edge.',
        answer: true,
        why: 'Fresh masks per step on feed-forward edges; the compounding problem comes from the *edges chosen*, not mask reuse.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'What was the headline empirical result?',
        options: [
          'Properly-placed dropout cut language-model perplexity dramatically and improved generalization of LSTMs',
          'Dropout made RNNs train 10× faster',
          'Dropout removed the need for gradient clipping',
          'Dropout allowed one-layer models to match deep ones',
        ],
        answer: 0,
        why: 'Their regularized LSTMs dropped PTB perplexity from ~100 to ~78 at the time - a large gain from placement alone.',
        tag: 'briefing',
      },
      {
        type: 'tf',
        q: 'True or false: variational dropout (2016) showed recurrent-edge dropout can work if the same mask is reused across all timesteps.',
        answer: true,
        why: 'Fixing the mask across time stops the per-step compounding - placement was the issue, plus mask correlation structure.',
        tag: 'bugs',
      },
      {
        type: 'mcq',
        q: 'The general engineering lesson of the paper is:',
        options: [
          'A regularizer is a noise-injection policy - where you inject noise into a dynamical system decides whether it helps',
          'Regularization is always beneficial regardless of placement',
          'RNNs cannot be regularized at all',
          'Dropout only works for convolutional networks',
        ],
        answer: 0,
        why: 'Same technique, opposite outcomes, purely from *which edges* it touched. Architecture-aware regularization.',
        tag: 'intuitions',
      },
      {
        type: 'fill',
        q: 'x̃ = x ⊙ m, m ~ Bernoulli(1-p) - applied to ___ edges only',
        tokens: ['feed-forward', 'recurrent', 'residual', 'attention'],
        answer: ['feed-forward'],
        why: 'Vertical inter-layer edges get dropout; horizontal time-carrying edges stay deterministic so memory stays trustworthy.',
        tag: 'mechanism',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 07 · complexodynamics
  // -----------------------------------------------------------------------
  {
    slug: 'complexodynamics',
    venue: 'scottaaronson.blog (essay, 2011)',
    sourceUrl: 'https://scottaaronson.blog/?p=762',
    briefing: {
      paragraphs: [
        'A change of pace: not a neural-network paper, but the essay Ilya kept on the list - Scott Aaronson\'s meditation on why cream swirling into coffee looks *interesting* for a while, then boring. Entropy, by the second law, only ever rises. Yet our intuitive sense of "complexity" clearly rises and then falls: unmixed coffee is simple, fully-mixed beige is simple, and the swirling middle is where the structure lives.',
        'Aaronson proposes "complextropy": a measurable stand-in for this intuition, built on Kolmogorov complexity - the length of the shortest program that produces a given pattern. The conjectured "First Law of Complexodynamics": in a closed system starting from a simple state, apparent complexity first increases, then decreases, even as entropy marches monotonically upward.',
        'Why is this on a deep-learning list? Because Kolmogorov complexity is the theoretical bedrock beneath compression, and compression is the bedrock beneath learning: a model that predicts data well *is* a compressor of that data. Understanding what "complexity" even means - and how gzip-length proxies the uncomputable - is foundational taste for everything generative.',
      ],
      stakes: 'this essay installs the mental model behind "learning = compression" - the deepest unifying idea in the whole reading list.',
    },
    eliEngineer: {
      prose: [
        'You already know Kolmogorov complexity under a different name: *the size of the smallest possible source code* for an object. A string of a million zeros has tiny complexity (`print("0"*10**6)`). A random string has maximal complexity - the shortest program is the string itself. Most interesting things sit in between.',
        'Now watch coffee mix. Start: two clean regions - describable in a few bytes ("dark left, cream right"). Middle: filigreed swirls, tendrils, fractal-ish interfaces - no short description; you\'d have to ship the whole bitmap. End: uniform beige - `fill(#b8a58a)`. Complexity rises, peaks, and falls. Entropy only rises.',
        'Since Kolmogorov complexity is uncomputable (thank you, halting problem), Aaronson\'s proposal is to proxy it with what engineers actually have: compression length. gzip the frame at each timestep - the gzip-size curve over time is the complextropy curve. Crude, but it captures the hump.',
      ],
      code: {
        lang: 'python',
        file: 'complextropy.py',
        snippet: `import zlib

def entropy(pixels):            # second law: only goes up
    p = histogram(pixels) / pixels.size
    return -(p * log2(p)).sum()

def kolmogorov_proxy(pixels):   # "apparent complexity" ~ gzip size
    return len(zlib.compress(pixels.tobytes()))

# timeline of a coffee cup:
# t=0    two clean regions  -> low H,  low K   ("dark | cream")
# t=mid  intricate swirls   -> mid H,  HIGH K  (no short program)
# t=end  uniform beige      -> high H, low K   (fill(beige))
# entropy climbs monotonically; complexity humps. that's the law.`,
      },
    },
    intuitions: [
      {
        title: 'Entropy and complexity are different axes',
        body: 'Entropy counts disorder (how mixed); complexity measures description length (how hard to specify). Both a perfect crystal and perfect noise are simple to describe; the interesting stuff - swirls, organisms, codebases - lives at intermediate entropy.',
      },
      {
        title: 'gzip is a Kolmogorov approximation you can run',
        body: 'The shortest-program length is uncomputable, but every compressor is an upper bound: if gzip finds 12 KB, the true complexity is ≤ 12 KB. Engineers have been doing applied Kolmogorov complexity every time they benchmarked a codec.',
        more: 'This is the same lineage as "the bitter lesson" of compression = intelligence: a model\'s cross-entropy loss *is* a compression rate (bits per token). Predicting and compressing are the same job, which is why this essay sits on an ML list.',
      },
      {
        title: 'The hump is a resource, not a coincidence',
        body: 'Complexity peaks mid-mixing because that\'s when gradients (temperature, density, concentration) exist to drive structure. Once everything equilibrates, there\'s no free energy left to maintain patterns. Life on Earth sits in exactly such a gradient - between the sun and cold space.',
      },
      {
        title: 'It\'s a conjecture with a technical core',
        body: 'The companion paper (Aaronson, Carroll, Ouellette 2014, arXiv:1405.6903) formalized "apparent complexity" via resource-bounded Kolmogorov complexity and studied it in a cellular-automaton "coffee automaton" - the hump shows up under reasonable proxy measures, though a fully general proof remains open.',
      },
    ],
    mechanism: {
      latex: 'K(x) = \\min_{p:\\, U(p) = x} |p| \\qquad \\text{and} \\qquad H(P) = -\\sum_i p_i \\log_2 p_i',
      terms: [
        { symbol: 'K(x)', meaning: 'Kolmogorov complexity of object x: length of the shortest program that outputs it' },
        { symbol: 'U(p)', meaning: 'a universal machine (your language runtime) executing program p' },
        { symbol: '|p|', meaning: 'program length in bits - the description size' },
        { symbol: 'H(P)', meaning: 'Shannon entropy of distribution P: expected surprise / disorder' },
        { symbol: 'p_i', meaning: 'probability of microstate/color i in the mixture' },
        { symbol: '\\min', meaning: 'the shortest possible description - elegant, and provably uncomputable in general' },
      ],
      diagram: {
        height: 46,
        nodes: [
          { id: 'e', x: 50, y: 14, label: 'entropy H(t)', sub: 'rises monotonically - second law', kind: 'io', w: 24 },
          { id: 'k', x: 50, y: 34, label: 'complexity K(t)', sub: 'rises, humps, falls - complextropy', kind: 'io', w: 24 },
          { id: 't0', x: 12, y: 34, label: 't0', sub: 'two clean regions', kind: 'mem', w: 8 },
          { id: 't1', x: 88, y: 34, label: 't_∞', sub: 'uniform beige', kind: 'mem', w: 8 },
        ],
        edges: [
          { from: 't0', to: 'e', label: 'climbs' },
          { from: 'e', to: 't1', label: 'keeps climbing' },
          { from: 't0', to: 'k', label: 'up' },
          { from: 'k', to: 't1', label: 'down', dashed: true },
        ],
      },
      caption: 'Two curves over one cup of coffee: entropy H climbs monotonically (second law); apparent complexity K humps in the middle (the First Law of Complexodynamics).',
    },
    lab: {
      name: 'coffee automaton complextropy',
      hint: 'run the automaton · watch entropy climb while complexity humps',
      completion: 'run the simulation to completion and observe both curves',
    },
    bugs: [
      {
        title: 'kolmogorov complexity is not computable - don\'t "just calculate it"',
        fix: 'determining the shortest program is undecidable (halting problem). use compressor length as an *upper bound proxy* - gzip/png size - and say "apparent complexity".',
      },
      {
        title: 'high entropy ≠ high complexity',
        fix: 'uniform noise has maximal entropy and near-zero *interesting* structure (short description: "random"). complexity humps at intermediate entropy - that distinction is the entire essay.',
      },
      {
        title: 'the "first law" is a conjecture, not a theorem',
        fix: 'it holds for reasonable proxy measures in studied models (coffee automaton), but no general proof exists. quote it as a law of *taste*, with the technical caveats attached.',
      },
    ],
    fieldNotes: {
      buildsOn: [],
      unlocks: ['mdl-1993', 'scaling-laws-2020'],
      further: [
        { label: 'the essay - scottaaronson.blog', url: 'https://scottaaronson.blog/?p=762' },
        { label: 'companion paper: the coffee automaton - arXiv:1405.6903', url: 'https://arxiv.org/abs/1405.6903' },
        { label: 'hutter prize: compression as intelligence', url: 'https://prize.hutter1.net/' },
      ],
      citation: `@misc{aaronson2011complexodynamics,\n  author = {Aaronson, Scott},\n  title = {The First Law of Complexodynamics},\n  year = {2011},\n  howpublished = {\\url{https://scottaaronson.blog/?p=762}}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'Kolmogorov complexity of a string is:',
        options: [
          'The length of the shortest program that outputs the string',
          'The Shannon entropy of the string\'s character distribution',
          'The number of unique characters in the string',
          'The string\'s gzip compression ratio',
        ],
        answer: 0,
        why: 'K(x) = min |p| over programs printing x - source-code size of the object, in the limit.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'As cream mixes into coffee, entropy ___ while apparent complexity ___ :',
        options: [
          'rises monotonically · rises, peaks mid-mix, then falls',
          'rises then falls · rises monotonically',
          'stays constant · falls',
          'falls · rises',
        ],
        answer: 0,
        why: 'The second law drives H up forever; the complextropy hump is the First Law of Complexodynamics conjecture.',
        tag: 'briefing',
      },
      {
        type: 'mcq',
        q: 'Why is gzip size a reasonable stand-in for Kolmogorov complexity?',
        options: [
          'Every compressor gives an upper bound on the shortest-program length - it\'s a computable proxy for an uncomputable quantity',
          'gzip literally finds the shortest program',
          'Because gzip uses the same algorithm as a universal Turing machine',
          'It isn\'t - gzip size is unrelated',
        ],
        answer: 0,
        why: 'K(x) ≤ compressed size always. Crude but computable - the best we can do, and it reproduces the hump.',
        tag: 'intuitions',
      },
      {
        type: 'tf',
        q: 'True or false: a uniformly-mixed cup of coffee (max entropy) has high apparent complexity.',
        answer: false,
        why: 'Uniform beige is trivially described ("fill(#b8a58a)"). Max entropy = boring = low complexity. The hump is in the middle.',
        tag: 'bugs',
      },
      {
        type: 'tf',
        q: 'True or false: the First Law of Complexodynamics is a proven theorem of physics.',
        answer: false,
        why: 'It\'s a conjecture supported by proxy-measure studies (e.g. the coffee automaton); a fully general proof is open.',
        tag: 'bugs',
      },
      {
        type: 'mcq',
        q: 'Why does this essay belong on a deep-learning reading list?',
        options: [
          'Learning and compression are the same job - a predictive model\'s loss is a compression rate, and Kolmogorov complexity is the theory beneath both',
          'Neural networks are cellular automata',
          'It introduced the ReLU activation',
          'It proved that gradients vanish',
        ],
        answer: 0,
        why: 'Cross-entropy loss = bits per token. Understanding complexity/description-length is the foundation of generative modeling.',
        tag: 'field-notes',
      },
      {
        type: 'order',
        q: 'Order the states of the coffee cup by apparent complexity (lowest first):',
        items: [
          'unmixed: dark coffee + separate cream blob',
          'fully mixed: uniform beige',
          'mid-mix: intricate filigreed swirls',
        ],
        answer: [0, 1, 2],
        why: 'Simple start, simple end, complex middle - the complextropy hump. (Note: entropy\'s order would be reversed.)',
        tag: 'intuitions',
      },
    ],
  },
];
