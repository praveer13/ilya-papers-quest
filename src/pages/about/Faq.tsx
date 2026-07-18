import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Reveal from '../achievements/Reveal';

/**
 * Section 5 — FAQ (about.md §5): six-item single-open accordion. Items
 * stagger 0.06s on scroll; expand spring via the accordion animation.
 */

const QA: { q: string; a: string }[] = [
  {
    q: "I'm a software engineer with zero ML background. Is this for me?",
    a: "Yes — that's exactly who it's built for. Every concept is explained in engineering analogies: attention is a differentiable key-value store, backprop is the chain rule automated, BPTT is unrolling a recursive function. Start at FILE 001.",
  },
  {
    q: 'How long does the full run take?',
    a: 'Roughly 15–25 hours across 32 levels. Streaks nudge you to do a little daily — most players finish in 4–8 weeks.',
  },
  {
    q: 'Do I need math?',
    a: 'High-school algebra plus willingness to stare at one equation per paper. Every equation gets a term-by-term decode.',
  },
  {
    q: 'What happens if I fail a quiz or boss?',
    a: 'Nothing bad. No XP loss, ever. You get review pointers and a free retry with reshuffled questions.',
  },
  {
    q: 'Where is my progress stored?',
    a: "In your browser's localStorage as a single JSON save file. Export it from the achievements page to move devices.",
  },
  {
    q: 'Who are you?',
    a: "A fan build, inspired by Ilya's list, Carmack's work ethic, and 12gramsofcarbon's paper-by-paper notes.",
  },
];

export default function Faq() {
  return (
    <section className="py-20 md:py-24" aria-label="faq">
      <div className="mx-auto max-w-prose2 px-4 sm:px-6">
        <Reveal>
          <h2 className="font-display text-[clamp(26px,4vw,32px)] font-semibold text-txt">faq</h2>
          <p className="mt-1 font-mono text-[13px] lowercase text-txt-dim">
            {'// asked often, answered honestly'}
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <Accordion
            type="single"
            collapsible
            className="mt-10 rounded-xl border border-line bg-surface px-5"
          >
            {QA.map((item, i) => (
              <AccordionItem key={item.q} value={`q-${i}`} className="border-line">
                <AccordionTrigger className="py-5 text-left text-[15px] font-medium text-txt hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[14px] leading-[1.75] text-txt-dim">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
