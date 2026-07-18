import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSaveStore } from '@/lib/game/save';
import { rankForXp, rankProgress } from '@/lib/game/ranks';
import StreakFlame from '@/components/game/StreakFlame';

/**
 * Navbar — 64px sticky (design.md §12): --void/80% blur backdrop, 1px bottom
 * border. Positioning contract (react-dev.md): sticky in normal flow — pages
 * do NOT compensate for nav height. Mobile: hamburger → full-screen overlay.
 */

const LINKS = [
  { to: '/', label: 'DECK' },
  { to: '/map', label: 'MAP' },
  { to: '/achievements', label: 'BADGES' },
  { to: '/about', label: 'ABOUT' },
] as const;

export default function Navbar() {
  const xp = useSaveStore((s) => s.xp);
  const streak = useSaveStore((s) => s.streak.count);
  const sound = useSaveStore((s) => s.profile.sound);
  const setSound = useSaveStore((s) => s.setSound);
  const handle = useSaveStore((s) => s.profile.handle);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const rank = rankForXp(xp);
  const prog = rankProgress(xp);
  const xpPct = Math.round(prog.pct * 100);

  return (
    <>
      <header className="sticky top-0 z-50 h-16 border-b border-line bg-void/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-shell items-center justify-between gap-4 px-4 sm:px-6">
          {/* left: logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="90% — home">
            <img src="/favicon.svg" alt="" className="size-6" />
            <span className="font-display text-[19px] font-bold tracking-tight text-txt">
              90%<span className="animate-blink text-t1">▮</span>
            </span>
          </Link>

          {/* center: nav links (desktop) */}
          <nav className="hidden items-center gap-7 md:flex" aria-label="primary">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'hud-label relative py-1 text-[12px] transition-colors duration-200',
                    isActive ? 'text-txt' : 'text-txt-dim hover:text-txt',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {l.label}
                    <span
                      className={cn(
                        'absolute -bottom-0.5 left-0 h-[2px] bg-t1 transition-all duration-250 ease-expo-out',
                        isActive ? 'w-full' : 'w-0',
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* right: hud cluster */}
          <div className="flex items-center gap-3 sm:gap-4">
            <StreakFlame count={streak} className="hidden sm:inline-flex" />
            {/* mini XP bar with rank tooltip */}
            <div className="hidden items-center gap-2 lg:flex" title={`${rank.name} — ${formatXp(xp)} xp · ${xpPct}% to next`}>
              <div className="h-[6px] w-[120px] overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-xp transition-[width] duration-[600ms] ease-expo-out"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => setSound(!sound)}
              className="rounded-md p-1.5 text-txt-dim transition-colors hover:text-txt"
              aria-label={sound ? 'mute sounds' : 'unmute sounds'}
              title={sound ? 'sound: on' : 'sound: off'}
            >
              {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            {handle && (
              <span className="hidden rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[12px] text-txt-dim sm:inline-block">
                {handle}
              </span>
            )}
            {/* mobile hamburger */}
            <button
              className="rounded-md p-1.5 text-txt-dim transition-colors hover:text-txt md:hidden"
              onClick={() => setOpen(true)}
              aria-label="open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* mobile full-screen overlay menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] flex flex-col bg-void/95 backdrop-blur-lg md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <span className="font-display text-[19px] font-bold text-txt">
                90%<span className="animate-blink text-t1">▮</span>
              </span>
              <button
                className="rounded-md p-1.5 text-txt-dim hover:text-txt"
                onClick={() => setOpen(false)}
                aria-label="close menu"
              >
                <X size={22} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col items-start justify-center gap-6 px-8" aria-label="mobile">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.06 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'font-display text-4xl font-bold',
                      location.pathname === l.to ? 'text-t1' : 'text-txt',
                    )}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.06 * LINKS.length, duration: 0.3 }}
                className="mt-4 flex items-center gap-4"
              >
                <StreakFlame count={streak} />
                <span className="font-mono text-[13px] text-txt-dim">{rank.name}</span>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function formatXp(n: number): string {
  return n.toLocaleString('en-US');
}
