/**
 * Track 5 — Speech, Generative & Scaling (files 028–032):
 * Deep Speech, Variational Lossy Autoencoder, Scaling Laws, GPipe (bonus), MPNN (bonus).
 * Full level content per design/paper.md §6; schema types imported from track3.ts.
 */

import type { PaperContent } from './track3';

export const track5Papers: PaperContent[] = [
  // ---------------------------------------------------------------- FILE 028
  {
    slug: 'deep-speech-2014',
    fileNo: '028',
    title: 'Deep Speech: Scaling up End-to-End Speech Recognition',
    shortTitle: 'Deep Speech',
    authors: 'Hannun, Case, Casper, Catanzaro, Diamos, Elsen, Prenger, Satheesh, Sengupta, Coates, Ng',
    year: 2014,
    venue: 'arXiv 2014 (Baidu Research)',
    sourceUrl: 'https://arxiv.org/abs/1412.5567',
    sourceLabel: 'arXiv:1412.5567',
    track: 5,
    xp: 460,
    difficulty: 4,
    estMinutes: 35,
    hook: 'Speech recognition with the pipeline deleted: audio in, text out.',
    briefing: {
      paragraphs: [
        "Classic speech recognition was a Rube Goldberg pipeline: hand-designed acoustic features (MFCCs) → Gaussian mixtures → hidden Markov models → phoneme dictionaries → language models — each stage tuned by specialists for years, each stage's errors poisoning the next. Deep Speech, from Baidu's Silicon Valley AI Lab in December 2014, replaced the entire contraption with one deep network: spectrogram frames in, characters out, trained end-to-end.",
        "Two ideas carry the paper. Architecturally: a deep recurrent network over spectrogram frames predicting a raw character alphabet — no phonemes, no pronunciation dictionary. Statistically: CTC (connectionist temporal classification) loss, which trains the network to emit characters at the right time WITHOUT ever being told where in the audio each letter falls — it sums over all possible alignments, blanks included.",
        "The system was engineered for scale from day one: thousands of hours of labeled speech (vs a few hundred for academic systems), custom GPU kernels for the recurrent layers, and heavy noise synthesis/augmentation. The result handled accents and noisy environments where pipeline systems crumbled — and set the template for end-to-end everything: delete the pipeline, add data and compute.",
      ],
      stakes: "this was the proof that 'end-to-end + lots of data' beats 'hand-built pipeline + clever features' outside vision — the recipe the whole field then copied.",
    },
    eliEngineer: {
      prose: [
        "The old pipeline was microservices with serialization bugs between every layer: MFCC extraction, GMM acoustic model, HMM decoder, phoneme lexicon, language model — five repos, five teams, five failure modes, each optimized for its own proxy metric. Deep Speech is the monolith rewrite: one network learns the whole mapping, so the gradient of the final transcription error flows into every stage at once. Everything is jointly optimized for the only metric that matters: get the characters right.",
        "The training-label problem is the clever part. Your dataset is (audio clip, transcript) pairs, but the loss needs per-frame targets — and nobody knows which 20ms frames contain the 'k' in 'cat'. CTC solves it like a diff algorithm with wildcards: add a blank token ε, let the network emit any per-frame sequence, then collapse repeats and delete blanks; the loss sums the probability of ALL frame sequences that collapse to the correct transcript. The network discovers the alignment by itself.",
      ],
      code: {
        lang: 'python',
        file: 'ctc.py',
        snippet: `# network emits per-frame char probabilities; B collapses the alignment:
B("c  c  ε  a  a  t")  ==  B("ε  c  a  t  ε  ε")  ==  "cat"
# (merge repeated chars, then drop blanks ε)

def ctc_loss(audio, transcript):           # no frame-level labels needed!
    frames = rnn(spectrogram(audio))       # T frames x alphabet probabilities
    total = 0
    for alignment in all_sequences_that_collapse_to(transcript):
        total += prod(frames[t][alignment[t]] for t in range(T))
    return -log(total)                     # computed exactly by dynamic programming`,
      },
    },
    intuitions: [
      {
        title: 'The pipeline was the bug',
        body: "Multi-stage systems optimize each stage for a proxy metric (acoustic likelihood, phone error rate), not the final transcript, and errors compound through hand-off interfaces that freeze assumptions in place. End-to-end training makes every parameter accountable to the final loss.",
        more: "It also deletes domain friction: no phoneme lexicon means new languages and accents need data, not linguists.",
      },
      {
        title: 'CTC: alignment as a differentiable search',
        body: "With T frames and a label of length L there are exponentially many valid alignments; CTC sums over all of them with a forward-backward dynamic program, turning 'unknown segmentation' into an exact, differentiable loss.",
        more: "The blank ε does double duty: it separates repeated characters (the two l's in 'hello' are l ε l) and gives the network a 'say nothing this frame' output.",
      },
      {
        title: 'Characters are a feature, not a limitation',
        body: "Predicting raw characters skips phonemes and pronunciation dictionaries entirely; spelling and pronunciation quirks become just more data to learn from. The model learns an implicit grapheme-to-sound map inside its weights.",
        more: "A language model can still be layered on top at decode time (beam search) to fix spelling-level slips — the paper's best numbers use one.",
      },
      {
        title: 'Scale is the strategy',
        body: "The paper's quiet headline is engineering: thousands of hours of speech (vs the standard ~300-hour corpora), synthesized noise augmentation, and hand-written GPU kernels to make RNN training fast enough to matter. Accuracy followed the data.",
        more: "This 'performance scales with data + compute' observation is the same curve file 030 turns into a power-law science.",
      },
    ],
    mechanism: {
      latex: "P(y \\mid x) = \\sum_{\\pi \\in \\mathcal{B}^{-1}(y)} \\; \\prod_{t=1}^{T} p(\\pi_t \\mid x_t)",
      terms: [
        { symbol: 'x', meaning: 'input: T frames of spectrogram features' },
        { symbol: 'y', meaning: 'the transcript — the training label, with NO timing information' },
        { symbol: 'π', meaning: 'one possible per-frame alignment: a length-T path through characters and blanks' },
        { symbol: 'B⁻¹(y)', meaning: 'the set of all frame sequences that collapse to y (merge repeats, remove blanks)' },
        { symbol: 'p(π_t | x_t)', meaning: "the network's softmax probability for character/blank π_t at frame t" },
        { symbol: 'Σ Π', meaning: 'sum of path probabilities over all valid alignments; computed exactly by dynamic programming' },
      ],
      diagram: {
        kind: 'ctc-alignment',
        title: 'Deep Speech + CTC data flow',
        nodes: [
          { id: 'spec', label: 'spectrogram frames', sub: '+ context window' },
          { id: 'rnn', label: 'deep RNN', sub: 'feed-forward + recurrent layers, clipped ReLU' },
          { id: 'sm', label: 'per-frame softmax', sub: 'a–z, space, apostrophe, blank ε' },
          { id: 'col', label: 'B-collapse', sub: 'merge repeats, drop ε' },
          { id: 'out', label: '"cat"', sub: 'transcript' },
        ],
        edges: [
          { from: 'spec', to: 'rnn' },
          { from: 'rnn', to: 'sm' },
          { from: 'sm', to: 'col' },
          { from: 'col', to: 'out' },
        ],
        note: 'Show an example emission row "c c ε a a t" above the collapse node with braces marking the merge and the blank deletion.',
      },
      caption: 'CTC turns unsegmented audio into a sum over all alignments that collapse to the transcript — no frame labels needed.',
    },
    lab: {
      id: 'ctc-aligner',
      name: 'ctc alignment lab',
      blurb: 'Scrub a spectrogram while a CTC lattice animates: watch many frame-level paths collapse to the same transcript.',
      controls: [
        { label: 'audio scrubber', kind: 'slider', detail: 'playhead across the spectrogram strip' },
        { label: 'candidate alignments', kind: 'toggle', detail: 'overlay 3 different frame-level paths that collapse to the same word' },
        { label: 'play collapse', kind: 'button', detail: 'animate merging repeats and deleting blanks into the final string' },
        { label: 'blank highlight', kind: 'toggle', detail: 'mark ε frames so their separator role is visible' },
      ],
      stage: 'Top: spectrogram strip with playhead. Middle: per-frame character emissions (peak picks) with blanks highlighted. Bottom: the collapse animation producing the final string, plus a running probability readout summing path masses.',
      hint: 'scrub the audio · toggle the alignments · watch blanks hold repeated letters apart',
      completion: 'scrubbed through the full clip and viewed at least two different alignments collapsing to the same word',
      fallback: 'Static 3-row figure: two alignments → collapse → transcript, with blanks marked.',
    },
    bugs: [
      {
        title: '"CTC needs frame-level timestamps"',
        fix: "That's the point of the loss: only (audio, transcript) pairs are required; alignment is summed over, never given.",
      },
      {
        title: '"blank tokens are padding to delete"',
        fix: 'Blanks separate repeated characters (l-ε-l → "ll", but l-l → "l") and mark "no output this frame"; deleting them blindly mangles double letters.',
      },
      {
        title: '"end-to-end means no language model ever"',
        fix: "The acoustic model is end-to-end, but the paper's best error rates still come from beam-search decoding with an external language model rescoring candidates.",
      },
    ],
    fieldNotes: {
      buildsOn: ['lstm-1997'],
      unlocks: ['gpipe-2018', 'scaling-laws-2020'],
      further: [
        { label: 'Original paper (arXiv:1412.5567)', url: 'https://arxiv.org/abs/1412.5567' },
        { label: 'Deep Speech 2 (arXiv:1512.02595)', url: 'https://arxiv.org/abs/1512.02595' },
        { label: 'CTC: Graves et al. 2006 (DOI 10.1145/1143844.1143891)', url: 'https://doi.org/10.1145/1143844.1143891' },
      ],
      citation: '@article{hannun2014deepspeech, title={Deep speech: Scaling up end-to-end speech recognition}, author={Hannun, Awni and Case, Carl and Casper, Jared and Catanzaro, Bryan and Diamos, Greg and Elsen, Erich and Prenger, Ryan and Satheesh, Sanjeev and Sengupta, Shubho and Coates, Adam and Ng, Andrew Y.}, journal={arXiv:1412.5567}, year={2014} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'What problem does CTC solve?',
        options: [
          'training on (audio, transcript) pairs without frame-level alignment labels, by summing over all valid alignments',
          'compressing audio into fewer frames',
          'translating between languages',
          'removing background noise from recordings',
        ],
        answer: 0,
        why: 'Nobody labels which frames contain each letter; CTC marginalizes over every alignment that collapses to the transcript.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'The blank token ε…',
        options: [
          'separates repeated characters and marks "emit nothing this frame"; it is removed only AFTER repeats are merged',
          'is simple padding with no function',
          'represents unknown words',
          'is the space character',
        ],
        answer: 0,
        why: 'l-ε-l collapses to "ll" while l-l collapses to "l" — blanks are what make repeated characters representable.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'What did Deep Speech replace?',
        options: [
          'the hand-built MFCC → GMM-HMM → phoneme lexicon pipeline with one end-to-end trained network',
          'the microphone hardware',
          'the English language model with a French one',
          'supervised learning with reinforcement learning',
        ],
        answer: 0,
        why: 'Audio features go in, characters come out, one loss — the multi-stage specialist pipeline is deleted.',
        tag: 'S1',
      },
      {
        type: 'tf',
        q: 'Deep Speech predicts phonemes using a hand-built pronunciation dictionary.',
        answer: false,
        why: 'It predicts characters directly — no phonemes, no lexicon. Spelling and pronunciation are learned from data.',
        tag: 'S3',
      },
      {
        type: 'order',
        q: 'Order the Deep Speech data flow.',
        items: [
          'spectrogram frames (with context window)',
          'feed-forward + recurrent layers',
          'per-frame softmax over characters + blank',
          'CTC collapse → transcript',
        ],
        answer: [0, 1, 2, 3],
        why: 'Features → deep RNN → per-frame character probabilities → merge repeats, drop blanks.',
        tag: 'S2',
      },
      {
        type: 'fill',
        q: 'P(y|x) sums path probabilities over all alignments π in ___⁻¹(y).',
        tokens: ['B', 'softmax', 'HMM'],
        answer: ['B'],
        why: 'B is the collapse map (merge repeats, remove blanks); B⁻¹(y) is the set of alignments consistent with transcript y.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'Why predict characters instead of phonemes?',
        options: [
          'no lexicon or phoneme inventory needed; spelling/pronunciation is learned from data; new languages need data, not linguists',
          'characters are faster to compute',
          'phonemes cannot be represented numerically',
          'English has fewer characters than phonemes',
        ],
        answer: 0,
        why: 'Deleting the pronunciation dictionary deletes a whole specialist subsystem and its maintenance cost.',
        tag: 'S2',
      },
      {
        type: 'mcq',
        q: "The paper's scaling strategy was…",
        options: [
          'thousands of hours of data + noise synthesis/augmentation + custom GPU kernels — accuracy follows data scale',
          'a single clean dataset of exactly 300 hours',
          'training on CPUs for reproducibility',
          'hand-labeling frame-level alignments',
        ],
        answer: 0,
        why: 'Deep Speech was built as an engineering system for scale — the same playbook as file 030, five years earlier.',
        tag: 'S1',
      },
    ],
  },
  // ---------------------------------------------------------------- FILE 029
  {
    slug: 'vlae-2016',
    fileNo: '029',
    title: 'Variational Lossy Autoencoder',
    shortTitle: 'VLAE',
    authors: 'Chen, Kingma, Salimans, Duan, Dhariwal, Schulman, Sutskever, Abbeel',
    year: 2016,
    venue: 'ICLR 2017',
    sourceUrl: 'https://arxiv.org/abs/1611.02731',
    sourceLabel: 'arXiv:1611.02731',
    track: 5,
    xp: 460,
    difficulty: 4,
    estMinutes: 35,
    hook: 'An autoencoder that keeps the meaning and lossy-compresses the texture.',
    briefing: {
      paragraphs: [
        "The variational autoencoder promised generative modeling with a clean latent space: encode x into a distribution q(z|x), sample z, decode p(x|z), and train by maximizing the ELBO — reconstruction quality balanced against a KL penalty keeping the code close to a simple prior. But researchers kept hitting a catch: pair a VAE with a very powerful decoder — an autoregressive PixelCNN that predicts pixels one by one — and the decoder learns to generate fine images while IGNORING z entirely. The latent code, the whole point, goes unused.",
        "VLAE (OpenAI, 2016) flips the problem into a design principle: if the decoder will model everything it can, then decide what it CAN'T model and force exactly that into z. Make the code lossy on purpose — restrict the information z can carry so it captures only global structure (a face's pose, lighting, identity), while the autoregressive decoder paints the local texture it was going to model anyway.",
        "The result is a generative model whose latent space actually means something: moving in z changes high-level features while low-level detail re-randomizes sensibly, with better samples than plain VAEs of the era. This 'who models what' division of labor — semantic code plus powerful local decoder — previews modern hierarchies from VQ-VAE to the latent spaces of diffusion models.",
      ],
      stakes: "a latent variable your decoder ignores is a storage bill with no benefit. VLAE shows how to design what the code must remember.",
    },
    eliEngineer: {
      prose: [
        "A VAE is a compression protocol: the encoder writes a lossy summary z (a distribution, not a point — think 'mean plus error bars'), the decoder reconstructs the file, and the KL term is a bitrate cap forcing z to stay within a standard-normal envelope — literally an MDL bit budget (file 027) on the latent code. Gradients can't flow through sampling, so the reparameterization trick routes them around it: z = μ + σ·ε with ε ~ N(0,1) as external noise.",
        "Now hire a decoder that is TOO good: a PixelCNN that predicts each pixel from its predecessors can model images without reading z at all — like a zip implementation that ignores your archive comment and recompresses from scratch. VLAE's fix is deliberate sabotage-by-design: limit what z can express (constrain its capacity, inject noise, choose its dimensionality) so the ONLY way to cut reconstruction loss on global structure is to route that information through z. Global semantics get a reserved channel; texture stays with the autoregressive painter.",
      ],
      code: {
        lang: 'python',
        file: 'vlae.py',
        snippet: `# VAE forward pass (reparameterized so gradients flow)
mu, sigma = encoder(x)                 # code distribution, not a point
z = mu + sigma * randn_like(sigma)     # sample via external noise
x_hat = pixelcnn_decoder(z)            # autoregressive: very strong local model

# ELBO = reconstruction - KL penalty   (maximize)
loss = -log p(x | z) + KL(q(z|x) || N(0, I))
#                    ^ the MDL "model bits" for the latent code (see file 027)

# VLAE twist: deliberately restrict z's capacity (lossy by design)
#  -> decoder can't lean on z for details, so z carries global structure only`,
      },
    },
    intuitions: [
      {
        title: 'The ELBO is a two-line invoice',
        body: "Reconstruction term: pay for every pixel you get wrong. KL term: pay for every bit your code deviates from the standard-normal prior. Training balances fidelity against code cost — exactly the error-bits vs model-bits trade of MDL (file 027).",
        more: "Maximize the ELBO ⇔ minimize the total description length of the data under the model; the two papers are dialects of one idea.",
      },
      {
        title: 'Sampling needs a reparameterization detour',
        body: "Gradients can't pass through 'draw z from q'. Move the randomness to an input: z = μ(x) + σ(x)⊙ε with ε ~ N(0,1). Now μ and σ are ordinary differentiable outputs and ε is just noise data — backprop restored.",
        more: "This 2013 trick is what made VAEs trainable by plain SGD, and its relatives (Gumbel-softmax et al.) keep recurring across generative modeling.",
      },
      {
        title: 'A powerful decoder will ghost your latent',
        body: "PixelCNN decodes pixel-by-pixel with full access to preceding pixels, so it can reach low reconstruction loss with z unplugged; the KL term then cheerfully drives q(z|x) to the prior and the code carries nothing. The model generates well and learns nothing you can steer.",
        more: "The diagnosis is posterior collapse — KL(q‖p) ≈ 0, samples ignore z. VLAE treats it as a capacity-allocation bug, not a training failure.",
      },
      {
        title: 'Lossy by design',
        body: "VLAE constrains the code (limiting the information q(z|x) can transmit) so global factors are the cheapest thing for z to carry — identity, pose, lighting — while pixel noise stays with the decoder. You choose the compression ratio of MEANING.",
        more: "The payoff is controllable generation: sweep one latent dimension and the face rotates while skin texture resamples naturally.",
      },
    ],
    mechanism: {
      latex: "\\log p(x) \\ge \\mathbb{E}_{q(z|x)}\\bigl[\\log p(x \\mid z)\\bigr] - D_{KL}\\bigl(q(z \\mid x) \\,\\|\\, p(z)\\bigr)",
      terms: [
        { symbol: 'q(z|x)', meaning: 'encoder: posterior distribution over codes for this input (Gaussian with learned μ, σ)' },
        { symbol: 'p(x|z)', meaning: "decoder: likelihood of the data given a code — VLAE's is an autoregressive PixelCNN" },
        { symbol: 'E[log p(x|z)]', meaning: 'reconstruction term: how well samples from the code rebuild x' },
        { symbol: 'D_KL(q‖p)', meaning: 'KL penalty: the description-length cost of the code against the prior' },
        { symbol: 'p(z)', meaning: 'prior over codes, standard normal: the codebook envelope the KL anchors to' },
        { symbol: '≥', meaning: 'the ELBO lower-bounds true data likelihood; maximizing it pushes p(x) up' },
      ],
      diagram: {
        kind: 'vlae-arch',
        title: 'VLAE architecture',
        nodes: [
          { id: 'x', label: 'image x' },
          { id: 'enc', label: 'encoder CNN', sub: '→ μ, σ' },
          { id: 'z', label: 'z = μ + σε', sub: 'lossy channel: global structure only' },
          { id: 'dec', label: 'PixelCNN decoder', sub: 'local texture lives here' },
          { id: 'xh', label: 'x̂ / samples' },
        ],
        edges: [
          { from: 'x', to: 'enc' },
          { from: 'enc', to: 'z' },
          { from: 'z', to: 'dec' },
          { from: 'dec', to: 'xh' },
        ],
        note: 'Annotate the z node with a narrow-pipe glyph ("capacity limited on purpose") and the decoder with "autoregressive: models p(pixel | previous pixels)".',
      },
      caption: 'Encode to a distribution, sample via the reparameterization trick, decode with a PixelCNN. VLAE narrows the z channel so it must carry global structure.',
    },
    lab: {
      id: 'latent-walk',
      name: 'latent space walk',
      blurb: 'Drag a point through a 2D latent space and watch a shape decode live; tighten the KL slider to see the latent cloud collapse toward the prior.',
      controls: [
        { label: 'latent plane', kind: 'canvas', detail: 'drag the z crosshair through the 2D code space' },
        { label: 'KL weight β', kind: 'slider', detail: '0 → 2: loosen or tighten the code budget' },
        { label: 'decode', kind: 'button', detail: 'render the procedural shape at the current z' },
        { label: 'latent cloud', kind: 'toggle', detail: 'overlay the training codes q(z) against the N(0,1) prior contours' },
      ],
      stage: 'Left: latent plane with standard-normal prior contours and the scattered training cloud; draggable crosshair. Right: the decoded procedural shape morphing smoothly as z moves. At β→0 the cloud sprawls and reconstruction sharpens; at high β the cloud collapses and outputs blur.',
      hint: 'drag z around the plane · slide the KL weight · watch structure vs fidelity trade',
      completion: 'dragged z through at least three regions and swept the KL slider across its range',
      fallback: 'Static 3×3 grid of decodes from a latent lattice, plus a caption on the KL/prior cloud.',
    },
    bugs: [
      {
        title: '"posterior collapse means the model failed"',
        fix: "KL→0 with ignored z is a design outcome: the decoder doesn't need the code. VLAE's answer isn't a bugfix but an allocation — make z the only channel for global information.",
      },
      {
        title: '"the KL term is just a regularizer to shrink"',
        fix: "It's the code's bit budget; anneal it to 0 and you get sharp reconstructions but a prior-inconsistent latent space — sampling z ~ N(0,1) decodes garbage.",
      },
      {
        title: '"z = μ + σε is a hack to avoid learning σ"',
        fix: 'Reparameterization is what makes the pipeline differentiable — randomness moves to an input node so μ and σ receive gradients through every sample.',
      },
    ],
    fieldNotes: {
      buildsOn: ['mdl-1993', 'graves-handwriting-2013'],
      unlocks: ['scaling-laws-2020'],
      further: [
        { label: 'Original paper (arXiv:1611.02731)', url: 'https://arxiv.org/abs/1611.02731' },
        { label: 'The original VAE: Kingma & Welling (arXiv:1312.6114)', url: 'https://arxiv.org/abs/1312.6114' },
        { label: 'PixelRNN/PixelCNN (arXiv:1601.06759)', url: 'https://arxiv.org/abs/1601.06759' },
      ],
      citation: '@inproceedings{chen2017vlae, title={Variational lossy autoencoder}, author={Chen, Xi and Kingma, Diederik P. and Salimans, Tim and Duan, Yan and Dhariwal, Prafulla and Schulman, John and Sutskever, Ilya and Abbeel, Pieter}, booktitle={ICLR}, year={2017} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'The two terms of the ELBO are…',
        options: [
          'expected reconstruction log-likelihood minus KL(q(z|x) ‖ prior) — fidelity vs code cost',
          'precision and recall',
          'generator loss and discriminator loss',
          'mean and variance of the prior',
        ],
        answer: 0,
        why: 'E[log p(x|z)] rewards reconstruction; the KL term charges the code for deviating from the standard-normal prior.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'The reparameterization trick…',
        options: [
          'writes z = μ + σ⊙ε with ε ~ N(0,1): randomness becomes an input, so gradients reach μ and σ',
          'replaces sampling with the argmax',
          'detaches the encoder from the graph',
          'quantizes z to integers',
        ],
        answer: 0,
        why: 'Backprop cannot flow through a sampling node; moving the noise outside keeps the whole pipeline differentiable.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'Why does a PixelCNN decoder tend to ignore z?',
        options: [
          'it models p(x) autoregressively from preceding pixels alone; reconstruction is achievable without the code (posterior collapse)',
          'z has the wrong dimensionality',
          'the KL term is too large by default',
          'PixelCNN cannot accept conditioning inputs',
        ],
        answer: 0,
        why: 'A strong enough local model needs no global hints — the KL term then shrinks q(z|x) to the prior and the code empties.',
        tag: 'S3',
      },
      {
        type: 'mcq',
        q: "VLAE's fix is to…",
        options: [
          'make the code deliberately lossy/capacity-limited so z carries only global structure while the decoder owns local detail',
          'remove the decoder entirely',
          'train without the reconstruction term',
          'use a uniform prior instead of Gaussian',
        ],
        answer: 0,
        why: 'Lossy-by-design: the only way to reduce reconstruction loss on global features is to route them through z.',
        tag: 'S1',
      },
      {
        type: 'tf',
        q: 'Setting the KL weight to zero leaves a clean, samplable standard-normal latent space.',
        answer: false,
        why: 'Without the KL pull toward the prior, codes sprawl arbitrarily; sampling z ~ N(0,1) then decodes nonsense.',
        tag: 'S3',
      },
      {
        type: 'order',
        q: 'Order a VAE forward pass.',
        items: [
          'encode x → μ, σ',
          'sample z = μ + σε (ε ~ N(0,1))',
          'decode p(x|z)',
          'loss = −log p(x|z) + KL(q‖p)',
        ],
        answer: [0, 1, 2, 3],
        why: 'Encode to a distribution → reparameterized sample → decode → ELBO.',
        tag: 'S2',
      },
      {
        type: 'fill',
        q: 'ELBO = E_q[log p(x|z)] − ___',
        tokens: ['KL(q(z|x) ‖ p(z))', 'H(x)', 'log q(z|x)'],
        answer: ['KL(q(z|x) ‖ p(z))'],
        why: 'The KL divergence from posterior to prior is the code cost — the second line of the invoice.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'In MDL terms (file 027), the KL term is…',
        options: [
          'the description-length (bits) cost of the latent code under the prior codebook',
          'the entropy of the image pixels',
          'the learning-rate schedule',
          'a measure of decoder depth',
        ],
        answer: 0,
        why: 'Both papers are compression accounting: bits for the code, bits for the reconstruction error.',
        tag: 'S2',
      },
    ],
  },
  // ---------------------------------------------------------------- FILE 030
  {
    slug: 'scaling-laws-2020',
    fileNo: '030',
    title: 'Scaling Laws for Neural Language Models',
    shortTitle: 'Scaling Laws',
    authors: 'Kaplan, McCandlish, Henighan, Brown, Chess, Child, Gray, Radford, Wu, Amodei',
    year: 2020,
    venue: 'arXiv 2020 (OpenAI)',
    sourceUrl: 'https://arxiv.org/abs/2001.08361',
    sourceLabel: 'arXiv:2001.08361',
    track: 5,
    xp: 500,
    difficulty: 4,
    estMinutes: 40,
    hook: 'Loss falls as a power law. The future became a chart you could extrapolate.',
    briefing: {
      paragraphs: [
        "Before 2020, 'should I train a bigger model?' was answered with vibes. Kaplan et al. answered with physics: across seven orders of magnitude, language-model test loss is a smooth power law in model size N, dataset size D, and compute C — straight lines on log-log plots with no architecture-dependent wobble. Performance wasn't a mystery locked in the right hyperparameters; it was a resource curve you could extrapolate before spending a dollar.",
        "The practical laws: larger models are MORE sample-efficient — they extract more signal per token. When compute is fixed, the loss-optimal allocation is to train a big model and stop it well before convergence rather than grind a small model to its floor. And the fitted exponents (α_N ≈ 0.076, α_D ≈ 0.095, α_C ≈ 0.050) quantify how steeply each axis pays off: parameters cheap, data expensive, compute slowest of all.",
        "The caveats aged interestingly: the paper's compute-optimal recipe favored params over data (N ∝ C^0.73, D ∝ C^0.27), which Chinchilla (2022) later revised toward balanced scaling — modern LLMs train on far more tokens per parameter than Kaplan prescribed. But the core discovery stands and runs the industry: loss is predictable, so you can plan. GPT-3-scale bets were placed on these lines.",
      ],
      stakes: "this paper turned 'scale' from an act of faith into an engineering discipline — budgets, exponents, and predictions you can check before you burn a million GPU-hours.",
    },
    eliEngineer: {
      prose: [
        "A power law L(N) = (N_c/N)^α is what 'diminishing returns with no ceiling' looks like: every 10× of parameters buys the same multiplicative drop in loss, indefinitely, within the measured regime. On log-log axes that is a straight line — so you fit it with cheap 10⁶-parameter models and read off the expected loss at 10¹⁰. This is not curve-fitting nostalgia: the paper validates extrapolations across scales, which is exactly what made billion-dollar training runs plannable.",
        "The sample-efficiency result is the sleeper insight: big models learn more per token. Under a fixed compute budget C ≈ 6·N·D (FLOPs ≈ 6 × params × tokens) you are choosing a point on a trade-off curve — and the 2020 optimum is a model large enough that you must early-stop it. Undertrained giant beats converged dwarf. Chinchilla's later re-measurement shifts the optimum toward more data — same game, updated coefficients.",
      ],
      code: {
        lang: 'python',
        file: 'scaling_laws.py',
        snippet: `def L(N):                               # loss vs non-embedding params
    return (N_c / N) ** alpha_N         # a straight line on log-log axes

# paper's fits (approx):  alpha_N ≈ 0.076, alpha_D ≈ 0.095, alpha_C ≈ 0.050

# fixed compute budget C ≈ 6 * N * D  ->  how to split it?
# Kaplan 2020:  N ∝ C^0.73,  D ∝ C^0.27   (big model, stop early)
# Chinchilla 2022 update: N ∝ C^0.5, D ∝ C^0.5 (scale data ~equally)

# sample efficiency: larger models reach a target loss with FEWER tokens,
# so under a token or compute crunch, size is an efficiency technology`,
      },
    },
    intuitions: [
      {
        title: 'A straight line on log-log is a law',
        body: "L = (N_c/N)^α ⟺ log L = α·(log N_c − log N): linear in log-space. That the SAME line holds across ~7 orders of magnitude and across depth/width variations is why people call it a law rather than a fit.",
        more: "The lines show no floor within the regime — 'loss keeps paying for scale' — which is precisely what an industry deciding on GPU fleets wanted to hear.",
      },
      {
        title: 'Big models are sample-efficient',
        body: "A 10× bigger model reaches the same loss with meaningfully fewer tokens and optimization steps; capacity buys extraction efficiency, not just a higher ceiling. Data spent on a small model is partly wasted.",
        more: "This inverts folk intuition ('big models need big data to work at all') — they need big compute to be TRAINED, but they learn more per example.",
      },
      {
        title: 'Compute-optimal ≠ converged',
        body: "With C fixed, pushing a small model to convergence burns FLOPs squeezing its tiny ceiling; the loss-optimal plan trains a much larger model on fewer tokens and stops early. 'Undertrained' is a budget strategy, not a failure.",
        more: "The paper derives N ∝ C^0.73, D ∝ C^0.27; Chinchilla's re-analysis (with better LR schedules) moves the frontier to roughly balanced scaling. The method survives; coefficients get revised.",
      },
      {
        title: 'Architecture matters less than budget',
        body: "Within a broad range, depth/width/aspect-ratio variations slide models along the same loss-vs-N curve instead of off it; the scarce resource is scale itself.",
        more: "Caveat: this holds for reasonable transformer shapes — at extremes (depth ≫ width, tiny context) shape bites back. Tune budget first, shape second.",
      },
    ],
    mechanism: {
      latex: "L(N) = \\Bigl(\\frac{N_c}{N}\\Bigr)^{\\alpha_N}, \\qquad \\alpha_N \\approx 0.076",
      terms: [
        { symbol: 'L', meaning: 'test cross-entropy loss of the trained language model' },
        { symbol: 'N', meaning: 'non-embedding parameter count (embeddings excluded — they scale with vocab, not compute)' },
        { symbol: 'N_c', meaning: 'fit constant (~8.8×10¹³ params): the scale at which L ≈ 1 nat' },
        { symbol: 'α_N', meaning: 'the power-law exponent: 0.076 means each 10× of params buys a fixed multiplicative loss drop' },
        { symbol: 'log-log', meaning: 'the axes where the law becomes a straight line you can fit small and extrapolate large' },
      ],
      diagram: {
        kind: 'scaling-curves',
        title: 'Three resources, three straight lines',
        nodes: [
          { id: 'ln', label: 'L(N)', sub: 'slope −0.076' },
          { id: 'ld', label: 'L(D)', sub: 'slope −0.095' },
          { id: 'lc', label: 'L(C)', sub: 'slope −0.050' },
        ],
        edges: [],
        note: 'Draw one log-log plane with three descending straight lines (loss vs N, D, C) with labeled slopes; add a dashed compute-optimal frontier curve beneath.',
      },
      caption: 'Loss vs parameters, data, and compute are clean power laws — straight lines on log-log axes, fittable on small runs and extrapolable to large ones.',
    },
    lab: {
      id: 'power-law-playground',
      name: 'power-law playground',
      blurb: 'Slide parameters, data, and compute on a log-log chart and watch predicted loss fall along the power-law lines — find the compute-optimal frontier yourself.',
      controls: [
        { label: 'log N (params)', kind: 'slider', detail: '10⁶ → 10¹¹' },
        { label: 'log D (tokens)', kind: 'slider', detail: '10⁸ → 10¹²' },
        { label: 'compute constraint', kind: 'toggle', detail: 'lock C ≈ 6ND: moving N re-balances D automatically' },
        { label: 'coefficients', kind: 'toggle', detail: 'Kaplan 2020 / Chinchilla 2022 allocation rules' },
        { label: 'frontier', kind: 'toggle', detail: 'overlay the compute-optimal frontier line' },
      ],
      stage: 'Log-log canvas with the fitted loss lines; sliders move a "your run" marker with a live predicted-loss readout; with the constraint on, moving N auto-adjusts D to keep C fixed, and the frontier shows the loss-optimal N for each budget.',
      hint: 'drag N up 10× · toggle the compute constraint · compare Kaplan vs Chinchilla allocations',
      completion: 'swept all three sliders and enabled the compute constraint at least once',
      fallback: 'Static log-log chart with the three power-law lines and the frontier marked.',
    },
    bugs: [
      {
        title: '"power laws mean bigger is always optimal"',
        fix: 'They hold within the measured regime and for LOSS — not necessarily downstream accuracy, emergent behaviors, or economics (inference cost of a huge model may dominate).',
      },
      {
        title: '"the 2020 exponents are settled physics"',
        fix: 'Chinchilla (2022) re-measured with better LR schedules and shifted the recipe toward ~equal scaling of params and tokens; treat exponents as empirical fits that get revised.',
      },
      {
        title: '"architecture search is dead"',
        fix: 'The paper shows weak shape dependence within a reasonable range (sane transformer aspect ratios); data quality, context length, and training stability still differentiate real systems.',
      },
    ],
    fieldNotes: {
      buildsOn: ['transformer-2017', 'adam-2014'],
      unlocks: ['gpipe-2018', 'mpnn-2017'],
      further: [
        { label: 'Original paper (arXiv:2001.08361)', url: 'https://arxiv.org/abs/2001.08361' },
        { label: 'Chinchilla: Training Compute-Optimal LLMs (arXiv:2203.15556)', url: 'https://arxiv.org/abs/2203.15556' },
      ],
      citation: '@article{kaplan2020scaling, title={Scaling laws for neural language models}, author={Kaplan, Jared and McCandlish, Sam and Henighan, Tom and Brown, Tom B. and Chess, Benjamin and Child, Rewon and Gray, Scott and Radford, Alec and Wu, Jeffrey and Amodei, Dario}, journal={arXiv:2001.08361}, year={2020} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'A power law L(N) = (N_c/N)^α looks like what on log-log axes?',
        options: [
          'a straight line with slope −α — fittable on small models, extrapolable to large ones',
          'a parabola',
          'an S-curve saturating at zero loss',
          'random scatter',
        ],
        answer: 0,
        why: 'log L = α·(log N_c − log N): linear in logs. That is what makes small-scale fits predictive at large scale.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: "'Larger models are more sample-efficient' means…",
        options: [
          'they reach a given loss with fewer tokens/optimization steps than smaller models',
          'they need fewer parameters',
          'they train without data',
          'they are cheaper to host',
        ],
        answer: 0,
        why: 'Capacity buys extraction efficiency: more signal per token, which is why undertrained giants beat converged dwarfs on fixed compute.',
        tag: 'S3',
      },
      {
        type: 'mcq',
        q: 'Compute-optimal training (per the 2020 paper) is…',
        options: [
          'train a large model on fewer tokens and stop early, rather than converging a small model',
          'always train to convergence',
          'train the smallest model that fits in memory',
          'maximize tokens per parameter at all costs',
        ],
        answer: 0,
        why: 'On a fixed budget C ≈ 6ND, the loss-optimal point is a big model stopped well before convergence.',
        tag: 'S3',
      },
      {
        type: 'tf',
        q: 'The paper claims architecture shape (depth vs width) strongly changes loss at fixed parameter count.',
        answer: false,
        why: 'Within a broad range of reasonable shapes, models lie on the same loss-vs-N curve; budget dominates shape.',
        tag: 'S6',
      },
      {
        type: 'mcq',
        q: 'Which exponents did the paper fit?',
        options: [
          'α_N ≈ 0.076 (params), α_D ≈ 0.095 (data), α_C ≈ 0.050 (compute)',
          'α_N ≈ 0.5 for all three',
          'α_N ≈ 1.0 (linear returns)',
          'α_D ≈ 0.001 (data barely matters)',
        ],
        answer: 0,
        why: 'Roughly: 10× params ≈ 16% loss drop, 10× data ≈ 20%, 10× compute ≈ 11% — multiplicatively, per decade.',
        tag: 'S1',
      },
      {
        type: 'order',
        q: 'Order the workflow of planning a training run with scaling laws.',
        items: [
          'fit power laws on small, cheap runs',
          'choose a compute budget C',
          'allocate N and D per the compute-optimal frontier',
          'train the big model (stop early) with the extrapolated loss as the prediction',
        ],
        answer: [0, 1, 2, 3],
        why: 'Measure small → budget → allocate per the frontier → the big run is a confirmation, not a gamble.',
        tag: 'S2',
      },
      {
        type: 'fill',
        q: "The paper's compute accounting: C ≈ 6 · N · ___.",
        tokens: ['D', 'L', 'α'],
        answer: ['D'],
        why: 'FLOPs per token ≈ 6 × parameters (forward + backward), so total compute ≈ 6·N·D.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'What did Chinchilla (2022) change?',
        options: [
          're-measured scaling and shifted the compute-optimal split toward ~equal growth of params and tokens — more data than Kaplan prescribed',
          'disproved power laws entirely',
          'showed loss stops improving at 1B parameters',
          'proved architecture shape dominates scale',
        ],
        answer: 0,
        why: 'Same method, better protocol (LR schedule among other fixes): modern LLMs train far more tokens per parameter than the 2020 recipe.',
        tag: 'S6',
      },
    ],
  },
  // ---------------------------------------------------------------- FILE 031
  {
    slug: 'gpipe-2018',
    fileNo: '031',
    title: 'GPipe: Easy Scaling with Micro-Batch Pipeline Parallelism',
    shortTitle: 'GPipe',
    authors: 'Huang, Cheng, Bapna, Firat, Chen, Chen, Lee, Ngiam, Le, Wu, Chen',
    year: 2018,
    venue: 'NeurIPS 2019',
    sourceUrl: 'https://arxiv.org/abs/1811.06965',
    sourceLabel: 'arXiv:1811.06965',
    track: 5,
    bonus: true,
    xp: 380,
    difficulty: 3,
    estMinutes: 25,
    hook: 'One model too big for one GPU? Slice it like an assembly line.',
    briefing: {
      paragraphs: [
        "By 2018 the scaling story (file 030) was clear, but the hardware lagged: accelerators have fixed memory, and data parallelism — every device holds the whole model and splits the batch — stops helping the moment the model itself doesn't fit on one device. GPipe productionized the alternative: model parallelism as an assembly line. Partition the L layers across K accelerators and stream the computation through them.",
        "Naive pipelining has a catch: with one batch in flight, accelerator 2 idles while accelerator 1 works — the pipeline 'bubble' — so expensive hardware sits mostly empty. GPipe's fix: split each mini-batch into M micro-batches that flow through back-to-back, keeping all K stages busy; the idle fraction drops to roughly (K−1)/(M+K−1). Gradients accumulate across micro-batches and apply once per mini-batch, so training semantics stay synchronous — mathematically the same update as a single-device run.",
        "Memory gets the same treatment via re-materialization: instead of storing every layer's activations for the backward pass, store only the boundaries between pipeline stages and RECOMPUTE the rest during backprop — a clean compute-for-memory trade. GPipe trained a 557M-parameter AmoebaNet to 84.3% top-1 ImageNet accuracy and multi-billion-parameter translation models: the blueprint for pod-scale training in the LLM era.",
      ],
      stakes: "every frontier model today trains on pipeline parallelism or its descendants; this is the paper that made 'too big for one chip' a solved problem.",
    },
    eliEngineer: {
      prose: [
        "Think CPU instruction pipelines: one instruction at a time leaves the fetch/decode/execute units idle; interleave many instructions and every stage stays busy. GPipe is that, with accelerators as stages and micro-batches as instructions. The mini-batch — the unit of one gradient update — is chopped into M micro-batches that queue through the K stage-devices; once the pipe fills, utilization approaches 1 − (K−1)/(M+K−1).",
        "The correctness trick: although micro-batches race through the pipe, optimizer semantics don't change — gradients from all M micro-batches are accumulated and applied in ONE synchronous step, so the math matches a single-device run (with a caveat for batchnorm statistics, computed per micro-batch and corrected at the end of the step). Re-materialization is the classic space/time trade: don't cache activations; recompute them during the backward pass from the stage boundary.",
      ],
      code: {
        lang: 'python',
        file: 'gpipe.py',
        snippet: `# K accelerators hold consecutive layer slices; M micro-batches flow through
for mb in split(mini_batch, M):
    for stage in range(K):                     # forward: fills the pipe
        mb.acts[stage+1] = stages[stage].forward(mb.acts[stage])
for mb in reversed(micro_batches):             # backward: drains the pipe
    mb.grads = backward(mb)                    # activations recomputed on the fly
optimizer.step(accumulate(all_grads))          # ONE synchronous update per mini-batch

# bubble (idle) fraction ≈ (K - 1) / (M + K - 1)   ->  small when M >> K
# re-materialization: keep only stage-boundary activations,
#                     recompute the rest in backward (compute up, memory way down)`,
      },
    },
    intuitions: [
      {
        title: 'The pipeline bubble',
        body: "Filling and draining the pipe leaves stages idle: with K stages and M micro-batches, the bubble is the (K−1) fill/drain steps against (M+K−1) total — so the idle fraction vanishes as M grows. Rule of thumb: M ≥ 4K makes overhead single-digit percent.",
        more: "Same fill/drain math as CPU pipelines; later work (1F1B schedules, interleaved stages) attacks the residual bubble directly.",
      },
      {
        title: 'Micro-batching ≠ changing the batch size',
        body: "The optimizer still sees the full mini-batch: gradients accumulate across all M micro-batches and apply once. You get pipeline utilization without altering training dynamics or convergence semantics.",
        more: "Batchnorm is the one wrinkle: per-micro-batch statistics differ from full-batch ones — GPipe notes the discrepancy and corrects the statistics at the end of each step.",
      },
      {
        title: 'Re-materialization: compute is cheap, memory is gold',
        body: "Storing all intermediate activations for backprop is what actually OOMs giant models. Keeping only K stage-boundary checkpoints and recomputing each stage's internals during backward slashes memory — at the known cost of extra forward compute.",
        more: "The same trick, rebranded 'activation/gradient checkpointing', is standard in every modern trainer (torch.utils.checkpoint) even on a single device.",
      },
      {
        title: 'Partition by layers, not by tensors',
        body: "GPipe's split is coarse: consecutive layers live on the same device, minimizing cross-device chatter to boundary activations. Within-layer (tensor) parallelism — splitting individual matmuls — is the complementary axis (Megatron-style) that modern stacks mix with pipelines.",
        more: "Balance matters: the slowest stage sets the clock, so layers are allocated to equalize per-stage compute — like balancing an assembly line.",
      },
    ],
    mechanism: {
      latex: "\\text{bubble fraction} \\approx \\frac{K - 1}{M + K - 1}",
      terms: [
        { symbol: 'K', meaning: 'pipeline stages (accelerators), each holding a contiguous slice of layers' },
        { symbol: 'M', meaning: 'micro-batches per mini-batch: the "instructions" keeping the pipe full' },
        { symbol: 'K−1', meaning: 'fill/drain steps where some stage idles — the bubble' },
        { symbol: 'M+K−1', meaning: 'total steps to push M micro-batches through K stages' },
        { symbol: '≈', meaning: 'assumes balanced stages; uneven partitions enlarge the bubble' },
      ],
      diagram: {
        kind: 'gpipe-gantt',
        title: 'The GPipe schedule (K=4, M=4)',
        nodes: [
          { id: 'a1', label: 'accel 1', sub: 'layers 1..L/4' },
          { id: 'a2', label: 'accel 2' },
          { id: 'a3', label: 'accel 3' },
          { id: 'a4', label: 'accel 4' },
        ],
        edges: [
          { from: 'a1', to: 'a2', label: 'activations' },
          { from: 'a2', to: 'a3' },
          { from: 'a3', to: 'a4' },
        ],
        note: 'Draw the classic Gantt: forward blocks F(m1..m4) stair-step right across the 4 device rows, then backward blocks B(m4..m1) stair back; shade the triangular idle regions as bubbles.',
      },
      caption: 'Forward micro-batches fill the pipeline, backward passes drain it. Shaded triangles are bubble idle time — more micro-batches, smaller fraction.',
    },
    lab: {
      id: 'pipeline-gantt',
      name: 'pipeline gantt lab',
      blurb: 'Animate micro-batches flowing through 4 accelerators on a Gantt timeline; crank the micro-batch count and watch the bubble shrink.',
      controls: [
        { label: 'micro-batches M', kind: 'slider', detail: '1 → 16' },
        { label: 'stages K', kind: 'slider', detail: '2 → 8 accelerators' },
        { label: 'run schedule', kind: 'button', detail: 'animate forward fill + backward drain' },
      ],
      stage: 'A Gantt chart: rows = accelerators, columns = time; forward blocks fill diagonally, backward blocks drain back, idle cells shaded red (bubble). A readout shows bubble % and speedup vs sequential, live-verifying (K−1)/(M+K−1).',
      hint: 'run with M=1, then M=16 · change K · watch the red triangles shrink',
      completion: 'ran the schedule at M=1 and at M ≥ 4K once, observing the bubble fraction drop',
      fallback: 'Static Gantt figures with M=2 and M=8 side by side, bubble regions shaded.',
    },
    bugs: [
      {
        title: '"pipelining changes the training math"',
        fix: 'Micro-batches only change SCHEDULING: gradients accumulate over all M and apply in one synchronous step — same update as single-device (batchnorm statistics being the one caveat).',
      },
      {
        title: '"more micro-batches is always free"',
        fix: 'Very small micro-batches underutilize each device\'s kernels and inflate per-step overhead; M is tuned (rule of thumb ≳ 4K), not maximized.',
      },
      {
        title: '"model parallelism replaces data parallelism"',
        fix: 'They compose: pipelines shard the MODEL across stages; data parallelism replicates the whole pipeline across batch shards. Large runs use both (plus tensor parallelism).',
      },
    ],
    fieldNotes: {
      buildsOn: ['resnet-2015', 'scaling-laws-2020'],
      unlocks: [],
      further: [
        { label: 'Original paper (arXiv:1811.06965)', url: 'https://arxiv.org/abs/1811.06965' },
        { label: 'Google AI Blog: Introducing GPipe', url: 'https://ai.googleblog.com/2019/03/introducing-gpipe-open-source-library.html' },
      ],
      citation: '@inproceedings{huang2019gpipe, title={GPipe: Easy scaling with micro-batch pipeline parallelism}, author={Huang, Yanping and Cheng, Youlong and Bapna, Ankur and Firat, Orhan and Chen, Dehao and Chen, Mia Xu and Lee, HyoukJoong and Ngiam, Jiquan and Le, Quoc V. and Wu, Yonghui and Chen, Zhifeng}, booktitle={NeurIPS}, year={2019} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'What problem does GPipe solve?',
        options: [
          'models too big for one accelerator: partition layers across devices and pipeline micro-batches through',
          'overfitting on small datasets',
          'slow tokenization',
          'GPU driver incompatibility',
        ],
        answer: 0,
        why: 'When the model itself exceeds one device\'s memory, data parallelism is dead — you must shard the model and keep the shards busy.',
        tag: 'S1',
      },
      {
        type: 'mcq',
        q: 'The bubble fraction is approximately…',
        options: [
          '(K−1)/(M+K−1): fill/drain steps over total steps — it shrinks as micro-batches M grow',
          'M/(M+K)',
          'always 50%',
          'independent of K',
        ],
        answer: 0,
        why: 'Only the first K−1 and last K−1 steps have idle stages; with M ≥ 4K the overhead is single-digit percent.',
        tag: 'S4',
      },
      {
        type: 'tf',
        q: 'In GPipe, gradient updates are applied once per micro-batch.',
        answer: false,
        why: 'Gradients accumulate across ALL M micro-batches and apply in one synchronous step per mini-batch — identical semantics to single-device training.',
        tag: 'S3',
      },
      {
        type: 'mcq',
        q: 'Re-materialization means…',
        options: [
          'storing only stage-boundary activations and recomputing the rest during backward — trading extra compute for memory',
          'saving the model to disk between steps',
          're-running the forward pass on different data',
          'reinitializing weights each epoch',
        ],
        answer: 0,
        why: 'Activation memory is what OOMs giant models; recomputation during backprop is the standard fix (a.k.a. gradient checkpointing).',
        tag: 'S3',
      },
      {
        type: 'order',
        q: 'Order one GPipe training step.',
        items: [
          'split the mini-batch into M micro-batches',
          'forward passes fill the pipeline',
          'backward passes drain it (with recomputed activations)',
          'accumulate gradients; single synchronous optimizer step',
        ],
        answer: [0, 1, 2, 3],
        why: 'Split → fill → drain → one update. Scheduling changes; optimizer math does not.',
        tag: 'S2',
      },
      {
        type: 'fill',
        q: 'bubble ≈ (K−1)/(___ + K − 1)',
        tokens: ['M', 'L', 'D'],
        answer: ['M'],
        why: 'M micro-batches through K stages take M+K−1 steps; only K−1 of them are bubble.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'Why must the layer partition across devices be balanced?',
        options: [
          'the slowest stage sets the pipeline clock; imbalance inflates idle time on every other stage',
          'unbalanced partitions break the loss function',
          'GPUs refuse uneven layer counts',
          'it reduces the number of parameters',
        ],
        answer: 0,
        why: 'An assembly line moves at the speed of its slowest station; every other device waits on it.',
        tag: 'S2',
      },
      {
        type: 'mcq',
        q: "GPipe's headline demonstrations were…",
        options: [
          'a 557M-parameter AmoebaNet (84.3% top-1 ImageNet) and multi-billion-parameter translation models',
          'a 7-layer MLP on MNIST',
          'the first GPU implementation of backprop',
          'beating AlexNet with no convolutions',
        ],
        answer: 0,
        why: 'Proof that accuracy scales with model size once "too big for one chip" stops being a constraint.',
        tag: 'S1',
      },
    ],
  },
  // ---------------------------------------------------------------- FILE 032
  {
    slug: 'mpnn-2017',
    fileNo: '032',
    title: 'Neural Message Passing for Quantum Chemistry',
    shortTitle: 'MPNN',
    authors: 'Gilmer, Schoenholz, Riley, Vinyals, Dahl',
    year: 2017,
    venue: 'ICML 2017',
    sourceUrl: 'https://arxiv.org/abs/1704.01212',
    sourceLabel: 'arXiv:1704.01212',
    track: 5,
    bonus: true,
    xp: 380,
    difficulty: 4,
    estMinutes: 30,
    hook: 'A neural net whose input is a molecule.',
    briefing: {
      paragraphs: [
        "Molecules aren't grids or sequences: atoms are nodes, bonds are edges, and rotating the molecule or renumbering the atoms changes nothing about its chemistry. The pre-2017 ML approach featurized molecules with hand-engineered 'fingerprints' — fixed-length hashes of local substructures — and fed those to standard models. Gilmer et al. asked: what if the graph itself is the input, and the features are learned?",
        "Their Message Passing Neural Network framework unified a zoo of existing graph convolutions into three phases: MESSAGE — each edge computes a message from its two endpoints' states; UPDATE — each node sums its incoming messages and updates its state, for T rounds; READOUT — a permutation-invariant pooling over final node states produces one graph-level vector. Because aggregation is a sum over neighbors, atom numbering is irrelevant by construction.",
        "On QM9 — 134k small organic molecules with 13 quantum-chemical properties computed by expensive DFT simulations — MPNNs reached state of the art on all 13 targets and chemical accuracy on 11, beating fingerprints and every prior learned method. The message/update/readout abstraction became the standard template for graph neural networks: GCN, GraphSAGE, GAT, and the modern drug-discovery stack are all dialects of it.",
      ],
      stakes: "most real-world data — molecules, code, social graphs, chip netlists — is graphs, not tensors. This paper defined the layer that eats graphs.",
    },
    eliEngineer: {
      prose: [
        "Message passing is a gossip protocol with a fixed number of rounds. Every node starts with a feature vector (atom type, charge, …). Each round: every edge formats a message from its two endpoints (bond type included), every node sums its incoming mail and applies a learned update function. After T rounds, each node's state describes its T-hop neighborhood — information has diffused exactly T bonds across the molecule.",
        "The graph-level answer comes from the readout: a learned, order-invariant pooling over all final node states. Because messages aggregate by summation and the readout ignores order, the entire computation is permutation-invariant: renumber your atoms and every intermediate, plus the output, is provably unchanged — the data structure finally matches the physics. And every operation is differentiable, so the 'fingerprint' is learned end-to-end against the property you actually care about.",
      ],
      code: {
        lang: 'python',
        file: 'mpnn.py',
        snippet: `h = {v: atom_features(v) for v in nodes}        # initial node states
for t in range(T):                              # T rounds of gossip
    m = {v: 0 for v in nodes}
    for (v, w, e_vw) in edges:                  # MESSAGE phase
        m[v] += M(h[v], h[w], e_vw)             # learned message fn (bond-aware)
        m[w] += M(h[w], h[v], e_vw)
    for v in nodes:                             # UPDATE phase
        h[v] = U(h[v], m[v])                    # e.g. a GRU on (state, inbox)
graph_vector = R([h[v] for v in nodes])         # READOUT: invariant pooling
property = mlp(graph_vector)                    # e.g. predicted energy gap`,
      },
    },
    intuitions: [
      {
        title: 'A graph is just sparse routing',
        body: "A conv layer is message passing on a grid graph; MPNN generalizes the routing table to arbitrary adjacency. Same weight-sharing trick as CNNs (file 019), but the 'neighborhood' is defined by bonds, not pixels.",
        more: "Written as gather → transform → scatter, GNNs become familiar fast — those three ops power every graph framework (PyG, DGL, jraph).",
      },
      {
        title: 'T rounds = T hops of context',
        body: "Each round extends every node's receptive field by one bond, so T controls how far chemical information travels — a 3-round net sees 3-hop substructures, roughly the radius fingerprints hashed by hand.",
        more: "Too many rounds can over-smooth (node states converge toward each other) — depth on graphs has its own failure mode.",
      },
      {
        title: 'Permutation invariance by construction',
        body: "There is no canonical atom ordering, so the model must be invariant to it; sum-aggregation plus an order-invariant readout makes invariance a theorem of the architecture rather than a data-augmentation hope.",
        more: "Sum aggregation can collapse some distinctions (multiset counting); richer aggregators trade simplicity for expressivity — the analysis behind GIN.",
      },
      {
        title: 'Fingerprints you can backprop through',
        body: "Circular fingerprints (ECFP) are hand-designed local hashes; an MPNN learns task-specific substructure features directly from property labels — which is why it beat fingerprints on 11 of 13 QM9 targets at chemical accuracy.",
        more: "Learned representations can transfer poorly when the chemistry shifts, so fingerprints linger as baselines — but representation learning won the field.",
      },
    ],
    mechanism: {
      latex: "m_v^{t+1} = \\sum_{w \\in N(v)} M_t\\bigl(h_v^t, h_w^t, e_{vw}\\bigr), \\qquad h_v^{t+1} = U_t\\bigl(h_v^t, m_v^{t+1}\\bigr)",
      terms: [
        { symbol: 'h_vᵗ', meaning: "node v's state vector at round t (starts as atom features)" },
        { symbol: 'N(v)', meaning: "v's bonded neighbors" },
        { symbol: 'e_vw', meaning: 'edge features: bond type, distance bin' },
        { symbol: 'M_t', meaning: 'learned message function for round t: endpoint states + bond → message' },
        { symbol: 'Σ', meaning: 'sum over incoming messages: permutation-invariant aggregation' },
        { symbol: 'U_t', meaning: 'learned update function (e.g. GRU): merges old state with the inbox' },
      ],
      diagram: {
        kind: 'mpnn-molecule',
        title: 'Message passing on a molecule',
        nodes: [
          { id: 'mol', label: 'molecule graph', sub: 'atoms = nodes, bonds = edges' },
          { id: 'msg', label: 'T rounds', sub: 'message → aggregate → update' },
          { id: 'read', label: 'readout R', sub: 'order-invariant pooling' },
          { id: 'pred', label: 'MLP → property', sub: 'e.g. HOMO energy' },
        ],
        edges: [
          { from: 'mol', to: 'msg' },
          { from: 'msg', to: 'read' },
          { from: 'read', to: 'pred' },
        ],
        note: 'Draw the molecule as labeled circles (C/N/O/H) with bond edges; annotate dashed rings for rounds 1–3 of message pulses expanding from one clicked atom.',
      },
      caption: 'T rounds of edge messages and node updates diffuse information across the molecule; an invariant readout pools it into one prediction.',
    },
    lab: {
      id: 'message-passing-lab',
      name: 'message passing lab',
      blurb: 'Click an atom in a small molecule and watch 3 rounds of messages diffuse across the bonds; then the readout pools the graph into a predicted property.',
      controls: [
        { label: 'molecule canvas', kind: 'canvas', detail: 'click any atom to trace message flow from it' },
        { label: 'step rounds', kind: 'button', detail: 'run rounds t = 1, 2, 3 one at a time' },
        { label: 'rounds T', kind: 'slider', detail: '1 → 4: see where over-smoothing starts' },
        { label: 'readout', kind: 'toggle', detail: 'show the final pooling into a property value' },
      ],
      stage: 'A molecule graph (8–10 labeled atoms); edge pulses animate each round and node halos grow as messages accumulate; a side panel shows per-atom state magnitude and the final readout → property value.',
      hint: 'click an atom · step through rounds 1→3 · watch its neighborhood light up',
      completion: 'ran all 3 message-passing rounds from at least two different starting atoms and viewed the readout',
      fallback: 'Static 3-frame strip: rounds 1/2/3 halo expansion from one atom, then the pooled readout.',
    },
    bugs: [
      {
        title: '"just flatten the molecule into a vector"',
        fix: 'Any flattening picks an arbitrary atom order and breaks permutation invariance; the model then must learn from data what the architecture could guarantee for free.',
      },
      {
        title: '"more message-passing rounds = more accuracy"',
        fix: 'Beyond the chemistry-relevant radius, rounds over-smooth (node states homogenize) and dilute the signal; the paper used T = 3.',
      },
      {
        title: '"MPNNs only work for molecules"',
        fix: 'The framework is domain-agnostic: any nodes+edges data — programs, social graphs, physics simulations — fits the message/update/readout template. Quantum chemistry was the demo.',
      },
    ],
    fieldNotes: {
      buildsOn: ['alexnet-2012'],
      unlocks: [],
      further: [
        { label: 'Original paper (arXiv:1704.01212)', url: 'https://arxiv.org/abs/1704.01212' },
        { label: 'Distill: A Gentle Introduction to Graph Neural Networks', url: 'https://distill.pub/2021/gnn-intro/' },
      ],
      citation: '@inproceedings{gilmer2017mpnn, title={Neural message passing for quantum chemistry}, author={Gilmer, Justin and Schoenholz, Samuel S. and Riley, Patrick F. and Vinyals, Oriol and Dahl, George E.}, booktitle={ICML}, year={2017} }',
    },
    quiz: [
      {
        type: 'mcq',
        q: 'The three MPNN phases are…',
        options: [
          'message (edges compute from endpoints), update (nodes aggregate + update), readout (invariant graph pooling)',
          'encode, decode, sample',
          'forward, backward, optimize',
          'split, shuffle, merge',
        ],
        answer: 0,
        why: 'Edges build messages → nodes sum and update for T rounds → an order-invariant readout pools the graph.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'Why is the architecture permutation-invariant?',
        options: [
          'aggregation is a sum over neighbors and the readout is order-invariant — renumbering atoms changes nothing',
          'atoms are sorted alphabetically first',
          'the loss function is symmetric',
          'molecules have no structure',
        ],
        answer: 0,
        why: 'Invariance is a theorem of the architecture: sums and set-functions do not care about indexing.',
        tag: 'S3',
      },
      {
        type: 'mcq',
        q: "After T rounds, a node's state encodes…",
        options: [
          'its T-hop neighborhood — substructures within T bonds',
          'only its own atom type',
          'the entire periodic table',
          'the 3D coordinates exactly',
        ],
        answer: 0,
        why: 'Each round diffuses information one bond further; T sets the chemical context radius (the paper used T = 3).',
        tag: 'S2',
      },
      {
        type: 'tf',
        q: 'MPNNs require molecules to be converted into fixed-length fingerprints first.',
        answer: false,
        why: 'The graph itself is the input; the whole point is learning task-specific features end-to-end instead of hand-hashing substructures.',
        tag: 'S1',
      },
      {
        type: 'order',
        q: 'Order one round of message passing.',
        items: [
          'each edge builds a message from its endpoint states (+ bond features)',
          'each node sums its incoming messages',
          'each node updates its state (e.g. with a GRU)',
          'after T rounds, readout pools all states',
        ],
        answer: [0, 1, 2, 3],
        why: 'Message → aggregate → update, repeated T times; then the invariant readout.',
        tag: 'S2',
      },
      {
        type: 'fill',
        q: 'm_v^{t+1} = Σ_{w∈N(v)} M_t(h_vᵗ, h_wᵗ, ___)',
        tokens: ['e_vw', 'x_t', 'R(h)'],
        answer: ['e_vw'],
        why: 'The message function sees both endpoint states AND the edge (bond) features e_vw.',
        tag: 'S4',
      },
      {
        type: 'mcq',
        q: 'The benchmark result was…',
        options: [
          "state of the art on all 13 QM9 quantum-property targets, chemical accuracy on 11 — beating fingerprint-based methods",
          'parity with logistic regression',
          'a new ImageNet record',
          'the first molecule classifier',
        ],
        answer: 0,
        why: 'Learned representations beat hand-designed fingerprints across the board on 134k molecules.',
        tag: 'S1',
      },
      {
        type: 'mcq',
        q: 'The risk of too many message-passing rounds is…',
        options: [
          'over-smoothing: node states converge and lose discriminative local structure',
          'the graph becomes directed',
          'bonds get deleted',
          'the loss becomes negative',
        ],
        answer: 0,
        why: 'Repeated averaging homogenizes states; past the useful context radius, more rounds blur rather than sharpen.',
        tag: 'S6',
      },
    ],
  },
];

export default track5Papers;

