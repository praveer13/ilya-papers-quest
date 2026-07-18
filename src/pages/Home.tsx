import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Hero from './home/Hero';
import NewGameModal from './home/NewGameModal';
import Briefing from './home/Briefing';
import CommandDeck from './home/CommandDeck';
import NextObjective from './home/NextObjective';
import FiveWorlds from './home/FiveWorlds';
import ActivityLog from './home/ActivityLog';
import BadgesStrip from './home/BadgesStrip';
import FooterCTA from './home/FooterCTA';
import { useReducedMotion } from '@/lib/game/format';

gsap.registerPlugin(ScrollTrigger);

/**
 * Dashboard ("Command Deck") — `/` (home.md). Part landing page, part game
 * dashboard: what is this, how far am I, what's my next move.
 * Lenis smooth scroll is active on this page only; hero pin is the only
 * ScrollTrigger section (the rest are simple reveals).
 */
export default function Home() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.11 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [reduced]);

  return (
    <>
      <NewGameModal />
      <Hero />
      <Briefing />
      <CommandDeck />
      <NextObjective />
      <FiveWorlds />
      <ActivityLog />
      <BadgesStrip />
      <FooterCTA />
    </>
  );
}
