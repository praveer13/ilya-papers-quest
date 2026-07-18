import { useParams } from 'react-router';
import CornerPanel from '@/components/game/CornerPanel';

/**
 * Route stubs — replaced by the page agents. Keep them tiny and on-theme so
 * the shell is navigable end-to-end from day one.
 */

function Stub({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="mx-auto flex max-w-shell flex-col items-center px-4 py-32 sm:px-6">
      <CornerPanel cornerColor="#22D3EE" className="w-full max-w-[560px] p-10 text-center">
        <span className="micro-label text-txt-faint">// under construction</span>
        <h1 className="mt-3 font-display text-3xl font-bold text-txt">{title}</h1>
        <p className="mt-3 font-mono text-[13px] lowercase text-txt-dim">{caption}</p>
      </CornerPanel>
    </div>
  );
}

export function MapStub() {
  return <Stub title="quest map" caption="5 lanes · 32 paper nodes · 5 boss nodes" />;
}

export function PaperStub() {
  const { slug } = useParams();
  return <Stub title={`paper: ${slug ?? '?'}`} caption="briefing → eli-engineer → lab → checkpoint quiz" />;
}

export function BossStub() {
  const { trackId } = useParams();
  return <Stub title={`boss: ${trackId ?? '?'}`} caption="10 questions · 3 hearts · one hp bar" />;
}

export function AchievementsStub() {
  return <Stub title="badges & profile" caption="rank ladder · badge gallery · streak heatmap · save manager" />;
}

export function AboutStub() {
  return <Stub title="about / how to play" caption="the carmack story · rules & xp table · faq" />;
}
