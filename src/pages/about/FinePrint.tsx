import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import Reveal from '../achievements/Reveal';

/**
 * Section 4 — The Fine Print (about.md §4): content honesty, single prose
 * column (760px), four blocks with ▸ mono bullets that nudge on hover.
 * External links open new tabs with ↗.
 */

function ExtLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-baseline gap-0.5 text-t1 underline decoration-t1/40 underline-offset-2 transition-colors hover:text-focus"
    >
      {children}
      <ArrowUpRight size={12} className="translate-y-[1px]" />
    </a>
  );
}

const BLOCKS: { title: string; body: ReactNode }[] = [
  {
    title: 'the list is a reconstruction.',
    body: (
      <>
        The original email is lost (Facebook wiped it). This site uses the widely-circulated
        reconstruction, papers verified against public sources, plus two bonus papers (GPipe, MPNN)
        marked with ★. Where versions differ, we chose the most teachable option — e.g. the
        "complextropy" entry is Scott Aaronson's{' '}
        <ExtLink href="https://www.scottaaronson.com/blog/?p=762">The First Law of Complexodynamics</ExtLink>
        .
      </>
    ),
  },
  {
    title: 'summaries are ours, breakthroughs are theirs.',
    body: (
      <>
        Every level links to the original paper or blog —{' '}
        <ExtLink href="https://arxiv.org">arXiv</ExtLink>, author sites, the primary source. Read
        the originals: this game is a map, not the territory.
      </>
    ),
  },
  {
    title: 'labs are intuition pumps.',
    body: (
      <>
        The interactive demos are simplified models of the ideas, not faithful reimplementations.
        Each lab states its simplifications up front — the goal is a working mental model, not a
        benchmark.
      </>
    ),
  },
  {
    title: 'not affiliated.',
    body: (
      <>
        A fan build for learners. No accounts, no tracking, no backend — your save file lives in
        your browser (localStorage) and exports as JSON. Not endorsed by Ilya Sutskever, John
        Carmack, or anyone else.
      </>
    ),
  },
];

export default function FinePrint() {
  return (
    <section className="border-t border-line bg-abyss py-20 md:py-24" aria-label="the fine print">
      <div className="mx-auto max-w-prose2 px-4 sm:px-6">
        <Reveal>
          <h3 className="font-display text-[22px] font-semibold text-txt">the fine print</h3>
        </Reveal>
        <div className="mt-8 flex flex-col gap-7">
          {BLOCKS.map((block, i) => (
            <Reveal key={block.title} delay={i * 0.08} y={20}>
              <div className="group flex gap-3">
                <span
                  aria-hidden
                  className="mt-1 font-mono text-t1 transition-transform duration-200 ease-expo-out group-hover:translate-x-[3px]"
                >
                  ▸
                </span>
                <div>
                  <p className="font-display text-[17px] font-semibold text-txt">{block.title}</p>
                  <p className="mt-1.5 text-[15px] leading-[1.75] text-txt-dim">{block.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
