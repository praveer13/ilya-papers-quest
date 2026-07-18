import { Link } from 'react-router';
import { Download } from 'lucide-react';
import { saveSizeKB, useSaveStore } from '@/lib/game/save';
import { pushToast } from '@/lib/game/ui';

/**
 * Footer (design.md §12): 3 cols — brand + tagline · nav links · save file
 * status (`local · n KB` + export link). Bottom row: source links +
 * "not affiliated" disclaimer.
 */

function downloadSave() {
  const json = useSaveStore.getState().exportSave();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `np90-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  pushToast('save file exported — keep it safe', 'success');
}

export default function Footer() {
  const kb = useSaveStore((s) => saveSizeKB(s));

  return (
    <footer className="border-t border-line bg-abyss">
      <div className="mx-auto max-w-shell px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {/* brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/favicon.svg" alt="" className="size-5" />
              <span className="font-display text-lg font-bold text-txt">
                90%<span className="animate-blink text-t1">▮</span>
              </span>
            </div>
            <p className="mt-3 font-mono text-[13px] lowercase leading-relaxed text-txt-dim">
              30 papers. one save file.
              <br />
              90% of what matters.
            </p>
          </div>

          {/* nav links */}
          <nav className="flex flex-col gap-2.5" aria-label="footer">
            <span className="micro-label mb-1 text-txt-faint">navigate</span>
            {[
              { to: '/', label: 'command deck' },
              { to: '/map', label: 'quest map' },
              { to: '/achievements', label: 'badges & profile' },
              { to: '/about', label: 'about / how to play' },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="w-fit font-mono text-[13px] lowercase text-txt-dim transition-colors hover:text-t1"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* save file status */}
          <div className="flex flex-col gap-2.5">
            <span className="micro-label mb-1 text-txt-faint">save file</span>
            <span className="font-mono text-[13px] lowercase text-txt-dim">
              save file: local · {kb.toFixed(1)} KB
            </span>
            <button
              onClick={downloadSave}
              className="inline-flex w-fit items-center gap-1.5 font-mono text-[13px] lowercase text-t1 transition-colors hover:text-focus"
            >
              <Download size={13} />
              export .json
            </button>
            <span className="font-mono text-[12px] lowercase text-txt-faint">
              no account. no server. yours.
            </span>
          </div>
        </div>

        {/* bottom row */}
        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <span className="micro-label text-txt-faint">sources:</span>
            {[
              { href: 'https://arxiv.org', label: 'arxiv' },
              { href: 'https://karpathy.github.io/2015/05/21/rnn-effectiveness/', label: 'karpathy.github.io' },
              { href: 'https://nlp.seas.harvard.edu/annotated-transformer/', label: 'annotated transformer' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[12px] lowercase text-txt-faint transition-colors hover:text-txt-dim"
              >
                {l.label}
              </a>
            ))}
          </div>
          <p className="font-mono text-[12px] lowercase text-txt-faint">
            not affiliated with anyone — just a fan build.
          </p>
        </div>
      </div>
    </footer>
  );
}
