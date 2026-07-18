/**
 * Track 4 — Training, Optimization & Regularization (files 023–027):
 * Batch Normalization, Delving Deep into Rectifiers (He init), Dropout, Adam, MDL.
 * Full level content per design/paper.md §6; schema types imported from track3.ts.
 */

import type { PaperContent } from './track3';

export const track4Papers: PaperContent[] = [
  // ---------------------------------------------------------------- FILE 023
  {
    slug: 'batchnorm-2015',
    fileNo: '023',
    title: 'Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift',
    shortTitle: 'BatchNorm',
    authors: 'Ioffe, Szegedy',
    year: 2015,
    venue: 'ICML 2015',
    sourceUrl: 'https://arxiv.org/abs/1502.03167',
    sourceLabel: 'arXiv:1502.03167',
    track: 4,
    xp: 460,
    difficulty: 3,
    estMinutes: 30,
    hook: 'Normalize the inputs to every layer, not just the first.',
    briefing: {
      paragraphs: [
        "Everyone normalized their input data; then the first layer's output became the next layer's input — unnormalized, and shifting distribution with every weight update. Ioffe & Szegedy named this internal covariate shift: layer 12 is trying to fit a target while the ground moves under it at every step, like coding against an API that redeploys with breaking changes every few seconds.",
        "BatchNorm inserts normalization inside the network: for each feature, subtract the mini-batch mean, divide by the mini-batch std, then apply a learned scale γ and shift β so the layer can still express any distribution it needs — including undoing the normalization entirely. Activations stay in the healthy, gradient-rich region of the nonlinearity for the whole of training, not just at initialization.",
        "The reported effects were dramatic: matching ImageNet accuracy in about 14× fewer training steps, far higher usable learning rates, and much less sensitivity to initialization. BN became default plumbing in conv nets for half a decade, and its descendants (LayerNorm, GroupNorm, RMSNorm) run inside every Transformer you have ever used.",
      ],
      stakes: "BN turned deep-net training from artisanal init-tuning into an industrial process — and every modern normalization layer is its descendant.",
    },
    eliEngineer: {
      prose: [
        "Think of each layer as a service consuming the previous service's JSON. Without a schema, a tiny drift upstream (one weight update) compounds into garbage downstream, and layers spend most of training re-adapting to input drift instead of learning the task. BatchNorm is a validation middleware on every internal interface: whatever comes in gets re-standardized to mean 0, variance 1 (per feature, over the current batch), so downstream code always sees a stable contract.",
        "Pure standardization would be too opinionated — sometimes a layer wants its pre-activations saturated or offset. So BN appends two learned parameters per feature: γ (scale) and β (shift) — normalization with an escape hatch. At inference the 'current batch' doesn't exist, so BN swaps in running averages of mean and variance collected during training: the middleware switches from live sampling to cached statistics. That train/test statistics mismatch is the source of nearly every BN bug in production.",
      ],
      code: {
        lang: 'python',
        file: 'batchnorm.py',
        snippet: `# training step: normalize per feature across the batch, then un-squash
def batchnorm_train(x, gamma, beta, eps=1e-5):
    mu  = x.mean(axis=0)                    # per-feature mean over the batch
    var = x.var(axis=0)
    x_hat = (x - mu) / sqrt(var + eps)      # stable contract: ~N(0,1)
    running_avg.update(mu, var)             # cache stats for inference
    return gamma * x_hat + beta             # learned escape hatch

# inference: no batch to average -> use the cached running stats
def batchnorm_infer(x, gamma, beta):
    return gamma * (x - running_avg.mu) / sqrt(running_avg.var + eps) + beta`,
      },
    },
    intuitions: [
      {
        title: 'Dependency hell, inside one network',
        body: "Each layer's weight update changes the distribution of everything downstream, and deep stacks compound the drift. BN pins each layer's input distribution, so a layer's job stops including 'chase a moving target' and starts being just 'learn the function'.",
        more: "Later work (Santurkar et al., 2018) argues BN's deeper win is smoothing the loss landscape — different mechanism, same engineering outcome: training stops fighting itself.",
      },
      {
        title: 'γ and β are the escape hatch',
        body: "Blind standardization would cap what a layer can express — tanh could never saturate, sigmoid could never leave its linear zone. Learned per-feature scale and shift let the network recover any mean/variance it wants, making BN strictly more expressive than the unnormalized layer.",
        more: "Set γ = √var and β = mean and you recover the original distribution exactly; BN constrains the starting point, not the capacity.",
      },
      {
        title: 'Higher learning rates become safe',
        body: "Normalized pre-activations keep the nonlinearity in its gradient-rich region, so big steps no longer detonate the stack into saturated dead zones. The paper matched state of the art on ImageNet in 1/14th of the training steps, partly by using much larger learning rates.",
        more: "BN also makes a layer invariant to its weight scale (BN(Wx) = BN((αW)x)), which breaks the exploding-weights → exploding-activations feedback loop.",
      },
      {
        title: 'Train stats ≠ test stats',
        body: "In training you normalize by the current mini-batch (a noisy sample); at inference by running averages (the population). The batch noise is even a feature: each example is scored in a slightly random context, which regularizes.",
        more: "Tiny batches make the noise dominate — statistics swing batch to batch — which is why detection and segmentation models with batch size 1–2 moved to GroupNorm.",
      },
    ],
    mechanism: {
      latex: "\\hat{x} = \\frac{x - \\mu_B}{\\sqrt{\\sigma_B^2 + \\epsilon}}, \\qquad y = \\gamma\\,\\hat{x} + \\beta",
      terms: [
        { symbol: 'x', meaning: "one feature's activation for a single example in the mini-batch" },
        { symbol: 'μ_B, σ_B²', meaning: 'mean and variance of that feature computed over the current batch' },
        { symbol: 'ε', meaning: 'tiny constant keeping the denominator safe when a batch has ~zero variance' },
        { symbol: 'x̂', meaning: 'standardized activation: mean 0, variance 1 across the batch' },
        { symbol: 'γ, β', meaning: 'learned per-feature scale and shift — the license to undo or reshape the normalization' },
        { symbol: 'y', meaning: 'the value finally passed to the nonlinearity' },
      ],
      diagram: {
        kind: 'batchnorm-pipeline',
        title: 'BatchNorm between linear layer and nonlinearity',
        nodes: [
          { id: 'x', label: 'batch of activations x' },
          { id: 'stats', label: 'μ_B, σ_B²', sub: 'per feature, over batch' },
          { id: 'norm', label: 'x̂ = (x−μ)/√(σ²+ε)' },
          { id: 'scale', label: 'y = γx̂ + β', sub: 'learned' },
          { id: 'act', label: 'ReLU → next layer' },
        ],
        edges: [
          { from: 'x', to: 'stats' },
          { from: 'stats', to: 'norm' },
          { from: 'x', to: 'norm' },
          { from: 'norm', to: 'scale' },
          { from: 'scale', to: 'act' },
        ],
        note: 'Annotate the stats node with a small train/inference toggle: training uses batch stats; inference swaps in running averages.',
      },
      caption: 'BN sits between the linear transform and the nonlinearity: standardize across the batch, then re-scale with learned γ and β.',
    },
    lab: {
      id: 'covariate-shift',
      name: 'internal covariate shift',
      blurb: 'Drag the incoming batch mean and variance around and watch the pre-activation histogram whipsaw — then enable BN and watch it snap to a stable shape.',
      controls: [
        { label: 'batch mean μ', kind: 'slider', detail: '−4 … 4' },
        { label: 'batch std σ', kind: 'slider', detail: '0.2 … 4' },
        { label: 'BatchNorm', kind: 'toggle', detail: 'on: normalize then apply γ/β; off: raw passthrough' },
        { label: 'γ / β', kind: 'toggle', detail: 'enable the learned scale/shift to see the escape hatch reshape the output' },
        { label: 'resample batch', kind: 'button', detail: 'draw a fresh noisy batch from the current distribution' },
      ],
      stage: 'Two live histograms: incoming activation distribution (driven by the sliders) and post-BN output. With BN on, the second histogram stays centered and unit-width regardless of slider abuse; γ/β toggles show the learned re-shaping.',
      hint: 'yank the μ and σ sliders · flip BN on · toggle γ/β to see the escape hatch',
      completion: 'moved both distribution sliders across their range with BN off and on, and resampled once',
      fallback: 'Static before/after histograms with captions: "input drift" → "BN re-standardizes" → "γ/β restore expressivity".',
    },
    bugs: [
      {
        title: '"BN at inference uses batch statistics"',
        fix: 'Inference must use running averages collected during training; normalizing by a test-time batch leaks information across examples and makes predictions depend on batch composition.',
      },
      {
        title: '"more batchnorm = more better, tiny batches fine"',
        fix: 'Batch size 1–4 gives statistics so noisy they destabilize training; use GroupNorm/LayerNorm or frozen BN there.',
      },
      {
        title: '"BN eliminates the need for good initialization"',
        fix: 'It relaxes init sensitivity, it does not remove it — see file 024; bad scales can still stall early layers before BN statistics settle.',
      },
    ],
    fieldNotes: {
      buildsOn: ['alexnet-2012'],
      unlocks: ['resnet-2015', 'identity-mappings-2016', 'he-init-2015'],
      further: [
        { label: 'Original paper (arXiv:1502.03167)', url: 'https://arxiv.org/abs/1502.03167' },
        { label: 'How Does Batch Normalization Help Optimization? (arXiv:1805.11604)', url: 'https://arxiv.org/abs/1805.11604' },
      ],
      citation: '@inproceedings{ioffe2015batchnorm, title={Batch normalization: Accelerating deep network training by reducing internal covariate shift}, author={Ioffe, Sergey and Szegedy, Christian}, booktitle={ICML}, year={2015} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'Internal covariate shift refers to…',
        options: [
          "each layer's input distribution changing as upstream weights update during training",
          'test data differing from training data',
          'gradients shifting sign between layers',
          'the softmax shifting as temperature changes',
        ],
        answer: 0,
        why: 'Every weight update upstream moves the distribution downstream layers must fit — like coding against an API that changes every step.',
        tag: 'S1',
      },
      {
        type: 'mcq',
        q: 'What do γ and β do in BatchNorm?',
        options: [
          'Learned per-feature scale and shift after standardization, so the layer can express any distribution — including undoing BN',
          'Momentum terms for the running averages',
          'Regularization penalties on the weights',
          'Learning rates for the two moments',
        ],
        answer: 0,
        why: 'Standardization alone would restrict expressivity (e.g. tanh could never saturate); γx̂ + β restores full representational freedom.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'How does BN behave differently at train vs test time?',
        options: [
          'Train: current-batch mean/variance; test: running averages of those statistics collected during training',
          'Train: running averages; test: batch statistics',
          'Identical behavior in both modes',
          'Test time skips BN entirely',
        ],
        answer: 0,
        why: 'At inference there is no batch, so BN freezes the population estimates — forgetting this swap is the classic production bug.',
        tag: 'S4',
      },
      {
        type: 'tf',
        q: 'BN permits higher learning rates partly because it keeps pre-activations out of the saturated regions of the nonlinearity.',
        answer: true,
        why: 'Standardized inputs keep gradients flowing through the nonlinearity, so big steps no longer detonate the stack into saturated dead zones.',
        tag: 'S3',
      },
      {
        type: 'order',
        q: 'Order the operations of a BatchNorm layer at training time.',
        items: [
          'compute batch mean μ_B and variance σ_B² per feature',
          'standardize: x̂ = (x − μ_B)/√(σ_B² + ε)',
          'scale and shift: y = γx̂ + β',
          'apply the nonlinearity (e.g. ReLU)',
        ],
        answer: [0, 1, 2, 3],
        why: 'Statistics → standardize → learned rescale → nonlinearity. BN goes between the linear transform and the activation.',
        tag: 'S4',
      },
      {
        type: 'fill',
        q: 'x̂ = (x − μ_B) / √(___ + ε)',
        tokens: ['σ²_B', 'β', 'γ'],
        answer: ['σ²_B'],
        why: 'Divide by the batch standard deviation (root of the variance) to get unit variance; ε guards the denominator.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'Why is batch-size-1 training with BatchNorm problematic?',
        options: [
          'Per-batch statistics become extremely noisy (variance of a single sample is meaningless), destabilizing normalization and gradients',
          'It is actually ideal — one sample per batch is fastest',
          'GPUs cannot process single samples',
          'γ and β cannot be learned with batch size 1',
        ],
        answer: 0,
        why: 'BN divides by batch statistics; with 1–4 samples the estimates swing wildly — the reason small-batch vision tasks use GroupNorm.',
        tag: 'S6',
      },
      {
        type: 'mcq',
        q: 'A useful side effect of normalizing by noisy batch statistics is…',
        options: [
          'mild regularization — each example is normalized in a slightly different context, like data jitter',
          'faster inference',
          'smaller model size',
          'exact gradient computation',
        ],
        answer: 0,
        why: 'The noise acts like a regularizer: the network cannot rely on exact activation values, similar in spirit to dropout noise.',
        tag: 'S2',
      },
    ],
  },
  // ---------------------------------------------------------------- FILE 024
  {
    slug: 'he-init-2015',
    fileNo: '024',
    title: 'Delving Deep into Rectifiers: Surpassing Human-Level Performance on ImageNet Classification',
    shortTitle: 'He Initialization',
    authors: 'He, Zhang, Ren, Sun',
    year: 2015,
    venue: 'ICCV 2015',
    sourceUrl: 'https://arxiv.org/abs/1502.01852',
    sourceLabel: 'arXiv:1502.01852',
    track: 4,
    xp: 420,
    difficulty: 3,
    estMinutes: 30,
    hook: 'One constant — √(2/n) — that decides if your net wakes up at all.',
    briefing: {
      paragraphs: [
        "Deep nets in early 2015 stood on crutches: layer-wise pretraining, normalization tricks, and luck. This paper attacked the root cause — initialization. If weights are drawn with the wrong variance, activations shrink or grow geometrically layer by layer; by layer 20 the signal, and its gradient, is numerically dead or exploded. No optimizer can fix a network that never receives a signal.",
        "The authors derive the right variance from first principles: for a ReLU layer with n inputs, forward activations keep constant variance if and only if Var(w) = 2/n. The factor 2 — versus Xavier's 1/n — exists because ReLU zeroes half the distribution, halving variance at every layer. Draw W ~ N(0, √(2/n)) and a 30-layer ReLU network, deeper than anything trained directly before, converges from scratch.",
        "Same paper, second gift: PReLU, a ReLU with a learned negative slope. PReLU plus the new initialization produced the first reported better-than-human result on ImageNet classification (4.94% top-5 vs the ~5.1% human estimate). 'He initialization' is still the default every time you call kaiming_normal_ in PyTorch.",
      ],
      stakes: "get this one constant wrong by 10× and a 20-layer net is mathematically untrainable before the first gradient step.",
    },
    eliEngineer: {
      prose: [
        "Picture each layer as an amplifier stage with a gain knob: input variance × per-layer gain = output variance. Gain below 1 per stage compounds to silence; above 1 compounds to clipping noise. The paper simply solves for unity gain — the init that makes Var(output) = Var(input) — given the actual statistics of a ReLU instead of an idealized linear unit.",
        "The derivation is three lines of probability. With zero-mean weights, Var(y) = n·Var(w)·E[x²]. For ReLU, x = max(0, z) with z symmetric about 0, so E[x²] = ½·Var(z): the rectifier halves variance every layer. Setting total gain to 1 gives n·Var(w)·½ = 1, i.e. Var(w) = 2/n. Xavier's classic 1/n assumed linear or tanh units; the 2 is ReLU's tax refund.",
      ],
      code: {
        lang: 'python',
        file: 'he_init.py',
        snippet: `# variance propagation through one ReLU layer (zero-mean weights):
#   Var(y) = n * Var(w) * E[x^2]        # y = w·x summed over n inputs
#   ReLU:  E[x^2] = Var(z) / 2          # half the mass is clamped to zero
#   => Var(y) = (n/2) * Var(w) * Var(z)
# unity gain  =>  Var(w) = 2 / n

def init_layer(fan_in, fan_out):
    std = sqrt(2.0 / fan_in)            # "kaiming" init
    return normal(0, std, size=(fan_out, fan_in))

# PyTorch:  nn.init.kaiming_normal_(w, nonlinearity='relu')
# Xavier (tanh/linear nets):  std = sqrt(1.0 / fan_in)   # note the missing 2`,
      },
    },
    intuitions: [
      {
        title: 'Unity gain or bust',
        body: "A stack of layers multiplies per-layer variance ratios; any constant ratio r ≠ 1 becomes r^L — exponential in depth. Stable training needs each layer to be variance-neutral on average, and initialization is where you set that gain.",
        more: "The same r^L logic applies to gradients flowing backward, which is why the paper also derives the backward-direction condition (Var(w) = 2/n_out).",
      },
      {
        title: "The 2 is ReLU's child support",
        body: "ReLU clamps half its input distribution to zero, so E[x²] halves each layer. Xavier's 1/n was derived for linear/tanh units and systematically shrinks deep ReLU nets; doubling the variance exactly compensates.",
        more: "For a leaky ReLU with slope a the correction generalizes analytically: Var(w) = 2/((1+a²)·n) — PReLU included.",
      },
      {
        title: 'fan_in vs fan_out',
        body: "Forward stability keys on the number of inputs to a unit (fan-in, n); backward stability on fan-out. He init optimizes the forward pass for ReLUs (2/fan_in); the paper shows forward-mode init suffices even for very deep nets.",
        more: "In PyTorch, mode='fan_in' is the default flavor; 'fan_out' is used when preserving the backward signal matters more for the layer shape at hand.",
      },
      {
        title: 'Init sets the starting zone, not the destination',
        body: "Good init doesn't train the net; it ensures layer-1 statistics let gradients flow so training can begin. BN (file 023) later relaxed the constraint by re-normalizing on the fly — but even BN networks converge faster from a principled init.",
        more: "The paper trained 30-layer models from scratch with no BN and no layer-wise pretraining — a radical claim in February 2015.",
      },
    ],
    mechanism: {
      latex: "W \\sim \\mathcal{N}\\!\\bigl(0,\\; \\sqrt{\\tfrac{2}{n_l}}\\bigr), \\qquad n_l = k^2 \\, c_{in}",
      terms: [
        { symbol: 'W', meaning: "a layer's weights, drawn i.i.d. from a zero-mean Gaussian" },
        { symbol: 'n_l', meaning: 'fan-in: the number of inputs feeding one unit' },
        { symbol: '2', meaning: 'compensates ReLU zeroing half the variance at every layer' },
        { symbol: '√(2/n_l)', meaning: 'the standard deviation that makes per-layer variance gain exactly 1' },
        { symbol: 'k²·c_in', meaning: 'conv fan-in: kernel area × input channels (a 3×3 conv on 256 channels → n = 2304)' },
      ],
      diagram: {
        kind: 'variance-cascade',
        title: 'Variance compounding through 20 layers',
        nodes: [
          { id: 'x', label: 'input', sub: 'Var = 1' },
          { id: 'l1', label: 'layer 1', sub: 'gain g' },
          { id: 'l2', label: 'layer 2', sub: 'gain g' },
          { id: 'dots', label: '…' },
          { id: 'l20', label: 'layer 20', sub: 'Var = g²⁰' },
        ],
        edges: [
          { from: 'x', to: 'l1' },
          { from: 'l1', to: 'l2' },
          { from: 'l2', to: 'dots' },
          { from: 'dots', to: 'l20' },
        ],
        note: 'Annotate three curves under the stack: g=0.9 dies (~0.12 by layer 20), g=1.0 flat, g=1.1 explodes (~6.7). He init picks g=1 for ReLU.',
      },
      caption: 'Activation variance compounds multiplicatively through depth. He initialization sets per-layer gain to exactly 1 for ReLU nets.',
    },
    lab: {
      id: 'init-cascade',
      name: 'the variance cascade',
      blurb: 'Slide the init scale and push a signal through 20 ReLU layers; watch the activation histograms die, explode, or hold steady.',
      controls: [
        { label: 'init scale', kind: 'slider', detail: '0.1× … 3× around √(2/n)' },
        { label: 'activation', kind: 'toggle', detail: 'ReLU / tanh — tanh mode shows Xavier\'s 1/n winning instead' },
        { label: 'propagate forward', kind: 'button', detail: 'run activations through all 20 layers' },
        { label: 'propagate backward', kind: 'button', detail: 'run a gradient back through all 20 layers' },
      ],
      stage: 'A cascade of 20 activation histograms (layer 1 → 20). Too-small init: bars collapse to zero by layer ~12; too-big: they blow off scale; √(2/n): the band stays stable end to end. Tanh mode flips the winner to 1/n.',
      hint: "slide the init scale · watch layer 20 · switch ReLU→tanh and see the '2' matter",
      completion: 'swept the init slider through the dying and exploding regimes and found the stable band for both activations',
      fallback: 'Static 3-row strip of histogram cascades (too small / He / too large) with variance readouts per row.',
    },
    bugs: [
      {
        title: '"Xavier init is fine for ReLUs"',
        fix: "Xavier's 1/n assumes symmetric, roughly linear activations; on ReLU stacks it under-scales by √2 per layer and deep nets fade. Use He (2/n) for the ReLU family.",
      },
      {
        title: '"the 2 in 2/n is a tuned hyperparameter"',
        fix: 'It falls out of E[max(0,z)²] = Var(z)/2 — pure derivation, not folklore. Change the activation and the constant changes analytically: leaky slope a → 2/(1+a²).',
      },
      {
        title: '"good init guarantees training works"',
        fix: 'It guarantees a usable signal at step 0. Optimization can still fail — bad LR, pathological data. Init is necessary, not sufficient.',
      },
    ],
    fieldNotes: {
      buildsOn: ['alexnet-2012'],
      unlocks: ['resnet-2015', 'batchnorm-2015', 'adam-2014'],
      further: [
        { label: 'Original paper (arXiv:1502.01852)', url: 'https://arxiv.org/abs/1502.01852' },
        { label: 'Glorot & Bengio: Understanding the difficulty of training deep feedforward neural networks', url: 'http://proceedings.mlr.press/v9/glorot10a.html' },
      ],
      citation: '@inproceedings{he2015delving, title={Delving deep into rectifiers: Surpassing human-level performance on ImageNet classification}, author={He, Kaiming and Zhang, Xiangyu and Ren, Shaoqing and Sun, Jian}, booktitle={ICCV}, year={2015} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'He initialization for a ReLU layer with fan-in n sets…',
        options: ['Var(w) = 2/n, i.e. std √(2/n)', 'Var(w) = 1/n', 'Var(w) = 2/(n_in + n_out)', 'all weights to 0.01'],
        answer: 0,
        why: 'The derivation forces per-layer variance gain to 1 given that ReLU halves variance — Var(w) = 2/n.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'Where does the factor 2 come from?',
        options: [
          'ReLU zeroes half its inputs, so E[x²] = Var/2 per layer; doubling weight variance compensates',
          'Two GPUs were used',
          'It cancels the factor ½ in the learning rate',
          'It is empirical — no derivation exists',
        ],
        answer: 0,
        why: 'For zero-symmetric z, E[max(0,z)²] = ½·Var(z). The 2 exactly refunds what rectification destroys.',
        tag: 'S3',
      },
      {
        type: 'tf',
        q: "Xavier's 1/n init systematically shrinks activation variance in deep ReLU networks.",
        answer: true,
        why: "1/n misses ReLU's variance halving, so each layer loses a factor of 2 and signals fade exponentially with depth.",
        tag: 'S3',
      },
      {
        type: 'mcq',
        q: 'What failure does the wrong initialization scale cause?',
        options: [
          'activation (and gradient) variance compounds as r^L — dying below 1 or exploding above 1 within tens of layers',
          'the loss becomes non-differentiable',
          'weights become NaN immediately in all cases',
          'the model cannot be saved to disk',
        ],
        answer: 0,
        why: 'Per-layer variance ratios multiply; any r ≠ 1 becomes exponential in depth. r=1 is the only stable point.',
        tag: 'S1',
      },
      {
        type: 'order',
        q: 'Order the derivation of He initialization.',
        items: [
          'Var(y) = n·Var(w)·E[x²] for zero-mean weights',
          'ReLU: E[x²] = Var(z)/2',
          'set the gain (n/2)·Var(w) = 1',
          'solve: Var(w) = 2/n',
        ],
        answer: [0, 1, 2, 3],
        why: 'Variance propagation → rectifier correction → unity-gain condition → the √2/n constant.',
        tag: 'S4',
      },
      {
        type: 'fill',
        q: 'kaiming std = √( ___ / n )',
        tokens: ['2', '1', '6'],
        answer: ['2'],
        why: "The '2' is ReLU's correction; Xavier for tanh/linear uses 1.",
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'For a convolutional layer, the n in 2/n equals…',
        options: [
          'kernel height × width × input channels (fan-in)',
          'the number of layers',
          'output channels × batch size',
          'image height × width',
        ],
        answer: 0,
        why: 'A conv unit sums over k·k·c_in products, so fan-in is kernel area times input channels (3×3×256 = 2304).',
        tag: 'S2',
      },
      {
        type: 'mcq',
        q: "The paper's other headline result was…",
        options: [
          'PReLU + this init gave the first reported better-than-human top-5 error on ImageNet (~4.94%)',
          'the invention of the ReLU activation',
          'winning ILSVRC 2015 with 152 layers',
          'the first use of dropout on ImageNet',
        ],
        answer: 0,
        why: 'PReLU (learned negative slope) plus principled init pushed a single model past the ~5.1% human estimate. (The 152-layer win is file 020.)',
        tag: 'S1',
      },
    ],
  },
  // ---------------------------------------------------------------- FILE 025
  {
    slug: 'dropout-2014',
    fileNo: '025',
    title: 'Dropout: A Simple Way to Prevent Neural Networks from Overfitting',
    shortTitle: 'Dropout',
    authors: 'Srivastava, Hinton, Krizhevsky, Sutskever, Salakhutdinov',
    year: 2014,
    venue: 'JMLR 15 (2014)',
    sourceUrl: 'https://jmlr.org/papers/v15/srivastava14a.html',
    sourceLabel: 'JMLR 15 (2014)',
    track: 4,
    xp: 420,
    difficulty: 2,
    estMinutes: 25,
    hook: 'Train an exponential ensemble by randomly unplugging neurons.',
    briefing: {
      paragraphs: [
        "Big nets memorize. With millions of weights and a mere million images, a network can learn each training example by heart — and the failure mode has a name: co-adaptation, neurons conspiring into brittle committees that nail the training set and collapse everywhere else. In 2012 the regularization toolkit was L2 penalties, early stopping, and data augmentation. Dropout added a stranger weapon: during training, delete half the network at random on every step.",
        "Each forward pass, every unit (and its edges) is independently kept with probability p — typically 0.5 for hidden units. The network can never rely on any single feature detector; whatever it learns must be useful across a blizzard of different subnetworks, which forces robust, redundant features and kills co-adaptation. At test time nothing is dropped: weights are simply scaled by p, which approximates averaging the whole exponential family of subnetworks in one deterministic pass.",
        "The JMLR 2014 paper (building on Hinton et al. 2012) showed gains across vision, speech, text, and genetics benchmarks, and dropout became the default regularizer of the pre-batchnorm era. Modern nets use it more sparingly, but the core idea — destructive noise as a training signal for robustness — is everywhere, from DropConnect to stochastic depth to augmentation itself.",
      ],
      stakes: "without a strong regularizer, the deep nets of files 019–024 memorize their training sets; dropout was the cheap trick that let them generalize.",
    },
    eliEngineer: {
      prose: [
        "Dropout is chaos monkey for your layer activations: every training step, each neuron independently goes down with probability 1−p. Any code path that silently depended on one specific neuron being up gets tested millions of times per epoch, and the only features that survive are ones that work no matter which half of the fleet is live.",
        "The ensemble view is the beautiful part. A net with n dropout units is really 2^n different networks sharing weights, each trained on whichever steps its mask drew. Averaging 2^n models at test time would be insane — but scaling each weight by p turns out to compute the geometric mean of the whole ensemble in a single pass. Train with noise, serve the average, pay nothing extra at inference.",
      ],
      code: {
        lang: 'python',
        file: 'dropout.py',
        snippet: `def train_step(x, W, p=0.5):
    mask = (rand(*x.shape) < p)          # Bernoulli: keep each unit w.p. p
    y = (x * mask) / p                   # "inverted dropout": rescale NOW,
    return relu(W @ y)                   #  so test time needs no changes

# classic version: train with x*mask, then at test time scale W <- p*W
# why it works: 2^n weight-sharing subnetworks train together;
# p*W at test time ≈ geometric mean of the entire ensemble`,
      },
    },
    intuitions: [
      {
        title: 'No single points of failure',
        body: "Co-adaptation is neurons forming a cartel: detector A fires only because detector B always covers its false positives. Dropout randomly fires B, so A must become independently useful — features spread into redundant, robust detectors.",
        more: "The paper likens it to sexual reproduction: genes that only work alongside one specific partner gene get weeded out of the pool.",
      },
      {
        title: '2ⁿ networks for the price of one',
        body: "Every dropout mask defines a different subnetwork; SGD trains whichever one is awake, all sharing weights. It is an exponentially large ensemble whose members never meet — cheap committee training where the committee shares one brain.",
        more: "This is why dropout's gains look like classic bagging/ensemble gains, minus the ×1000 training cost.",
      },
      {
        title: 'Scale at test, or rescale at train',
        body: "At inference every unit is always on, so activations would be ~2× too large for p=0.5. The fix: multiply outgoing weights by p at test time — or, in the now-standard inverted dropout, divide by p during training and leave test alone.",
        more: "Forgetting this scaling is a classic silent bug: the model runs, but activations and softmax confidences are systematically off.",
      },
      {
        title: 'Noise is a feature',
        body: "Dropout's mechanism is destructive randomness at exactly the right layer: it corrupts the representation, not the labels or the weights, so the net learns structure that survives corruption — a smooth, redundant code of the data.",
        more: "Same family as data augmentation and label smoothing; RNNs needed a variant that never drops the memory wires (file 006).",
      },
    ],
    mechanism: {
      latex: "r_j \\sim \\mathrm{Bernoulli}(p), \\qquad \\tilde{y} = \\frac{r \\odot y}{p} \\;\\;(\\text{train}), \\qquad y \\;\\;(\\text{test})",
      terms: [
        { symbol: 'y', meaning: 'unit activations of a layer' },
        { symbol: 'r_j', meaning: 'per-unit keep-mask: 1 with probability p, else 0 — resampled every training step' },
        { symbol: '⊙', meaning: 'element-wise multiply: masked units output exactly 0 for this step' },
        { symbol: '÷p', meaning: 'inverted-dropout rescale so expected activations match test time' },
        { symbol: 'p', meaning: 'keep probability: ~0.5 for hidden units, higher (~0.8) for inputs' },
      ],
      diagram: {
        kind: 'dropout-net',
        title: 'A different subnetwork every step',
        nodes: [
          { id: 'x', label: 'input layer' },
          { id: 'h', label: 'hidden layer', sub: '2 of 6 units dropped' },
          { id: 'o', label: 'output layer' },
        ],
        edges: [
          { from: 'x', to: 'h' },
          { from: 'h', to: 'o', label: 'edges from dropped units removed this step' },
        ],
        note: 'Draw two frames side by side: same net, different random masks (dropped units greyed, their edges dashed).',
      },
      caption: 'Each training step samples a thinned subnetwork (p = 0.5). At test time the full net runs with weights scaled by p.',
    },
    lab: {
      id: 'dropout-playground',
      name: 'co-adaptation killer',
      blurb: 'Drop neurons yourself, set p, and watch a small net overfit without dropout — then generalize with it.',
      controls: [
        { label: 'hidden units', kind: 'canvas', detail: 'click units to force-drop them and their edges' },
        { label: 'keep probability p', kind: 'slider', detail: '0.1 … 1.0' },
        { label: 'dropout', kind: 'toggle', detail: 'on/off during scripted training' },
        { label: 'train 200 epochs', kind: 'button', detail: 'plays precomputed train/val loss curves for the current p' },
      ],
      stage: 'A 6-unit hidden-layer net with live edges; train/val loss curves animate as "training" runs — without dropout the validation curve U-turns upward, with p ≈ 0.5 the gap stays closed; clicked units flash red and their edges vanish.',
      hint: 'click neurons to drop them · sweep p · run training with dropout off, then on',
      completion: 'force-dropped at least one neuron, swept p across the range, and ran training in both modes',
      fallback: 'Static pair of loss-curve charts (no dropout vs p = 0.5) plus a masked-network diagram.',
    },
    bugs: [
      {
        title: '"dropout at test time gives free stochastic ensembling"',
        fix: 'Standard dropout is OFF at test time with weights scaled by p; sampling masks at inference is MC-dropout — a different, deliberate technique for uncertainty estimates.',
      },
      {
        title: '"p = 0.5 everywhere"',
        fix: 'Inputs usually keep p ≈ 0.8–1.0 (dropping raw features is expensive); 0.5 is for hidden layers. And in modern BN-era conv nets, dropout is often reduced or removed — BN already regularizes.',
      },
      {
        title: '"dropout works by adding noise to the weights"',
        fix: 'It drops ACTIVATIONS (units plus their edges) per step; the weights themselves are never noised — shared weights are exactly how the 2^n subnetworks stay one model.',
      },
    ],
    fieldNotes: {
      buildsOn: ['alexnet-2012'],
      unlocks: ['rnn-dropout-2014', 'batchnorm-2015'],
      further: [
        { label: 'JMLR paper (v15/srivastava14a)', url: 'https://jmlr.org/papers/v15/srivastava14a.html' },
        { label: 'Predecessor: Hinton et al. 2012 (arXiv:1207.0580)', url: 'https://arxiv.org/abs/1207.0580' },
      ],
      citation: '@article{srivastava2014dropout, title={Dropout: A simple way to prevent neural networks from overfitting}, author={Srivastava, Nitish and Hinton, Geoffrey and Krizhevsky, Alex and Sutskever, Ilya and Salakhutdinov, Ruslan}, journal={Journal of Machine Learning Research}, volume={15}, year={2014} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'Co-adaptation means…',
        options: [
          'neurons become useful only in the presence of specific other neurons — brittle committees that memorize the training set',
          'neurons adapting to the learning rate',
          'two networks sharing a dataset',
          'weights adapting to batch statistics',
        ],
        answer: 0,
        why: 'Detector A only works because detector B always covers its mistakes. Dropout fires B randomly, so every feature must stand on its own.',
        tag: 'S2',
      },
      {
        type: 'mcq',
        q: 'What happens at test time with classic dropout?',
        options: [
          'No units are dropped; weights are scaled by p (or train with /p inverted dropout and leave test unchanged)',
          'Units are dropped with the same p',
          'The network is run 2^n times and averaged',
          'p is set to 1 for hidden layers and 0 for inputs',
        ],
        answer: 0,
        why: 'Test time is deterministic: the p-scaling makes expected activations match training, approximating the full ensemble average.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'The ensemble interpretation of dropout is…',
        options: [
          "each mask is one of 2^n weight-sharing subnetworks; p-scaled weights ≈ the ensemble's geometric mean",
          'each mask trains a fully independent network',
          'dropout averages the last n checkpoints',
          'dropout is a Bayesian posterior over masks',
        ],
        answer: 0,
        why: 'Weight sharing is the trick: exponential ensemble diversity at the cost of training a single network.',
        tag: 'S3',
      },
      {
        type: 'tf',
        q: 'Dropout regularizes by adding noise to the weights themselves during training.',
        answer: false,
        why: 'It zeroes ACTIVATIONS (units + edges) per step. Weights stay clean — they are the shared resource across all subnetworks.',
        tag: 'S2',
      },
      {
        type: 'mcq',
        q: 'Typical keep probabilities in the paper are…',
        options: [
          'p ≈ 0.5 for hidden units, higher (~0.8) for input units',
          'p = 0.1 everywhere',
          'p = 1.0 (dropout off) for hidden units',
          'p = 0.5 for inputs, 0.9 for hidden',
        ],
        answer: 0,
        why: 'Hidden layers tolerate aggressive dropping; inputs are expensive to corrupt, so they are kept most of the time.',
        tag: 'S1',
      },
      {
        type: 'order',
        q: 'Order one training step with inverted dropout.',
        items: [
          'sample a Bernoulli keep-mask r (prob p)',
          'y ← r ⊙ y / p',
          'forward + backprop through the thinned network',
          'update weights; repeat with a fresh mask next step',
        ],
        answer: [0, 1, 2, 3],
        why: 'Fresh mask each step, rescale by 1/p during training, and test time needs no changes.',
        tag: 'S2',
      },
      {
        type: 'fill',
        q: 'Expected activations are preserved at test time by multiplying the weights by ___.',
        tokens: ['p', '1/p', '2'],
        answer: ['p'],
        why: 'Each unit was active only p of the time during training, so its outgoing weights must shrink by p to match expectations.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'Why did dropout usage decline in BatchNorm-era conv nets?',
        options: [
          'batchnorm already regularizes via batch noise, and the two can interact awkwardly — modern recipes use dropout sparingly',
          'dropout was proven incorrect',
          'GPUs got faster, so overfitting stopped',
          'dropout cannot be implemented in modern frameworks',
        ],
        answer: 0,
        why: "Regularizers substitute for each other; BN's noisy statistics plus augmentation often suffice, and BN+dropout interacts subtly.",
        tag: 'S6',
      },
    ],
  },
  // ---------------------------------------------------------------- FILE 026
  {
    slug: 'adam-2014',
    fileNo: '026',
    title: 'Adam: A Method for Stochastic Optimization',
    shortTitle: 'Adam',
    authors: 'Kingma, Ba',
    year: 2014,
    venue: 'ICLR 2015',
    sourceUrl: 'https://arxiv.org/abs/1412.6980',
    sourceLabel: 'arXiv:1412.6980',
    track: 4,
    xp: 460,
    difficulty: 3,
    estMinutes: 30,
    hook: 'Momentum with a per-parameter clutch: the default optimizer.',
    briefing: {
      paragraphs: [
        "Vanilla SGD treats every parameter identically: one global learning rate for a weight that sees a gradient on every step and for an embedding that updates once per epoch. It also jitters along ravines — oscillating across the steep axis while crawling along the shallow one. By 2014 the fixes existed separately: momentum smoothed the direction; AdaGrad/RMSProp rescaled per parameter. Adam fused them into one update rule that became the default for the next decade.",
        "Adam keeps two exponential moving averages per parameter: m of the gradient (where are we heading?) and v of the squared gradient (how noisy is that heading?). The step is m̂/√v̂ — big confident strides on parameters with consistent gradients, tiny careful steps on noisy ones — plus a bias correction that un-skews the averages during the first steps, while the zero-initialized accumulators are still warming up.",
        "It is not magic: later work showed Adam can generalize worse than tuned SGD on vision tasks, its convergence proof had a gap (fixed by AMSGrad), and its L2 regularization interacts badly with the adaptive scaling (fixed by AdamW). But 'just use Adam' remains the most successful opening move in deep learning — the entire Transformer era trains on it or its descendants.",
      ],
      stakes: "the optimizer is the loop that runs your entire training run; Adam is the loop that ran nearly every model you have ever used.",
    },
    eliEngineer: {
      prose: [
        "Think of each parameter as a car with its own adaptive cruise control. m is the smoothed velocity — a low-pass filter on the gradient stream that keeps you moving through sampling noise instead of reacting to every minibatch. v is a per-parameter noise meter: if recent gradients were large and erratic, √v is big, so the update m/√v automatically eases off; if gradients are small but consistent, √v is small and the same update becomes a confident stride.",
        "Both accumulators start at zero, which biases them toward zero for roughly the first 1/(1−β) steps — like a moving average with a cold cache. Adam's bias correction (divide by 1−βᵗ) inflates the early estimates back to honest scale, so you don't crawl through the most fragile phase of training. Then it is one line: θ −= α·m̂/(√v̂ + ε), with defaults (0.9, 0.999, 1e-8) that almost never need touching.",
      ],
      code: {
        lang: 'python',
        file: 'adam.py',
        snippet: `m, v = 0.0, 0.0                      # per-parameter accumulators
b1, b2, eps, alpha = 0.9, 0.999, 1e-8, 3e-4

def step(g, t):                      # g = grad at step t (t starts at 1)
    m = b1 * m + (1 - b1) * g        # EMA of gradient   ("velocity")
    v = b2 * v + (1 - b2) * g * g    # EMA of squared grad ("noise")
    m_hat = m / (1 - b1 ** t)        # bias correction: cold-start fix
    v_hat = v / (1 - b2 ** t)
    return -alpha * m_hat / (sqrt(v_hat) + eps)

# consistent gradient -> v stays small -> effective step grows
# noisy gradient      -> v inflates    -> effective step shrinks
# |step| ≈ alpha always: updates are roughly scale-free per parameter`,
      },
    },
    intuitions: [
      {
        title: 'EMA is a low-pass filter',
        body: "Raw minibatch gradients are noisy sensor readings; m = 0.9·m + 0.1·g is a cheap IIR filter that keeps the persistent direction and cancels the jitter. That smoothing is what lets Adam cross ravines without oscillating off the walls.",
        more: "β₁ = 0.9 ≈ averaging the last ~10 gradients; β₂ = 0.999 ≈ the last ~1000 squared gradients.",
      },
      {
        title: 'Dividing by √v is a per-parameter clutch',
        body: "Parameters with historically large gradients get their steps divided down; rarely-updated parameters (sparse features!) with small historical gradients get relatively larger steps. Update magnitude ends up ≈ α regardless of gradient scale — why Adam is famously insensitive to loss scaling.",
        more: "This is inherited from AdaGrad/RMSProp; Adam's contribution was bolting it to momentum plus bias correction.",
      },
      {
        title: 'Bias correction is a cold-start fix',
        body: "With m, v initialized at 0, early estimates are shrunk by a factor of (1−βᵗ). Dividing by 1−βᵗ exactly un-shrinks them; after a few hundred steps the correction → 1 and disappears.",
        more: "Skip the correction and the first updates are tiny and biased toward zero — noticeable exactly when training is most fragile.",
      },
      {
        title: "The default that isn't free",
        body: "Adam converges fast and tolerates sloppy hyperparameters, but it can land in sharper minima than well-tuned SGD (the 'generalization gap'), and L2 applied through the adaptive update decays high-gradient weights less than intended — AdamW fixes this by decoupling weight decay from the gradient step.",
        more: "Reddi et al. 2018 also showed v can shrink at the wrong moment and break convergence in rare cases; AMSGrad keeps a running max of v.",
      },
    ],
    mechanism: {
      latex: "\\theta_t = \\theta_{t-1} - \\alpha\\, \\frac{\\hat{m}_t}{\\sqrt{\\hat{v}_t} + \\epsilon}",
      terms: [
        { symbol: 'θ', meaning: 'the parameters being updated' },
        { symbol: 'α', meaning: 'global learning rate (paper default 0.001; 3e-4 is the folklore default)' },
        { symbol: 'm̂', meaning: 'bias-corrected EMA of the gradient: the smoothed direction' },
        { symbol: 'v̂', meaning: 'bias-corrected EMA of squared gradients: the per-parameter scale/noise estimate' },
        { symbol: '√v̂ + ε', meaning: 'normalizer — large when gradients were big or noisy, shrinking the step; ε avoids division by zero' },
        { symbol: 't', meaning: 'step index (starts at 1), needed for the 1−βᵗ bias corrections' },
      ],
      diagram: {
        kind: 'adam-flow',
        title: 'One Adam update',
        nodes: [
          { id: 'g', label: 'gradient g_t' },
          { id: 'm', label: 'm ← β₁m + (1−β₁)g', sub: 'direction' },
          { id: 'v', label: 'v ← β₂v + (1−β₂)g²', sub: 'scale' },
          { id: 'hat', label: 'm̂, v̂', sub: '÷ (1−βᵗ)' },
          { id: 'upd', label: 'θ −= α·m̂/(√v̂+ε)' },
        ],
        edges: [
          { from: 'g', to: 'm' },
          { from: 'g', to: 'v' },
          { from: 'm', to: 'hat' },
          { from: 'v', to: 'hat' },
          { from: 'hat', to: 'upd' },
        ],
        note: 'Side captions: "momentum from m" on the m node, "adaptive per-parameter rate from v" on the v node.',
      },
      caption: "Two running averages per parameter: direction (m) and scale (v). Adam's step is direction normalized by scale.",
    },
    lab: {
      id: 'optimizer-race',
      name: 'optimizer race',
      blurb: 'Race SGD, momentum, and Adam down a ravine loss surface and watch who oscillates, who crawls, and who glides.',
      controls: [
        { label: 'start race', kind: 'button', detail: 'animate all three optimizers step-by-step from the same start' },
        { label: 'learning rate', kind: 'slider', detail: 'crank it until SGD diverges' },
        { label: 'restart', kind: 'button', detail: 'reset to the start point' },
        { label: 'show trails', kind: 'toggle', detail: 'keep the full path of each ball on the contour map' },
      ],
      stage: '2D contour map of a narrow ravine; three balls animate step-by-step: SGD ping-pongs across the ravine, momentum overshoots then settles, Adam takes damped diagonal strides to the bottom. A step counter and current loss read out live.',
      hint: 'run the race · crank the learning rate until SGD diverges · restart and compare',
      completion: 'ran the race at least twice, including once at a learning rate where plain SGD visibly struggles',
      fallback: 'Static 3-trail contour image with one caption per optimizer.',
    },
    bugs: [
      {
        title: '"Adam is always better than SGD"',
        fix: 'Adam converges faster and needs less tuning, but tuned SGD+momentum often generalizes better on vision benchmarks; common recipe: prototype on Adam, finalize with SGD or AdamW.',
      },
      {
        title: '"L2 regularization works the same in Adam"',
        fix: 'L2 enters the gradient, then gets divided by √v — high-gradient weights get LESS decay. AdamW (arXiv:1711.05101) decouples decay from the adaptive step and is what modern stacks actually run.',
      },
      {
        title: '"bias correction is optional bookkeeping"',
        fix: 'Without it, the first ~1/(1−β) steps use m, v biased toward zero — updates are systematically too small and skewed exactly when training is most sensitive.',
      },
    ],
    fieldNotes: {
      buildsOn: ['he-init-2015'],
      unlocks: ['scaling-laws-2020', 'transformer-2017'],
      further: [
        { label: 'Original paper (arXiv:1412.6980)', url: 'https://arxiv.org/abs/1412.6980' },
        { label: 'AdamW: Decoupled Weight Decay (arXiv:1711.05101)', url: 'https://arxiv.org/abs/1711.05101' },
        { label: 'Distill: Why Momentum Really Works', url: 'https://distill.pub/2017/momentum/' },
      ],
      citation: '@inproceedings{kingma2015adam, title={Adam: A method for stochastic optimization}, author={Kingma, Diederik P. and Ba, Jimmy}, booktitle={ICLR}, year={2015} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'What do m and v track in Adam?',
        options: [
          'EMA of the gradient and EMA of the squared gradient — direction and per-parameter scale',
          'the minimum and maximum gradient seen so far',
          'momentum and velocity in physical units',
          'the loss and its curvature',
        ],
        answer: 0,
        why: 'm is a smoothed gradient (where to go); v is a smoothed squared gradient (how big/noisy the steps have been).',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'Why does Adam need bias correction?',
        options: [
          'm and v start at 0, so early estimates are biased toward zero; dividing by (1−βᵗ) restores honest scale',
          'gradients are biased by the batch size',
          'ReLU biases activations toward zero',
          'the learning rate decays over time',
        ],
        answer: 0,
        why: 'An EMA initialized at 0 underestimates for the first ~1/(1−β) steps; the correction vanishes as t grows.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'A parameter with large, noisy historical gradients gets…',
        options: [
          'a smaller effective step (divided by a large √v) — the per-parameter clutch',
          'a larger effective step to escape the noise',
          'exactly the same step as all other parameters',
          'frozen until the noise decreases',
        ],
        answer: 0,
        why: '√v large → m̂/√v̂ small. Consistent small gradients, by contrast, get amplified up toward α.',
        tag: 'S3',
      },
      {
        type: 'tf',
        q: 'Applying L2 regularization through Adam decays all weights equally.',
        answer: false,
        why: 'L2 joins the gradient and is then divided by √v, so high-gradient weights decay less. AdamW decouples weight decay from the adaptive update.',
        tag: 'S6',
      },
      {
        type: 'order',
        q: 'Order one Adam update step.',
        items: [
          'compute the minibatch gradient g',
          'update the EMAs m and v',
          'bias-correct: m̂ = m/(1−β₁ᵗ), v̂ = v/(1−β₂ᵗ)',
          'θ −= α · m̂ / (√v̂ + ε)',
        ],
        answer: [0, 1, 2, 3],
        why: 'Gradient → accumulate moments → un-bias → normalized step.',
        tag: 'S4',
      },
      {
        type: 'fill',
        q: 'θ_t = θ_{t−1} − α · m̂_t / (___ + ε)',
        tokens: ['√v̂_t', 'v̂_t', 'm̂_t²'],
        answer: ['√v̂_t'],
        why: 'The step is direction divided by the ROOT of the second moment — RMS, not raw variance.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: "The paper's default hyperparameters are…",
        options: ['β₁ = 0.9, β₂ = 0.999, ε = 1e-8', 'β₁ = 0.99, β₂ = 0.9, ε = 1e-6', 'β₁ = 0.5, β₂ = 0.5, ε = 0', 'α = 0.1, β₁ = 0.95, β₂ = 0.95'],
        answer: 0,
        why: 'β₁ = 0.9 and β₂ = 0.999 average ~10 and ~1000 past (squared) gradients respectively.',
        tag: 'S2',
      },
      {
        type: 'mcq',
        q: 'Adam is best described as the fusion of which two ideas?',
        options: [
          'momentum (smoothed direction) + RMSProp/AdaGrad-style per-parameter adaptive scaling',
          'genetic algorithms + gradient descent',
          'Newton\'s method + line search',
          'dropout + batch normalization',
        ],
        answer: 0,
        why: 'First moment ≈ momentum; second-moment normalization ≈ RMSProp. Adam = both, plus bias correction.',
        tag: 'S1',
      },
    ],
  },
  // ---------------------------------------------------------------- FILE 027
  {
    slug: 'mdl-1993',
    fileNo: '027',
    title: 'Keeping Neural Networks Simple by Minimizing the Description Length of the Weights',
    shortTitle: 'MDL Weights',
    authors: 'Hinton, van Camp',
    year: 1993,
    venue: 'COLT 1993',
    sourceUrl: 'https://doi.org/10.1145/168304.168306',
    sourceLabel: 'DOI 10.1145/168304.168306',
    track: 4,
    xp: 420,
    difficulty: 4,
    estMinutes: 30,
    hook: 'Regularization = file compression for weights.',
    briefing: {
      paragraphs: [
        "Why should a big neural network with thousands of weights generalize at all? In 1993 — years before deep learning worked — Hinton & van Camp gave an answer that still frames the debate: a learning algorithm is a compression scheme. To transmit the training data you can send the raw examples, or send a model plus the errors it makes; if model-plus-corrections is SHORTER than the raw data, the model has captured real structure. This is Rissanen's Minimum Description Length principle: Occam's razor, measured in bits.",
        "Their move: make description length itself the training objective. Total cost = bits to describe the weights + bits to describe the data's misfit given those weights. Shannon says an event of probability p costs −log₂ p bits to transmit, so the two terms are exactly the negative log-prior and negative log-likelihood — MDL is MAP estimation seen through a compression lens, and a Gaussian prior on weights turns out to be L2 weight decay in disguise.",
        "The paper's elegant detail: with a mixture-of-Gaussians prior, weights can be communicated after quantization into a few learned clusters — weights that cluster together are cheap to describe, so the objective actively pushes toward simple, quantizable, few-effective-parameter solutions. The same accounting later powered variational inference (the ELBO's KL term IS a description-length term, file 029) and the modern 'compression is intelligence' view of large models.",
      ],
      stakes: "every regularizer you have ever used is secretly a statement about how many bits your model is worth. This paper said that first — and made it a loss function.",
    },
    eliEngineer: {
      prose: [
        "You are emailing the training set to a friend. Option A: attach the raw CSV — n examples, full price. Option B: send a small program (the weights) plus a diff of every place the program is wrong. If program + diff < raw CSV, your model genuinely compressed the data — and compression is only possible by exploiting regularities, which is what generalization IS. Overfitting is when your diff is tiny but the program is enormous: you re-attached the dataset inside the model.",
        "Now make it a loss function. Shannon coding says the optimal code for an event costs −log₂ p bits. So bits(weights) = −log₂ P(weights) is the prior, and bits(errors | weights) = −log₂ P(data | weights) is the usual training loss. Minimize the sum and you are doing MAP — but the compression view tells you how to DESIGN priors: pick codes where good models are cheap. Hinton & van Camp's mixture prior lets weights snap to a few shared values — like palette-compressing a PNG — spending bits only where precision pays.",
      ],
      code: {
        lang: 'python',
        file: 'mdl_loss.py',
        snippet: `# shannon coding: an outcome with probability p costs -log2(p) bits
def total_bits(weights, data):
    model_bits = -log2(prior_pdf(weights)).sum()         # cost to transmit W
    error_bits = -log2(likelihood(data | weights)).sum() # cost to transmit residuals
    return model_bits + error_bits                       # the MDL objective

# gaussian prior N(0, σ²):  model_bits ∝ Σ w² / (2σ² ln2)  == L2 weight decay!
# mixture-of-gaussians prior: weights cluster to a few values -> cheap to encode
#   (think: 256-color palette instead of 24-bit RGB for every weight)`,
      },
    },
    intuitions: [
      {
        title: 'Overfitting is a zip bomb in reverse',
        body: "A memorizing model has near-zero error bits but a model description as long as the dataset itself — total transmission no shorter than the raw data. MDL's sum exposes the scam: you haven't compressed anything.",
        more: "The sweet spot is a model just complex enough that one more bit of model saves more than one bit of errors; the objective finds it automatically.",
      },
      {
        title: 'MAP is MDL in a trench coat',
        body: "−log P(w|D) = −log P(D|w) − log P(w) + const. Read as bits: error term + model term. L2 weight decay is literally 'Gaussian codebook for weights'; L1 is a Laplacian codebook. Your favorite regularizers are prior beliefs about which models are cheap to describe.",
        more: "This is why Bayesian and compression people keep arriving at the same objectives from opposite directions.",
      },
      {
        title: 'Clustered weights compress',
        body: "With a mixture-of-Gaussians prior, encoding a weight costs little if it sits near a cluster center shared by many weights — the codebook amortizes. Gradient pressure literally quantizes the network toward a few effective values, years before 'network quantization' was a deployment trick.",
        more: "The clusters' means, variances, and mixing weights are learned per layer during training — the codebook adapts to the network it must describe.",
      },
      {
        title: 'Bits are the universal currency',
        body: "Accuracy, complexity, and uncertainty all convert to one unit, so trade-offs become arithmetic: is this extra layer worth 300 bits? MDL even sets the regularization strength automatically — no separate hunt for λ.",
        more: "The KL penalty in VAEs (file 029) is the same idea wearing a neural hat: the latent code must pay its description length in bits.",
      },
    ],
    mechanism: {
      latex: "L(w) = \\underbrace{-\\log_2 P(D \\mid w)}_{\\text{error bits}} \\;+\\; \\underbrace{-\\log_2 P(w)}_{\\text{model bits}}",
      terms: [
        { symbol: 'L(w)', meaning: 'total description length: bits to transmit the data using this model — the training objective' },
        { symbol: '−log₂ P(D|w)', meaning: 'error bits: cost of describing every residual the model gets wrong (the usual likelihood loss)' },
        { symbol: '−log₂ P(w)', meaning: 'model bits: cost of describing the weights under the prior\'s code (the regularizer)' },
        { symbol: 'P(w)', meaning: 'the prior = the codebook: Gaussian → L2; mixture of Gaussians → learned quantization' },
        { symbol: 'log₂', meaning: "Shannon's coding theorem: the optimal code length of an event with probability p is −log₂ p bits" },
      ],
      diagram: {
        kind: 'mdl-bars',
        title: 'The MDL budget',
        nodes: [
          { id: 'raw', label: 'raw data', sub: 'n bits' },
          { id: 'model', label: 'model', sub: 'm bits' },
          { id: 'errors', label: 'residual errors', sub: 'e bits' },
          { id: 'total', label: 'm + e < n ?', sub: 'compressed?' },
        ],
        edges: [
          { from: 'model', to: 'total' },
          { from: 'errors', to: 'total' },
          { from: 'raw', to: 'total', label: 'beat this' },
        ],
        note: 'Draw as stacked bars: model bits + error bits trading off as a complexity slider moves; mark the minimum of the total.',
      },
      caption: 'Transmit the model, then the errors it makes. Learning = minimizing the total message length.',
    },
    lab: {
      id: 'mdl-budget',
      name: 'description-length budget',
      blurb: 'Drag model complexity and watch model bits rise while error bits fall — find the minimum total, then switch priors to see weights cluster and compress.',
      controls: [
        { label: 'model complexity', kind: 'slider', detail: 'effective parameters, few → many' },
        { label: 'prior', kind: 'toggle', detail: 'Gaussian (L2) / mixture-of-Gaussians (clustered codebook)' },
        { label: 'weight histogram', kind: 'button', detail: 'show the learned weight distribution snapping into clusters under the mixture prior' },
      ],
      stage: 'Two stacked bars (model bits, error bits) and their sum as a line with a marked minimum; mixture-prior mode shows weights snapping into clusters on an inline histogram, visibly shrinking the model bar.',
      hint: 'drag complexity across the sweep · watch the total bottom out · flip the prior to cluster the weights',
      completion: 'moved the complexity slider through its full range and switched priors once',
      fallback: 'Static bar chart at three complexity settings (middle minimal) with a caption explaining the trade-off.',
    },
    bugs: [
      {
        title: '"MDL says always prefer the smallest model"',
        fix: "It prefers the smallest TOTAL message: a too-simple model pays more error bits than it saves in model bits. MDL trades, it doesn't shrink.",
      },
      {
        title: '"this is just Bayes with extra steps"',
        fix: 'They coincide for MAP point estimates, but MDL is broader: it needs no "true prior", only a code — and it explains WHY simple models generalize (compression), which Bayes assumes rather than derives.',
      },
      {
        title: '"1993 theory, no modern use"',
        fix: 'The same accounting drives variational inference (the ELBO KL term is a bit budget, file 029), neural weight quantization and compression, and the "LLMs are compressors" argument.',
      },
    ],
    fieldNotes: {
      buildsOn: [],
      unlocks: ['vlae-2016', 'dropout-2014', 'complexodynamics'],
      further: [
        { label: 'Original paper (DOI 10.1145/168304.168306)', url: 'https://doi.org/10.1145/168304.168306' },
        { label: 'Scholarpedia: Minimum Description Length', url: 'http://www.scholarpedia.org/article/Minimum_description_length' },
      ],
      citation: '@inproceedings{hinton1993mdl, title={Keeping neural networks simple by minimizing the description length of the weights}, author={Hinton, Geoffrey E. and van Camp, Drew}, booktitle={Proceedings of COLT}, year={1993} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'The MDL objective is…',
        options: [
          "bits to describe the model + bits to describe the data's errors given the model",
          'the number of parameters in the model',
          'the training loss alone',
          'the entropy of the dataset',
        ],
        answer: 0,
        why: 'Total message length = model bits + error bits. Minimizing the sum is learning.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'Under Shannon coding, an event with probability p costs…',
        options: ['−log₂ p bits — which is why −log P(w) is a description length', 'p bits', 'log₂ p bits (positive)', '1/p bits'],
        answer: 0,
        why: 'Likely events get short codes, rare events long ones; −log₂ p is the optimal length, so probabilities ARE bit budgets.',
        tag: 'S3',
      },
      {
        type: 'tf',
        q: 'A Gaussian prior on the weights corresponds to L2 weight decay.',
        answer: true,
        why: '−log of a Gaussian density is proportional to Σw² — the L2 penalty is the Gaussian codebook, in bits.',
        tag: 'S3',
      },
      {
        type: 'mcq',
        q: 'Why does an overfit model fail the MDL test?',
        options: [
          'its error bits are low but its model description is as long as the data — no net compression',
          'it uses too few parameters',
          'its loss is exactly zero',
          'it compresses the data too well',
        ],
        answer: 0,
        why: 'Memorization moves bits from the error column into the model column; the total message never shrinks.',
        tag: 'S2',
      },
      {
        type: 'mcq',
        q: 'The mixture-of-Gaussians prior encourages…',
        options: [
          'weights clustering into a few shared values that are cheap to encode — learned quantization',
          'weights spreading to infinity',
          'binary weights only',
          'sparse activations in the forward pass',
        ],
        answer: 0,
        why: 'Weights near a shared cluster center cost few bits; the objective pushes the network toward quantizable solutions.',
        tag: 'S3',
      },
      {
        type: 'fill',
        q: 'L(w) = −log₂ P(D|w) ___ (−log₂ P(w))',
        tokens: ['+', '−', '×'],
        answer: ['+'],
        why: 'Total description length is the SUM of error bits and model bits.',
        tag: 'S4',
      },
      {
        type: 'order',
        q: 'Order the MDL transmission story.',
        items: [
          'choose/train weights w',
          'transmit w using the prior code',
          'transmit each residual (data − prediction)',
          'total bits = model + errors; minimize it',
        ],
        answer: [0, 1, 2, 3],
        why: 'Sender and receiver share the codebook; whatever the model explains needs no bits in the residual stream.',
        tag: 'S2',
      },
      {
        type: 'mcq',
        q: 'MDL formalizes which classical principle?',
        options: [
          "Occam's razor: the best hypothesis is the one that compresses the data most",
          'the pigeonhole principle',
          'the bias-variance tradeoff, renamed',
          "Moore's law",
        ],
        answer: 0,
        why: '"Simplest explanation that fits" becomes measurable: shortest total description in bits.',
        tag: 'S1',
      },
    ],
  },
];

export default track4Papers;

