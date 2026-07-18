import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/game/format';
import Legend from './about/Legend';
import TrackList from './about/TrackList';
import HowToPlay from './about/HowToPlay';
import FinePrint from './about/FinePrint';
import Faq from './about/Faq';
import Credits from './about/Credits';

/**
 * /about — About / How to Play (about.md): the Carmack story, the list,
 * rules & XP tables, the fine print, FAQ, credits. Purely informational —
 * reveal-only animations, no game mechanics at stake.
 */
export default function About() {
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = '90%▮ — about / how to play';
    return () => {
      document.title = '90% — The Ilya Papers Quest';
    };
  }, []);

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Legend />
      <TrackList />
      <HowToPlay />
      <FinePrint />
      <Faq />
      <Credits />
    </motion.div>
  );
}
