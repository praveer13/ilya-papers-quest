import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSaveStore } from '@/lib/game/save';
import { useReducedMotion } from '@/lib/game/format';

/**
 * Section 8 — Footer CTA Band (home.md): big display line `INSERT BRAIN.▮`,
 * sub `the map is waiting, {handle}.`, breathing-glow ENTER THE MAP button.
 * Headline character-splits on scroll into view.
 */
export default function FooterCTA() {
  const handle = useSaveStore((s) => s.profile.handle);
  const reduced = useReducedMotion();
  const line = 'INSERT BRAIN.';

  return (
    <section className="relative overflow-hidden bg-void py-28 md:py-36" aria-label="enter the map">
      <div className="grid-texture pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-shell px-4 text-center sm:px-6">
        <h2 className="font-display font-bold text-txt" style={{ fontSize: 'clamp(36px, 6vw, 56px)' }}>
          {reduced
            ? line
            : line.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={{ y: 60, rotate: 6, opacity: 0 }}
                  whileInView={{ y: 0, rotate: 0, opacity: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.5, delay: 0.028 * i, ease: [0.22, 1, 0.36, 1] }}
                >
                  {ch === ' ' ? '\u00A0' : ch}
                </motion.span>
              ))}
          <span className="animate-blink text-t1">▮</span>
        </h2>
        <motion.p
          className="mt-4 font-mono text-[14px] lowercase text-txt-dim"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          the map is waiting, {handle || 'player_1'}.
        </motion.p>
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/map"
            className="hud-label group mt-9 inline-flex animate-breathe items-center gap-2 rounded-lg bg-t1 px-8 py-4 text-void transition-transform duration-200 hover:scale-[1.04]"
          >
            enter the map
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
