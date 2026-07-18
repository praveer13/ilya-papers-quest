import { useRef, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useReducedMotion } from '@/lib/game/format';
import { SplitChars, SplitWords } from './Split';
import { wordCount } from './word-count';

/**
 * Section 1 — Hero: The Legend (about.md §1): 70vh, hero-neural-bg dimmed
 * to 40% (alternate crop) + grid overlay, slow −60px parallax. Headline
 * char-split, story paragraphs word-fade, Carmack/Ilya quotes get hover
 * citation tooltips (Lex Fridman Podcast #309, 2022).
 */

const CITE = 'Lex Fridman Podcast #309, 2022';

type Part = string | { q: string };

/** hoverable citation wrapper for quote fragments */
function Cite({ children, source }: { children: ReactNode; source: string }) {
  return (
    <span className="group/cite relative inline cursor-help border-b border-dashed border-t1/60 text-txt">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface-2 px-2.5 py-1.5 font-mono text-[11px] lowercase text-txt-dim opacity-0 shadow-lg transition-opacity duration-150 group-hover/cite:opacity-100"
      >
        source: {source}
      </span>
    </span>
  );
}

/** per-part stagger delays, chained so the whole paragraph fades as one stream */
function partDelays(parts: Part[], base: number): number[] {
  const out: number[] = [];
  let d = base;
  for (const p of parts) {
    out.push(d);
    d += wordCount(typeof p === 'string' ? p : p.q) * 0.008 + 0.05;
  }
  return out;
}

function StoryParagraph({ parts, base }: { parts: Part[]; base: number }) {
  const delays = partDelays(parts, base);
  return (
    <p className="text-[17px] leading-[1.8] text-txt-dim md:text-[19px]">
      {parts.map((p, i) => {
        const text = typeof p === 'string' ? p : p.q;
        const words = <SplitWords text={text} delay={delays[i]} />;
        return (
          <span key={i}>
            {typeof p === 'string' ? words : <Cite source={CITE}>{words}</Cite>}
            {i < parts.length - 1 ? '\u00A0' : ''}
          </span>
        );
      })}
    </p>
  );
}

const P1: Part[] = [
  'In 2019, John Carmack — the programmer behind Doom and Quake — asked Ilya Sutskever, co-founder and chief scientist of OpenAI, for a reading list. His way of learning:',
  { q: '"give me a stack of all the stuff I need to know to actually be relevant in this space."' },
];

const P2: Part[] = [
  'Ilya handed over a list of roughly 30–40 research papers and said:',
  { q: '"If you really learn all of these, you\'ll know 90% of what matters today."' },
];

const P3: Part[] = [
  'Carmack plowed through all of them.',
  { q: '"And it all started sorting out in my head."' },
  'This site turns that list into a game — because the best way to finish a hard thing is to make finishing it fun.',
];

export default function Legend() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -60]);

  const line1 = 'ONE LIST. 30 PAPERS.';
  const line2 = '90% OF WHAT MATTERS.';
  const line2Delay = 0.2 + line1.length * 0.025 + 0.1;
  const storyBase = line2Delay + line2.length * 0.025 + 0.35;

  return (
    <section ref={ref} className="relative flex min-h-[70vh] items-center overflow-hidden" aria-label="the origin story">
      {/* background: dimmed neural hero, alternate crop, slow parallax */}
      <motion.div style={reduced ? undefined : { y }} className="absolute -inset-y-16 inset-x-0">
        <img
          src="/hero-neural-bg.png"
          alt=""
          className="size-full scale-105 object-cover opacity-40"
          style={{ objectPosition: 'center 72%' }}
        />
      </motion.div>
      <div aria-hidden className="absolute inset-0 grid-texture" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-void/70 via-void/40 to-void" />

      <div className="relative mx-auto w-full max-w-[820px] px-4 py-24 text-center sm:px-6">
        <motion.span
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-block rounded-full border border-t1/40 bg-t1/10 px-3.5 py-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-t1"
        >
          {'// the origin story'}
        </motion.span>

        <h1 className="mt-8 font-display text-[clamp(38px,6.5vw,76px)] font-bold leading-[1.06] tracking-[-0.02em] text-txt">
          <span className="block">
            <SplitChars text={line1} delay={0.2} />
          </span>
          <span className="mt-2 block text-xp text-glow-gold">
            <SplitChars text={line2} delay={line2Delay} />
          </span>
        </h1>

        <div className="mx-auto mt-10 flex max-w-[720px] flex-col gap-6 text-left">
          <StoryParagraph parts={P1} base={storyBase} />
          <StoryParagraph parts={P2} base={storyBase + 0.55} />
          <StoryParagraph parts={P3} base={storyBase + 1.05} />
        </div>
      </div>
    </section>
  );
}
