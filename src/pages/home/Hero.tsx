import { Suspense, lazy, useRef } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowRight, ChevronDown, Map as MapIcon, Play } from 'lucide-react';
import { useSaveStore, selectHasRun } from '@/lib/game/save';
import { continueSlug } from '@/lib/game/unlocks';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HeroParticles = lazy(() => import('./HeroParticles'));

/**
 * Section 1 — Hero (home.md): full-viewport stack (bg image → Three.js
 * particle field → grid → scanlines → vignette → content, center-left).
 * GSAP intro timeline on mount (1.8 s), ScrollTrigger pin for +60% scroll
 * with letter scatter; reduced motion = simple fade.
 *
 * NOTE: headline chars are hand-rolled JSX spans (`.hero-char`), NOT GSAP
 * SplitText — SplitText rewrites DOM nodes that React owns, and any later
 * re-render (e.g. save-store rehydration) crashes reconciliation
 * (`insertBefore`). GSAP only transforms these stable spans.
 */

function SplitLine({ text, line }: { text: string; line: number }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <span key={`${line}-${i}`} className="hero-char" data-line={line} aria-hidden>
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
      <span className="sr-only">{text}</span>
    </>
  );
}

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const particlesWrapRef = useRef<HTMLDivElement>(null);
  const hasRun = useSaveStore(selectHasRun);
  const nextSlug = useSaveStore((s) => continueSlug(s));

  const primaryCta = hasRun && nextSlug ? (
    <Link
      to={`/paper/${nextSlug}`}
      className="hud-label group inline-flex items-center gap-2 rounded-lg bg-t1 px-6 py-3.5 text-void transition-all duration-200 hover:shadow-glow-cyan-lg"
    >
      <Play size={15} className="transition-transform group-hover:translate-x-0.5" />
      continue
    </Link>
  ) : (
    <Link
      to="/map"
      className="hud-label group inline-flex items-center gap-2 rounded-lg bg-t1 px-6 py-3.5 text-void transition-all duration-200 hover:shadow-glow-cyan-lg"
    >
      enter the map
      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const hero = heroRef.current;
      if (!hero) return;

      if (reduced) {
        gsap.from(hero.querySelectorAll('.hero-fade'), { opacity: 0, duration: 0.2, stagger: 0.05 });
        return;
      }

      const chars = hero.querySelectorAll('.hero-char');

      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.fromTo(hero.querySelector('.hero-bg'), { scale: 1.06 }, { scale: 1, duration: 1.4 }, 0)
        .fromTo(
          hero.querySelectorAll('.hero-chip'),
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0% 0 0)', duration: 0.3, stagger: 0.1 },
          0.2,
        )
        .from(chars, { y: 60, rotate: 6, opacity: 0, duration: 0.7, stagger: 0.028 }, 0.35)
        .fromTo(
          hero.querySelectorAll('.hero-word'),
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.01 },
          0.9,
        )
        .from(
          hero.querySelectorAll('.hero-rise'),
          { y: 24, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(1.6)' },
          1.1,
        )
        .fromTo(hero.querySelector('.hero-cue'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.6)
        .add(() => {
          // free the chars for CSS hover jiggle
          gsap.set(chars, { clearProps: 'transform,opacity' });
        });

      // scroll: pin +60%, letters scatter upward, particles drift down, fade
      const st = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '+=60%',
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
        },
      });
      st.to(chars, { y: -140, opacity: 0, stagger: { each: 0.4 / Math.max(1, chars.length), from: 'random' }, ease: 'none' }, 0)
        .to(hero.querySelectorAll('.hero-sub, .hero-ctas, .hero-stats, .hero-chiprow'), { opacity: 0, y: -30, ease: 'none' }, 0)
        .to(particlesWrapRef.current, { y: 120, ease: 'none' }, 0)
        .to(hero.querySelector('.hero-cue'), { opacity: 0, ease: 'none' }, 0);
    },
    { scope: heroRef },
  );

  const sub =
    'In 2019, Ilya Sutskever handed John Carmack a list of ~30 research papers and said: "If you really learn all of these, you\'ll know 90% of what matters today." Carmack read them all. This site turns that list into a game — so you can too.';

  return (
    <section ref={heroRef} className="relative flex min-h-[100dvh] min-h-[640px] items-center overflow-hidden" aria-label="hero">
      {/* background stack, bottom → top */}
      <div className="hero-bg absolute inset-0" style={{ transformOrigin: 'center' }}>
        <img
          src="/hero-neural-bg.png"
          alt=""
          className="size-full object-cover opacity-60"
          draggable={false}
        />
      </div>
      <div ref={particlesWrapRef} className="absolute inset-0">
        <Suspense fallback={null}>
          <HeroParticles heroRef={heroRef} />
        </Suspense>
      </div>
      <div className="grid-texture pointer-events-none absolute inset-0" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />
      <div className="vignette pointer-events-none absolute inset-0" />

      {/* content */}
      <div className="relative z-10 mx-auto w-full max-w-shell px-4 sm:px-6">
        <div className="max-w-[720px]">
          <div className="hero-chiprow mb-6 flex flex-wrap items-center gap-2.5">
            <span className="hero-chip hud-label inline-flex rounded-full border border-line bg-surface/70 px-3 py-1.5 text-[11px] text-t1">
              {'// a learning rpg for software engineers'}
            </span>
            <span className="hero-chip hud-label inline-flex rounded-full border border-xp/40 bg-xp/10 px-3 py-1.5 text-[11px] text-xp">
              30+2 papers
            </span>
          </div>

          <h1 className="font-display font-bold leading-[0.98] tracking-[-0.02em]" style={{ fontSize: 'clamp(44px, 7vw, 88px)' }}>
            <span className="block">
              <SplitLine text="90% OF WHAT" line={1} />
            </span>
            <span className="block">
              <SplitLine text="MATTERS." line={2} />
              <span className="animate-blink text-t1" aria-hidden>▮</span>
            </span>
          </h1>

          <p className="hero-sub mt-7 max-w-[56ch] text-[17px] leading-[1.75] text-txt-dim sm:text-[19px]">
            {sub.split(' ').map((w, i) => (
              <span key={i} className="hero-word inline-block whitespace-pre">
                {w}{' '}
              </span>
            ))}
          </p>

          <div className="hero-ctas mt-9 flex flex-wrap items-center gap-4">
            <span className="hero-rise inline-block">{primaryCta}</span>
            <span className="hero-rise inline-block">
              {hasRun ? (
                <Link
                  to="/map"
                  className="hud-label inline-flex items-center gap-2 rounded-lg border border-line px-6 py-3.5 text-txt-dim transition-all duration-200 hover:border-t1/50 hover:text-txt"
                >
                  <MapIcon size={15} />
                  map
                </Link>
              ) : (
                <a
                  href="#briefing"
                  className="hud-label inline-flex items-center gap-2 rounded-lg border border-line px-6 py-3.5 text-txt-dim transition-all duration-200 hover:border-t1/50 hover:text-txt"
                >
                  how it works
                </a>
              )}
            </span>
          </div>

          <div className="hero-stats mt-10 flex flex-wrap gap-2.5">
            {['32 LEVELS', '5 BOSSES', '~17,000 XP', '1 SAVE FILE'].map((s) => (
              <span
                key={s}
                className="hero-rise rounded-full border border-line bg-surface/70 px-3.5 py-1.5 font-mono text-[12px] tracking-[0.08em] text-txt-dim"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* scroll cue */}
      <div className="hero-cue absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <div className="flex animate-bob flex-col items-center gap-1 text-txt-faint">
          <ChevronDown size={16} />
          <span className="micro-label">scroll</span>
        </div>
      </div>
    </section>
  );
}
