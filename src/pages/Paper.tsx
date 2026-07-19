import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronDown, Clock, ExternalLink, Lock, Star, Zap } from 'lucide-react';
import TrackChip from '@/components/game/TrackChip';
import ProgressRing from '@/components/game/ProgressRing';
import CornerPanel from '@/components/game/CornerPanel';
import { useSaveStore } from '@/lib/game/save';
import { paperBySlug, papersByTrack } from '@/lib/game/papers';
import { trackById } from '@/lib/game/tracks';
import { isPaperUnlocked } from '@/lib/game/unlocks';
import { pushToast } from '@/lib/game/ui';
import { useReducedMotion } from '@/lib/game/format';
import { paperContent, SECTION_IDS, SECTION_LABELS } from '@/data/papers';
import type { PaperContent, SectionId } from '@/data/papers';
import type { Paper as PaperMeta } from '@/lib/game/papers';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { useSectionRead } from '@/hooks/useSectionRead';
import SectionShell from './paper/Section';
import ProgressRail from './paper/ProgressRail';
import CodeBlock from './paper/CodeBlock';
import EquationBlock from './paper/EquationBlock';
import Diagram from './paper/Diagram';
import DemoFrame from './paper/DemoFrame';
import QuizEngine from './paper/QuizEngine';
import { getLab } from './paper/labs';
import { cn } from '@/lib/utils';

/**
 * Paper Level — /paper/:slug (paper.md). The core learning experience:
 * HUD header + progress rail + 7-section scroll journey (briefing →
 * ELI-engineer → intuitions → mechanism → lab → bug reports → field notes)
 * + checkpoint quiz + completion ledger. All progress flows through the
 * shared save store (sections +10, lab +25, quiz via QuizEngine).
 */

const SPY_IDS = [...SECTION_IDS, 'checkpoint'];

export default function Paper() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const meta = slug ? paperBySlug(slug) : undefined;
  const content = slug ? paperContent(slug) : undefined;
  const track = meta ? trackById(meta.track) : undefined;
  const unlocked = useSaveStore((s) => (meta ? isPaperUnlocked(s, meta) : false));
  const progress = useSaveStore((s) => (slug ? s.papers[slug] : undefined));

  // route guard: unknown slug or locked paper → back to the map
  useEffect(() => {
    if (!meta || !content) {
      pushToast('unknown file — back to the map', 'info');
      navigate('/map', { replace: true });
    } else if (!unlocked) {
      pushToast('locked — master the previous paper first', 'info');
      navigate('/map', { replace: true });
    }
  }, [meta, content, unlocked, navigate]);

  // session time tracking (flush every 15s + on unmount)
  const lastFlush = useRef(0);
  useEffect(() => {
    lastFlush.current = Date.now();
    const iv = window.setInterval(() => {
      const now = Date.now();
      useSaveStore.getState().addTime(now - lastFlush.current);
      lastFlush.current = now;
    }, 15000);
    return () => {
      window.clearInterval(iv);
      useSaveStore.getState().addTime(Date.now() - lastFlush.current);
    };
  }, [slug]);

  const active = useScrollSpy(SPY_IDS);

  const lane = track ? papersByTrack(track.id) : [];
  const idx = meta ? lane.findIndex((p) => p.slug === meta.slug) : -1;
  const prev = idx > 0 ? lane[idx - 1] : null;
  const next = idx >= 0 && idx < lane.length - 1 ? lane[idx + 1] : null;
  const nextUnlocked = useSaveStore((s) => (next ? isPaperUnlocked(s, next) : false));

  if (!meta || !content || !track || !unlocked) return null;

  const color = track.color;
  const sectionsRead = progress?.sectionsRead ?? [];
  const labDone = progress?.labDone ?? false;
  const mastered = progress?.mastered ?? false;
  const xpEarned = progress?.xpEarned ?? 0;
  const completion = (sectionsRead.length + (labDone ? 1 : 0) + (mastered ? 1 : 0)) / (SECTION_IDS.length + 2);

  const jump = (id: string) => {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="relative">
      {/* mobile level progress bar */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-line bg-void/90 px-4 py-2 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-txt-faint">
            file {String(meta.num).padStart(3, '0')}
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-line/60">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completion * 100}%`, backgroundColor: color }} />
          </div>
          <span className="stat-numeral text-[11px] text-xp">+{xpEarned}</span>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* HUD header                                                       */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-shell px-4 py-8 sm:py-10">
          {/* breadcrumb */}
          <nav className="mb-4 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-txt-faint">
            <Link to="/map" className="transition-colors hover:text-txt">map</Link>
            <span>/</span>
            <span style={{ color }}>track {track.num}</span>
            <span>/</span>
            <span className="text-txt-dim">file {String(meta.num).padStart(3, '0')}</span>
          </nav>

          <div className="flex flex-wrap items-start gap-6">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <TrackChip track={track} />
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/70 px-2.5 py-1 font-mono text-[12px] text-txt-dim" title="difficulty">
                  {Array.from({ length: meta.stars }, (_, i) => (
                    <Star key={i} className="size-3 fill-current text-xp" />
                  ))}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/70 px-2.5 py-1 font-mono text-[12px] text-txt-dim">
                  <Clock className="size-3" />~{meta.minutes} min
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-xp/40 bg-xp/10 px-2.5 py-1 font-mono text-[12px] text-xp">
                  <Zap className="size-3" />
                  {meta.xp} XP
                </span>
              </div>

              <h1 className="font-display text-3xl font-bold leading-tight text-txt sm:text-4xl lg:text-[42px]">
                {meta.title}
              </h1>
              <p className="mt-3 font-mono text-[13px] text-txt-dim">
                {meta.authors} · {meta.year} · {content.venue}
              </p>
              <a
                href={content.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider transition-colors hover:underline"
                style={{ color }}
              >
                read the original
                <ExternalLink className="size-3.5" />
              </a>
            </div>

            {/* level completion ring */}
            <div className="relative shrink-0">
              <ProgressRing
                value={completion}
                size={104}
                stroke={7}
                color={mastered ? '#34D399' : color}
                center={
                  <div className="text-center">
                    <div className="stat-numeral text-[20px] text-txt">{Math.round(completion * 100)}%</div>
                    <div className="micro-label text-[8px] text-txt-faint">complete</div>
                  </div>
                }
              />
              {mastered && (
                <motion.span
                  initial={reduced ? false : { scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: -8 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded border border-success bg-void px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-success"
                >
                  mastered
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* body: rail + scroll journey                                      */}
      {/* ---------------------------------------------------------------- */}
      <div className="mx-auto max-w-shell px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* progress rail */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <ProgressRail
                active={active}
                sectionsRead={sectionsRead}
                labDone={labDone}
                mastered={mastered}
                xpEarned={xpEarned}
                color={color}
                onJump={jump}
              />
            </div>
          </aside>

          {/* prose column */}
          <div className="max-w-[760px] space-y-16">
            <LevelSection slug={meta.slug} id="briefing" index={0} color={color} read={sectionsRead.includes('briefing')}>
              <BriefingBody content={content} color={color} hook={meta.hook} />
            </LevelSection>

            <LevelSection slug={meta.slug} id="eli-engineer" index={1} color={color} read={sectionsRead.includes('eli-engineer')}>
              <div className="space-y-4">
                {content.eliEngineer.prose.map((p, i) => (
                  <p key={i} className="text-[16.5px] leading-[1.75] text-txt-dim">{p}</p>
                ))}
                <CodeBlock code={content.eliEngineer.code.snippet} lang={content.eliEngineer.code.lang} file={content.eliEngineer.code.file} />
              </div>
            </LevelSection>

            <LevelSection slug={meta.slug} id="intuitions" index={2} color={color} read={sectionsRead.includes('intuitions')}>
              <div className="grid gap-3 sm:grid-cols-2">
                {content.intuitions.map((it, i) => (
                  <IntuitionCard key={i} intuition={it} color={color} index={i} />
                ))}
              </div>
            </LevelSection>

            <LevelSection slug={meta.slug} id="mechanism" index={3} color={color} read={sectionsRead.includes('mechanism')}>
              <div className="space-y-8">
                <EquationBlock latex={content.mechanism.latex} terms={content.mechanism.terms} color={color} />
                <Diagram spec={content.mechanism.diagram} color={color} caption={content.mechanism.caption} />
              </div>
            </LevelSection>

            <LevelSection slug={meta.slug} id="lab" index={4} color={color} read={sectionsRead.includes('lab')}>
              <LabBody slug={meta.slug} content={content} color={color} labDone={labDone} />
            </LevelSection>

            <LevelSection slug={meta.slug} id="bugs" index={5} color={color} read={sectionsRead.includes('bugs')}>
              <div className="space-y-3">
                {content.bugs.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={reduced ? false : { opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.4, delay: reduced ? 0 : i * 0.07 }}
                    className="rounded-lg border border-line bg-surface p-4"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] font-bold text-danger">BUG #{i + 1}</span>
                      <h3 className="font-mono text-[13.5px] font-bold text-txt">{b.title}</h3>
                    </div>
                    <p className="mt-2 font-mono text-[13px] leading-relaxed text-txt-dim">
                      <span className="text-success">fix: </span>
                      {b.fix}
                    </p>
                  </motion.div>
                ))}
              </div>
            </LevelSection>

            <LevelSection slug={meta.slug} id="field-notes" index={6} color={color} read={sectionsRead.includes('field-notes')}>
              <FieldNotesBody content={content} color={color} />
            </LevelSection>

            {/* ---------------------------------------------------------- */}
            {/* checkpoint quiz                                            */}
            {/* ---------------------------------------------------------- */}
            <section id="sec-checkpoint" className="scroll-mt-24">
              <QuizEngine
                paper={meta}
                content={content}
                color={color}
                nextSlug={next && nextUnlocked ? next.slug : null}
                onSectionLink={(id: SectionId) => jump(id)}
              />
            </section>

            {/* ---------------------------------------------------------- */}
            {/* prev / next nav                                            */}
            {/* ---------------------------------------------------------- */}
            <footer className="flex items-stretch gap-3 border-t border-line pt-6">
              {prev ? (
                <Link
                  to={`/paper/${prev.slug}`}
                  className="group flex flex-1 items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-all hover:border-focus"
                >
                  <ArrowLeft className="size-4 shrink-0 text-txt-faint transition-transform group-hover:-translate-x-1" />
                  <span className="min-w-0">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-txt-faint">prev · file {String(prev.num).padStart(3, '0')}</span>
                    <span className="block truncate font-mono text-[12.5px] text-txt-dim">{prev.title}</span>
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {next ? (
                nextUnlocked ? (
                  <Link
                    to={`/paper/${next.slug}`}
                    className="group flex flex-1 items-center justify-end gap-3 rounded-lg border px-4 py-3 text-right transition-all hover:bg-surface-2"
                    style={{ borderColor: color }}
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-txt-faint">next · file {String(next.num).padStart(3, '0')}</span>
                      <span className="block truncate font-mono text-[12.5px] text-txt">{next.title}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" style={{ color }} />
                  </Link>
                ) : (
                  <div className="flex flex-1 items-center justify-end gap-3 rounded-lg border border-line bg-surface/50 px-4 py-3 opacity-60">
                    <span className="min-w-0 text-right">
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-txt-faint">next · locked</span>
                      <span className="block truncate font-mono text-[12.5px] text-txt-faint">master this paper to unlock</span>
                    </span>
                    <Lock className="size-4 shrink-0 text-txt-faint" />
                  </div>
                )
              ) : (
                <Link
                  to="/map"
                  className="group flex flex-1 items-center justify-end gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-all hover:border-focus"
                >
                  <span className="font-mono text-[12.5px] text-txt-dim">end of track — back to the map</span>
                  <ArrowRight className="size-4 shrink-0 text-txt-faint" />
                </Link>
              )}
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// section wrapper wiring the read-detection hook
// ---------------------------------------------------------------------------

function LevelSection({
  slug,
  id,
  index,
  color,
  read,
  children,
}: {
  slug: string;
  id: SectionId;
  index: number;
  color: string;
  read: boolean;
  children: ReactNode;
}) {
  const ref = useSectionRead(slug, id, index);
  return (
    <SectionShell id={id} index={index} label={SECTION_LABELS[id]} color={color} read={read} readRef={ref}>
      {children}
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// S1 · briefing
// ---------------------------------------------------------------------------

function BriefingBody({ content, color, hook }: { content: PaperContent; color: string; hook: string }) {
  return (
    <CornerPanel cornerColor={color} className="p-5 sm:p-6">
      <p className="mb-4 font-mono text-[12px] lowercase italic text-txt-faint">// {hook}</p>
      <div className="space-y-4">
        {content.briefing.paragraphs.map((p, i) => (
          <p key={i} className="text-[16.5px] leading-[1.75] text-txt-dim">{p}</p>
        ))}
      </div>
      <p className="mt-5 border-t border-line pt-4 font-mono text-[12.5px] lowercase" style={{ color }}>
        stakes: <span className="text-txt-dim">{content.briefing.stakes}</span>
      </p>
    </CornerPanel>
  );
}

// ---------------------------------------------------------------------------
// S3 · intuition card with tell-me-more drawer
// ---------------------------------------------------------------------------

function IntuitionCard({ intuition, color, index }: { intuition: PaperContent['intuitions'][number]; color: string; index: number }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: reduced ? 0 : index * 0.07 }}
      className="flex flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:bg-surface-2/60"
    >
      <h3 className="font-mono text-[13.5px] font-bold leading-snug" style={{ color }}>
        {intuition.title}
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-txt-dim">{intuition.body}</p>
      {intuition.more && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-3 inline-flex items-center gap-1 self-start font-mono text-[11px] uppercase tracking-wider text-txt-faint transition-colors hover:text-txt"
          >
            tell me more
            <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={reduced ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reduced ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <p className="mt-2 border-l-2 pl-3 text-[13.5px] leading-relaxed text-txt-dim" style={{ borderColor: color }}>
                  {intuition.more}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// S5 · lab
// ---------------------------------------------------------------------------

function LabSlot({ slug, resetKey, color }: { slug: string; resetKey: number; color: string }) {
  const lab = getLab(slug);
  if (!lab) return null;
  return (
    <>
      {React.createElement(lab, {
        key: resetKey,
        color,
        onComplete: () => useSaveStore.getState().markLabDone(slug),
      })}
    </>
  );
}

function LabBody({ slug, content, color, labDone }: { slug: string; content: PaperContent; color: string; labDone: boolean }) {
  const [resetKey, setResetKey] = useState(0);
  const hasLab = getLab(slug) !== undefined;
  return (
    <div className="space-y-3">
      <DemoFrame
        name={content.lab.name}
        hint={content.lab.hint}
        completion={content.lab.completion}
        color={color}
        done={labDone}
        onReset={() => setResetKey((k) => k + 1)}
      >
        {hasLab ? (
          <LabSlot slug={slug} resetKey={resetKey} color={color} />
        ) : (
          <div className="flex h-[320px] flex-col items-center justify-center gap-2 font-mono text-[12px] text-txt-faint">
            <span>no lab module registered for this level yet</span>
            <span className="text-[11px]">the written sections + checkpoint below are fully playable</span>
          </div>
        )}
      </DemoFrame>
      {labDone && (
        <p className="font-mono text-[12px] text-success">✓ experiment complete — +25 XP banked. keep playing, it&apos;s free.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// S7 · field notes
// ---------------------------------------------------------------------------

function FieldNotesBody({ content, color }: { content: PaperContent; color: string }) {
  const [copied, setCopied] = useState(false);
  const links = (slugs: string[]) =>
    slugs
      .map((s) => paperBySlug(s))
      .filter((p): p is PaperMeta => Boolean(p));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {content.fieldNotes.buildsOn.length > 0 && (
          <div className="rounded-lg border border-line bg-surface p-4">
            <h3 className="hud-label mb-3 text-txt-faint">builds on</h3>
            <div className="space-y-2">
              {links(content.fieldNotes.buildsOn).map((p) => (
                <Link key={p.slug} to={`/paper/${p.slug}`} className="block rounded-md border border-line px-3 py-2 font-mono text-[12px] text-txt-dim transition-all hover:border-focus hover:text-txt">
                  <span className="text-txt-faint">file {String(p.num).padStart(3, '0')}</span> · {p.title}
                </Link>
              ))}
            </div>
          </div>
        )}
        {content.fieldNotes.unlocks.length > 0 && (
          <div className="rounded-lg border border-line bg-surface p-4">
            <h3 className="hud-label mb-3 text-txt-faint">leads to</h3>
            <div className="space-y-2">
              {links(content.fieldNotes.unlocks).map((p) => (
                <Link key={p.slug} to={`/paper/${p.slug}`} className="block rounded-md border border-line px-3 py-2 font-mono text-[12px] text-txt-dim transition-all hover:bg-surface-2 hover:text-txt">
                  <span className="text-txt-faint">file {String(p.num).padStart(3, '0')}</span> · {p.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-line bg-surface p-4">
        <h3 className="hud-label mb-3 text-txt-faint">further reading</h3>
        <div className="space-y-1.5">
          {content.fieldNotes.further.map((f) => (
            <a
              key={f.url}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 font-mono text-[12.5px] text-txt-dim transition-colors hover:text-txt"
            >
              <ExternalLink className="size-3.5 shrink-0" style={{ color }} />
              {f.label}
            </a>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-[#0A0A14] p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="hud-label text-txt-faint">cite this paper</h3>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(content.fieldNotes.citation);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* noop */
              }
            }}
            className="rounded border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-txt-faint transition-colors hover:border-focus hover:text-txt"
          >
            {copied ? 'copied ✓' : 'copy bibtex'}
          </button>
        </div>
        <pre className="overflow-x-auto font-mono text-[11.5px] leading-relaxed text-txt-dim">{content.fieldNotes.citation}</pre>
      </div>
    </div>
  );
}
