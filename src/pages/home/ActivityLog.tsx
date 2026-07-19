import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import EmptyState from '@/components/game/EmptyState';
import Reveal from './Reveal';
import { useSaveStore } from '@/lib/game/save';
import { timeAgo } from '@/lib/game/format';
import type { ActivityEvent, ActivityKind } from '@/lib/game/types';

/**
 * Section 6 — Activity Log (home.md): "git log for your brain". Terminal-
 * chrome panel listing the last 6 events, newest first, typewriter-in at
 * 25% viewport. Zero state: EmptyState + START PAPER 01 CTA.
 */

const KIND_COLORS: Record<ActivityKind, string> = {
  master: 'text-success',
  boss: 'text-danger',
  streak: 'text-t4',
  achievement: 'text-t2',
  xp: 'text-xp',
  section: 'text-txt-dim',
  lab: 'text-txt-dim',
  quiz: 'text-txt-dim',
  rank: 'text-xp',
  system: 'text-txt-faint',
};

function LogLine({ event, typed, newest }: { event: ActivityEvent; typed: string; newest: boolean }) {
  const done = typed.length >= event.label.length;
  return (
    <div
      className={`flex items-baseline gap-3 whitespace-nowrap border-l-2 py-[3px] pl-3 ${
        newest ? 'border-t1' : 'border-transparent'
      }`}
      title={new Date(event.at).toLocaleString()}
    >
      <span className="text-txt-faint">{event.id}</span>
      {event.xp > 0 && <span className="text-xp">+{event.xp}xp</span>}
      <span className={KIND_COLORS[event.kind]}>
        {typed}
        {!done && <span className="animate-blink">▌</span>}
      </span>
      {done && <span className="text-txt-faint">{timeAgo(event.at)}</span>}
    </div>
  );
}

export default function ActivityLog() {
  const activity = useSaveStore((s) => s.activity);
  const events = useMemo(() => activity.slice(0, 6), [activity]);
  const totalChars = useMemo(() => events.reduce((n, e) => n + e.label.length, 0), [events]);

  const panelRef = useRef<HTMLDivElement>(null);
  const [typedCount, setTypedCount] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = panelRef.current;
    if (!el || events.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const iv = setInterval(() => {
            setTypedCount((c) => {
              if (c >= totalChars) {
                clearInterval(iv);
                return c;
              }
              return c + 1;
            });
          }, 8);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [events.length, totalChars]);

  // slice the global typed budget across lines (functional, no mutation)
  const typedPerLine = useMemo(() => {
    return events.reduce<{ lines: string[]; remaining: number }>(
      (acc, e) => {
        const chars = Math.max(0, Math.min(e.label.length, acc.remaining));
        return {
          lines: [...acc.lines, e.label.slice(0, chars)],
          remaining: acc.remaining - chars,
        };
      },
      { lines: [], remaining: typedCount },
    ).lines;
  }, [events, typedCount]);

  return (
    <section className="bg-void py-24 md:py-32" aria-label="activity log">
      <div className="mx-auto grid max-w-shell items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <span className="micro-label text-txt-faint">{'// commits to your own head'}</span>
          <h2 className="mt-3 font-display text-[30px] font-semibold text-txt md:text-[36px]">activity log</h2>
          <p className="mt-4 max-w-[44ch] text-[15px] leading-[1.75] text-txt-dim">
            Every section read, every lab broken, every paper mastered — committed to your local save file like a git
            history of your own brain.
          </p>
          {events.length === 0 ? (
            <div className="mt-8">
              <EmptyState message="no commits yet." />
              <Link
                to="/paper/01-image-classification-cnn"
                className="mt-4 inline-flex items-center gap-2 font-mono text-[13px] uppercase tracking-wider text-xp transition-colors hover:text-xp-bright"
              >
                start paper 01
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <p className="mt-4 font-mono text-[12px] lowercase text-txt-faint">
              {events.length} event{events.length > 1 ? 's' : ''} · {totalChars} characters
            </p>
          )}
        </Reveal>

        <div ref={panelRef} className="relative">
          <div className="absolute inset-0 -z-10 rounded-xl bg-surface ring-1 ring-line" />
          <div className="max-h-[420px] overflow-auto p-5 font-mono text-[13px]">
            {events.map((e, i) => (
              <LogLine key={e.id} event={e} typed={typedPerLine[i] ?? ''} newest={i === 0} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
