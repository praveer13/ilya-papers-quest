import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * DemoFrame — the bordered lab enclosure (design.md §12): HUD header
 * (`LAB // <name>`, status LED, reset button), stage, footer hint bar.
 * The lab body lazy-mounts on viewport entry.
 */
export default function DemoFrame({
  name,
  hint,
  completion,
  color,
  done,
  onReset,
  children,
}: {
  name: string;
  hint: string;
  completion: string;
  color: string;
  done: boolean;
  /** bump to signal the lab child to reset */
  onReset?: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || mounted) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setMounted(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mounted]);

  return (
    <div ref={ref} className="overflow-hidden rounded-xl border border-line bg-surface">
      {/* HUD header */}
      <div className="flex items-center gap-3 border-b border-line bg-surface-2/60 px-4 py-2.5">
        <span className="hud-label text-txt-dim">
          LAB <span className="text-txt-faint">//</span> <span style={{ color }}>{name}</span>
        </span>
        <span
          className={cn('ml-auto inline-block size-2 rounded-full transition-all')}
          style={{
            backgroundColor: done ? '#34D399' : '#5B6178',
            boxShadow: done ? '0 0 8px #34D399' : 'none',
          }}
          title={done ? 'experiment complete' : 'awaiting interaction'}
        />
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-txt-faint transition-colors hover:border-focus hover:text-txt"
          >
            <RotateCcw className="size-3" />
            reset
          </button>
        )}
      </div>

      {/* stage */}
      <div className="min-h-[320px] bg-[#0A0A14] p-4 sm:p-5">
        {mounted ? (
          children
        ) : (
          <div className="flex h-[320px] items-center justify-center font-mono text-[12px] text-txt-faint">
            loading lab…
          </div>
        )}
      </div>

      {/* footer hint bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-surface-2/60 px-4 py-2">
        <span className="font-mono text-[11px] lowercase tracking-wide text-txt-faint">{hint}</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-txt-faint/70">
          complete: {completion}
        </span>
      </div>
    </div>
  );
}
