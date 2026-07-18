/**
 * Track 3 — Vision & ConvNets (files 019–022): AlexNet, ResNet, Identity Mappings, Dilated Convolutions.
 * Full level content per design/paper.md §6. No imports — this file also carries the shared
 * content-schema types consumed by track4.ts / track5.ts (structurally identical to paper.md §6).
 */

export type SectionId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7';

export type QuizQuestion =
  | { type: 'mcq'; q: string; options: string[]; answer: number; why: string; tag: SectionId }
  | { type: 'tf'; q: string; answer: boolean; why: string; tag: SectionId }
  | { type: 'order'; q: string; items: string[]; answer: number[]; why: string; tag: SectionId }
  | { type: 'fill'; q: string; tokens: string[]; answer: string[]; why: string; tag: SectionId };

export interface DiagramNode {
  id: string;
  label: string;
  sub?: string;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

/** Bespoke hand-built SVG spec: labeled boxes/arrows, left-to-right flow unless `note` says otherwise. */
export interface DiagramSpec {
  kind: string; // machine name, e.g. "residual-block"
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  note?: string; // drawing instructions / tooltip captions for the artist
}

export interface LabControl {
  label: string;
  kind: 'slider' | 'toggle' | 'button' | 'canvas' | 'tabs';
  detail: string;
}

export interface LabSpec {
  id: string;
  name: string; // shown as "LAB // <name>"
  blurb: string;
  controls: LabControl[];
  stage: string; // what the canvas/SVG stage renders
  hint: string; // footer gesture hint bar
  completion: string; // completion-detection rule (+25 XP trigger)
  fallback: string; // static reduced-motion SVG walkthrough
}

export interface PaperContent {
  slug: string;
  fileNo: string; // "014"
  title: string;
  shortTitle: string;
  authors: string;
  year: number;
  venue: string;
  sourceUrl: string;
  sourceLabel: string; // "arXiv:1706.03762"
  track: 1 | 2 | 3 | 4 | 5;
  bonus?: boolean;
  xp: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estMinutes: number;
  hook: string;
  briefing: { paragraphs: string[]; stakes: string };
  eliEngineer: { prose: string[]; code: { lang: string; file: string; snippet: string } };
  intuitions: { title: string; body: string; more?: string }[]; // 3-4
  mechanism: {
    latex: string;
    terms: { symbol: string; meaning: string }[];
    diagram: DiagramSpec;
    caption: string;
  };
  lab: LabSpec;
  bugs: { title: string; fix: string }[]; // 2-3
  fieldNotes: {
    buildsOn: string[]; // sibling paper slugs
    unlocks: string[]; // sibling paper slugs
    further: { label: string; url: string }[];
    citation: string; // bibtex-style, copy-able
  };
  quiz: QuizQuestion[]; // pool of 8, draw 5
}

export const track3Papers: PaperContent[] = [
  // ---------------------------------------------------------------- FILE 019
  {
    slug: 'alexnet-2012',
    fileNo: '019',
    title: 'ImageNet Classification with Deep Convolutional Neural Networks',
    shortTitle: 'AlexNet',
    authors: 'Krizhevsky, Sutskever, Hinton',
    year: 2012,
    venue: 'NeurIPS 2012',
    sourceUrl: 'https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks',
    sourceLabel: 'NeurIPS 2012 proceedings',
    track: 3,
    xp: 500,
    difficulty: 3,
    estMinutes: 35,
    hook: 'The 2012 Big Bang: GPUs, ReLUs, and the end of hand-crafted features.',
    briefing: {
      paragraphs: [
        "In 2012 computer vision ran on hand-engineered features — SIFT, HOG, carefully tuned pipelines — fed into shallow classifiers, and the field's flagship benchmark (ImageNet: 1.2M labeled images, 1000 classes) had top-5 error rates stuck in the mid-20s. Then three researchers from Toronto entered an 8-layer convolutional network trained on two gaming GPUs and scored 15.3%, nearly 11 points better than the runner-up. The architecture family wasn't new — LeCun trained conv nets in 1989 — but this was the first proof at scale that learned features crush engineered ones.",
        "Three ingredients made it train at all: ReLU activations, which train several times faster than the tanh units of the era; aggressive regularization — dropout plus heavy data augmentation — to keep 60 million parameters from simply memorizing 1.2 million images; and hand-written CUDA convolution kernels split across two GTX 580s that each held half the network and swapped tensors at a few chosen layers. Five to six days of GPU compute did what no CPU budget of the time could.",
        "The aftershock defines the decade you work in: within three years essentially every vision system was a deep conv net, 'feature engineering' became 'architecture engineering', and GPU compute became the limiting reagent of AI progress. This paper is the Big Bang — the moment deep learning went from fringe to inevitable.",
      ],
      stakes: "without this result, deep learning stays a niche curiosity — no GPU gold rush, no ImageNet moment, no modern AI stack.",
    },
    eliEngineer: {
      prose: [
        "A convolution is a small function applied at every position of an image — one function, millions of call sites. Instead of hand-writing isEdge(x, y), AlexNet learns 96 different 11×11 filters in its first layer by gradient descent, then learns filters over the outputs of those filters, stacking abstraction the way you compose pure functions. Weight sharing means one cat-ear detector works whether the ear is top-left or bottom-right: translation invariance for free, and a parameter count a fully connected layer could never afford.",
        "Training itself is ordinary SGD: forward an image, compare the 1000-way softmax to the label, backprop the error through every filter, nudge, repeat. What made it viable in 2012 was engineering: ReLUs whose gradients don't saturate, dropout randomly disabling half of the two huge fully connected layers each step, augmentation synthesizing thousands of times more training data (random 224×224 crops, horizontal flips, PCA color jitter from 256×256 originals), and two GPUs passing activation tensors through a hand-built cross-device pipeline.",
      ],
      code: {
        lang: 'python',
        file: 'convnet.py',
        snippet: `# a conv layer = one function, every position, shared weights
def conv2d(image, kernel, bias):              # kernel: small LEARNED weight grid
    out = empty_like(image)
    for y in range(H - K + 1):                # slide the window
        for x in range(W - K + 1):
            patch = image[y:y+K, x:x+K]
            out[y, x] = relu(sum(patch * kernel) + bias)  # dot product + ReLU
    return out

relu = lambda v: max(0, v)   # cheap, and gradients don't saturate

# AlexNet ≈ 5 conv layers (edges -> textures -> parts -> objects)
#         + 3 dense layers + 1000-way softmax — every filter learned end-to-end`,
      },
    },
    intuitions: [
      {
        title: 'One function, a million call sites',
        body: "A fully connected layer on a 224×224 image learns a separate weight for every (pixel, neuron) pair — and a cat detector learned top-left is useless bottom-right. Convolution shares one small kernel across all positions, like extracting a helper function instead of inlining it everywhere: far fewer parameters, built-in translation invariance.",
        more: "AlexNet's first layer learned 96 filters that look exactly like the edge and color-blob detectors vision researchers used to design by hand — except gradient descent invented them.",
      },
      {
        title: 'ReLU is a gradient that never sleeps',
        body: "tanh saturates: for large |x| its slope is ~0, so error signals die layer by layer. ReLU's slope is exactly 1 for all positive inputs, so gradients flow at full strength no matter the activation level — AlexNet trained several times faster with ReLUs than with tanh, which is what made a net this deep feasible at all.",
        more: "The cost: a neuron whose inputs go permanently negative outputs 0 forever (a 'dead ReLU') — a trade the field still accepts daily.",
      },
      {
        title: 'Regularization is survival gear, not polish',
        body: "60M parameters against 1.2M images is a memorization machine waiting to happen. AlexNet stacked dropout (kill 50% of the two huge dense layers each step) with augmentation (crops, flips, color jitter) to multiply the effective dataset — forcing features that work on any subnetwork and any crop.",
        more: "At test time dropout just scales weights by p — an exponential ensemble of subnetworks collapsed into one deterministic forward pass. File 025 does the deep dive.",
      },
      {
        title: 'Compute is a research ingredient',
        body: "The two-GPU split wasn't cosmetic: a single 2012 GPU couldn't hold the model, so Krizhevsky wrote CUDA kernels slicing layers across two GTX 580s with cross-GPU communication at chosen layers. The lesson the field took: ideas that are 'known but untestable' become revolutions the day the hardware catches up.",
        more: "5–6 days on roughly $1,000 of consumer gaming cards beat every academic vision pipeline on Earth.",
      },
    ],
    mechanism: {
      latex: "a_{i,j} = \\max\\Bigl(0,\\; b + \\sum_{c}\\sum_{u,v} w_{c,u,v}\\; x_{c,\\, i+u,\\, j+v}\\Bigr)",
      terms: [
        { symbol: 'x', meaning: "input activation map — the image, or the previous layer's features — indexed by channel c and pixel (i, j)" },
        { symbol: 'w', meaning: 'the filter (kernel): a small learned weight tensor, slid across every position' },
        { symbol: 'Σ', meaning: 'weighted sum of the local patch — a dot product between filter and patch, i.e. template matching' },
        { symbol: 'b', meaning: 'learned bias: how much evidence the filter needs before it fires' },
        { symbol: 'max(0, ·)', meaning: 'ReLU: keeps positive evidence, zeroes the rest; gradient is 1 wherever active' },
        { symbol: 'a', meaning: 'output activation map — one channel per filter (96 channels after AlexNet layer 1)' },
      ],
      diagram: {
        kind: 'alexnet-stack',
        title: 'AlexNet dataflow (single-GPU view)',
        nodes: [
          { id: 'in', label: 'image', sub: '227×227×3' },
          { id: 'c1', label: 'conv 11×11 /4 + ReLU', sub: '96 maps' },
          { id: 'p1', label: 'max-pool 3×3 /2', sub: '55→27' },
          { id: 'c2', label: 'conv 5×5 + ReLU', sub: '256 maps' },
          { id: 'p2', label: 'max-pool', sub: '27→13' },
          { id: 'c3', label: 'conv 3×3 ×3 + ReLU', sub: '384→256' },
          { id: 'fc', label: 'fc 4096 → fc 4096', sub: 'dropout p=0.5' },
          { id: 'out', label: 'fc 1000 + softmax', sub: 'class scores' },
        ],
        edges: [
          { from: 'in', to: 'c1' },
          { from: 'c1', to: 'p1' },
          { from: 'p1', to: 'c2' },
          { from: 'c2', to: 'p2' },
          { from: 'p2', to: 'c3' },
          { from: 'c3', to: 'fc' },
          { from: 'fc', to: 'out' },
        ],
        note: 'Draw as a left→right banded stack with channel counts under each block; annotate the historical two-GPU lane split between conv2 and conv3 with a dashed divider.',
      },
      caption: 'Eight learned layers: five convolutions extract features, three dense layers classify. Numbers under each stage are output channel counts.',
    },
    lab: {
      id: 'conv-explorer',
      name: 'conv explorer',
      blurb: "Run real convolution kernels over a real image and watch the per-pixel multiply-accumulate happen — then browse what AlexNet's first layer actually learned.",
      controls: [
        { label: 'kernel picker', kind: 'tabs', detail: 'edge / sobel-x / sobel-y / blur / sharpen / emboss — real 3×3 kernels applied live to the canvas image' },
        { label: 'zoom lens', kind: 'canvas', detail: 'hover a 5×5 pixel region: a magnifier shows each weight×pixel product summing into one output value' },
        { label: 'stride toggle', kind: 'toggle', detail: 'stride 1 vs 2 — output dimensions halve; watch the map get coarser' },
        { label: 'filter gallery', kind: 'button', detail: 'stage page 2: the 96 learned layer-1 filters rendered as a grid of edge/color detectors' },
      ],
      stage: 'Left: sample image on canvas with the current kernel applied live. Right: magnified patch grid showing per-weight multiplies summing into a single output pixel, plus a dimension readout (H×W×C) that updates with stride.',
      hint: 'switch kernels · hover the image to see the multiply-accumulate · toggle stride',
      completion: 'applied ≥3 different kernels and inspected the pixel-math magnifier at least once',
      fallback: 'Static 3-panel strip: original patch → element-wise products with the kernel → summed output pixel, one caption each.',
    },
    bugs: [
      {
        title: '"CNNs were invented in 2012"',
        fix: "LeCun trained conv nets on digits in 1989; AlexNet's novelty was scale + ReLU + dropout/augmentation + GPUs on ImageNet, not the architecture family.",
      },
      {
        title: '"local response normalization is essential"',
        fix: 'LRN was dropped by the very next generation (VGG, ResNet) with no loss; batchnorm (file 023) is the normalization that survived. Treat LRN as a historical footnote.',
      },
      {
        title: '"dropout and augmentation are optional tuning knobs"',
        fix: "With 60M params vs 1.2M images, the paper's own ablations show clear overfitting without them — they are load-bearing structure, not garnish.",
      },
    ],
    fieldNotes: {
      buildsOn: [],
      unlocks: ['resnet-2015', 'dilated-conv-2015', 'batchnorm-2015', 'dropout-2014'],
      further: [
        { label: 'Original paper (NeurIPS proceedings)', url: 'https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks' },
        { label: 'CS231n: Convolutional Neural Networks for Visual Recognition', url: 'https://cs231n.github.io/convolutional-networks/' },
      ],
      citation: '@inproceedings{krizhevsky2012alexnet, title={ImageNet classification with deep convolutional neural networks}, author={Krizhevsky, Alex and Sutskever, Ilya and Hinton, Geoffrey E.}, booktitle={Advances in Neural Information Processing Systems 25 (NeurIPS)}, year={2012} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'A 227×227 image is convolved with an 11×11 kernel, stride 4, no padding. What is the output width?',
        options: ['55', '54', '56', '224'],
        answer: 0,
        why: 'Output size = ⌊(n − k)/s⌋ + 1 = ⌊(227−11)/4⌋ + 1 = 54 + 1 = 55.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'Why did swapping tanh for ReLU matter so much in AlexNet?',
        options: [
          'ReLU keeps gradient ≈ 1 for all positive inputs, so deep nets train several times faster',
          'ReLU bounds activations to [0,1], stabilizing the loss',
          'ReLU has no parameters, reducing overfitting',
          'ReLU makes the softmax output smoother',
        ],
        answer: 0,
        why: 'tanh saturates at large |x| (slope → 0) and error signals die; ReLU passes gradients at full strength wherever active — the paper measured a several-fold training speedup.',
        tag: 'S3',
      },
      {
        type: 'tf',
        q: "AlexNet's 2012 win was mainly due to a brand-new architecture family invented that year.",
        answer: false,
        why: 'Conv nets date to LeCun (1989). The 2012 delta was scale: ReLU, dropout + augmentation, and GPU training on ImageNet-size data.',
        tag: 'S1',
      },
      {
        type: 'mcq',
        q: 'Which pair of techniques did AlexNet use specifically to fight overfitting?',
        options: [
          'Dropout in the fully connected layers + data augmentation',
          'Weight decay only',
          'Local response normalization + smaller kernels',
          'Early stopping + ensemble averaging',
        ],
        answer: 0,
        why: "Dropout (p=0.5 on the fc layers) and augmentation (224×224 crops, horizontal flips, PCA color jitter) are the paper's anti-overfitting core; without both, 60M params memorize 1.2M images.",
        tag: 'S3',
      },
      {
        type: 'mcq',
        q: 'Why was the network split across two GPUs?',
        options: [
          'A single GTX 580 (3 GB) could not hold the model; layers were partitioned with cross-GPU traffic at a few points',
          'Two GPUs halve the label noise',
          'Data parallelism requires exactly two replicas',
          'CUDA of the era could not address more than 2 GB per device',
        ],
        answer: 0,
        why: 'Memory. The two towers each ran half the kernels of a layer and communicated at chosen layers — a hand-built model-parallel pipeline (cf. file 031 for the modern version).',
        tag: 'S2',
      },
      {
        type: 'order',
        q: 'Order the data flow through AlexNet.',
        items: [
          '5 conv layers with ReLU (+ max-pooling after some)',
          'flatten to a vector',
          'fc-4096 → fc-4096 with dropout',
          'fc-1000 + softmax class scores',
        ],
        answer: [0, 1, 2, 3],
        why: 'Conv stack extracts features → flatten → two dropout-regularized dense layers → 1000-way softmax.',
        tag: 'S4',
      },
      {
        type: 'fill',
        q: 'ReLU keeps positive evidence and zeroes the rest: relu(x) = max(0, ___).',
        tokens: ['x', '1', 'e^-x', 'log x'],
        answer: ['x'],
        why: 'ReLU is the identity for positive inputs and 0 otherwise — the unsaturating gradient is the whole point.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: "What did AlexNet's first-layer filters end up looking like?",
        options: [
          'Oriented edge and color-blob detectors — the hand-crafted features of the 1990s, but learned',
          'Random noise patterns',
          'Full object templates (whole cats, whole cars)',
          'Fourier transforms of the input images',
        ],
        answer: 0,
        why: 'Gradient descent rediscovered Gabor-like edge/color detectors as the optimal first-stage features — the strongest argument that features should be learned, not designed.',
        tag: 'S3',
      },
    ],
  },
  // ---------------------------------------------------------------- FILE 020
  {
    slug: 'resnet-2015',
    fileNo: '020',
    title: 'Deep Residual Learning for Image Recognition',
    shortTitle: 'ResNet',
    authors: 'He, Zhang, Ren, Sun',
    year: 2015,
    venue: 'CVPR 2016',
    sourceUrl: 'https://arxiv.org/abs/1512.03385',
    sourceLabel: 'arXiv:1512.03385',
    track: 3,
    xp: 460,
    difficulty: 4,
    estMinutes: 35,
    hook: '152 layers deep — by learning what to skip.',
    briefing: {
      paragraphs: [
        "By 2015 everyone 'knew' deeper was better — and everyone hit the same wall: stack more plain conv layers and both test AND training error get worse. This degradation problem wasn't overfitting (training error rose too) and wasn't quite vanishing gradients (batchnorm kept them flowing): a 56-layer plain net simply optimized worse than a 20-layer one. He et al. reframed the issue — if extra layers can't even learn to be the identity function, depth is a liability, not an asset.",
        "The fix is one line: make each block learn F(x) and output F(x) + x, adding a 'skip connection' that carries the input straight to the output. A useless layer now just pushes F toward 0 and the block degrades gracefully into an identity — depth becomes free optionality. Their 152-layer residual network won ILSVRC 2015 with 3.57% top-5 error, and the residual block became the default atom of deep learning, Transformers included.",
        "The skip connection also repairs the gradient path: backprop through y = F(x) + x yields ∂y/∂x = 1 + ∂F/∂x — an additive gradient highway instead of a long multiplicative chain, so error signals reach early layers intact even at depth 100+. One '+' sign, and the depth ceiling of the entire field lifted by an order of magnitude.",
      ],
      stakes: "without residual connections, nets deeper than ~20 layers degrade — no ResNet, no 100-layer anything, and no deep Transformer stacks as we know them.",
    },
    eliEngineer: {
      prose: [
        "Think of each block as a code change reviewed by addition: instead of rewriting the whole function (a plain layer computing H(x) from scratch), a residual block submits a diff F(x) that gets merged onto the original: y = x + F(x). Identity is the zero-diff. Learning 'pass the input through unchanged' becomes trivial — push the weights toward zero — while a plain deep stack has to discover the identity mapping through several composed matrix multiplies, a weirdly hard optimization target.",
        "During backprop the same trick runs in reverse. The chain rule through y = x + F(x) hands every layer two gradient sources: the direct identity path — an unattenuated copy of the incoming gradient — plus the diff path. It's like returning both the diff and the original file from every function call: the caller can always reconstruct what happened, so 152 layers of reviews don't garble the message.",
      ],
      code: {
        lang: 'python',
        file: 'residual.py',
        snippet: `# plain block: hope the stack can represent what you want
y = relu(W2 @ relu(W1 @ x))          # depth = liability

# residual block: learn the diff, keep the original
def residual_block(x, W1, W2, b1, b2):
    F = relu(W1 @ x + b1)
    F = W2 @ F + b2                   # note: no activation on the diff yet
    return relu(x + F)                # skip connection: merge the diff

# useless layer?  W -> 0 makes the whole block the identity function.
# gradient:     dy/dx = 1 + dF/dx   (the "1" is an unbroken gradient highway)`,
      },
    },
    intuitions: [
      {
        title: 'Degradation ≠ overfitting',
        body: "The smoking gun: a 56-layer plain net has higher TRAINING error than a 20-layer one. Memorization can't explain that — the deeper model strictly contains the shallower one (copy the first 20 layers, set the other 36 to identity), yet SGD can't find it. The problem was optimization, not generalization.",
        more: "This falsified the 'just add layers' reading of deep learning and made optimizer-friendly architecture a first-class design goal.",
      },
      {
        title: 'Learn the diff, not the file',
        body: "If the ideal mapping is close to identity, forcing layers to learn H(x) from scratch makes them model x (the boring 99%) plus the interesting delta. Residual blocks learn only the delta: identity comes free via the shortcut, and the weights specialize in what's actually new.",
        more: "Empirically F stays small — residual nets behave like ensembles of many shallow paths, each block a gentle edit rather than a rewrite.",
      },
      {
        title: 'The gradient highway',
        body: "Unroll L residual blocks and the input-to-output path is x_L = x_0 + Σ F(x_i): a sum, not a product. Gradients flowing back pick up a '+1' term at every block, so they can't vanish multiplicatively — depth stops compounding the chain rule.",
        more: "This is why ResNets pair so well with batchnorm (file 023): normalization keeps the F branch well-conditioned while the skip path guarantees signal survival.",
      },
      {
        title: 'Depth as optionality',
        body: "A 152-layer residual net isn't committed to using all of it: blocks with tiny weights are near-identity pass-throughs, so the network allocates effective depth where it helps and skips where it doesn't. Depth becomes a resource the optimizer can spend, not a bet it must win.",
        more: "Deleting a single block from a trained ResNet barely dents accuracy; deleting one from VGG is catastrophic — evidence the net really uses depth incrementally.",
      },
    ],
    mechanism: {
      latex: "y = F(x, \\{W_i\\}) + x",
      terms: [
        { symbol: 'x', meaning: 'block input, carried through untouched by the skip connection' },
        { symbol: 'F', meaning: "the residual: 2–3 conv layers' worth of learned 'delta' over the input" },
        { symbol: '{W_i}', meaning: "the block's weights; pushing them toward 0 turns the block into identity" },
        { symbol: '+', meaning: 'element-wise addition — requires matching shapes (1×1 conv shortcut when dimensions change)' },
        { symbol: 'y', meaning: 'block output: original signal plus learned refinement' },
      ],
      diagram: {
        kind: 'residual-block',
        title: 'One residual block',
        nodes: [
          { id: 'in', label: 'x', sub: 'block input' },
          { id: 'cv1', label: 'conv 3×3 + BN + ReLU' },
          { id: 'cv2', label: 'conv 3×3 + BN', sub: 'F(x)' },
          { id: 'add', label: '⊕ add', sub: 'x + F(x)' },
          { id: 'out', label: 'ReLU → y' },
        ],
        edges: [
          { from: 'in', to: 'cv1' },
          { from: 'cv1', to: 'cv2' },
          { from: 'cv2', to: 'add' },
          { from: 'in', to: 'add', label: 'identity shortcut' },
          { from: 'add', to: 'out' },
        ],
        note: 'Draw the shortcut as a curved arc skipping both convs into the ⊕ node; annotate "gradient highway" on the arc.',
      },
      caption: 'The whole invention is the curved skip connection: the convs only learn a correction to x, never x itself.',
    },
    lab: {
      id: 'skip-highway',
      name: 'skip highway',
      blurb: 'Stack up to 50 plain vs residual blocks and watch per-layer gradient magnitude flatline or survive the backward pass.',
      controls: [
        { label: 'depth slider', kind: 'slider', detail: '2 → 50 blocks' },
        { label: 'skip connections', kind: 'toggle', detail: 'on = residual blocks, off = plain blocks' },
        { label: 'run backward pass', kind: 'button', detail: 'scripted backprop, records ||∂L/∂W|| per layer' },
        { label: 'log scale', kind: 'toggle', detail: 'log y-axis to reveal tiny gradients' },
      ],
      stage: 'Left: block-stack schematic. Right: bar chart of gradient magnitude per layer after one scripted backward pass — plain-net bars collapse to ~0 below the top few layers while residual-net bars stay within one order of magnitude across all 50.',
      hint: 'drag depth to 50 · flip the skip toggle · watch the gradient bars die and resurrect',
      completion: 'toggled skips on and off at depth ≥ 30 and ran the backward pass in both modes',
      fallback: 'Two static bar charts (plain vs residual at depth 50) captioned "chain rule compounding" vs "additive highway".',
    },
    bugs: [
      {
        title: '"ResNet fixed vanishing gradients"',
        fix: 'It fixed degradation — training error rising with depth. Vanishing gradients were already largely handled by good init + BN; guaranteed gradient flow is the bonus, not the headline.',
      },
      {
        title: '"the +x means ResNets can never forget features"',
        fix: "The shortcut is identity only when shapes match; stride/1×1 projection shortcuts resample x, and blocks can still learn to overwrite information — it's a strong prior, not a guarantee.",
      },
      {
        title: '"deeper is always better now"',
        fix: "Returns diminish and each block still costs compute; the paper's own 1202-layer CIFAR net overfit. Depth became affordable, not free.",
      },
    ],
    fieldNotes: {
      buildsOn: ['alexnet-2012', 'batchnorm-2015'],
      unlocks: ['identity-mappings-2016', 'transformer-2017', 'dilated-conv-2015'],
      further: [
        { label: 'Original paper (arXiv:1512.03385)', url: 'https://arxiv.org/abs/1512.03385' },
        { label: 'Follow-up: Identity Mappings (arXiv:1603.05027)', url: 'https://arxiv.org/abs/1603.05027' },
      ],
      citation: '@inproceedings{he2016resnet, title={Deep residual learning for image recognition}, author={He, Kaiming and Zhang, Xiangyu and Ren, Shaoqing and Sun, Jian}, booktitle={CVPR}, year={2016} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'What is the degradation problem?',
        options: [
          'Deeper plain nets get higher training (and test) error than shallower ones — an optimization failure, not overfitting',
          'Deeper nets always overfit the training set',
          'Gradients explode beyond 20 layers',
          'Feature maps shrink below 1×1 resolution',
        ],
        answer: 0,
        why: 'Training error rises with depth — the deeper model can represent the shallower one exactly, yet SGD fails to find it.',
        tag: 'S1',
      },
      {
        type: 'mcq',
        q: 'In y = F(x) + x, what does a "useless" layer converge to?',
        options: [
          'F ≈ 0, so the block becomes the identity function',
          'F ≈ x, doubling the signal',
          'F ≈ −x, cancelling the input',
          'F ≈ random noise, adding robustness',
        ],
        answer: 0,
        why: 'Driving the weights toward zero makes the block a pass-through; depth can be opted out of, block by block.',
        tag: 'S4',
      },
      {
        type: 'tf',
        q: "Unrolling residual blocks gives x_L = x_0 + Σ F(x_i), so gradients pick up a '+1' term per block and cannot vanish multiplicatively.",
        answer: true,
        why: 'The forward path is additive, so ∂x_L/∂x_0 = 1 + ∂ΣF/∂x_0 — the identity term ships gradients to any depth unattenuated.',
        tag: 'S3',
      },
      {
        type: 'mcq',
        q: 'Why is degradation surprising from a representational standpoint?',
        options: [
          'The deeper model can express the shallower one exactly (identity extra layers), yet optimization fails to find it',
          'Deeper models always have fewer parameters',
          'CIFAR-10 is too small to test depth',
          'Skip connections were not invented yet',
        ],
        answer: 0,
        why: 'A 56-layer net contains the 20-layer solution as a special case — worse training error means the optimizer, not the model class, is the bottleneck.',
        tag: 'S3',
      },
      {
        type: 'order',
        q: 'Order the data flow inside a basic (post-activation) residual block.',
        items: ['conv → BN → ReLU', 'conv → BN', 'add identity x', 'final ReLU'],
        answer: [0, 1, 2, 3],
        why: 'The original block: two conv layers with a ReLU between, then x is added, then the post-addition ReLU (file 021 removes that last one).',
        tag: 'S4',
      },
      {
        type: 'fill',
        q: 'Through a residual block, ∂y/∂x = ___ + ∂F/∂x.',
        tokens: ['1', 'x', 'γ'],
        answer: ['1'],
        why: 'The identity shortcut contributes a constant 1 to the Jacobian — the gradient highway.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'When spatial dimensions or channel counts change between blocks, the shortcut must…',
        options: [
          'use a 1×1 conv projection (or zero-padding) so shapes match for the addition',
          'drop the skip connection entirely',
          'apply max-pooling to F(x)',
          'double the learning rate',
        ],
        answer: 0,
        why: 'Addition requires identical shapes; the paper uses 1×1 projection shortcuts (or padded identity) at dimension changes.',
        tag: 'S6',
      },
      {
        type: 'mcq',
        q: 'Why is identity easy for a residual block but hard for a plain stack?',
        options: [
          'Driving F\'s weights toward zero ≈ identity, while a plain stack must compose several non-identity matrices to approximate it',
          'Plain stacks cannot contain ReLUs',
          'Residual blocks have no parameters',
          'Identity requires batchnorm, which plain stacks lack',
        ],
        answer: 0,
        why: 'Zeroing small weights is an easy, stable attractor for SGD; approximating identity through composed affine+ReLU transforms is a delicate, deep credit-assignment problem.',
        tag: 'S2',
      },
    ],
  },
  // ---------------------------------------------------------------- FILE 021
  {
    slug: 'identity-mappings-2016',
    fileNo: '021',
    title: 'Identity Mappings in Deep Residual Networks',
    shortTitle: 'Pre-activation ResNet',
    authors: 'He, Zhang, Ren, Sun',
    year: 2016,
    venue: 'ECCV 2016',
    sourceUrl: 'https://arxiv.org/abs/1603.05027',
    sourceLabel: 'arXiv:1603.05027',
    track: 3,
    xp: 420,
    difficulty: 3,
    estMinutes: 30,
    hook: 'The sequel: keep the highway lane completely clear.',
    briefing: {
      paragraphs: [
        "ResNet (file 020) made 152 layers trainable. This 2016 follow-up from the same team asked the uncomfortable question: is the block design optimal, or merely good enough? They ran a controlled study over every placement of the ReLU/BN activations relative to the skip connection and found the original design still puts obstacles on the identity path — the post-addition ReLU touches the very signal the skip connection was built to protect.",
        "Their answer is the pre-activation block: apply BN and ReLU BEFORE each conv, and let the addition output flow directly into the next block with nothing — no ReLU, no BN, no scaling — on the through path. Forward signal and backward gradient then travel as pure identities between any two layers: x_L = x_l + ΣF(x_i) and ∂L/∂x_l = ∂L/∂x_L · (1 + ∂ΣF/∂x_l).",
        "The payoff: a 1001-layer ResNet trains cleanly on CIFAR-10 — where the original design overfit and struggled — and a 164-layer pre-activation ResNet beats the original 1202-layer one, with less overfitting (BN on the pre-activation path also regularizes). The pre-activation layout became the template for modern residual design, and its 'norm first, keep the trunk linear' instinct reappears as pre-norm in Transformers.",
      ],
      stakes: "this is the difference between 'deep nets can work' and 'deep nets are easy': clear the identity path and depth stops fighting you.",
    },
    eliEngineer: {
      prose: [
        "The original ResNet block ends with relu(x + F) — harmless-looking, but that ReLU sits ON the highway. Forward: anything negative the skip path carried gets clamped to zero, so information can't pass through as-is. Backward: the gradient gets multiplied by ReLU's 0-or-1 gate at every single block, and a long product of per-block gates is exactly the vanishing-gradient machine ResNet was built to escape.",
        "The fix is a pure refactor: move the nonlinearity off the shared path into the F branch (BN → ReLU → conv), so the trunk of the network is a straight additive pipe from input to output with learned subroutines hanging off the side. It adds no parameters and removes nothing — it just stops stamping on the signal. The 1001-layer result is the receipt.",
      ],
      code: {
        lang: 'python',
        file: 'pre_activation.py',
        snippet: `# original "post-activation" block — ReLU guards the highway exit
y = relu(x + conv(relu(bn(conv(x)))))   # nonlinearity touches x's path

# pre-activation block — the trunk is a clean pipe
def block(x, W1, W2):
    F = conv2(relu(bn(conv1(relu(bn(x))))))   # activations live inside F
    return x + F                              # NOTHING between x and the next block

# unrolled:  x_L    = x_l + sum(F_i)          forward  = identity + deltas
#            dL/dx_l = dL/dx_L * (1 + eps)    backward = identity + small deltas`,
      },
    },
    intuitions: [
      {
        title: "Don't put a gate on the highway",
        body: "The post-addition ReLU forces every forward signal through a 0/1 clamp at every block; negative-carrying information dies, and gradients multiply by another per-block gate. The identity path must be literally identity: no ReLU, no BN, no scale.",
        more: "The paper tested 5 activation placements and 8 shortcut variants; strict identity won every metric that matters.",
      },
      {
        title: 'Even 0.5× shortcuts jam the signal',
        body: "A tempting 'improvement' — scaling the shortcut by a constant or a learned gate — multiplies the through-gradient by λ per block, and λ^L explodes or vanishes exponentially. Only an untouched addition gives both directions a clean path.",
        more: "Highway-network-style learned gates can match ResNets at moderate depth but lose cleanly at 100+ layers; multiplicative anything is the enemy.",
      },
      {
        title: 'x_L = x_l + Σ F(x_i): depth as a running sum',
        body: "With identity skips, any layer's representation equals any earlier layer's plus a sum of block deltas. Features are never recomputed from scratch, only refined — and the gradient at layer l is the gradient at L plus small corrections, so extreme depth trains end-to-end.",
        more: "This additive view explains why ResNets behave like ensembles of many shallower paths (Veit et al., 2016).",
      },
      {
        title: 'Pre-activation BN doubles as a regularizer',
        body: "Moving BN/ReLU ahead of the convs leaves block outputs unbounded and puts BN inside every branch, which the paper links to reduced overfitting at depth — their 1001-layer CIFAR net generalizes where the original 1000+ layer one overfit.",
        more: "The same instinct — normalize inside the branch, keep the trunk linear — reappears as pre-norm Transformers, which train more stably than post-norm.",
      },
    ],
    mechanism: {
      latex: "x_L = x_l + \\sum_{i=l}^{L-1} F(x_i), \\qquad \\frac{\\partial L}{\\partial x_l} = \\frac{\\partial L}{\\partial x_L}\\Bigl(1 + \\frac{\\partial}{\\partial x_l}\\textstyle\\sum_i F(x_i)\\Bigr)",
      terms: [
        { symbol: 'x_l, x_L', meaning: 'activations at any two layers; identity skips make their difference a plain sum of block outputs' },
        { symbol: 'F(x_i)', meaning: "block i's residual branch (BN–ReLU–conv ×2): the only place weights and nonlinearities live" },
        { symbol: 'Σ', meaning: "the forward 'running diff': features accumulate additively down the network" },
        { symbol: '∂L/∂x_L', meaning: 'gradient arriving from the top, transmitted toward any earlier layer at full strength' },
        { symbol: '1 + ∂ΣF/∂x_l', meaning: "the '+1' identity term: even if the F-branch gradient dies, the loss signal still reaches layer l intact" },
      ],
      diagram: {
        kind: 'pre-activation-block',
        title: 'Pre-activation block (vs post-activation)',
        nodes: [
          { id: 'in', label: 'x_l' },
          { id: 'bn1', label: 'BN + ReLU' },
          { id: 'cv1', label: 'conv 3×3' },
          { id: 'bn2', label: 'BN + ReLU' },
          { id: 'cv2', label: 'conv 3×3', sub: 'F(x_l)' },
          { id: 'add', label: '⊕ x_l + F' },
          { id: 'out', label: 'x_{l+1}', sub: 'untouched' },
        ],
        edges: [
          { from: 'in', to: 'bn1' },
          { from: 'bn1', to: 'cv1' },
          { from: 'cv1', to: 'bn2' },
          { from: 'bn2', to: 'cv2' },
          { from: 'cv2', to: 'add' },
          { from: 'in', to: 'add', label: 'clean identity — nothing on it' },
          { from: 'add', to: 'out' },
        ],
        note: 'Contrast row: show the post-activation block beside it with the ReLU sitting after ⊕, struck through in red.',
      },
      caption: 'Pre-activation: all nonlinearity moves inside the residual branch; the trunk from x_l to x_{l+1} is pure addition.',
    },
    lab: {
      id: 'pre-activation-ab',
      name: 'pre- vs post-activation A/B',
      blurb: 'Flip a block between post-activation (original) and pre-activation layouts, then trace one forward and one backward signal through up to 1000 blocks.',
      controls: [
        { label: 'layout toggle', kind: 'toggle', detail: 'post-activation / pre-activation' },
        { label: 'depth slider', kind: 'slider', detail: '10 → 1000 blocks (log scale)' },
        { label: 'trace forward', kind: 'button', detail: 'send a unit signal down the stack' },
        { label: 'trace backward', kind: 'button', detail: 'send a unit gradient back up the stack' },
      ],
      stage: 'A horizontal strip of blocks with a signal dot traveling left→right (brightness = magnitude); below, a log-scale line chart of signal/gradient magnitude vs depth — post-activation decays, pre-activation stays flat.',
      hint: 'toggle post→pre · send a signal down 1000 blocks · compare what survives',
      completion: 'traced both a forward signal and a backward gradient in each of the two layout modes',
      fallback: 'Static split figure: two stacks, one signal decaying (post), one flat (pre), with the two equations underneath.',
    },
    bugs: [
      {
        title: '"pre-activation means no ReLU anywhere"',
        fix: 'ReLU/BN still exist — inside the residual branch. Only the skip/aggregation path is kept free of nonlinearity.',
      },
      {
        title: '"gated or scaled shortcuts are free upgrades"',
        fix: "Any constant λ≠1 on the shortcut compounds as λ^L through depth; the paper's experiments show worse training at scale. Identity or bust.",
      },
      {
        title: '"1001 layers worked, so depth is solved"',
        fix: 'It worked on CIFAR-scale problems with BN + heavy augmentation; depth still costs compute, and most modern wins came from width, data, and scale too (see file 030).',
      },
    ],
    fieldNotes: {
      buildsOn: ['resnet-2015', 'batchnorm-2015'],
      unlocks: ['transformer-2017', 'annotated-transformer'],
      further: [
        { label: 'Original paper (arXiv:1603.05027)', url: 'https://arxiv.org/abs/1603.05027' },
        { label: 'Residual Networks Behave Like Ensembles of Shallow Networks (arXiv:1605.06431)', url: 'https://arxiv.org/abs/1605.06431' },
      ],
      citation: '@inproceedings{he2016identity, title={Identity mappings in deep residual networks}, author={He, Kaiming and Zhang, Xiangyu and Ren, Shaoqing and Sun, Jian}, booktitle={ECCV}, year={2016} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'What question does this paper answer?',
        options: [
          'Where should activations live relative to the skip connection — answered with controlled experiments',
          'Whether residual networks can classify images',
          'How to remove batch normalization entirely',
          'How to train without gradients',
        ],
        answer: 0,
        why: 'It is an ablation study of activation/shortcut design inside the residual block, with a clean winner: full pre-activation.',
        tag: 'S1',
      },
      {
        type: 'mcq',
        q: 'In the pre-activation block, what sits on the path from x_l to x_{l+1}?',
        options: [
          'Nothing — just the identity addition; BN and ReLU moved inside F',
          'A single ReLU',
          'A learned gating function',
          'Batch normalization',
        ],
        answer: 0,
        why: 'The through path is pure addition. All normalization and nonlinearity live inside the residual branch.',
        tag: 'S4',
      },
      {
        type: 'tf',
        q: 'Multiplying the shortcut by a constant λ < 1 is harmless at great depth.',
        answer: false,
        why: 'The through-signal is multiplied by λ at every block: λ^L vanishes exponentially with depth L. The paper confirms scaled shortcuts train worse.',
        tag: 'S3',
      },
      {
        type: 'mcq',
        q: 'With identity skips, the backward gradient at layer l is…',
        options: [
          '∂L/∂x_l = ∂L/∂x_L · (1 + ∂ΣF/∂x_l) — the "+1" ships the gradient to any layer unattenuated',
          '∂L/∂x_l = ∂L/∂x_L · Π ReLU′(x_i)',
          'Exactly zero below layer 100',
          'Independent of the loss',
        ],
        answer: 0,
        why: 'Even if every F-branch gradient vanishes, the identity term delivers ∂L/∂x_L to layer l intact.',
        tag: 'S4',
      },
      {
        type: 'order',
        q: 'Order the operations in one pre-activation residual block.',
        items: ['BN + ReLU', 'conv 3×3', 'BN + ReLU', 'conv 3×3, then add x'],
        answer: [0, 1, 2, 3],
        why: 'Pre-activation: normalize and activate BEFORE each conv; the branch output is then added to the untouched identity.',
        tag: 'S4',
      },
      {
        type: 'fill',
        q: 'With clean identity shortcuts, x_L = x_l + ___.',
        tokens: ['Σ F(x_i)', 'Π F(x_i)', 'F′(x_l)'],
        answer: ['Σ F(x_i)'],
        why: 'The forward signal is the input plus a SUM of block residuals — additive, never multiplicative.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: "What is the paper's headline experimental result?",
        options: [
          'A 1001-layer CIFAR ResNet trains cleanly, and a 164-layer pre-activation net beats the original 1202-layer one',
          'A 10-layer net solves ImageNet',
          'Removing BN doubles accuracy',
          'Post-activation blocks reach 10000 layers',
        ],
        answer: 0,
        why: 'Extreme depth becomes routine, and pre-activation nets outperform far deeper original-design nets with less overfitting.',
        tag: 'S1',
      },
      {
        type: 'mcq',
        q: 'Why does the post-addition ReLU hurt the forward signal?',
        options: [
          "It clamps negative values on the through path to zero, so x can't pass through as-is — signals shrink block by block",
          'It adds extra parameters',
          'It slows down inference hardware',
          'It conflicts with max-pooling',
        ],
        answer: 0,
        why: 'Any signal component carried as a negative value is destroyed at every block boundary; the shortcut stops being an identity.',
        tag: 'S6',
      },
    ],
  },
  // ---------------------------------------------------------------- FILE 022
  {
    slug: 'dilated-conv-2015',
    fileNo: '022',
    title: 'Multi-Scale Context Aggregation by Dilated Convolutions',
    shortTitle: 'Dilated Convolutions',
    authors: 'Yu, Koltun',
    year: 2015,
    venue: 'ICLR 2016',
    sourceUrl: 'https://arxiv.org/abs/1511.07122',
    sourceLabel: 'arXiv:1511.07122',
    track: 3,
    xp: 420,
    difficulty: 3,
    estMinutes: 25,
    hook: 'See more without shrinking anything.',
    briefing: {
      paragraphs: [
        "Dense prediction tasks — semantic segmentation, where every pixel needs a label — face a structural tension: to know WHAT a pixel is you need wide context (a patch of road vs a whole intersection), but to know WHERE it is you need full resolution. The 2015 playbook adapted classification nets: pool and stride to grow context, then fight to recover resolution with upsampling, losing fine detail on the way down and hallucinating it on the way up.",
        "Yu & Koltun's dilated convolution (a.k.a. à trous, 'with holes') resolves the tension by spacing out the kernel instead of shrinking the image: a 3×3 filter with dilation r reads pixels r apart, so its receptive field spans (2r+1)×(2r+1) while the parameter count stays at 9 and the feature map never shrinks. Stack layers with exponentially growing dilation — 1, 2, 4, 8 — and context compounds exponentially with zero pooling.",
        "Their 'context module' bolted onto front-end segmentation nets lifted accuracy immediately, and the trick diffused across the field: DeepLab's atrous spatial pyramid pooling, WaveNet's audio convolutions, and modern segmentation backbones all stride the kernel, not the signal.",
      ],
      stakes: "dense prediction used to force a choice between context and resolution. Dilation is the cheat code that gives you both.",
    },
    eliEngineer: {
      prose: [
        "A normal conv reads a contiguous window, like buf[i..i+3]. A dilated conv reads with a stride inside the window: buf[i], buf[i+r], buf[i+2r] — same three reads, but the span is 2r+1. You're sampling a ring buffer at every r-th slot; the kernel has holes in it, which is exactly what the French name says. Implementation-wise it needs no new op: the same multiply-accumulate with strided indexing, exposed in every framework as a `dilation` flag.",
        "The compounding is the point. Stack 3×3 convs with dilation doubling each layer (1, 2, 4, 8) and the receptive field grows 3 → 7 → 15 → 31 — exponential context at linear cost in layers, with no extra parameters and no loss of spatial resolution. Pooling grows context too, but pays for it by throwing away the 'where' that dense prediction exists to produce.",
      ],
      code: {
        lang: 'python',
        file: 'dilated.py',
        snippet: `def dilated_conv1d(x, w, r):          # 1D version of the idea
    k = len(w)                        # e.g. 3 taps
    span = (k - 1) * r + 1            # 3 taps at dilation r cover 2r+1 positions
    out = zeros(len(x) - span + 1)
    for i in range(len(out)):
        taps = [x[i + j * r] for j in range(k)]   # read every r-th sample
        out[i] = sum(wj * xj for wj, xj in zip(w, taps))
    return out

# stack dilations [1, 2, 4, 8] with 3-tap kernels:
# receptive field = 3 -> 7 -> 15 -> 31  (2^(t+1) - 1) — exponential
# params per layer: still 3. output resolution: unchanged.`,
      },
    },
    intuitions: [
      {
        title: 'Stride the kernel, not the image',
        body: "Pooling and strided conv grow context by downsampling the signal — you see more but know less about where anything is. Dilation moves the stride into the kernel's sampling pattern, so the feature map stays full-resolution while each unit's view widens.",
        more: "This is exactly the trade segmentation cannot accept: lose 16× spatial detail to gain context, then hallucinate it back with deconvolution.",
      },
      {
        title: 'Exponential context, linear cost',
        body: "Dilation factors that double per layer compound like a binary counter: 3×3 kernels at dilations 1, 2, 4, 8 give receptive fields of 3, 7, 15, 31. Every layer still costs the same 9 weights per channel; only the sampling offsets change.",
        more: "The paper's context module stacks such layers and ends with 1×1 convs to remix channels — a fully convolutional, resolution-preserving context aggregator.",
      },
      {
        title: 'A kernel with holes is still a kernel',
        body: "No new op is required: dilation is ordinary convolution with strided indexing (equivalently, insert r−1 zeros between taps). Memory cost is just the full-size feature maps you were keeping anyway, and it is a one-line flag in modern frameworks.",
        more: "Watch for 'gridding': if stacked dilations share a common factor, the kernel samples a sparse lattice and skips intervening pixels — mix rates (e.g. 1, 2, 5) so coverage stays dense.",
      },
      {
        title: 'Where pooling still wins',
        body: "Dilation preserves resolution at the cost of keeping full-size feature maps through many layers — memory scales with pixels × channels. Classification (one label per image) happily pays pooling's information loss for that efficiency; dense prediction can't, which is why dilation became the segmentation default.",
        more: "Hybrid designs dominate: pool a few times for cheap context, then switch to dilation in deep layers (DeepLab's output-stride-8/16 backbones).",
      },
    ],
    mechanism: {
      latex: "(F *_r k)(p) = \\sum_{s + r\\,t = p} F(s)\\, k(t)",
      terms: [
        { symbol: 'F', meaning: 'input feature map' },
        { symbol: 'k', meaning: 'the kernel: the same small set of weights as a normal conv (e.g. 3×3)' },
        { symbol: 'r', meaning: 'dilation factor: the stride BETWEEN kernel taps; r=1 recovers ordinary convolution' },
        { symbol: 's + r·t = p', meaning: 'kernel tap t lands r pixels away from its neighbor instead of 1 — holes in the sampling pattern' },
        { symbol: '*_r', meaning: "dilated convolution: output size equals a normal conv's; only the sampling offsets change" },
      ],
      diagram: {
        kind: 'dilated-grid',
        title: 'Same 3×3 kernel, three dilations',
        nodes: [
          { id: 'g1', label: 'r = 1', sub: 'contiguous 3×3 → RF 3×3' },
          { id: 'g2', label: 'r = 2', sub: 'taps 2 apart → RF 5×5' },
          { id: 'g3', label: 'r = 4', sub: 'taps 4 apart → RF 9×9' },
        ],
        edges: [],
        note: 'Draw three 9×9 pixel grids side by side; highlight the 9 sampled cells per dilation in track color and shade the covered receptive field.',
      },
      caption: 'Nine weights cover 3×3, 5×5, or 9×9 of input depending on dilation — the resolution of the output map never changes.',
    },
    lab: {
      id: 'dilation-grid',
      name: 'dilation playground',
      blurb: 'Drag the dilation factor on a pixel grid and watch the receptive field bloom outward — then compare what a pooling path would have cost.',
      controls: [
        { label: 'dilation slider', kind: 'slider', detail: 'r = 1 / 2 / 4 / 8' },
        { label: 'layer stack', kind: 'toggle', detail: 'stack 4 layers with dilations 1, 2, 4, 8 and accumulate the receptive field' },
        { label: 'pooling comparison', kind: 'toggle', detail: 'side panel: equivalent pooled path loses ½, ¼, ⅛ resolution' },
      ],
      stage: 'A 15×15 pixel grid with the active output cell centered; sampled taps light up per layer while the accumulated receptive field shades in; a side readout prints RF size (3 → 7 → 15 → 31) versus the pooled path\'s shrinking resolution.',
      hint: 'drag r from 1 to 8 · stack all 4 layers · flip on the pooling comparison',
      completion: 'moved the dilation slider through its full range and enabled the 4-layer stack',
      fallback: 'Static 3-grid strip (r = 1, 2, 4) with RF readouts and a caption contrasting pooled resolution loss.',
    },
    bugs: [
      {
        title: '"dilation is zero-cost context — use it everywhere"',
        fix: "Feature maps stay full-resolution through every dilated layer, so compute and memory stay high. Dilation trades pooling's savings for spatial fidelity.",
      },
      {
        title: '"bigger dilation is strictly better"',
        fix: 'Stacked dilations with common factors sample a sparse lattice and skip pixels entirely (gridding); mix rates so coverage stays dense — a lesson DeepLab v3 formalized.',
      },
      {
        title: '"dilated conv ≈ strided conv"',
        fix: 'Opposites: strided conv shrinks the output map to grow context; dilated conv keeps the output map and strides the kernel taps instead.',
      },
    ],
    fieldNotes: {
      buildsOn: ['alexnet-2012'],
      unlocks: ['deep-speech-2014'],
      further: [
        { label: 'Original paper (arXiv:1511.07122)', url: 'https://arxiv.org/abs/1511.07122' },
        { label: 'DeepLab v2: atrous convolution for segmentation (arXiv:1606.00915)', url: 'https://arxiv.org/abs/1606.00915' },
        { label: 'WaveNet: dilated convs for audio (arXiv:1609.03499)', url: 'https://arxiv.org/abs/1609.03499' },
      ],
      citation: '@inproceedings{yu2016dilated, title={Multi-scale context aggregation by dilated convolutions}, author={Yu, Fisher and Koltun, Vladlen}, booktitle={ICLR}, year={2016} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'A 3×3 kernel with dilation r = 4 covers an effective window of…',
        options: ['9×9 — span = (k−1)·r + 1 = 9, using only 9 weights', '4×4', '13×13 with 169 weights', '3×3 — dilation changes nothing spatial'],
        answer: 0,
        why: 'Effective span = (k−1)·r + 1 = 2·4 + 1 = 9. The taps spread 4 apart; the parameter count is unchanged.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'What problem does dilation solve for dense prediction?',
        options: [
          'It grows the receptive field without shrinking the feature map, so context and resolution coexist',
          'It removes the need for labels',
          'It speeds up inference on CPUs',
          'It regularizes the network like dropout',
        ],
        answer: 0,
        why: 'Pooling buys context with resolution; dilation buys context with sampling offsets — the output map stays full-size.',
        tag: 'S1',
      },
      {
        type: 'order',
        q: 'Stack 3×3 convs with dilations 1, 2, 4, 8. Order the receptive fields as they accumulate.',
        items: ['3×3', '7×7', '15×15', '31×31'],
        answer: [0, 1, 2, 3],
        why: 'RF grows by 2·r each layer: 3 → 3+4 → 7+8 → 15+16. Exponential context from linear depth.',
        tag: 'S4',
      },
      {
        type: 'tf',
        q: 'Dilated convolution changes the number of parameters in a layer.',
        answer: false,
        why: 'Same taps, different offsets — a 3×3 kernel has 9 weights per channel pair at any dilation.',
        tag: 'S3',
      },
      {
        type: 'mcq',
        q: 'Why is pooling painful for dense prediction?',
        options: [
          'It discards exact spatial position; upsampling must invent detail that pooling destroyed',
          'It doubles the parameter count',
          'It prevents backpropagation',
          'It only works on grayscale images',
        ],
        answer: 0,
        why: 'Pooling answers "what" while forgetting "where" — the exact information segmentation must output per pixel.',
        tag: 'S2',
      },
      {
        type: 'fill',
        q: 'Effective kernel span = (k − 1)·___ + 1.',
        tokens: ['r', 'k', 'stride'],
        answer: ['r'],
        why: 'The dilation factor r sets the spacing between taps, hence the total span the kernel covers.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'The "gridding" artifact happens when…',
        options: [
          'stacked dilation rates share common factors, so the kernel samples a sparse lattice and skips input pixels',
          'the learning rate is too high',
          'kernels are initialized with He init',
          'the batch size is too small',
        ],
        answer: 0,
        why: 'If all rates divide each other, entire columns/rows of the input are never read by any tap — vary the rates to keep coverage dense.',
        tag: 'S6',
      },
      {
        type: 'mcq',
        q: "The paper's context module is…",
        options: [
          'a stack of dilated conv layers (increasing r) ending in 1×1 convs — fully convolutional, resolution-preserving',
          'a recurrent network over image rows',
          'a fully connected layer over the whole image',
          'a hand-crafted pyramid of image scales',
        ],
        answer: 0,
        why: 'Plug-in dilated stack for multi-scale context at full resolution — the design that spread into DeepLab and WaveNet.',
        tag: 'S3',
      },
    ],
  },
];

export default track3Papers;
