import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import CornerPanel from '@/components/game/CornerPanel';
import { useSaveStore, selectHasRun } from '@/lib/game/save';
import { pushToast } from '@/lib/game/ui';
import { sfx } from '@/lib/game/sound';

/**
 * Section 0 — New Game Modal (home.md): first visit only. Full-screen
 * overlay (--void/85% + blur), centered gold-cornered CornerPanel, handle
 * input (mono, max 16 chars, auto-focus), INITIALIZE RUN → + skip link.
 * Springs in after the hero intro; on submit exits up and toasts.
 */
export default function NewGameModal() {
  const hasRun = useSaveStore(selectHasRun);
  const setHandle = useSaveStore((s) => s.setHandle);
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // block after the hero intro completes (250 ms fade after ~1.8 s intro)
  useEffect(() => {
    if (hasRun) return;
    const t = setTimeout(() => setVisible(true), 1900);
    return () => clearTimeout(t);
  }, [hasRun]);

  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  if (hasRun) return null;

  const submit = (handle: string) => {
    if (leaving) return;
    setLeaving(true);
    setHandle(handle.trim() || 'player_1');
    sfx.levelUp();
    pushToast('+0 xp — run initialized', 'info');
  };

  // Portal to <body>: the hero's ScrollTrigger pin wraps its section in a
  // pin-spacer, so a conditionally-mounted fragment sibling would crash
  // React's insertBefore anchor when this modal appears. A portal keeps the
  // overlay out of the hero's parent entirely.
  return createPortal(
    <AnimatePresence>
      {visible && !hasRun && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-void/85 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="New game"
        >
          <motion.div
            initial={{ scale: 0.92, y: 24 }}
            animate={leaving ? { scale: 1.04, y: -40, opacity: 0 } : { scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            <CornerPanel cornerColor="#FBBF24" className="w-[440px] max-w-[calc(100vw-32px)] p-8">
              <span className="hud-label text-xp">new game</span>
              <h3 className="mt-3 font-display text-2xl font-semibold text-txt">choose your handle</h3>
              <form
                className="mt-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (value.trim().length >= 2) submit(value);
                }}
              >
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value.slice(0, 16))}
                  placeholder="e.g. carmack_fan"
                  maxLength={16}
                  className="w-full rounded-lg border border-line bg-void px-4 py-3 font-mono text-[15px] text-txt placeholder:text-txt-faint focus:border-xp/60 focus:outline-none"
                  aria-label="player handle"
                />
                <p className="mt-4 font-mono text-[12px] lowercase leading-relaxed text-txt-dim">
                  no account. no server. your progress lives in this browser as a save file you can export.
                </p>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <button
                    type="submit"
                    disabled={value.trim().length < 2}
                    className="hud-label rounded-lg bg-xp px-5 py-3 text-void transition-all duration-200 enabled:hover:shadow-glow-xp disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    initialize run →
                  </button>
                  <button
                    type="button"
                    onClick={() => submit('player_1')}
                    className="font-mono text-[13px] lowercase text-txt-faint transition-colors hover:text-txt-dim"
                  >
                    skip
                  </button>
                </div>
              </form>
            </CornerPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
