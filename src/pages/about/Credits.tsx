import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useReducedMotion } from '@/lib/game/format';
import Reveal from '../achievements/Reveal';

/**
 * Section 6 — Credits & Sources Band (about.md §6): centered link chip row
 * (999px, mono) + build-with micro line. Chips pop stagger 0.05s; hover →
 * lift −3px + cyan border. All links open new tabs.
 */

const LINKS: { label: string; href: string }[] = [
  { label: "12gramsofcarbon — ilya's 30 papers table", href: 'https://12gramsofcarbon.com' },
  { label: 'karpathy.github.io', href: 'https://karpathy.github.io/2015/05/21/rnn-effectiveness/' },
  { label: 'colah.github.io', href: 'https://colah.github.io/' },
  { label: 'arxiv.org', href: 'https://arxiv.org' },
  { label: 'nlp.seas.harvard.edu', href: 'https://nlp.seas.harvard.edu/annotated-transformer/' },
  { label: 'lex fridman podcast #309', href: 'https://lexfridman.com/john-carmack/' },
];

export default function Credits() {
  const reduced = useReducedMotion();
  return (
    <section className="border-t border-line bg-abyss py-20 md:py-24" aria-label="sources and inspiration">
      <div className="mx-auto max-w-prose2 px-4 text-center sm:px-6">
        <Reveal>
          <h3 className="font-display text-[22px] font-semibold text-txt">sources & inspiration</h3>
        </Reveal>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {LINKS.map((link, i) => {
            const chip = (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 font-mono text-[12px] lowercase text-txt-dim transition-all duration-200 ease-expo-out hover:-translate-y-[3px] hover:border-t1/60 hover:text-txt"
              >
                {link.label}
                <ArrowUpRight size={12} className="text-txt-faint" />
              </a>
            );
            if (reduced) return <span key={link.href}>{chip}</span>;
            return (
              <motion.span
                key={link.href}
                initial={{ scale: 0.7, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.05 }}
              >
                {chip}
              </motion.span>
            );
          })}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-10 font-mono text-[12px] lowercase leading-relaxed tracking-[0.04em] text-txt-faint">
            built with react · three.js · gsap · framer motion · katex — and an unreasonable
            effectiveness of game loops
          </p>
        </Reveal>
      </div>
    </section>
  );
}
