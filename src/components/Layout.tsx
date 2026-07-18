import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import Navbar from './Navbar';
import Footer from './Footer';
import XPToast from '@/components/game/XPToast';
import LevelUpModal from '@/components/game/LevelUpModal';
import { armAudio } from '@/lib/game/sound';

/**
 * Layout — global chrome: Navbar (sticky top-0 z-50, in normal flow so no
 * page needs offset bookkeeping), Footer (hidden on boss fights & quiz focus
 * mode), XP toast layer, level-up modal, first-gesture audio arming.
 *
 * ROUTING CONTRACT (react-dev.md): this Layout uses the CHILDREN pattern —
 * App.tsx must render `<Layout><Routes>…</Routes></Layout>`. Do not add an
 * <Outlet/> here.
 */
export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const focusMode = location.pathname.startsWith('/boss/');

  // arm WebAudio on the first user gesture anywhere (design.md §10)
  useEffect(() => {
    const arm = () => armAudio();
    window.addEventListener('pointerdown', arm, { once: true });
    window.addEventListener('keydown', arm, { once: true });
    return () => {
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
    };
  }, []);

  // scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-void text-txt">
      <Navbar />
      <main className="flex-1">{children}</main>
      {!focusMode && <Footer />}
      <XPToast />
      <LevelUpModal />
    </div>
  );
}
