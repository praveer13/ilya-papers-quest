import type { PaperContent } from './schema';

/**
 * TRACK 2 — Sequences, Attention, Transformers (papers 8–18, violet).
 * Content per paper.md §7 (exemplar) + §8 briefs, expanded to full §6 depth.
 */

export const track2Papers: PaperContent[] = [
  // -----------------------------------------------------------------------
  // 08 · seq2seq-2014
  // -----------------------------------------------------------------------
  {
    slug: 'seq2seq-2014',
    venue: 'NeurIPS 2014 · arXiv:1409.3215',
    sourceUrl: 'https://arxiv.org/abs/1409.3215',
    briefing: {
      paragraphs: [
        'Before this paper, neural machine translation meant bolting neural components onto hand-engineered statistical MT pipelines. Sutskever, Vinyals and Le threw the pipeline away: one LSTM reads the source sentence token by token and compresses it into a single fixed-size vector; a second LSTM unpacks that vector into the target sentence. Encoder, decoder, end-to-end gradients, no linguistic features.',
        'The results were startling: a straightforward model with 4-layer LSTMs (384M parameters) reached a BLEU score of 34.8 on WMT English→French — competitive with the phrase-based systems of the day on their home turf. Two engineering details mattered enormously: deep (4-layer) LSTMs beat shallow ones, and **reversing the source sentence** ("a b c" → "c b a") made training dramatically easier by introducing short-term dependencies the optimization could latch onto.',
        'Seq2seq became the template for an era: translation, summarization, dialog, parsing, speech — if you could frame it as sequence-in/sequence-out, this architecture applied. Its fixed-vector bottleneck was also its famous flaw, and fixing that bottleneck (next paper) gave us attention.',
      ],
      stakes: 'this is the blueprint: encoder–decoder thinking still structures how we build — and debug — every sequence model.',
    },
    eliEngineer: {
      prose: [
        'Think of the encoder as `JSON.stringify` with loss: it folds an entire sentence into one fixed-size vector — say 1000 floats — which must contain everything the decoder needs. The decoder is the matching `JSON.parse`: it takes only that vector and generates the translation one token at a time.',
        'A fixed-size vector for a variable-size sentence is a **lossy zip file**. Short sentences compress fine; long sentences overflow the buffer and information leaks. That single bottleneck dominated the next three years of research.',
        'The reversed-input trick is pure optimizer ergonomics: reversing the source puts the first words of the source next to the first words of the target in "time", so early decoding steps get strong short-range gradients from the words they most depend on. Same task, much friendlier loss landscape.',
      ],
      code: {
        lang: 'python',
        file: 'seq2seq.py',
        snippet: `# encoder: fold the sentence into ONE vector (a lossy zip)
h = zeros(1000)
for tok in reversed(source):       # reverse! shorter gradient paths
    h = encoder_lstm(embed(tok), h)
context = h                        # <- the entire sentence, 1000 floats

# decoder: unpack the vector into the target sentence
h, y = context, "<bos>"
while y != "<eos>":
    h = decoder_lstm(embed(y), h)  # only sees 'context' via init state
    y = sample(softmax(W_out @ h)) # one token at a time
    yield y

# training: teacher forcing on (source, target) pairs,
# one loss summed over every target position, end-to-end.`,
      },
    },
    intuitions: [
      {
        title: 'A context vector is a lossy zip file',
        body: 'Whatever the decoder needs — words, order, agreement, tone — must fit in one fixed vector. Compression is lossy by construction: the model must decide what to keep, and long sentences blow the budget. Diagnosing "the model forgot the beginning of the sentence" = diagnosing buffer overflow.',
        more: 'The paper\'s own plots showed BLEU degrading for sentences longer than ~35 words. Bahdanau et al.\'s attention mechanism (paper 09) exists precisely to remove this bottleneck: let the decoder look back instead of relying on the zip.',
      },
      {
        title: 'Reversing the source is a gradient hack, not linguistics',
        body: 'Reversed source → the first target words align with nearby source words instead of words 30 steps away. Short-term dependencies are easy to learn (1994!); once the model has a foothold, longer ones follow. It\'s curriculum design by token order.',
      },
      {
        title: 'Depth beat width before it was cool',
        body: 'Four LSTM layers stacked vertically crushed one wide layer. The stack acts like a deepening pipeline of abstraction — the same bet deep convnets were making in vision, ported to sequences.',
      },
      {
        title: 'One model, zero features',
        body: 'No alignment tables, no phrase extraction, no morphology — a single objective (maximize target likelihood) replaces a decade of pipeline engineering. The performance was slightly worse than the best tuned SMT system, but the *engineering complexity* collapsed. That trade — simpler system, competitive numbers, scale it later — became the deep-learning playbook.',
      },
    ],
    mechanism: {
      latex: 'p(y_1, \\dots, y_{T\'} \\,|\\, x_1, \\dots, x_T) = \\prod_{t=1}^{T\'} p\\big(y_t \\,|\\, v,\\, y_1, \\dots, y_{t-1}\\big)',
      terms: [
        { symbol: 'x_1..x_T', meaning: 'source tokens (fed in reversed order — the trick)' },
        { symbol: 'y_1..y_{T\'}', meaning: 'target tokens — lengths T and T\' can differ' },
        { symbol: 'v', meaning: 'the fixed-size context vector: final hidden state of the encoder LSTM' },
        { symbol: 'p(y_t | v, y_{<t})', meaning: 'decoder distribution: conditioned on the vector and previously emitted tokens' },
        { symbol: '\\prod', meaning: 'chain rule: the sentence probability factors token by token' },
      ],
      diagram: {
        height: 50,
        nodes: [
          { id: 's', x: 12, y: 34, label: 'C B A', sub: 'source (reversed)', kind: 'io', w: 14 },
          { id: 'enc', x: 32, y: 34, label: 'encoder LSTM ×4', sub: 'reads token by token', kind: 'box', w: 22 },
          { id: 'v', x: 56, y: 34, label: 'v', sub: 'fixed-size context vector', kind: 'mem', w: 8 },
          { id: 'dec', x: 76, y: 34, label: 'decoder LSTM ×4', sub: 'writes token by token', kind: 'box', w: 22 },
          { id: 't', x: 90, y: 12, label: 'W X Y Z', sub: 'target sentence', kind: 'io', w: 14 },
        ],
        edges: [
          { from: 's', to: 'enc' },
          { from: 'enc', to: 'v', label: 'final state' },
          { from: 'v', to: 'dec', label: 'init state' },
          { from: 'dec', to: 't' },
        ],
      },
      caption: 'The encoder–decoder: one LSTM folds the (reversed) source into a fixed vector v; a second LSTM unfolds v into the target. All cross-lingual knowledge must pass through v.',
    },
    lab: {
      name: 'encoder → context → decoder step-through',
      hint: 'step token by token · watch the sentence fold into one vector and unfold again',
      completion: 'run a full encode–decode pass to the end',
    },
    bugs: [
      {
        title: 'the fixed vector is not a "sentence embedding" you can reuse',
        fix: 'v is trained only to serve this decoder\'s next-token predictions — a task-specific compression, not a general semantic representation. expecting it to behave like a modern sentence embedding leads to disappointment.',
      },
      {
        title: 'reversing helps *training*, it adds no information',
        fix: 'the reversal changes gradient path lengths, not content. it\'s an optimization trick: early target tokens get nearby source evidence. don\'t read linguistics into it (and don\'t reverse the target).',
      },
      {
        title: 'teacher forcing at train time ≠ free-running at test time',
        fix: 'the model is trained on gold prefixes but generates on its own outputs — exposure bias. errors compound at test time; scheduled sampling and (later) attention mitigate, but the mismatch is structural.',
      },
    ],
    fieldNotes: {
      buildsOn: ['lstm-1997', 'gru-2014'],
      unlocks: ['bahdanau-2014', 'neural-conv-2015', 'transformer-2017'],
      further: [
        { label: 'original paper — arXiv:1409.3215', url: 'https://arxiv.org/abs/1409.3215' },
        { label: 'companion: cho et al. encoder–decoder — arXiv:1406.1078', url: 'https://arxiv.org/abs/1406.1078' },
        { label: 'pytorch seq2seq tutorial', url: 'https://pytorch.org/tutorials/intermediate/seq2seq_translation_tutorial.html' },
      ],
      citation: `@inproceedings{sutskever2014sequence,\n  author = {Sutskever, Ilya and Vinyals, Oriol and Le, Quoc V.},\n  title = {Sequence to Sequence Learning with Neural Networks},\n  booktitle = {NeurIPS}, year = {2014},\n  eprint = {1409.3215}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'What is the fixed-size context vector v in seq2seq?',
        options: [
          'The encoder LSTM\'s final hidden state — the whole source sentence compressed into one vector',
          'The average of all source word embeddings',
          'A learned constant, same for every sentence',
          'The decoder\'s output vocabulary distribution',
        ],
        answer: 0,
        why: 'The encoder folds the sentence token by token; its final state is the only channel through which source information reaches the decoder.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Why did reversing the source sentence help so much?',
        options: [
          'It introduced short-term dependencies between nearby source and target words, giving optimization an easy foothold',
          'French grammar requires reversed input',
          'It doubled the training data',
          'It regularized the model against overfitting',
        ],
        answer: 0,
        why: 'Early target words now sit next to their source evidence in time — short gradient paths, which 1994 told us are the learnable ones.',
        tag: 'intuitions',
      },
      {
        type: 'tf',
        q: 'True or false: source and target sentences must have the same length in seq2seq.',
        answer: false,
        why: 'The model learns p(y_1..y_T\' | x_1..x_T) with independent lengths — that\'s the whole point of the encoder–decoder split.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'What was the paper\'s most famous architectural weakness?',
        options: [
          'The fixed-vector bottleneck: long sentences overflow the context vector and the beginning gets forgotten',
          'The use of LSTMs instead of GRUs',
          'The softmax over the target vocabulary',
          'Training required too little data',
        ],
        answer: 0,
        why: 'BLEU degraded on long sentences — the flaw Bahdanau-style attention was invented to fix.',
        tag: 'briefing',
      },
      {
        type: 'mcq',
        q: 'Which architecture choices mattered most in the paper\'s ablations?',
        options: [
          'Deep 4-layer LSTMs and reversed source sentences',
          'Dropout on recurrent edges and GRU cells',
          'Convolutional encoders and beam width 1',
          'Word-level inputs and a single wide layer',
        ],
        answer: 0,
        why: 'Depth (4 layers) and input reversal were the two big levers; shallow or forward-order variants trained far worse.',
        tag: 'briefing',
      },
      {
        type: 'order',
        q: 'Order the seq2seq inference flow:',
        items: [
          'encoder reads the (reversed) source token by token',
          'final encoder state becomes the context vector v',
          'decoder is initialized with v and emits the first token',
          'each emitted token is fed back to generate the next, until <eos>',
        ],
        answer: [0, 1, 2, 3],
        why: 'Fold → freeze → unfold → feed back. The decoder never sees the source directly, only v.',
        tag: 'mechanism',
      },
      {
        type: 'tf',
        q: 'True or false: at training time the decoder is fed the gold previous token (teacher forcing), but at test time it consumes its own output.',
        answer: true,
        why: 'That train/test mismatch is exposure bias — errors made early in generation can compound downstream.',
        tag: 'bugs',
      },
      {
        type: 'mcq',
        q: 'What replaced the decade-old phrase-based MT pipeline in this work?',
        options: [
          'A single end-to-end objective: maximize target-sentence likelihood with two LSTMs',
          'A committee of 12 hand-tuned subsystems',
          'A hidden Markov model with neural emissions',
          'A rule-based transfer grammar',
        ],
        answer: 0,
        why: 'One loss, one model, no linguistic features — the engineering-complexity collapse that became the deep-learning playbook.',
        tag: 'briefing',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 09 · bahdanau-2014
  // -----------------------------------------------------------------------
  {
    slug: 'bahdanau-2014',
    venue: 'ICLR 2015 · arXiv:1409.0473',
    sourceUrl: 'https://arxiv.org/abs/1409.0473',
    briefing: {
      paragraphs: [
        'Bahdanau, Cho and Bengio identified the fixed context vector of encoder–decoder translation as the bottleneck it was — and removed it. Their model lets the decoder, at every output step, *look back* over all encoder hidden states and softly select the relevant ones. They called it "jointly learning to align and translate"; the field calls it **attention**.',
        'Two ingredients: a **bidirectional RNN encoder**, so every source position carries a summary of both its left and right context, and an **alignment model** — a small learned scorer (additive attention) that rates how relevant each source state is to the current decoder state, normalized by softmax into weights that blend the states into a per-step context vector.',
        'The payoff was twofold: translation quality jumped, especially on long sentences (the fixed-vector model degraded, the attention model didn\'t), and the learned alignments were *interpretable* — the paper\'s heatmaps of English→French word alignments became some of the most reproduced figures in deep learning. Every transformer you will ever read about descends from this mechanism.',
      ],
      stakes: 'attention starts here. one fixed vector per sentence dies; the decoder that can look back is born.',
    },
    eliEngineer: {
      prose: [
        'Seq2seq passed an entire sentence through one return value. Bahdanau\'s fix is a callback: instead of a single context vector, the decoder gets query access to the encoder\'s full sequence of hidden states, and at each output step it asks "which source positions matter right now?"',
        'The query is a learned compatibility score, not an exact match: a tiny feedforward net scores (decoder state, source state) pairs, softmax normalizes the scores into weights, and the context is the weighted average of all source states. Soft, differentiable, trainable end-to-end.',
        'Note the design pattern: the output isn\'t a hard pointer to one source word but a *distribution* over positions. That\'s what keeps gradients flowing — you can backprop through a weighted average, not through an argmax.',
      ],
      code: {
      lang: 'python',
        file: 'additive_attention.py',
        snippet: `# encoder: BiRNN -> one annotation h_j per source position
# (forward summary + backward summary, concatenated)

# decoder step i: score every source position
e_ij = v.T @ tanh(W_s @ s_prev + U_h @ h_j)   # additive attention
alpha = softmax(e_i)                          # weights sum to 1

c_i = sum(alpha[j] * h[j] for j in range(T))  # soft lookup, not argmax
s_i = lstm(s_prev, [y_prev, c_i])             # decode with fresh context
y_i = softmax(W_out @ s_i)                    # next word

# the "callback": every output step re-queries ALL encoder states.
# no more lossy zip — the decoder reads the source as needed.`,
      },
    },
    intuitions: [
      {
        title: 'Stop passing the function through one return value',
        body: 'The fixed vector forced all source information through a single return slot. Attention gives the decoder query access to the encoder\'s full memory: each decoding step constructs its *own* context from whatever source positions it currently needs.',
      },
      {
        title: 'Soft alignment is a differentiable dictionary lookup',
        body: 'Scores → softmax → weighted sum: the decoder reads a blend of all source states, weighted by learned relevance. Because every position contributes a little, gradients flow to all of them — the alignment is learned, not annotated.',
        more: 'Nobody told the model what "alignment" means; the alignment structure emerged purely from the translation objective. The famous heatmaps (e.g. "zone économique européenne" reversing order relative to English) are unsupervised discoveries.',
      },
      {
        title: 'Bidirectional annotations carry both contexts',
        body: 'Each source position is annotated by a forward RNN (summarizing the past) and a backward RNN (summarizing the future), concatenated. When the decoder attends to a word, it gets that word *plus* its neighborhood — crucial for deciding relevance.',
      },
      {
        title: 'Long sentences stopped degrading',
        body: 'The paper\'s length-analysis is the smoking gun: the no-attention baseline\'s BLEU collapses as sentences grow past ~30 words, while the attention model (RNNsearch-50) holds up. Query access removed the capacity cliff — evidence that the bottleneck was information flow, not modeling power.',
      },
    ],
    mechanism: {
      latex: '\\alpha_{ij} = \\frac{\\exp(e_{ij})}{\\sum_{k=1}^{T} \\exp(e_{ik})}, \\quad e_{ij} = v^{\\!\\top} \\tanh(W_s\\, s_{i-1} + U_h\\, h_j), \\quad c_i = \\sum_j \\alpha_{ij}\\, h_j',
      terms: [
        { symbol: 'e_{ij}', meaning: 'alignment score: how relevant is source position j to decoder step i' },
        { symbol: 's_{i-1}', meaning: 'previous decoder hidden state — the "query" of this lookup' },
        { symbol: 'h_j', meaning: 'encoder annotation at position j (BiRNN: left + right context)' },
        { symbol: 'v^{\\!\\top} \\tanh(\\cdot)', meaning: 'the additive attention MLP — a learned compatibility scorer' },
        { symbol: '\\alpha_{ij}', meaning: 'normalized attention weight — a probability over source positions' },
        { symbol: 'c_i', meaning: 'context for step i: the weighted blend of all annotations' },
      ],
      diagram: {
        height: 54,
        nodes: [
          { id: 'h1', x: 20, y: 42, label: 'h₁', sub: 'annotation (BiRNN)', kind: 'mem', w: 9 },
          { id: 'h2', x: 36, y: 42, label: 'h₂', kind: 'mem', w: 9 },
          { id: 'h3', x: 52, y: 42, label: 'h₃', kind: 'mem', w: 9 },
          { id: 's', x: 36, y: 10, label: 's_{i-1}', sub: 'decoder state (query)', kind: 'io', w: 12 },
          { id: 'score', x: 56, y: 26, label: 'score + softmax', sub: 'additive attention', kind: 'box', w: 18 },
          { id: 'c', x: 82, y: 26, label: 'c_i', sub: 'weighted context', kind: 'mem', w: 10 },
          { id: 'y', x: 90, y: 10, label: 'y_i', sub: 'next word', kind: 'io', w: 9 },
        ],
        edges: [
          { from: 'h1', to: 'score' },
          { from: 'h2', to: 'score' },
          { from: 'h3', to: 'score' },
          { from: 's', to: 'score', label: 'query' },
          { from: 'score', to: 'c', label: 'Σ α·h' },
          { from: 'c', to: 'y' },
        ],
      },
      caption: 'Additive attention: the decoder state queries every encoder annotation; softmax turns scores into weights; the context c_i is their weighted blend — fresh at every output step.',
    },
    lab: {
      name: 'attention alignment heatmap',
      hint: 'hover a French output word · see which English words it reads',
      completion: 'inspect the alignment of at least 3 different output words',
    },
    bugs: [
      {
        title: 'attention weights are alignments, not explanations',
        fix: 'high weight ≈ the decoder read that position — a correlate, not a causal proof. (this caution returns with a vengeance for transformers: one head\'s weights among 96.)',
      },
      {
        title: 'additive attention is not the only scoring function',
        fix: 'bahdanau (additive, MLP-based) vs luong (multiplicative, dot-product) are the two classic families; the transformer scaled dot-product won out for speed. same idea, different scorer.',
      },
      {
        title: 'the context is recomputed every step — don\'t cache it',
        fix: 'c_i depends on the *current* decoder state, so it changes at each output position. treating attention as a one-time fixed context reintroduces the bottleneck it removed.',
      },
    ],
    fieldNotes: {
      buildsOn: ['seq2seq-2014', 'gru-2014'],
      unlocks: ['transformer-2017', 'pointer-networks-2015', 'ntm-2014'],
      further: [
        { label: 'original paper — arXiv:1409.0473', url: 'https://arxiv.org/abs/1409.0473' },
        { label: 'luong et al. 2015: effective approaches to attention', url: 'https://arxiv.org/abs/1508.04025' },
        { label: 'lilian weng: attention? attention!', url: 'https://lilianweng.github.io/posts/2018-06-24-attention/' },
      ],
      citation: `@inproceedings{bahdanau2014neural,\n  author = {Bahdanau, Dzmitry and Cho, Kyunghyun and Bengio, Yoshua},\n  title = {Neural Machine Translation by Jointly Learning to Align and Translate},\n  booktitle = {ICLR}, year = {2015},\n  eprint = {1409.0473}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'What problem did Bahdanau-style attention solve?',
        options: [
          'The fixed-vector bottleneck: the decoder now builds a fresh context from all encoder states at every step',
          'Vanishing gradients in the decoder',
          'The lack of a beam search implementation',
          'Slow tokenization of the source',
        ],
        answer: 0,
        why: 'Instead of one context vector per sentence, each decoding step queries all annotations and blends the relevant ones.',
        tag: 'briefing',
      },
      {
        type: 'mcq',
        q: 'The alignment score e_ij in this paper is computed by:',
        options: [
          'A small feedforward network: vᵀ tanh(W_s s_{i−1} + U_h h_j) — "additive" attention',
          'A raw dot product s · h',
          'Cosine similarity of embeddings',
          'A convolution over the source',
        ],
        answer: 0,
        why: 'Additive (MLP) scoring — the learned compatibility between decoder state and each source annotation.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Why is the alignment *soft* (a weighted sum) rather than hard (argmax)?',
        options: [
          'A weighted average is differentiable, so alignment is learned end-to-end from the translation loss alone',
          'Softmax is faster to compute than argmax',
          'Hard alignment was patent-encumbered',
          'Soft weights use less memory',
        ],
        answer: 0,
        why: 'You can\'t backprop through an argmax choice; you can through a convex blend. No alignment labels were ever needed.',
        tag: 'eli-engineer',
      },
      {
        type: 'tf',
        q: 'True or false: the encoder is bidirectional so that each annotation summarizes both left and right context around its position.',
        answer: true,
        why: 'Forward + backward RNN states concatenated per position — attending to a word retrieves its neighborhood too.',
        tag: 'mechanism',
      },
      {
        type: 'tf',
        q: 'True or false: the context vector c_i is computed once per sentence and reused for every output word.',
        answer: false,
        why: 'c_i depends on the current decoder state and is recomputed at every step — that per-step refresh is the entire mechanism.',
        tag: 'bugs',
      },
      {
        type: 'order',
        q: 'Order one attention decoding step:',
        items: [
          'take the previous decoder state s_{i−1} as the query',
          'score it against every encoder annotation h_j',
          'softmax the scores into weights α',
          'blend annotations c_i = Σ α·h and decode the next word',
        ],
        answer: [0, 1, 2, 3],
        why: 'Query → score → normalize → blend → emit. Repeat per output token.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'What was the key evidence that attention removed the bottleneck?',
        options: [
          'BLEU stayed high on long sentences where the fixed-vector baseline collapsed',
          'Training converged in fewer epochs',
          'The model needed less data',
          'Attention reduced the parameter count',
        ],
        answer: 0,
        why: 'The paper\'s length analysis: RNNsearch-50 held up at length 50 while RNNencdec degraded steeply.',
        tag: 'briefing',
      },
      {
        type: 'mcq',
        q: 'The attention weights α over source positions are produced by:',
        options: [
          'A softmax over the alignment scores, so they form a probability distribution summing to 1',
          'An L2 normalization',
          'A sigmoid per position, independent of others',
          'Uniform weighting unless trained otherwise',
        ],
        answer: 0,
        why: 'Softmax competition across positions is what makes the lookup selective — positions share a unit budget of attention.',
        tag: 'mechanism',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 10 · neural-conv-2015
  // -----------------------------------------------------------------------
  {
    slug: 'neural-conv-2015',
    venue: 'ICML DL Workshop 2015 · arXiv:1506.05869',
    sourceUrl: 'https://arxiv.org/abs/1506.05869',
    briefing: {
      paragraphs: [
        'Vinyals and Le took the seq2seq translation model and pointed it at a new target: open-domain conversation. No rules, no templates, no dialog-state tracking — just train on movie subtitles (OpenSubtitles, ~62M sentences) and an IT-helpdesk chat corpus, and let the model learn to respond. The same architecture that translated French started holding conversations.',
        'The samples were genuinely shocking for 2015: the model answered philosophy questions ("what is the purpose of life?" → "to serve the greater good"), handled a multi-turn IT support dialogue, and produced coherent short exchanges. Equally important, the paper documented the failure modes honestly: generic replies ("i don\'t know"), contradiction across turns, and no consistent persona.',
        'This is the seed of every chatbot that followed. The recipe — scrape dialogue, train a big sequence model on response prediction — is exactly the pretraining stage of modern assistants; the documented weaknesses (consistency, grounding, persona) are precisely the problems RLHF and instruction tuning were later built to address.',
      ],
      stakes: 'chat became a learning problem in this paper. every assistant since is this idea, scaled and disciplined.',
    },
    eliEngineer: {
      prose: [
        'No new architecture this time — the insight is a *dataset*. Translation is just response prediction where the "response" is in another language. Feed the same encoder–decoder pairs of (message, reply), and next-token prediction becomes a chatbot.',
        'The engineering takeaway is about objective mismatch: the model optimizes "likely reply", not "good reply". "I don\'t know" is a fantastically likely reply to almost anything — high probability, zero utility. Perplexity improves while conversation quality doesn\'t necessarily follow.',
        'And because the model is a pure pattern-matcher over dialogue transcripts, it has no persistent self: ask it its age twice and you get two answers. Persona, memory, and grounding are *capabilities the objective never asked for* — an early, vivid lesson that you get what you optimize for.',
      ],
      code: {
        lang: 'python',
        file: 'chat_as_seq2seq.py',
        snippet: `# translation:   (english sentence) -> (french sentence)
# conversation:  (user message)      -> (system reply)
# same model. different dataset. that's the whole paper.

train_pairs = [
    ("my phone won't turn on", "have you tried holding the power button?"),
    ("what is the purpose of life?", "to serve the greater good."),
    # ... 62M more subtitle / helpdesk exchanges
]

# objective: p(reply | message) — maximize likelihood of the
# transcript reply. NOT helpfulness, NOT consistency, NOT truth.
# the famous failure modes are the objective, faithfully served.`,
      },
    },
    intuitions: [
      {
        title: 'Conversation = translation into the same language',
        body: 'The trick of the paper is recognizing that (context, response) pairs have the same shape as (source, target) pairs. Whatever the encoder–decoder learned about conditional language modeling transfers directly to dialogue.',
      },
      {
        title: 'Likely ≠ good: the generic-reply attractor',
        body: '"I don\'t know", "ok", "yes" are safe, high-probability responses to an enormous range of inputs. Pure likelihood training loves them — the objective has no term for informativeness. Every modern "the bot is being vague" complaint descends from this gap.',
        more: 'Later fixes attack exactly this term: mutual-information objectives (Li et al. 2016), sampling with diversity promotion, and ultimately RLHF — shaping rewards toward what humans rate as good rather than what transcripts rate as likely.',
      },
      {
        title: 'No persona is a missing feature, not a bug in the weights',
        body: 'The model contradicts itself ("how old are you?" — different answers on different turns) because nothing in (message → reply) training pins down identity. Consistency requires conditioning on a persona or memory — extra structure later work added explicitly.',
      },
      {
        title: 'Honest failure analysis is part of the contribution',
        body: 'The paper\'s "weaknesses" section — generic responses, lack of consistency, evaluation difficulty — became a roadmap. Reading it against today\'s assistants is a checklist of which problems were solved by scale, and which needed new ideas (grounding, alignment).',
      },
    ],
    mechanism: {
      latex: 'p(\\text{reply}) = \\prod_{t} p\\big(y_t \\,|\\, \\text{context},\\, y_{<t}\\big) \\qquad \\text{— plain seq2seq, new data}',
      terms: [
        { symbol: '\\text{context}', meaning: 'the conversation so far (one or more turns), encoded by the LSTM' },
        { symbol: 'y_t', meaning: 'the t-th token of the generated reply' },
        { symbol: 'p(y_t | \\cdot)', meaning: 'next-token distribution — trained on transcript replies' },
        { symbol: '\\prod', meaning: 'the reply is generated autoregressively, exactly like translation' },
      ],
      diagram: {
        height: 46,
        nodes: [
          { id: 'msg', x: 14, y: 24, label: 'message', sub: 'user turn(s)', kind: 'io', w: 14 },
          { id: 'enc', x: 38, y: 24, label: 'encoder', sub: 'LSTM reads context', kind: 'box', w: 16 },
          { id: 'v', x: 56, y: 24, label: 'v', kind: 'mem', w: 8 },
          { id: 'dec', x: 74, y: 24, label: 'decoder', sub: 'LSTM writes reply', kind: 'box', w: 16 },
          { id: 'rep', x: 92, y: 24, label: 'reply', sub: 'system turn', kind: 'io', w: 12 },
        ],
        edges: [
          { from: 'msg', to: 'enc' },
          { from: 'enc', to: 'v' },
          { from: 'v', to: 'dec' },
          { from: 'dec', to: 'rep' },
        ],
      },
      caption: 'Nothing new architecturally — seq2seq verbatim. The contribution is the training distribution: dialogue transcripts instead of parallel text.',
    },
    lab: {
      name: 'impressive or failure?',
      hint: 'read the paper\'s actual samples · sort them into impressive vs failure piles',
      completion: 'sort all 6 sample cards',
    },
    bugs: [
      {
        title: 'low perplexity does not mean a good chatbot',
        fix: 'perplexity measures fit to transcript statistics, which love generic safe replies. conversation quality needs human judgement or task success — the paper says this explicitly, and it\'s still true.',
      },
      {
        title: 'the model did not "understand" the it helpdesk',
        fix: 'it pattern-matched troubleshooting dialogues — impressive, but shallow: ask off-distribution or multi-step questions and the illusion breaks. don\'t generalize from cherry-picked samples.',
      },
      {
        title: 'contradictions are an objective problem, not a decoding bug',
        fix: 'nothing in next-token likelihood rewards self-consistency across turns. sampling vs argmax changes which inconsistency you get, not whether you get one.',
      },
    ],
    fieldNotes: {
      buildsOn: ['seq2seq-2014'],
      unlocks: ['transformer-2017'],
      further: [
        { label: 'original paper — arXiv:1506.05869', url: 'https://arxiv.org/abs/1506.05869' },
        { label: 'li et al. 2016: diversity-promoting objectives for dialog', url: 'https://arxiv.org/abs/1510.03055' },
        { label: 'opensubtitles corpus', url: 'https://opus.nlpl.eu/OpenSubtitles.php' },
      ],
      citation: `@inproceedings{vinyals2015neural,\n  author = {Vinyals, Oriol and Le, Quoc V.},\n  title = {A Neural Conversational Model},\n  booktitle = {ICML Deep Learning Workshop}, year = {2015},\n  eprint = {1506.05869}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'What was architecturally new in "A Neural Conversational Model"?',
        options: [
          'Nothing — the contribution is applying seq2seq unchanged to dialogue transcripts',
          'A hierarchical attention mechanism',
          'A persona-embedding layer',
          'A memory network for consistency',
        ],
        answer: 0,
        why: 'The insight is that (message, reply) pairs have the same shape as translation pairs — the model is stock seq2seq.',
        tag: 'briefing',
      },
      {
        type: 'mcq',
        q: 'Why do likelihood-trained chatbots produce so many generic replies ("i don\'t know")?',
        options: [
          'Generic replies are high-probability across many contexts — the objective rewards likelihood, not informativeness',
          'The decoder is too small',
          'Movie subtitles contain mostly generic lines',
          'Beam search is broken',
        ],
        answer: 0,
        why: 'You get what you optimize for: "likely transcript reply" has no term for specificity or helpfulness.',
        tag: 'intuitions',
      },
      {
        type: 'mcq',
        q: 'The model\'s inconsistency about facts like its own age demonstrates:',
        options: [
          'Nothing in the training objective pins down a persistent persona or memory across turns',
          'The encoder loses the previous turn',
          'A bug in the sampling temperature',
          'Insufficient vocabulary size',
        ],
        answer: 0,
        why: 'Next-token prediction on transcripts doesn\'t reward self-consistency; persona conditioning came later.',
        tag: 'intuitions',
      },
      {
        type: 'tf',
        q: 'True or false: the paper argues perplexity alone is an adequate metric for conversation quality.',
        answer: false,
        why: 'The authors explicitly discuss the evaluation gap — transcript likelihood doesn\'t track conversational quality; human judgement is needed.',
        tag: 'bugs',
      },
      {
        type: 'tf',
        q: 'True or false: the model was trained on both movie subtitles and an IT-helpdesk chat corpus.',
        answer: true,
        why: 'OpenSubtitles for open-domain chat, plus a helpdesk corpus where it produced plausible troubleshooting dialogues.',
        tag: 'briefing',
      },
      {
        type: 'mcq',
        q: 'Which modern technique most directly addresses the "likely ≠ good" objective gap this paper documented?',
        options: [
          'RLHF — optimizing human-rated quality instead of raw transcript likelihood',
          'Larger vocabularies',
          'Deeper encoders',
          'Byte-pair encoding',
        ],
        answer: 0,
        why: 'RLHF shapes the objective toward what humans rate as good replies — the missing term the paper identified.',
        tag: 'field-notes',
      },
      {
        type: 'mcq',
        q: 'The famous "purpose of life" Q&A sample illustrates:',
        options: [
          'Open-domain pattern matching can produce strikingly coherent philosophical exchanges from subtitle data',
          'The model has beliefs about ethics',
          'The dataset contained philosophy textbooks',
          'Seq2seq models are deterministic',
        ],
        answer: 0,
        why: 'Impressive surface coherence emerged from response prediction — without grounding, belief, or consistency guarantees.',
        tag: 'briefing',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 11 · graves-handwriting-2013
  // -----------------------------------------------------------------------
  {
    slug: 'graves-handwriting-2013',
    venue: 'arXiv:1308.0850 (2013)',
    sourceUrl: 'https://arxiv.org/abs/1308.0850',
    briefing: {
      paragraphs: [
        'Alex Graves asked a deceptively simple question: if an RNN can predict the next token, can it predict the next *pen stroke*? This 2013 paper generated two kinds of sequences — text and handwriting — and the handwriting half introduced machinery that would quietly become standard: mixture density outputs and a soft attention window over conditioning text.',
        'The problem with predicting pen coordinates: the next stroke location isn\'t a class label, it\'s a continuous, multimodal quantity — many different next-points are plausible. A single Gaussian (minimizing squared error) would average them and draw mush. The fix, a **mixture density network**, has the network output the *parameters* of a mixture of Gaussians — means, variances, correlations, and mixing weights — and sampling happens in two stages: pick a component, then draw from it.',
        'For handwriting synthesis, the model also needs to know which letter it\'s writing: a soft "window" mechanism slides along the character sequence, weighting each character by learned attention-like weights at every stroke step. The result — crisp, variable, cursive handwriting in any style from a text prompt — was one of the first great neural *generation* demos, and the direct ancestor of modern text-conditioned generative models.',
      ],
      stakes: 'mixture density outputs + soft conditioning windows are how neural nets first learned to draw — the prototype of conditioned generation.',
    },
    eliEngineer: {
      prose: [
        'Classification predicts a one-hot distribution over discrete classes. Regression predicts a single continuous point. A mixture density network predicts a *distribution over continuous space*: for the next pen offset (Δx, Δy), output K bivariate Gaussians — each with a center, spread, and correlation — plus weights saying how likely each component is.',
        'Sampling is a two-draw lottery: first sample which Gaussian component to use (from the mixing weights), then sample a point from that Gaussian. Training is just maximum likelihood: increase the probability the mixture assigned to the true next stroke.',
        'The conditioning trick is the "window": at every stroke step, a learned soft selector slides over the character sequence — essentially single-head attention over text — telling the network which letter it\'s currently inking. That\'s how "write *hello*" actually produces an h, then an e, then wobbly l\'s.',
      ],
      code: {
        lang: 'python',
        file: 'mdn_pen.py',
        snippet: `# network outputs PARAMETERS of a distribution, not a point:
out = lstm(stroke_prev, window_prev)
pi, mu_x, mu_y, s_x, s_y, rho = split(out)   # K components each
pen_up = sigmoid(out[-1])                    # plus a Bernoulli lift-bit

# the window: soft attention over the character sequence
kappa = kappa_prev + exp(out_k)              # slide right, learned speed
w = softmax_over_chars(kappa, text)          # which letter am I on?

def sample():
    k = categorical(pi).sample()             # 1. pick a component
    dx, dy = bivariate_gaussian(mu[k], s[k], rho[k]).sample()  # 2. draw
    return (dx, dy, bernoulli(pen_up).sample())

# bias/legibility dial: shrink the sigmas at sampling time ->
# cleaner, more uniform handwriting; raise it -> wild scrawl.`,
      },
    },
    intuitions: [
      {
        title: 'Regression can\'t draw: averages are mush',
        body: 'If several next-stroke positions are plausible, least-squares regression predicts their mean — a point that may be on no plausible stroke at all. Outputting a *mixture* lets the model represent "here OR there" instead of a blurry "in between".',
        more: 'This is the general answer to "why is my regression model\'s output blurry/averaged?" — the same argument that later pushed image generation toward autoregressive, VAE, and diffusion objectives instead of raw L2.',
      },
      {
        title: 'The network proposes a distribution; sampling does the rest',
        body: 'Separation of concerns: the network is deterministic (given context) and outputs parameters; randomness enters only at sampling. Train with NLL of the true stroke under the mixture — fully differentiable, no RL needed.',
      },
      {
        title: 'The window is attention before attention had a name',
        body: 'A softmax over character positions, with learned per-step drift (κ only increases — you don\'t un-write letters), is a soft addressing mechanism over text. It prefigures Bahdanau attention by a year and transformers by four.',
      },
      {
        title: 'One "bias" knob trades neatness for variety',
        body: 'Scaling the sampled variances down at generation time yields unnaturally tidy script; scaling them up produces drunken scrawl. Same model, same weights — the diversity lives in the distribution parameters, exactly like temperature in text sampling.',
      },
    ],
    mechanism: {
      latex: 'p(\\mathbf{s}_{t+1}) = \\sum_{k=1}^{K} \\pi_k^{(t)}\\; \\mathcal{N}\\!\\big(\\mathbf{s}_{t+1} \\,\\big|\\, \\mu_k^{(t)}, \\sigma_k^{(t)}, \\rho_k^{(t)}\\big)',
      terms: [
        { symbol: '\\mathbf{s}_{t+1}', meaning: 'the next pen offset (Δx, Δy) — a continuous 2D vector' },
        { symbol: 'K', meaning: 'number of mixture components (e.g. 20 Gaussians)' },
        { symbol: '\\pi_k', meaning: 'mixing weight of component k — how likely this mode is' },
        { symbol: '\\mu_k, \\sigma_k', meaning: 'center and spread of component k in stroke space' },
        { symbol: '\\rho_k', meaning: 'correlation between Δx and Δy in component k (stroke slant)' },
        { symbol: '\\mathcal{N}', meaning: 'a bivariate Gaussian — one plausible "next move" of the pen' },
      ],
      diagram: {
        height: 50,
        nodes: [
          { id: 'text', x: 12, y: 38, label: '"hello"', sub: 'conditioning text', kind: 'io', w: 12 },
          { id: 'win', x: 34, y: 38, label: 'window', sub: 'soft char attention κ', kind: 'box', w: 14 },
          { id: 'lstm', x: 56, y: 24, label: 'LSTM ×3', sub: 'stroke dynamics', kind: 'box', w: 14 },
          { id: 'mdn', x: 80, y: 24, label: 'MDN head', sub: 'π, μ, σ, ρ ×K', kind: 'box', w: 14 },
          { id: 'pen', x: 92, y: 42, label: 'Δpen', sub: 'sampled stroke', kind: 'io', w: 10 },
        ],
        edges: [
          { from: 'text', to: 'win' },
          { from: 'win', to: 'lstm', label: 'w' },
          { from: 'lstm', to: 'mdn' },
          { from: 'mdn', to: 'pen', label: 'sample' },
          { from: 'pen', to: 'lstm', label: 'feedback', dashed: true },
        ],
      },
      caption: 'Handwriting synthesis: a soft window attends the text; the LSTM tracks stroke state; the MDN head emits a Gaussian mixture for the next pen offset; the sample feeds back.',
    },
    lab: {
      name: 'mixture-density handwriting',
      hint: 'press write · drag the bias slider · watch the pen loosen or tighten',
      completion: 'render at least 2 samples at different bias settings',
    },
    bugs: [
      {
        title: 'fit next-stroke prediction with plain mse and you get spaghetti',
        fix: 'l2 regression averages the plausible next positions into a point on none of them. multimodal outputs need a mixture (or another explicit distribution) — never a single mean.',
      },
      {
        title: 'variances must be positive — exp() them, don\'t trust raw outputs',
        fix: 'parameterize σ = exp(raw) and π = softmax(raw); if you let the net emit σ directly, negative or zero "sigmas" will nan your likelihood.',
      },
      {
        title: 'the window is monotonic on purpose',
        fix: 'κ only increases (writing doesn\'t go backwards). if you implement the window as unconstrained attention, the pen will jitter between letters. the drift constraint is a feature.',
      },
    ],
    fieldNotes: {
      buildsOn: ['char-rnn', 'lstm-1997'],
      unlocks: ['bahdanau-2014', 'vlae-2016'],
      further: [
        { label: 'original paper — arXiv:1308.0850', url: 'https://arxiv.org/abs/1308.0850' },
        { label: 'interactive handwriting demo (distill.pub style lineage)', url: 'https://distill.pub/2016/handwriting/' },
        { label: 'bishop 1994: mixture density networks (the original)', url: 'https://publications.aston.ac.uk/id/eprint/373/' },
      ],
      citation: `@article{graves2013generating,\n  author = {Graves, Alex},\n  title = {Generating Sequences with Recurrent Neural Networks},\n  journal = {arXiv:1308.0850}, year = {2013},\n  eprint = {1308.0850}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'Why can\'t plain regression (single Gaussian / MSE) predict pen strokes well?',
        options: [
          'It averages the plausible next positions into a point that lies on no actual stroke',
          'Pen coordinates are discrete classes',
          'MSE cannot be differentiated',
          'It requires too much memory',
        ],
        answer: 0,
        why: 'Multimodal outputs need a multimodal distribution — the mixture represents "here OR there"; a mean represents "nowhere in particular".',
        tag: 'intuitions',
      },
      {
        type: 'mcq',
        q: 'A mixture density network outputs:',
        options: [
          'Parameters of a mixture distribution: per-component weights π, means μ, variances σ, correlations ρ',
          'A single predicted coordinate pair',
          'A softmax over a fixed vocabulary of strokes',
          'The latent code of a VAE',
        ],
        answer: 0,
        why: 'The network is deterministic; it emits distribution parameters, and randomness enters only when sampling.',
        tag: 'mechanism',
      },
      {
        type: 'order',
        q: 'Order the sampling of one pen stroke:',
        items: [
          'network outputs mixture parameters for the next offset',
          'sample a component index from the mixing weights π',
          'draw (Δx, Δy) from that component\'s bivariate Gaussian',
          'draw the pen-up bit; feed the stroke back into the RNN',
        ],
        answer: [0, 1, 2, 3],
        why: 'Parameters → component → point → feedback. Two-stage sampling is what makes the output diverse.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'What does the "window" mechanism do in handwriting synthesis?',
        options: [
          'Softly attends over the character sequence so the model knows which letter it is currently writing',
          'Crops the canvas to the current word',
          'Limits the pen speed',
          'Smooths the stroke trajectory',
        ],
        answer: 0,
        why: 'A learned softmax over text positions with monotonic drift κ — attention over characters, a year before Bahdanau.',
        tag: 'briefing',
      },
      {
        type: 'tf',
        q: 'True or false: the handwriting synthesis window only moves forward along the text.',
        answer: true,
        why: 'κ_t = κ_{t−1} + exp(·) is monotonically increasing — you never un-write a letter. The constraint is deliberate.',
        tag: 'bugs',
      },
      {
        type: 'mcq',
        q: 'What is the effect of increasing the sampling "bias" (shrinking variances)?',
        options: [
          'Cleaner, more uniform, more legible handwriting — less variety',
          'Wilder, more variable scrawl',
          'Faster writing',
          'Longer words',
        ],
        answer: 0,
        why: 'Bias sharpens each Gaussian: samples cluster near component means — the handwriting analog of lowering temperature.',
        tag: 'intuitions',
      },
      {
        type: 'tf',
        q: 'True or false: training a mixture density network requires reinforcement learning.',
        answer: false,
        why: 'It\'s plain maximum likelihood: raise the probability the mixture assigns to the true next stroke — fully differentiable.',
        tag: 'mechanism',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 12 · order-matters-2015
  // -----------------------------------------------------------------------
  {
    slug: 'order-matters-2015',
    venue: 'ICLR 2016 · arXiv:1511.06391',
    sourceUrl: 'https://arxiv.org/abs/1511.06391',
    briefing: {
      paragraphs: [
        'Seq2seq models assume the input is a sequence — it arrives in an order and gets read in that order. But many problems are naturally about **sets**: a handful of numbers to sort, points on a plane, objects in a scene. Sets have no canonical order, yet your recurrent encoder will see one anyway. Vinyals, Bengio and Kudlur asked: does the order you choose matter? The answer was a resounding yes.',
        'The paper explores both directions. For set *inputs*, they replace the order-sensitive LSTM read with an attention-based "read" operation that processes the set in a learned, content-dependent order (or an orderless one). For set *outputs*, they show the order in which you emit answers changes learnability dramatically — e.g. emitting a sorted sequence in the order induced by a good search procedure.',
        'The broader lesson is pure machine-learning craft: when the data has symmetries or free choices of representation, those choices are hyperparameters of learnability. Like picking a good sort order before a merge, a well-chosen input/output ordering can turn a hard sequence problem into an easy one — results included improved sorting, NMT with reordered inputs, parsing, and convex-hull computation.',
      ],
      stakes: 'your model sees an order even when your data doesn\'t have one. choosing that order deliberately is free accuracy.',
    },
    eliEngineer: {
      prose: [
        'An LSTM reading a set is like `for item in my_set:` — you\'ll iterate in *some* order, and that arbitrary order quietly becomes part of the function the network must learn. If the task is symmetric ("sort these numbers"), a bad iteration order forces the model to simultaneously learn the task *and* undo your arbitrary permutation.',
        'Their fix for inputs: make the read order itself a computation. An attention mechanism scores the set elements and reads them in a content-dependent sequence — the model learns its own iteration order instead of inheriting yours.',
        'For outputs, the insight is that generation order = search order. Emitting "the sorted array" is much easier if the decoder emits in sorted order (each step is a min-query over what\'s left) than in input order (each step is a full lookup). Choosing the emission order is choosing the algorithm the model gets to imitate.',
      ],
      code: {
        lang: 'python',
        file: 'read_attention.py',
        snippet: `# vanilla read: arbitrary order becomes part of the function
h = zeros()
for x in my_set:            # <- python gave you SOME order...
    h = lstm(x, h)          # ...and the model must live with it

# orderless / learned read: attention picks the iteration order
mem = [encode(x) for x in my_set]
q = zeros()
for step in range(K):
    a = softmax(score(q, mem))     # content-dependent read order
    q = lstm(sum(a * mem), q)      # read the set *attentively*
    # the model learns WHICH element to read next, or learns
    # to be order-invariant if the task is symmetric

# output side: emit sorted numbers in ascending order, and each
# decoder step is an easy "min of the remainder" query.`,
      },
    },
    intuitions: [
      {
        title: 'An arbitrary order is a hidden tax on learning',
        body: 'Present a set in random order and the model must learn the task under all permutations it might see — or memorize around them. That\'s sample complexity spent on your bookkeeping, not on the problem.',
      },
      {
        title: 'Let the model choose its iteration order',
        body: 'Attention over the set turns "for x in arbitrary_order" into "repeatedly read the most relevant element". The read order becomes learned, content-dependent computation — often recovering the order a human algorithm would use (e.g. ascending for sorting).',
      },
      {
        title: 'Output order = the algorithm you\'re asking for',
        body: 'Sequence generation defines a search order over the answer. Emit sorted output in ascending order and every step is a cheap local decision; emit it in input order and every step is a global query. Same task, different algorithmic difficulty — order is a compiler flag for learnability.',
        more: 'For the convex hull task, emitting points in angular order around the shape is easy (like Graham scan); emitting them in random order is brutal. The paper showed matching gains for NMT (pre-ordering source sentences) and parsing.',
      },
      {
        title: 'Symmetry is a design decision, not a discovery',
        body: 'If your data is a set, you choose: bake in order-invariance (Deep Sets, attention reads, graph nets) or pick a canonical order and feed it to a sequence model. Pretending the choice away just means you made it by accident.',
      },
    ],
    mechanism: {
      latex: 'q_t = \\mathrm{LSTM}\\!\\Big(\\sum_i \\alpha_{t,i}\\, m_i,\\; q_{t-1}\\Big), \\qquad \\alpha_{t,i} = \\mathrm{softmax}_i\\, f(q_{t-1}, m_i)',
      terms: [
        { symbol: 'm_i', meaning: 'encoded memory of set element i — orderless by construction' },
        { symbol: 'q_t', meaning: 'the "read" state after t attentive passes over the set' },
        { symbol: 'f(q, m_i)', meaning: 'compatibility score: how much does the current query want element i' },
        { symbol: '\\alpha_{t,i}', meaning: 'attention over the *set* — a learned read order, one distribution per pass' },
        { symbol: '\\sum_i \\alpha_{t,i} m_i', meaning: 'the soft read: a blend of elements, in content-chosen order' },
      ],
      diagram: {
        height: 50,
        nodes: [
          { id: 's1', x: 16, y: 38, label: 'x₃', sub: 'set element', kind: 'io', w: 8 },
          { id: 's2', x: 28, y: 38, label: 'x₁', kind: 'io', w: 8 },
          { id: 's3', x: 40, y: 38, label: 'x₂', kind: 'io', w: 8 },
          { id: 'mem', x: 28, y: 24, label: 'memories mᵢ', sub: 'encoded, orderless', kind: 'mem', w: 18 },
          { id: 'att', x: 56, y: 24, label: 'attend ×K', sub: 'learned read order', kind: 'box', w: 16 },
          { id: 'q', x: 78, y: 24, label: 'q_K', sub: 'set summary', kind: 'mem', w: 10 },
          { id: 'out', x: 90, y: 40, label: 'output seq', sub: 'in chosen order', kind: 'io', w: 14 },
        ],
        edges: [
          { from: 's1', to: 'mem' },
          { from: 's2', to: 'mem' },
          { from: 's3', to: 'mem' },
          { from: 'mem', to: 'att' },
          { from: 'att', to: 'q' },
          { from: 'q', to: 'out' },
        ],
      },
      caption: 'Reading a set: elements are encoded into orderless memories; K attention passes read them in a learned, content-dependent order; the decoder emits output in a chosen (easier) order.',
    },
    lab: {
      name: 'shuffle the input',
      hint: 'pick an input ordering · watch the task get easier or harder',
      completion: 'try at least 3 orderings, including the one the model prefers',
    },
    bugs: [
      {
        title: 'shuffling set inputs each epoch is not a free symmetry fix',
        fix: 'random permutation augmentation teaches invariance only by brute force — the model burns capacity covering all orders. an attention read or canonical ordering gets the same invariance structurally.',
      },
      {
        title: 'the "natural" order of your dataset may be the worst one',
        fix: 'dataset order (file order, scrape order) is arbitrary but not neutral: it shapes the function the model must learn. test a few canonical orders (sorted, curriculum, model-chosen) before accepting the default.',
      },
      {
        title: 'order-invariance is not always what you want',
        fix: 'some tasks are order-sensitive (language!). attention reads help for *sets*; for sequences, order is information. know which kind of data you have.',
      },
    ],
    fieldNotes: {
      buildsOn: ['seq2seq-2014', 'bahdanau-2014'],
      unlocks: ['pointer-networks-2015', 'relational-reasoning-2017', 'mpnn-2017'],
      further: [
        { label: 'original paper — arXiv:1511.06391', url: 'https://arxiv.org/abs/1511.06391' },
        { label: 'zaheer et al. 2017: deep sets (order-invariance by design)', url: 'https://arxiv.org/abs/1703.06114' },
        { label: 'vinyals & kaiser 2015: grammar as a foreign language (output ordering for parsing)', url: 'https://arxiv.org/abs/1412.7449' },
      ],
      citation: `@inproceedings{vinyals2015order,\n  author = {Vinyals, Oriol and Bengio, Samy and Kudlur, Manjunath},\n  title = {Order Matters: Sequence to Sequence for Sets},\n  booktitle = {ICLR}, year = {2016},\n  eprint = {1511.06391}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'What is the core problem with feeding a *set* to an LSTM encoder?',
        options: [
          'The LSTM reads in whatever arbitrary order the elements arrive, and that order silently becomes part of the function to learn',
          'LSTMs cannot process more than one element',
          'Sets are always too large to encode',
          'The encoder produces duplicate outputs',
        ],
        answer: 0,
        why: 'A set has no canonical order, but the recurrent read imposes one — the model must learn the task plus your permutation.',
        tag: 'briefing',
      },
      {
        type: 'mcq',
        q: 'The paper\'s attention-based "read" operation:',
        options: [
          'Scores set elements against a query and reads them in a learned, content-dependent order',
          'Always reads elements in sorted numeric order',
          'Shuffles the set randomly each step',
          'Reads the set in reverse insertion order',
        ],
        answer: 0,
        why: 'α = softmax(f(q, m_i)) per pass: the model learns its own iteration order over the orderless memories.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Why is emitting a sorted array in ascending order easier for a decoder than in input order?',
        options: [
          'Each step becomes a local "min of the remainder" decision instead of a global lookup — generation order sets the algorithm',
          'Ascending order has fewer tokens',
          'The softmax works better on small numbers',
          'It avoids attention entirely',
        ],
        answer: 0,
        why: 'Output order = search order. A good order decomposes the task into easy steps; a bad one makes every step global.',
        tag: 'intuitions',
      },
      {
        type: 'tf',
        q: 'True or false: the paper found input/output ordering choices irrelevant as long as the model is large enough.',
        answer: false,
        why: 'Ordering changed learnability dramatically across sorting, NMT, parsing, and hull tasks — it\'s a first-class hyperparameter.',
        tag: 'bugs',
      },
      {
        type: 'tf',
        q: 'True or false: for the convex-hull task, emitting hull points in angular (scan) order is easier than in arbitrary order.',
        answer: true,
        why: 'Angular order mirrors what geometric algorithms (Graham scan) do — each next point is a local decision.',
        tag: 'intuitions',
      },
      {
        type: 'mcq',
        q: 'Which is the best default when your data is genuinely a set?',
        options: [
          'Make order-invariance structural (attention reads / Deep Sets-style pooling) or choose a canonical order deliberately',
          'Shuffle the training set and hope',
          'Sort by memory address',
          'Pad the set to a fixed length and use a 1D conv',
        ],
        answer: 0,
        why: 'Handle symmetry by design — either bake in invariance or pick an order on purpose. Accidental order is the worst option.',
        tag: 'bugs',
      },
      {
        type: 'mcq',
        q: 'A headline result of the paper was:',
        options: [
          'Learned/chosen orderings improved sorting, machine translation (input pre-ordering), parsing, and geometric tasks',
          'Set inputs made all tasks impossible for RNNs',
          'Ordering matters only for images',
          'Random order always outperforms sorted order',
        ],
        answer: 0,
        why: 'The paper demonstrated consistent gains from treating order as a learnable/designable choice across very different domains.',
        tag: 'briefing',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 13 · pointer-networks-2015
  // -----------------------------------------------------------------------
  {
    slug: 'pointer-networks-2015',
    venue: 'NeurIPS 2015 · arXiv:1506.03134',
    sourceUrl: 'https://arxiv.org/abs/1506.03134',
    briefing: {
      paragraphs: [
        'Sequence models emit tokens from a fixed vocabulary. But what if the answer *is* a subset of the input — the indices of points forming a convex hull, the stops of a traveling-salesman tour? A fixed output vocabulary fundamentally cannot express "the 3rd input point" when the input length varies. Vinyals, Fortunato and Jaitly\'s Pointer Networks solve it with an audacious simplification: **use the attention weights themselves as the output distribution**.',
        'The Ptr-Net is an encoder–decoder where the decoder never emits words. At each step it computes attention over the input positions and *picks one* — the softmax over inputs is the output. The "vocabulary" is the input sequence itself, so the model handles any input length and its outputs always refer to real inputs by construction.',
        'They trained it on geometric-combinatorial problems — convex hulls, Delaunay triangulations, traveling salesman — where the output is genuinely a sequence of input indices. The model learned near-correct algorithms from examples alone and even generalized to sizes unseen in training. It\'s a foundational trick, still used whenever a model must extract spans or references from its input.',
      ],
      stakes: 'when the output is positions in the input, don\'t generate — point. this trick powers span extraction and copying everywhere.',
    },
    eliEngineer: {
      prose: [
        'Normal attention produces weights that blend values into a context vector. A pointer network stops one step earlier: the softmax weights *are* the deliverable. Attention as a selection mechanism, not a mixing mechanism — `argmax`-flavored output, still trained with plain cross-entropy.',
        'It\'s the difference between a function that returns a *value* and one that returns a *reference*. Convex hull? Don\'t return coordinates (fixed vocabulary of floats?!), return pointers: "input[4], input[1], input[7]". The output space automatically scales with the input.',
        'This also fixes a nasty implicit bug: generated answers could hallucinate nonexistent entities. Pointing makes every output refer to an actual input element — the model can\'t reference what it didn\'t see.',
      ],
      code: {
        lang: 'python',
        file: 'ptr_net.py',
        snippet: `# encoder: one vector e_j per input point
E = [encode(x_j) for x_j in inputs]

# decoder: no vocabulary softmax — the output IS the attention
d = init_state
chosen = []
for step in range(hull_size):
    u_j = v.T @ tanh(W1 @ E[j] + W2 @ d) for j in range(n)
    p = softmax(u)            # distribution over INPUT POSITIONS
    i = argmax(p)             # (greedy; or sample)
    chosen.append(i)          # output = "points to inputs[i]"
    d = lstm(E[i], d)         # feed the chosen point onward

# len(output_vocab) == len(input). always. by construction.`,
      },
    },
    intuitions: [
      {
        title: 'Attention weights can be the answer',
        body: 'Bahdanau attention blended annotations into a context; Ptr-Nets ship the weights. The softmax over input positions doubles as the output layer — an elegant reuse that turns "where to look" into "what to answer".',
      },
      {
        title: 'Variable input ⇒ variable output vocabulary',
        body: 'A fixed vocabulary can\'t name "input point #17" for arbitrary n. Pointing makes the output space a function of the input, so one model handles 5 points or 500 — and generalizes across sizes far better than vocab-based models.',
      },
      {
        title: 'References can\'t hallucinate',
        body: 'Generated tokens can name things that don\'t exist; a pointer can only refer to actual inputs. For extraction tasks this is a structural correctness guarantee — the reason span-extraction and copy mechanisms all descend from this paper.',
        more: 'Later descendants: copy mechanisms in summarization (See et al. 2017), reading-comprehension span prediction (SQuAD models), and retrieval-style references. All are "output = attention over input".',
      },
      {
        title: 'It learned algorithms from examples',
        body: 'Given (points → hull) training pairs, the Ptr-Net approximated computational-geometry algorithms — O(n log n)-ish behavior learned by gradient descent. Not perfectly, not with proofs, but well enough to beat the "neural nets can\'t do discrete algorithms" intuition of its day.',
      },
    ],
    mechanism: {
      latex: 'p(\\mathcal{C}_i \\,|\\, \\mathcal{C}_{<i},\\, \\mathcal{P}) = \\mathrm{softmax}(u_i), \\qquad u_i^{j} = v^{\\!\\top}\\tanh\\!\\big(W_1 e_j + W_2 d_i\\big)',
      terms: [
        { symbol: '\\mathcal{P}', meaning: 'the input sequence (e.g. points on a plane), length n' },
        { symbol: 'e_j', meaning: 'encoder state for input position j' },
        { symbol: 'd_i', meaning: 'decoder state at output step i — the pointer\'s "query"' },
        { symbol: 'u_i^j', meaning: 'attention score of input j at step i (additive attention)' },
        { symbol: '\\mathrm{softmax}(u_i)', meaning: 'the output: a probability distribution over input positions' },
        { symbol: '\\mathcal{C}_i', meaning: 'the i-th emitted index — an element of {1..n}, not a vocabulary token' },
      ],
      diagram: {
        height: 50,
        nodes: [
          { id: 'p1', x: 16, y: 40, label: 'p₁', sub: 'input point', kind: 'io', w: 8 },
          { id: 'p2', x: 28, y: 40, label: 'p₂', kind: 'io', w: 8 },
          { id: 'p3', x: 40, y: 40, label: 'p₃', kind: 'io', w: 8 },
          { id: 'enc', x: 28, y: 26, label: 'encoder', sub: 'one e_j per point', kind: 'box', w: 16 },
          { id: 'att', x: 58, y: 26, label: 'attend', sub: 'softmax over inputs', kind: 'box', w: 14 },
          { id: 'ptr', x: 80, y: 26, label: '→ p_j', sub: 'the output IS a pointer', kind: 'mem', w: 12 },
          { id: 'hull', x: 88, y: 42, label: 'hull path', sub: 'sequence of indices', kind: 'io', w: 14 },
        ],
        edges: [
          { from: 'p1', to: 'enc' },
          { from: 'p2', to: 'enc' },
          { from: 'p3', to: 'enc' },
          { from: 'enc', to: 'att' },
          { from: 'att', to: 'ptr' },
          { from: 'ptr', to: 'hull' },
          { from: 'ptr', to: 'att', label: 'feed back', dashed: true },
        ],
      },
      caption: 'Pointer network: the decoder attends over input positions and emits the argmax index — the output vocabulary is the input itself, so length generalization comes free.',
    },
    lab: {
      name: 'convex hull pointer',
      hint: 'click to place points · run the ptr-net · watch it point around the hull',
      completion: 'place at least 6 points and build a complete convex hull',
    },
    bugs: [
      {
        title: 'pointer nets don\'t solve combinatorial optimization',
        fix: 'they learn *approximate* algorithms from examples — great on-distribution, brittle far off it. a learned heuristic is not an optimal solver; check out-of-distribution sizes before trusting it.',
      },
      {
        title: 'the output order still matters',
        fix: 'a hull emitted in angular order is learnable; the same hull in random order is much harder (order matters, paper 12). canonicalize the emission order or the model struggles.',
      },
      {
        title: 'greedy pointing ≠ beam search',
        fix: 'one wrong early point can cascade through the tour/hull. argmax decoding is cheapest but beam search over pointer sequences usually buys accuracy — same as in token generation.',
      },
    ],
    fieldNotes: {
      buildsOn: ['bahdanau-2014', 'order-matters-2015'],
      unlocks: ['ntm-2014', 'transformer-2017'],
      further: [
        { label: 'original paper — arXiv:1506.03134', url: 'https://arxiv.org/abs/1506.03134' },
        { label: 'see et al. 2017: copy mechanisms for summarization', url: 'https://arxiv.org/abs/1704.04368' },
        { label: 'bello et al. 2016: neural combinatorial optimization with RL', url: 'https://arxiv.org/abs/1611.09940' },
      ],
      citation: `@inproceedings{vinyals2015pointer,\n  author = {Vinyals, Oriol and Fortunato, Meire and Jaitly, Navdeep},\n  title = {Pointer Networks},\n  booktitle = {NeurIPS}, year = {2015},\n  eprint = {1506.03134}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'What is the output of a Pointer Network at each decoding step?',
        options: [
          'A softmax distribution over the input positions — the model points to an input element',
          'A softmax over a fixed 50k vocabulary',
          'A continuous coordinate',
          'A binary keep/drop decision per layer',
        ],
        answer: 0,
        why: 'The attention weights themselves are the output distribution: the "vocabulary" is the input sequence.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Why can\'t a fixed-vocabulary seq2seq model solve convex hull for arbitrary n?',
        options: [
          'The answer is a set of input indices — a fixed vocabulary can\'t name "input #17" for arbitrary input length',
          'Fixed vocabularies are too small for geometry',
          'Seq2seq models only handle text',
          'The hull has variable area',
        ],
        answer: 0,
        why: 'Outputs must refer to inputs; vocabulary size would have to grow with n. Pointing makes the output space input-relative.',
        tag: 'briefing',
      },
      {
        type: 'mcq',
        q: 'How does a Ptr-Net differ from Bahdanau attention?',
        options: [
          'Bahdanau blends annotations into a context vector; Ptr-Net ships the attention weights as the answer',
          'Ptr-Net uses convolutional encoders',
          'Bahdanau attention cannot be trained',
          'Ptr-Net has no decoder',
        ],
        answer: 0,
        why: 'Same scoring machinery, different final step: mix (context = Σα·h) vs select (output = α).',
        tag: 'eli-engineer',
      },
      {
        type: 'tf',
        q: 'True or false: because it points, a Ptr-Net\'s outputs always refer to elements that actually exist in the input.',
        answer: true,
        why: 'Pointing is a structural guarantee against hallucinated references — a key reason copy mechanisms descended from it.',
        tag: 'intuitions',
      },
      {
        type: 'tf',
        q: 'True or false: Ptr-Nets provide provably optimal solutions to TSP.',
        answer: false,
        why: 'They learn approximate heuristics from examples — good on-distribution, no optimality guarantees.',
        tag: 'bugs',
      },
      {
        type: 'mcq',
        q: 'Which later NLP family directly descends from the pointing trick?',
        options: [
          'Span extraction and copy mechanisms (reading comprehension, summarization)',
          'Word embedding methods',
          'Batch normalization variants',
          'Gradient clipping schedules',
        ],
        answer: 0,
        why: '"Output = attention over input" is exactly span prediction and copying — SQuAD-era models and pointer-generator networks.',
        tag: 'field-notes',
      },
      {
        type: 'order',
        q: 'Order one Ptr-Net decoding step:',
        items: [
          'encoder produces one vector per input position',
          'decoder state scores every input position',
          'softmax over positions becomes the output distribution',
          'the chosen input is fed back for the next step',
        ],
        answer: [0, 1, 2, 3],
        why: 'Encode once, then repeatedly: query → score → point → feedback.',
        tag: 'mechanism',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 14 · transformer-2017  (the gold-standard level — paper.md §7)
  // -----------------------------------------------------------------------
  {
    slug: 'transformer-2017',
    venue: 'NeurIPS 2017 · arXiv:1706.03762',
    sourceUrl: 'https://arxiv.org/abs/1706.03762',
    briefing: {
      paragraphs: [
        'Before 2017, sequence models processed tokens one at a time — a for-loop you couldn\'t parallelize. This paper threw out recurrence and convolution entirely and built a sequence model from pure attention: every token looks directly at every other token.',
        'Training got massively parallel (no sequential dependency across positions), long-range dependencies became O(1) path length (any token is one attention hop from any other), and the architecture became the foundation of GPT, BERT, and essentially everything since. The title said it: attention is *all* you need.',
        'The full model is an encoder–decoder for translation: stacks of multi-head self-attention + feed-forward layers, residual connections and layer norm everywhere, sinusoidal positional encodings to inject order, and masked attention in the decoder to prevent peeking at the future.',
      ],
      stakes: 'this is the paper the current AI era is built on. you will understand exactly how it works.',
    },
    eliEngineer: {
      prose: [
        'Self-attention is a **fuzzy key-value store** you can backprop through. Each token writes a key and a value; each token also issues a query. The store returns a similarity-weighted blend of all values — differentiable, parallel, content-addressable. "Keys" advertise what a token offers, "queries" say what a token is looking for.',
        'Because the lookup is a matrix multiply over all positions at once, there is no loop over time: every token\'s output is computed simultaneously. That\'s where the training-speed revolution comes from — GPUs eat matrix multiplies for breakfast.',
        'The catch: with no loop, the model has no sense of order. The fix is to *inject* position — add a sinusoidal positional encoding to each token embedding — so "dog bites man" and "man bites dog" stay different.',
      ],
      code: {
        lang: 'python',
        file: 'attention.py',
        snippet: `# self-attention ≈ a differentiable dict lookup
scores  = Q @ K.T / sqrt(d_k)   # how much does token i care about token j?
weights = softmax(scores)       # normalize to a probability distribution
out     = weights @ V           # weighted blend of values

# Q, K, V are just learned linear projections of the same tokens.
# multi-head: run 8 of these lookups in parallel subspaces,
# concatenate the results. every position, one shot, no loop.`,
      },
    },
    intuitions: [
      {
        title: 'A dictionary you can backprop through',
        body: 'Q, K, V are learned projections of the token embeddings. The lookup is soft — every key matches every query to some degree — so gradients flow to all of them. Content-based addressing, learned end-to-end.',
        more: 'Compare a Python dict: exact key match, hard lookup, zero gradient. Self-attention is the continuous relaxation — and that relaxation is what makes it trainable.',
      },
      {
        title: 'Recurrence was a bottleneck, not a feature',
        body: 'A for-loop over time can\'t parallelize: step t needs step t−1. Attention is a matrix multiply — MapReduce over tokens. Sequential computation per layer dropped from O(n) to O(1), and training transformers at scale became an engineering problem instead of an impossibility.',
      },
      {
        title: 'Multi-head = multiple indexes on the same table',
        body: 'Eight heads learn eight different similarity notions in parallel subspaces — one tracks syntax, one coreference, one position. Concatenating heads is like querying several indexes and joining the results.',
      },
      {
        title: 'Position is injected, not inherent',
        body: 'With no recurrence, order must come from somewhere: sinusoidal encodings (sines/cosines at different frequencies, one per dimension) are added to the input embeddings. Without them, the model is literally a bag of words — shuffling the input changes nothing.',
        more: 'Why sinusoids? They give every position a unique, smooth fingerprint, and relative offsets are linear functions of them — easy for attention to learn "the token two to my left".',
      },
    ],
    mechanism: {
      latex: '\\mathrm{Attention}(Q, K, V) = \\mathrm{softmax}\\!\\left(\\frac{QK^{\\!\\top}}{\\sqrt{d_k}}\\right) V',
      terms: [
        { symbol: 'Q', meaning: 'queries — what each token is looking for' },
        { symbol: 'K', meaning: 'keys — what each token advertises' },
        { symbol: 'V', meaning: 'values — what each token actually passes along' },
        { symbol: 'QK^{\\!\\top}', meaning: 'pairwise similarity scores between every token pair' },
        { symbol: '\\sqrt{d_k}', meaning: 'scaling that keeps softmax out of its flat-gradient region' },
        { symbol: '\\mathrm{softmax}', meaning: 'row-wise normalization — each token\'s attention sums to 1' },
      ],
      diagram: {
        height: 62,
        nodes: [
          { id: 'tok', x: 10, y: 52, label: 'tokens', sub: 'input sequence', kind: 'io', w: 12 },
          { id: 'emb', x: 26, y: 52, label: 'embed + pos', sub: '+ sinusoidal positions', kind: 'box', w: 16 },
          { id: 'mha', x: 46, y: 40, label: 'multi-head attn', sub: 'Q·K lookups ×8', kind: 'box', w: 18 },
          { id: 'an1', x: 46, y: 28, label: 'add & norm', sub: 'residual + layernorm', kind: 'box', w: 16 },
          { id: 'ffn', x: 46, y: 16, label: 'feed-forward', sub: '2-layer MLP per token', kind: 'box', w: 16 },
          { id: 'an2', x: 46, y: 6, label: 'add & norm', sub: '×N layers deep', kind: 'box', w: 16 },
          { id: 'dec', x: 76, y: 28, label: 'masked attn + cross', sub: 'decoder: no peeking ahead', kind: 'box', w: 22 },
          { id: 'out', x: 90, y: 52, label: 'softmax', sub: 'next-token distribution', kind: 'io', w: 12 },
        ],
        edges: [
          { from: 'tok', to: 'emb' },
          { from: 'emb', to: 'mha' },
          { from: 'mha', to: 'an1' },
          { from: 'an1', to: 'ffn' },
          { from: 'ffn', to: 'an2' },
          { from: 'an2', to: 'dec', label: 'K,V', dashed: true },
          { from: 'dec', to: 'out', label: 'linear' },
        ],
      },
      caption: 'The Transformer: embeddings + positional encoding feed N× blocks of (multi-head attention → add&norm → FFN → add&norm); the decoder adds masked self-attention and cross-attention over the encoder output.',
    },
    lab: {
      name: 'self-attention playground',
      hint: 'hover a token · see where it attends · switch heads · drag d_k',
      completion: 'inspect at least 3 tokens on both attention heads',
    },
    bugs: [
      {
        title: '"attention weights = explanations"',
        fix: 'they\'re correlations inside one head; the model has 96 of them across layers. a weight map is a clue, not a causal account.',
      },
      {
        title: '"transformers have no sense of order"',
        fix: 'positional encodings are added at input; without them the model is a bag of words. order is injected, then attention exploits it.',
      },
      {
        title: '"bigger d_k is always better"',
        fix: 'unscaled dot products explode with d_k and kill softmax gradients — hence the √d_k divisor. scale the scores, not just the dims.',
      },
    ],
    fieldNotes: {
      buildsOn: ['bahdanau-2014', 'seq2seq-2014'],
      unlocks: ['annotated-transformer', 'scaling-laws-2020'],
      further: [
        { label: 'original paper — arXiv:1706.03762', url: 'https://arxiv.org/abs/1706.03762' },
        { label: 'the illustrated transformer — jalammar', url: 'https://jalammar.github.io/illustrated-transformer/' },
        { label: 'the annotated transformer — harvard nlp', url: 'https://nlp.seas.harvard.edu/2018/04/03/attention.html' },
      ],
      citation: `@inproceedings{vaswani2017attention,\n  author = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and Uszkoreit, Jakob and Jones, Llion and Gomez, Aidan N. and Kaiser, Lukasz and Polosukhin, Illia},\n  title = {Attention Is All You Need},\n  booktitle = {NeurIPS}, year = {2017},\n  eprint = {1706.03762}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'Why is the dot product scaled by √d_k?',
        options: [
          'Large scores push softmax into saturated regions with tiny gradients',
          'It normalizes the embeddings to unit length',
          'It makes the matrix multiplication faster',
          'It centers the values around zero',
        ],
        answer: 0,
        why: 'For large d_k, dot products grow in magnitude; softmax saturates and gradients vanish. Dividing by √d_k keeps scores in a healthy range.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'What replaces recurrence in the Transformer?',
        options: [
          'Self-attention over all positions at once',
          'A deeper stack of convolutions',
          'A larger LSTM cell state',
          'Beam search at every layer',
        ],
        answer: 0,
        why: 'Every token attends to every token in one matrix multiply — no sequential dependency across time.',
        tag: 'briefing',
      },
      {
        type: 'order',
        q: 'Order the data flow in one encoder block:',
        items: [
          'multi-head self-attention',
          'add & layer norm',
          'position-wise feed-forward',
          'add & layer norm',
        ],
        answer: [0, 1, 2, 3],
        why: 'Attention → residual+norm → FFN → residual+norm, repeated N times.',
        tag: 'mechanism',
      },
      {
        type: 'tf',
        q: 'True or false: without positional encodings, the Transformer is permutation-invariant.',
        answer: true,
        why: 'Self-attention computes pairwise interactions of a *set* of embeddings — shuffle the input and each output simply follows its token.',
        tag: 'intuitions',
      },
      {
        type: 'mcq',
        q: 'What does each attention head learn?',
        options: [
          'Its own Q/K/V projections, capturing different relations in parallel subspaces',
          'A separate copy of the full model',
          'One dimension of the embedding',
          'The positional encoding schedule',
        ],
        answer: 0,
        why: 'Heads are independent low-rank lookups (d_model/h each), then concatenated — multiple indexes on the same table.',
        tag: 'intuitions',
      },
      {
        type: 'fill',
        q: 'Attention(Q,K,V) = softmax( ___ ) V',
        tokens: ['QKᵀ/√d_k', 'KᵀQ/d_k', 'QV·K', 'Q·V/√d_k'],
        answer: ['QKᵀ/√d_k'],
        why: 'Scores are query·key dot products scaled by √d_k; softmax normalizes; the result blends values.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Key training advantage over LSTM seq2seq?',
        options: [
          'All tokens processed in parallel; constant path length between any two positions',
          'Fewer total parameters in every configuration',
          'No need for positional information',
          'It trains without gradient clipping',
        ],
        answer: 0,
        why: 'O(1) sequential ops per layer vs O(n); any token is one attention hop from any other.',
        tag: 'briefing',
      },
      {
        type: 'tf',
        q: 'True or false: the decoder uses masked attention to prevent attending to future tokens.',
        answer: true,
        why: 'Future scores are set to −∞ before the softmax, so position i can only attend to positions ≤ i.',
        tag: 'mechanism',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 15 · annotated-transformer
  // -----------------------------------------------------------------------
  {
    slug: 'annotated-transformer',
    venue: 'nlp.seas.harvard.edu (Harvard NLP, 2018)',
    sourceUrl: 'https://nlp.seas.harvard.edu/2018/04/03/attention.html',
    briefing: {
      paragraphs: [
        'Alexander Rush and the Harvard NLP group did something quietly radical: they re-presented "Attention Is All You Need" as ~400 lines of runnable, line-by-line commented PyTorch. Every equation in the paper appears as code with tensor shapes annotated, every diagram block maps to a class, and the whole thing actually trains a small translation model.',
        'Why this matters: the transformer paper is dense, and the gap between "understood the blog post" and "could implement it" is where most learning dies. The Annotated Transformer became the canonical bridge — the document a generation of engineers used to turn paper-knowledge into working-knowledge. Its style (code-first, shapes-everywhere, minimal dependencies) defined what "read a paper" means for engineers.',
        'Reading it trains a skill the rest of this quest assumes: mapping math to tensors. `softmax(QKᵀ/√d_k)V` is three lines; masked attention is a `masked_fill` with −∞ before the softmax; multi-head is a reshape-transpose-attend-transpose-concat. Once you see the shapes, the architecture stops being magic.',
      ],
      stakes: 'papers are specs; this is the reference implementation. learning to read it is learning to implement any paper.',
    },
    eliEngineer: {
      prose: [
        'Think of it as the difference between reading an architecture diagram and reading the source. The paper says "multi-head attention"; the code says: project to (batch, heads, seq, d_k), compute scores, mask, softmax, matmul values, transpose back, concatenate, project out. Every step has a shape, and the shapes *are* the documentation.',
        'The masking trick is a two-liner worth memorizing: build a lower-triangular matrix of allowed positions, set disallowed scores to −1e9 before the softmax, and the future disappears — the softmax gives it exactly zero weight.',
        'It also encodes craft the paper skips: label smoothing for regularization, the Noam learning-rate schedule (warmup then inverse-square-root decay), weight tying between embeddings. Real training details, in the open.',
      ],
      code: {
        lang: 'python',
        file: 'annotated_attention.py',
        snippet: `def attention(query, key, value, mask=None):
    d_k = query.size(-1)                       # (batch, h, seq, d_k)
    scores = query @ key.transpose(-2, -1) / math.sqrt(d_k)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)  # <- the future dies here
    p_attn = scores.softmax(dim=-1)
    return p_attn @ value, p_attn              # (batch, h, seq, d_k)

# multi-head = reshape, attend, reshape back:
#   x -> (batch, seq, h*d_k) -> (batch, h, seq, d_k)
#   attend -> transpose -> concat -> final linear layer`,
      },
    },
    intuitions: [
      {
        title: 'Shapes are the specification',
        body: 'Reading `(batch, heads, seq, d_k)` at every line forces the mental model: multi-head is just a batch dimension you reshape in and out. When you can say the shape, you understand the op — when you can\'t, you don\'t yet.',
      },
      {
        title: 'Masking is −∞ before softmax, nothing fancier',
        body: 'The decoder\'s "no peeking" is one masked_fill: set future scores to a huge negative number, and softmax assigns them zero probability. Every causal model you\'ve ever used runs this exact two-line trick.',
      },
      {
        title: 'The paper omits; the code confesses',
        body: 'Label smoothing, warmup schedules, weight tying, init details — the difference between a paper result and a reproduced one lives in these. The annotated version is valuable precisely because it shows the unglamorous parts.',
        more: 'The Noam schedule (lr ∝ d_model^−0.5 · min(step^−0.5, step·warmup^−1.5)) warms up linearly then decays as 1/√step — still the default shape for transformer training years later.',
      },
      {
        title: 'Implement-to-understand beats read-to-understand',
        body: 'The genre this post defined — annotated re-implementations — exists because implementation is a forcing function: every vague "somehow it attends" becomes a line you must write. Karpathy\'s nanoGPT later carried the same torch for GPT.',
      },
    ],
    mechanism: {
      latex: '\\mathrm{MultiHead}(Q,K,V) = \\mathrm{Concat}(\\mathrm{head}_1, \\dots, \\mathrm{head}_h)\\,W^{O}, \\quad \\mathrm{head}_i = \\mathrm{Attention}(QW_i^Q, KW_i^K, VW_i^V)',
      terms: [
        { symbol: 'W_i^Q, W_i^K, W_i^V', meaning: 'per-head projections: d_model → d_k (code: one big Linear, reshaped)' },
        { symbol: '\\mathrm{head}_i', meaning: 'one attention lookup in a d_k-dimensional subspace' },
        { symbol: '\\mathrm{Concat}', meaning: 'glue the h heads back: (batch, seq, h·d_k)' },
        { symbol: 'W^O', meaning: 'output projection mixing the heads: h·d_k → d_model' },
        { symbol: 'h', meaning: 'number of heads (8 in the paper; d_k = d_model/h = 64)' },
      ],
      diagram: {
        height: 56,
        nodes: [
          { id: 'x', x: 10, y: 28, label: 'x', sub: '(batch, seq, d_model)', kind: 'io', w: 8 },
          { id: 'proj', x: 28, y: 28, label: 'linear ×3', sub: 'Q, K, V projections', kind: 'box', w: 14 },
          { id: 'split', x: 46, y: 28, label: 'split h=8', sub: '(batch, h, seq, d_k)', kind: 'box', w: 14 },
          { id: 'att', x: 64, y: 28, label: 'scaled dot-product', sub: 'mask → softmax → @V', kind: 'box', w: 18 },
          { id: 'cat', x: 82, y: 28, label: 'concat', sub: 'heads glued back', kind: 'box', w: 12 },
          { id: 'wo', x: 94, y: 28, label: 'W^O', sub: 'output projection', kind: 'box', w: 8 },
        ],
        edges: [
          { from: 'x', to: 'proj' },
          { from: 'proj', to: 'split' },
          { from: 'split', to: 'att' },
          { from: 'att', to: 'cat' },
          { from: 'cat', to: 'wo' },
        ],
      },
      caption: 'Multi-head attention as data flow: project, split into heads, attend in parallel (with the −∞ mask), concatenate, project out. Each block is a few tensor ops.',
    },
    lab: {
      name: 'annotated code walkthrough',
      hint: 'click a code section · watch the matching block light up in the diagram',
      completion: 'visit all 6 code sections',
    },
    bugs: [
      {
        title: 'transposing the wrong axes when splitting heads',
        fix: 'you want (batch, heads, seq, d_k) so attention matmuls run per-head over seq. forgetting the transpose gives attention over d_k instead of seq — it runs, and it\'s wrong. assert shapes.',
      },
      {
        title: 'masking after the softmax does nothing',
        fix: 'the mask must zero scores *before* normalization (masked_fill with −1e9). masking probabilities after softmax changes their sum and leaks future information in early steps.',
      },
      {
        title: 'forgetting the residual + layernorm around each sublayer',
        fix: 'every sublayer is LayerNorm(x + Sublayer(x)) (original: post-norm). skip the residual and deep stacks degrade — the highway is load-bearing, not decorative.',
      },
    ],
    fieldNotes: {
      buildsOn: ['transformer-2017'],
      unlocks: ['scaling-laws-2020'],
      further: [
        { label: 'the annotated transformer — harvard nlp', url: 'https://nlp.seas.harvard.edu/2018/04/03/attention.html' },
        { label: 'karpathy: nanoGPT (same genre, GPT-scale)', url: 'https://github.com/karpathy/nanoGPT' },
        { label: 'the illustrated transformer — jalammar', url: 'https://jalammar.github.io/illustrated-transformer/' },
      ],
      citation: `@misc{rush2018annotated,\n  author = {Rush, Alexander},\n  title = {The Annotated Transformer},\n  year = {2018},\n  howpublished = {\\url{https://nlp.seas.harvard.edu/2018/04/03/attention.html}}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'In the annotated implementation, what tensor shape does multi-head attention operate on?',
        options: [
          '(batch, heads, seq, d_k) — heads become a batch dimension',
          '(seq, batch, d_model) only',
          '(batch, seq) per head',
          '(heads, batch, d_model, d_model)',
        ],
        answer: 0,
        why: 'Project to h·d_k, reshape and transpose so attention matmuls run per-head over the sequence axes.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'How is the decoder\'s causal mask implemented?',
        options: [
          'Set disallowed (future) scores to −1e9 before the softmax, so they get zero probability',
          'Zero out the attention probabilities after softmax',
          'Drop future tokens from the batch',
          'Add a learned bias to past positions',
        ],
        answer: 0,
        why: 'masked_fill(mask==0, −1e9) then softmax → exactly zero weight on the future. Two lines, no magic.',
        tag: 'bugs',
      },
      {
        type: 'mcq',
        q: 'What is the "Noam" learning-rate schedule used in the code?',
        options: [
          'Linear warmup, then inverse-square-root decay (lr ∝ step^−1/2)',
          'Constant learning rate',
          'Cosine decay from step one',
          'Cyclical learning rates with restarts',
        ],
        answer: 0,
        why: 'lr ∝ d_model^−0.5 · min(step^−0.5, step·warmup^−1.5): warm up, then decay as 1/√step.',
        tag: 'intuitions',
      },
      {
        type: 'tf',
        q: 'True or false: each sublayer is wrapped as LayerNorm(x + Sublayer(x)) in the original post-norm formulation.',
        answer: true,
        why: 'Residual connection around the sublayer, then layer norm — the highway keeps deep stacks trainable.',
        tag: 'mechanism',
      },
      {
        type: 'tf',
        q: 'True or false: the Annotated Transformer includes training details the paper omits, such as label smoothing.',
        answer: true,
        why: 'Label smoothing, warmup schedule, weight tying — the confession of details needed to actually reproduce results.',
        tag: 'briefing',
      },
      {
        type: 'order',
        q: 'Order the multi-head attention data flow:',
        items: [
          'linear projections produce Q, K, V',
          'reshape/split into h heads of size d_k',
          'scaled dot-product attention per head (mask, softmax)',
          'concatenate heads and apply the output projection W^O',
        ],
        answer: [0, 1, 2, 3],
        why: 'Project → split → attend → concat → project. Each step is a few tensor ops.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'With d_model = 512 and h = 8 heads, each head operates in:',
        options: [
          'd_k = 64 dimensions per head',
          '512 dimensions per head',
          '8 dimensions per head',
          '4096 dimensions per head',
        ],
        answer: 0,
        why: 'd_k = d_model / h = 512/8 = 64 — total compute stays roughly constant as heads increase.',
        tag: 'mechanism',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 16 · relational-rnn-2018
  // -----------------------------------------------------------------------
  {
    slug: 'relational-rnn-2018',
    venue: 'NeurIPS 2018 · arXiv:1806.01822',
    sourceUrl: 'https://arxiv.org/abs/1806.01822',
    briefing: {
      paragraphs: [
        'An LSTM\'s memory is one big flat vector — a soup of everything it has seen, with no internal structure. Santoro and colleagues at DeepMind asked: what if memory were a *set of slots* that could talk to each other? Their Relational Memory Core (RMC) replaces the single hidden state with a matrix of memory slots, and between timesteps the slots interact through multi-head self-attention — memories reasoning about memories.',
        'The architecture is a neat hybrid: a recurrent wrapper feeds each timestep\'s input into the memory (attending over slots), runs self-attention among the slots for a few steps of "thinking", and gates the result LSTM-style. The memory is no longer a passive buffer but an active workspace where relational computation happens *across* time.',
        'Results showed real gains exactly where you\'d predict: tasks demanding relational reasoning over long horizons — the "nth-farthest" spatial task, program evaluation, Mini-PacMan from pixels, and language modeling (strong WikiText-103 and Project Gutenberg perplexities at the time). Memory with structure beat memory without it.',
      ],
      stakes: 'memory-as-soup vs memory-as-objects: the slot-and-attention view previews how modern architectures organize state.',
    },
    eliEngineer: {
      prose: [
        'Upgrade your mental model of RNN state from `let state = vec![0.0; 1024]` to `let memory = Vec<Slot>` — a collection of distinct objects. Each timestep, the slots run a standup meeting: multi-head self-attention lets every slot query every other slot, exchange information, and update itself.',
        'The recurrence is then over *sets*: memory_t = attend(memory_{t−1}, input_t). Self-attention is the inter-slot bus; the LSTM-style gates decide what to keep from the meeting and what to discard. Because attention is permutation-symmetric over slots, the memory behaves like a data structure, not a smear.',
        'Why bother? Flat vectors are bad at "the red key opens the red door, the blue key opens the blue door" — facts that live in *relations between entities*. Slots + attention give the network a place to store entities separately and compute relations between them explicitly.',
      ],
      code: {
        lang: 'python',
        file: 'rmc_step.py',
        snippet: `# memory: a SET of slots, not one flat vector
M = memory_t_minus_1            # (n_slots, d_slot)
x = embed(input_t)              # this timestep's observation

# 1. input step: slots attend to the input (read the world)
M_in = M + attention(queries=M, keys=x, values=x)

# 2. relational step: slots attend to EACH OTHER (the meeting)
for _ in range(n_attn_steps):
    M_in = M_in + multihead_self_attention(M_in)   # slots talk

# 3. gating: lstm-style forget/input on the updated memory
memory_t = forget_gate * M + input_gate * tanh(M_in)
output = flatten(memory_t)      # read out for the policy/LM head`,
      },
    },
    intuitions: [
      {
        title: 'Memory as a set of objects, not a soup',
        body: 'A flat vector entangles everything; slots keep entities separable. Self-attention between slots then computes *relations between entities* explicitly — the thing flat RNNs must discover implicitly and often fail to.',
      },
      {
        title: 'The standup meeting: slots sync via self-attention',
        body: 'Between timesteps, each slot queries all slots (including itself) and updates. Information that entered the memory 10 steps apart can interact directly — the path length between memories is 1, not 10.',
        more: 'This is the same trick the transformer plays across *positions*, applied across *memories*. The RMC is literally "an LSTM whose cell is a small transformer over slots".',
      },
      {
        title: 'Recurrence over sets needs permutation symmetry',
        body: 'Slots have no canonical order, so the inter-memory operation must be permutation-equivariant — attention is exactly that. It\'s "Order Matters" (paper 12) applied to memory design: build the symmetry in rather than learning around it.',
      },
      {
        title: 'Structure shows up where you\'d expect it',
        body: 'Gains concentrated on relational, long-horizon tasks: nth-farthest (compare distances of many objects), program evaluation (track variable bindings), PacMan (entities + rules). On tasks where flat memory suffices, the extra structure is neutral — structure is a prior, not a universal win.',
      },
    ],
    mechanism: {
      latex: '\\tilde{M}_t = \\mathrm{MHA}\\big(M_{t-1} \\oplus x_t\\big), \\qquad M_t = f_t \\odot M_{t-1} + i_t \\odot \\tanh(\\tilde{M}_t)',
      terms: [
        { symbol: 'M_{t-1}', meaning: 'memory matrix: n_slot × d_slot — a set of slot vectors' },
        { symbol: 'x_t', meaning: 'the new input, folded into memory by attention' },
        { symbol: '\\oplus', meaning: 'incorporating the input (attend/concat) before the relational step' },
        { symbol: '\\mathrm{MHA}', meaning: 'multi-head self-attention *among slots* — the relational computation' },
        { symbol: 'f_t, i_t', meaning: 'LSTM-style forget/input gates controlling memory update' },
        { symbol: 'M_t', meaning: 'the new memory — passed to the next timestep' },
      ],
      diagram: {
        height: 52,
        nodes: [
          { id: 'm1', x: 18, y: 30, label: 'slot₁', kind: 'mem', w: 9 },
          { id: 'm2', x: 30, y: 30, label: 'slot₂', kind: 'mem', w: 9 },
          { id: 'm3', x: 42, y: 30, label: 'slot₃', kind: 'mem', w: 9 },
          { id: 'x', x: 12, y: 44, label: 'x_t', sub: 'new input', kind: 'io', w: 8 },
          { id: 'mha', x: 62, y: 30, label: 'self-attn', sub: 'slots attend slots', kind: 'box', w: 14 },
          { id: 'gate', x: 80, y: 30, label: 'gates', sub: 'forget / input', kind: 'op', w: 10 },
          { id: 'mt', x: 92, y: 30, label: 'M_t', sub: 'next memory', kind: 'mem', w: 10 },
        ],
        edges: [
          { from: 'x', to: 'm1', label: 'attend in' },
          { from: 'm1', to: 'mha' },
          { from: 'm2', to: 'mha' },
          { from: 'm3', to: 'mha' },
          { from: 'mha', to: 'gate' },
          { from: 'gate', to: 'mt' },
          { from: 'mt', to: 'm1', label: 'recur', dashed: true },
        ],
      },
      caption: 'The Relational Memory Core step: input attends into slots; slots self-attend (the relational "meeting"); LSTM-style gates write the result into the next memory.',
    },
    lab: {
      name: 'memory slots vs flat memory',
      hint: 'run the recall toy · compare slot attention to the flat LSTM',
      completion: 'run the sequence with both RMC and LSTM memories',
    },
    bugs: [
      {
        title: 'slots are not "just a bigger hidden state"',
        fix: 'the win comes from the *structured interaction* (self-attention between slots), not capacity. flattening the slots into one vector and adding parameters does not reproduce the relational gains.',
      },
      {
        title: 'attention between slots ≠ attention over the input',
        fix: 'two different attention uses live here: input→slots (perception) and slots→slots (reasoning). conflating them misreads the architecture — the relational step is the contribution.',
      },
      {
        title: 'rmc does not replace lstms everywhere',
        fix: 'it wins on relational/long-horizon tasks; on simple short-range sequence tasks the extra machinery is overhead. match the prior to the problem structure.',
      },
    ],
    fieldNotes: {
      buildsOn: ['lstm-1997', 'transformer-2017', 'ntm-2014'],
      unlocks: ['relational-reasoning-2017'],
      further: [
        { label: 'original paper — arXiv:1806.01822', url: 'https://arxiv.org/abs/1806.01822' },
        { label: 'deepmind blog: relational recurrent neural networks', url: 'https://deepmind.google/discover/blog/' },
        { label: 'companion: relation networks — arXiv:1706.01427', url: 'https://arxiv.org/abs/1706.01427' },
      ],
      citation: `@inproceedings{santoro2018relational,\n  author = {Santoro, Adam and Faulkner, Ryan and Raposo, David and Rae, Jack and Chrzanowski, Mike and Weber, Theophane and Wierstra, Daan and Vinyals, Oriol and Pascanu, Razvan and Lillicrap, Timothy},\n  title = {Relational Recurrent Neural Networks},\n  booktitle = {NeurIPS}, year = {2018},\n  eprint = {1806.01822}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'How does the Relational Memory Core differ from an LSTM\'s memory?',
        options: [
          'Memory is a set of slots that interact via multi-head self-attention, instead of one flat vector',
          'It uses GRUs instead of LSTM cells',
          'It stores memory externally on disk',
          'It removes gating entirely',
        ],
        answer: 0,
        why: 'Slots + self-attention = explicit relational computation between memories; a flat vector must do it implicitly.',
        tag: 'briefing',
      },
      {
        type: 'mcq',
        q: 'Why self-attention between slots specifically?',
        options: [
          'It is permutation-equivariant over the slot set and gives any pair of memories a path length of 1',
          'It is the only operation that fits on a GPU',
          'It removes the need for input embeddings',
          'It makes the memory read-only',
        ],
        answer: 0,
        why: 'Slots have no order (a set), and attention lets distant-in-time memories interact directly — the "meeting" between slots.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'On which tasks did the RMC show its clearest gains?',
        options: [
          'Relational, long-horizon tasks: nth-farthest, program evaluation, Mini-PacMan, language modeling',
          'Image classification',
          'Short-range part-of-speech tagging',
          'Frame-wise speech recognition only',
        ],
        answer: 0,
        why: 'Exactly the tasks where facts live in relations between entities over long horizons — the structure pays its rent there.',
        tag: 'briefing',
      },
      {
        type: 'tf',
        q: 'True or false: in the RMC, recurrence happens over a set of memory slots rather than a single state vector.',
        answer: true,
        why: 'M_t = f·M_{t−1} + i·tanh(MHA(M_{t−1} + input)): the recurrent object is the slot matrix.',
        tag: 'mechanism',
      },
      {
        type: 'tf',
        q: 'True or false: the RMC gains are mainly explained by its larger parameter count.',
        answer: false,
        why: 'Ablations point to the structured slot interactions, not capacity — flat-memory controls with similar capacity lag on relational tasks.',
        tag: 'bugs',
      },
      {
        type: 'mcq',
        q: 'Which earlier paper\'s machinery is reused for the inter-slot "meeting"?',
        options: [
          'The Transformer — multi-head self-attention, applied over memory slots instead of token positions',
          'Pointer Networks',
          'Mixture density networks',
          'The coffee automaton',
        ],
        answer: 0,
        why: 'The RMC is essentially an LSTM whose cell is a small transformer over slots.',
        tag: 'field-notes',
      },
      {
        type: 'order',
        q: 'Order one RMC timestep:',
        items: [
          'slots attend to the new input (perception)',
          'slots attend to each other (relational reasoning)',
          'forget/input gates blend the result with old memory',
          'the updated slot matrix becomes the next memory',
        ],
        answer: [0, 1, 2, 3],
        why: 'Read the world, hold the meeting, gate the write, recur.',
        tag: 'mechanism',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 17 · relational-reasoning-2017
  // -----------------------------------------------------------------------
  {
    slug: 'relational-reasoning-2017',
    venue: 'NeurIPS 2017 · arXiv:1706.01427',
    sourceUrl: 'https://arxiv.org/abs/1706.01427',
    briefing: {
      paragraphs: [
        'Some questions are easy to answer by looking at one thing ("what color is the circle?") and some require *relations* ("is the blue thing the same size as the red thing?"). Santoro et al. showed that standard architectures — CNNs, MLPs, even LSTMs — struggle badly with the second kind, and proposed a drop-in fix: the **Relation Network** module.',
        'The idea is disarmingly brute-force: extract object representations, then for *every pair* of objects (i, j), feed the concatenated pair (plus the question) through a small MLP g_θ, and aggregate all pair-outputs with another MLP f_φ. An O(n²) nested loop, as a neural module. Relational questions become trivial because the architecture computes pairwise relations by construction.',
        'On the CLEVR visual question-answering benchmark — then the flagship test of reasoning — the simple RN plug-in hit **superhuman** accuracy (~95.5%), smashing previous results, and also helped on text QA and physical reasoning. The lesson generalizes: when a task has known structure, baking that structure into the architecture beats hoping a generic net discovers it.',
      ],
      stakes: 'an o(n²) loop over object pairs, made differentiable — the cleanest demo that architectural priors beat parameter counts.',
    },
    eliEngineer: {
      prose: [
        'Think of an RN as a database join you can backprop through. The objects are rows; the module computes `SELECT f(g(a, b) FOR a IN objects, b IN objects)` — every pair gets scored, all scores get aggregated. The question is injected as an extra column into every pair.',
        'Why can\'t a plain MLP do this? A flattened scene forces the network to *find* the objects and *pair* them inside its weights — combinatorially expensive, and it must relearn the pairing logic for every scene layout. The RN hard-codes the pairing loop and lets learning focus on what a "relation" actually is.',
        'The aggregation is a sum, which makes the module permutation-invariant over objects: scene order doesn\'t matter, only the relations do. Another "Order Matters" lesson — the right symmetry, built in, is free generalization.',
      ],
      code: {
        lang: 'python',
        file: 'relation_network.py',
        snippet: `# objects: n slots of d features each (from a CNN, scene parser, ...)
def relation_network(objects, question):
    pair_feats = []
    for i in range(n):                      # O(n^2) nested loop...
        for j in range(n):                  # ...over every object pair
            pair = concat(objects[i], objects[j], question)
            pair_feats.append(g_theta(pair))  # small MLP per pair
    summed = sum(pair_feats, dim=0)         # orderless aggregation
    return f_phi(summed)                    # final MLP -> answer

# the pairing loop is architecture, not learned behavior.
# relational questions become: read out one pair's g_theta.`,
      },
    },
    intuitions: [
      {
        title: 'An O(n²) loop, made differentiable',
        body: 'The RN is unashamedly quadratic: n objects → n² pair evaluations. For scene-sized n (tens of objects) that\'s cheap, and it buys a structural guarantee: *every* relation is explicitly computed, so none must be discovered inside opaque weights.',
      },
      {
        title: 'Where MLPs fail: relations are combinatorial',
        body: 'On Sort-of-CLEVR, a plain MLP nails non-relational questions but collapses on relational ones ("shape of the object closest to the red circle?"). Add the RN and both become easy. The failure isn\'t capacity — it\'s that pairing logic is expensive to learn from scratch.',
        more: 'The paper\'s ablation is the whole argument in one table: same task, same data, same-ish parameter budget; only the pairing structure differs. Non-relational ~90%+, relational chance-level → ~90%+ with the RN.',
      },
      {
        title: 'Sum aggregation = order-invariant scene understanding',
        body: 'Summing pair features makes the module indifferent to object order. Scenes are sets; the RN respects that by construction, so it generalizes across layouts instead of memorizing them.',
      },
      {
        title: 'Priors are parameters you don\'t have to learn',
        body: 'CLEVR superhuman performance came from a tiny module plugged into a standard pipeline. When you know the task\'s structure (objects + pairwise relations), hard-coding it trades a little generality for a lot of sample efficiency — the central bargain of architecture design.',
      },
    ],
    mechanism: {
      latex: '\\mathrm{RN}(O) = f_\\phi\\!\\Big(\\sum_{i,j} g_\\theta\\big(o_i,\\, o_j,\\, q\\big)\\Big)',
      terms: [
        { symbol: 'O', meaning: 'the set of object representations {o₁..o_n} (e.g. CNN feature cells)' },
        { symbol: 'o_i, o_j', meaning: 'one pair of objects — the module iterates over all pairs' },
        { symbol: 'q', meaning: 'the question embedding, concatenated into every pair' },
        { symbol: 'g_\\theta', meaning: 'pairwise MLP: computes "the relation" between two objects' },
        { symbol: '\\sum_{i,j}', meaning: 'sum over all pairs — orderless aggregation of relations' },
        { symbol: 'f_\\phi', meaning: 'final MLP: maps aggregated relation features to the answer' },
      ],
      diagram: {
        height: 52,
        nodes: [
          { id: 'o1', x: 12, y: 16, label: 'o₁', sub: 'object', kind: 'io', w: 8 },
          { id: 'o2', x: 12, y: 30, label: 'o₂', kind: 'io', w: 8 },
          { id: 'o3', x: 12, y: 44, label: 'o₃', kind: 'io', w: 8 },
          { id: 'pairs', x: 36, y: 30, label: 'all pairs (i,j)', sub: 'O(n²) loop', kind: 'box', w: 18 },
          { id: 'g', x: 58, y: 30, label: 'g_θ MLP', sub: 'relation per pair', kind: 'box', w: 14 },
          { id: 'sum', x: 74, y: 30, label: 'Σ', sub: 'orderless aggregate', kind: 'op', w: 8 },
          { id: 'f', x: 88, y: 30, label: 'f_φ → answer', sub: 'final MLP', kind: 'box', w: 16 },
        ],
        edges: [
          { from: 'o1', to: 'pairs' },
          { from: 'o2', to: 'pairs' },
          { from: 'o3', to: 'pairs' },
          { from: 'pairs', to: 'g' },
          { from: 'g', to: 'sum' },
          { from: 'sum', to: 'f' },
        ],
      },
      caption: 'The Relation Network: every object pair (plus the question) goes through the same small MLP; pair features are summed (order-invariant); a final MLP answers.',
    },
    lab: {
      name: 'sort-of-clevr mini',
      hint: 'ask a question · watch the pairs light up · read the answer',
      completion: 'ask at least 3 questions, relational and non-relational',
    },
    bugs: [
      {
        title: 'o(n²) is a feature at scene scale, a bug at internet scale',
        fix: 'pairwise loops are fine for tens of objects; for thousands of tokens you need sparse/approximate pairing (that\'s part of the efficient-transformer research program). match the quadratic budget to n.',
      },
      {
        title: 'the rn needs objects — it doesn\'t discover them',
        fix: 'object slots come from upstream perception (cnn cells, scene parser). feed it raw pixels with no object structure and the "objects" are arbitrary grid cells — the prior is only as good as its slot extraction.',
      },
      {
        title: 'sum aggregation loses *which* pair mattered',
        fix: 'the sum is what buys order-invariance, but it pools relations anonymously. for debugging/attribution, inspect g_θ activations per pair — don\'t assume the aggregate tells you which relation fired.',
      },
    ],
    fieldNotes: {
      buildsOn: ['relational-rnn-2018', 'order-matters-2015'],
      unlocks: ['mpnn-2017'],
      further: [
        { label: 'original paper — arXiv:1706.01427', url: 'https://arxiv.org/abs/1706.01427' },
        { label: 'CLEVR dataset — johnson et al. 2017', url: 'https://arxiv.org/abs/1612.06890' },
        { label: 'deepmind blog: neural approach to relational reasoning', url: 'https://deepmind.google/discover/blog/' },
      ],
      citation: `@inproceedings{santoro2017simple,\n  author = {Santoro, Adam and Raposo, David and Barrett, David G. T. and Malinowski, Mateusz and Pascanu, Razvan and Battaglia, Peter and Lillicrap, Timothy},\n  title = {A Simple Neural Network Module for Relational Reasoning},\n  booktitle = {NeurIPS}, year = {2017},\n  eprint = {1706.01427}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'The Relation Network computes:',
        options: [
          'f_φ over a sum of g_θ applied to every pair of object representations (plus the question)',
          'A softmax attention over image pixels',
          'A recurrent readout of the scene left-to-right',
          'A single MLP over the flattened image',
        ],
        answer: 0,
        why: 'RN(O) = f_φ(Σ_{i,j} g_θ(o_i, o_j, q)) — the pairing loop is architecture, not learned behavior.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Why do plain MLPs fail relational questions on Sort-of-CLEVR?',
        options: [
          'Pairing objects inside opaque weights is combinatorially expensive to learn — the failure is structural, not capacity',
          'MLPs cannot process images',
          'Relational questions have no ground-truth answers',
          'The dataset is too small for any model',
        ],
        answer: 0,
        why: 'Same task and budget: non-relational easy, relational near chance. Add the pairing structure and both become easy.',
        tag: 'intuitions',
      },
      {
        type: 'mcq',
        q: 'Why is the pair aggregation a sum?',
        options: [
          'It makes the module permutation-invariant over objects — scenes are sets, order shouldn\'t matter',
          'It is faster than concatenation',
          'It prevents the gradients from exploding',
          'It increases the parameter count',
        ],
        answer: 0,
        why: 'Orderless aggregation respects the set structure of scenes and generalizes across layouts.',
        tag: 'mechanism',
      },
      {
        type: 'tf',
        q: 'True or false: plugging an RN into a standard pipeline achieved superhuman accuracy on CLEVR.',
        answer: true,
        why: '~95.5% on CLEVR — above human performance reported for the benchmark at the time.',
        tag: 'briefing',
      },
      {
        type: 'tf',
        q: 'True or false: the Relation Network discovers objects from raw pixels entirely on its own.',
        answer: false,
        why: 'It operates on object slots provided upstream (e.g. CNN feature cells); the pairing prior sits on top of perception.',
        tag: 'bugs',
      },
      {
        type: 'mcq',
        q: 'The RN is best understood as which programming idiom?',
        options: [
          'A nested loop / database join over object pairs, made differentiable',
          'A hash lookup',
          'A recursive descent parser',
          'An event queue',
        ],
        answer: 0,
        why: 'for i, for j, g(o_i, o_j, q), aggregate — an O(n²) join you can backprop through.',
        tag: 'eli-engineer',
      },
      {
        type: 'mcq',
        q: 'What is the main scaling caveat of the RN?',
        options: [
          'Quadratic pairing is cheap for tens of objects but prohibitive for thousands — sparse pairing needed at scale',
          'It cannot be batched on GPUs',
          'It requires labeled relations for training',
          'It only works for 3 objects',
        ],
        answer: 0,
        why: 'O(n²) is a feature at scene scale and a bug at internet scale — the same tension that drives efficient-attention research.',
        tag: 'bugs',
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 18 · ntm-2014
  // -----------------------------------------------------------------------
  {
    slug: 'ntm-2014',
    venue: 'arXiv:1410.5401 (2014)',
    sourceUrl: 'https://arxiv.org/abs/1410.5401',
    briefing: {
      paragraphs: [
        'Neural Turing Machines asked the most audacious question of the era: can a neural network have a *working memory* it reads and writes like a computer\'s RAM? Graves, Wayne and Danihelka coupled a neural controller (an LSTM or feedforward net) to a large external memory matrix, with read and write "heads" that access memory through soft, attention-like addressing — making the entire machine differentiable end-to-end.',
        'The addressing is the clever part. Every read/write produces a weighting over *all* memory locations, computed two ways: **content-based** (cosine similarity between a key the controller emits and each stored vector — "find what matches this") and **location-based** (shift/rotate the previous weighting — "go to the next slot"). Blend them, and you get something like differentiable pointers.',
        'Trained purely by gradient descent on input/output pairs, NTMs learned to copy sequences, repeat-copy, and do associative recall — and the learned algorithms *generalized* to lengths far beyond training. The NTM didn\'t become the future (transformers absorbed the memory idea differently), but it proved differentiable computers could be learned, and its addressing scheme is the direct ancestor of attention-based memory everywhere.',
      ],
      stakes: 'differentiable malloc/free: the proof that gradient descent can learn algorithms that use an external memory.',
    },
    eliEngineer: {
      prose: [
        'Think of the controller as a CPU and the memory matrix as a RAM stick. Each cycle, the CPU issues read/write requests — but instead of integer addresses (non-differentiable), every request produces a *probability distribution over all addresses*. A read returns the weighted blend of all cells; a write adds a little to every cell, proportional to the weights.',
        'Blurry access is the price of differentiability: you can\'t `argmax` an address and backprop through it, so you read "mostly cell #7" as 0.9·cell₇ + 0.05·cell₃ + ... and let gradients flow through the weights. During training the network learns to sharpen those weightings until they\'re effectively discrete pointers.',
        'Content addressing is a fuzzy `find(where value ≈ key)`; location addressing is pointer arithmetic (`address++`). Together they let the machine learn data structures: the copy task emerges as "write sequentially with location shifts, then read back the same way".',
      ],
      code: {
        lang: 'python',
        file: 'ntm_heads.py',
        snippet: `# every cycle, the controller emits: key k, strength beta,
# blend gate g, shift s, sharpening gamma. all differentiable.

# 1. content addressing: fuzzy find-by-value
w_c = softmax(beta * cosine_similarity(k, M))     # M = memory matrix

# 2. location addressing: pointer arithmetic on last weights
w_g = g * w_c + (1 - g) * w_prev                  # mix content & location
w = circular_convolve(w_g, s)                     # shift: address +/- 1
w = sharpen(w, gamma)                             # w^gamma / sum(w^gamma)

read_vector = (w[:, None] * M).sum(0)             # blurry read
M = M * (1 - w[:, None] * e) + w[:, None] * a     # erase e, add a

# no discrete addresses anywhere => gradients flow to the whole
# machine. training sharpens w until it's a pointer.`,
      },
    },
    intuitions: [
      {
        title: 'Differentiability means blurry everything',
        body: 'Hard addresses (read cell #7) are discrete and block gradients. The NTM\'s solution: every access touches all cells, weighted. Learning = sharpening the blur into an effective pointer. This is the same softening trick as soft attention — invented here, independently.',
        more: 'Notice the pattern across this track: soft alignment (Bahdanau), soft window (Graves handwriting), soft read order (Order Matters), soft addresses (NTM). "Make it soft so gradients flow" is the era\'s master move.',
      },
      {
        title: 'Content address = fuzzy find; location address = pointer math',
        body: 'Content-based weighting retrieves by *what* is stored (cosine similarity to a key) — like an associative array. Location-based weighting retrieves by *where* (shifting the previous distribution) — like iterating an array. Programs need both; the NTM learns when to use which via the blend gate.',
      },
      {
        title: 'It learned algorithms, not mappings',
        body: 'The copy task result is the proof: trained on sequences up to length 20, the NTM copied length-100 sequences near-perfectly — because it had learned a *procedure* (write sequentially, rewind, read sequentially), not a lookup table. Generalization across length is the signature of an algorithm.',
      },
      {
        title: 'External memory decouples capacity from parameters',
        body: 'An LSTM stores everything in its weights/hidden state — capacity is tied to model size. The NTM\'s memory matrix is storage you can enlarge without adding a single learned parameter: a preview of retrieval-augmented thinking that returned with a vengeance a decade later.',
      },
    ],
    mechanism: {
      latex: 'w_t^c(i) = \\frac{\\exp\\!\\big(\\beta_t\\, K[k_t, M_t(i)]\\big)}{\\sum_j \\exp\\!\\big(\\beta_t\\, K[k_t, M_t(j)]\\big)}, \\qquad r_t = \\sum_i w_t(i)\\, M_t(i)',
      terms: [
        { symbol: 'M_t(i)', meaning: 'memory row i — one stored vector in the RAM matrix' },
        { symbol: 'k_t', meaning: 'the key vector emitted by the controller — what it\'s looking for' },
        { symbol: 'K[k, M(i)]', meaning: 'cosine similarity between key and cell i' },
        { symbol: '\\beta_t', meaning: 'key strength — how sharply to focus (high β ≈ hard pointer)' },
        { symbol: 'w_t(i)', meaning: 'final read/write weight on cell i — a distribution over addresses' },
        { symbol: 'r_t', meaning: 'the read result: blurry weighted blend of all memory rows' },
      ],
      diagram: {
        height: 54,
        nodes: [
          { id: 'io', x: 12, y: 14, label: 'in/out', sub: 'task sequence', kind: 'io', w: 12 },
          { id: 'ctrl', x: 34, y: 14, label: 'controller', sub: 'LSTM / feedforward CPU', kind: 'box', w: 16 },
          { id: 'heads', x: 62, y: 14, label: 'heads', sub: 'emit key, β, gate, shift', kind: 'box', w: 16 },
          { id: 'w', x: 84, y: 14, label: 'w', sub: 'address distribution', kind: 'mem', w: 8 },
          { id: 'm1', x: 74, y: 38, label: 'M₁', kind: 'mem', w: 9 },
          { id: 'm2', x: 84, y: 38, label: 'M₂', kind: 'mem', w: 9 },
          { id: 'm3', x: 94, y: 38, label: 'M₃', kind: 'mem', w: 9 },
        ],
        edges: [
          { from: 'io', to: 'ctrl' },
          { from: 'ctrl', to: 'heads' },
          { from: 'heads', to: 'w' },
          { from: 'w', to: 'm1', label: 'read' },
          { from: 'w', to: 'm2', label: 'write' },
          { from: 'm3', to: 'ctrl', label: 'r_t', dashed: true },
        ],
      },
      caption: 'The NTM: a controller talks to the world and issues read/write requests; heads turn them into soft address distributions over the memory matrix; all of it is differentiable.',
    },
    lab: {
      name: 'memory matrix copy task',
      hint: 'step the machine · watch the write head deposit and the read head retrieve',
      completion: 'run the copy task to completion and toggle both addressing modes',
    },
    bugs: [
      {
        title: 'blurry writes corrupt neighboring cells',
        fix: 'soft weights spread writes across addresses; the erase-add scheme must keep weights sharp enough or memories smear together. training uses β and γ to sharpen — don\'t clamp them.',
      },
      {
        title: 'ntms are not turing-complete in practice',
        fix: 'the name is aspirational: finite memory, learned (not guaranteed) algorithms, and training is famously finicky (curriculum needed). treat it as a proof of concept for learned memory use, not a computer.',
      },
      {
        title: 'external memory ≠ bigger hidden state',
        fix: 'the memory matrix is decoupled from parameters and accessed by content/location, not by fixed weights. adding lstm units does not give you addressable storage — that decoupling is the entire point.',
      },
    ],
    fieldNotes: {
      buildsOn: ['lstm-1997', 'bahdanau-2014'],
      unlocks: ['relational-rnn-2018', 'pointer-networks-2015'],
      further: [
        { label: 'original paper — arXiv:1410.5401', url: 'https://arxiv.org/abs/1410.5401' },
        { label: 'follow-up: differentiable neural computer (dnc) — nature 2016', url: 'https://www.nature.com/articles/nature20101' },
        { label: 'deepmind blog: differentiable neural computers', url: 'https://deepmind.google/discover/blog/' },
      ],
      citation: `@article{graves2014neural,\n  author = {Graves, Alex and Wayne, Greg and Danihelka, Ivo},\n  title = {Neural Turing Machines},\n  journal = {arXiv:1410.5401}, year = {2014},\n  eprint = {1410.5401}, archivePrefix = {arXiv}\n}`,
    },
    quiz: [
      {
        type: 'mcq',
        q: 'Why do NTM read/write heads use soft weightings over all memory locations?',
        options: [
          'Hard addresses are discrete and block gradients; soft weightings keep the whole machine differentiable end-to-end',
          'Soft weightings are cheaper to compute',
          'It increases the memory capacity',
          'To prevent the controller from overfitting',
        ],
        answer: 0,
        why: 'You can\'t backprop through "read cell #7"; you can through 0.9·cell₇ + … . Learning sharpens the blur into a pointer.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Content-based addressing in an NTM works by:',
        options: [
          'Cosine similarity between a controller-emitted key and each memory row, softmaxed into weights',
          'Hashing the key to a bucket index',
          'Sorting the memory rows',
          'A learned permutation matrix',
        ],
        answer: 0,
        why: 'Fuzzy find-by-value: w ∝ exp(β·cos(k, M(i))) — retrieve by *what* is stored.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Location-based addressing provides:',
        options: [
          'Pointer arithmetic: shifting/rotating the previous weighting to move to neighboring addresses',
          'Random access by index',
          'Garbage collection of unused cells',
          'Compression of the memory matrix',
        ],
        answer: 0,
        why: 'Circular shifts of the weighting implement "next slot" / "previous slot" — iteration over memory.',
        tag: 'intuitions',
      },
      {
        type: 'tf',
        q: 'True or false: trained on short sequences, the NTM generalized to copying much longer sequences.',
        answer: true,
        why: 'It learned a procedure (write sequentially, rewind, read back), not a lookup — length generalization is the signature of an algorithm.',
        tag: 'briefing',
      },
      {
        type: 'tf',
        q: 'True or false: enlarging an NTM\'s memory matrix requires adding learned parameters.',
        answer: false,
        why: 'External memory decouples storage capacity from parameter count — a key contrast with LSTM hidden states.',
        tag: 'intuitions',
      },
      {
        type: 'mcq',
        q: 'The NTM write operation:',
        options: [
          'Erases proportionally to the weights, then adds a new vector — both blurry, proportional to w(i) per cell',
          'Overwrites exactly one cell chosen by argmax',
          'Appends a new row to the memory matrix',
          'Averages all rows into one',
        ],
        answer: 0,
        why: 'M ← M·(1 − w·e) + w·a: differentiable erase-add, spread by the address distribution.',
        tag: 'mechanism',
      },
      {
        type: 'mcq',
        q: 'Which modern mechanism is the direct conceptual descendant of NTM addressing?',
        options: [
          'Attention — content-based soft retrieval over a set of vectors',
          'Max pooling',
          'Batch normalization',
          'Weight tying',
        ],
        answer: 0,
        why: 'Soft content-based addressing over memory is attention; the transformer absorbed the memory idea into per-layer key-value lookups.',
        tag: 'field-notes',
      },
    ],
  },
];
