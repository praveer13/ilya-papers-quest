import { BookOpen, Gamepad2, Swords } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import Reveal from './Reveal';

/**
 * Section 2 — The Briefing (home.md): --abyss band, h2 + mono caption,
 * 3-step card row (CornerPanel, cyan), Carmack quote strip below.
 */

const STEPS = [
  {
    num: '01',
    verb: 'READ',
    icon: BookOpen,
    body: 'Each paper becomes a level: a mission briefing, an ELI-engineer breakdown, code analogies, and the core equation — decoded term by term.',
  },
  {
    num: '02',
    verb: 'PLAY',
    icon: Gamepad2,
    body: 'Every level hides an interactive lab. Drag, toggle, and break things until the intuition clicks. Playing earns more XP than reading.',
  },
  {
    num: '03',
    verb: 'CONQUER',
    icon: Swords,
    body: "Pass the checkpoint quiz (≥80%) to master the paper. Clear each world's boss exam to unlock the next world. Finish all 30 and you hold 90% of what matters.",
  },
];

export default function Briefing() {
  return (
    <section id="briefing" className="bg-abyss py-24 md:py-32" aria-label="the briefing">
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <Reveal className="text-center">
          <span className="micro-label text-txt-faint">{'// origin story'}</span>
          <h2 className="mt-3 font-display text-[34px] font-semibold text-txt md:text-[40px]">the briefing</h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.num} delay={0.09 * i}>
              <CornerPanel
                cornerColor="#22D3EE"
                className="group h-full p-7 transition-all duration-200 hover:-translate-y-1.5 hover:border-t1/50"
              >
                <div className="flex items-start justify-between">
                  <span className="stat-numeral text-[28px] text-t1">{s.num}</span>
                  <s.icon size={26} className="text-t1 transition-transform duration-200 group-hover:-rotate-6" strokeWidth={1.8} />
                </div>
                <h3 className="hud-label mt-5 text-txt">{s.num} {'//'} {s.verb}</h3>
                <p className="mt-3 text-[15px] leading-[1.75] text-txt-dim">{s.body}</p>
              </CornerPanel>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-20 text-center">
          <blockquote className="mx-auto max-w-[900px] font-display text-[22px] font-semibold leading-snug text-txt md:text-2xl">
            “And I did. I plowed through all those things and it all started sorting out in my head.”
          </blockquote>
          <p className="micro-label mt-4 text-txt-faint">— john carmack, on ilya&rsquo;s list</p>
        </Reveal>
      </div>
    </section>
  );
}
