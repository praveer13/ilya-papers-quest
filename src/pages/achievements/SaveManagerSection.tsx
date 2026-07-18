import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Download, FileJson, ShieldAlert, Upload } from 'lucide-react';
import CornerPanel from '@/components/game/CornerPanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSaveStore } from '@/lib/game/save';
import { confettiEnabled } from '@/lib/game/confetti';
import { formatInt, useReducedMotion } from '@/lib/game/format';
import { pushToast } from '@/lib/game/ui';
import { cn } from '@/lib/utils';
import Reveal from './Reveal';

/**
 * Section 6 — Save File Manager (achievements.md §6): cyan CornerPanel with
 * three rows — Export (download JSON, first export unlocks Save Scummer),
 * Import (file picker / drag-drop, schema-validated preview before
 * replacing), and a danger zone (type DELETE to confirm → 600 ms CRT
 * poweroff → fresh save).
 */

const CYAN = '#22D3EE';

interface ImportPreview {
  json: string;
  xp: number;
  papers: number;
  bosses: number;
  handle: string;
}

/** client-side pre-validation mirroring the store's importSave checks */
function parseImport(text: string): { ok: true; preview: ImportPreview } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (typeof parsed !== 'object' || parsed === null) return { ok: false, error: 'not an object' };
    if (parsed.version !== 1) return { ok: false, error: `unsupported version: ${String(parsed.version)}` };
    if (typeof parsed.xp !== 'number' || typeof parsed.profile !== 'object' || !parsed.profile) {
      return { ok: false, error: 'schema mismatch (xp/profile)' };
    }
    const papers = Object.values((parsed.papers ?? {}) as Record<string, { mastered?: boolean }>).filter(
      (p) => p?.mastered,
    ).length;
    const bosses = Object.values((parsed.bosses ?? {}) as Record<string, { cleared?: boolean }>).filter(
      (b) => b?.cleared,
    ).length;
    const handle =
      typeof (parsed.profile as { handle?: unknown }).handle === 'string'
        ? ((parsed.profile as { handle: string }).handle || 'player_1')
        : 'player_1';
    return { ok: true, preview: { json: text, xp: parsed.xp, papers, bosses, handle } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'invalid json' };
  }
}

/** 600 ms CRT poweroff: white screen collapses to a horizontal line → black */
function CrtPoweroff() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <motion.div
        className="absolute inset-0 origin-center bg-white"
        initial={{ scaleY: 1, scaleX: 1 }}
        animate={{ scaleY: [1, 0.004, 0.004], scaleX: [1, 1, 0] }}
        transition={{ duration: 0.6, times: [0, 0.65, 1], ease: 'easeIn' }}
      />
    </motion.div>
  );
}

export default function SaveManagerSection() {
  const reduced = useReducedMotion();
  const importSave = useSaveStore((s) => s.importSave);
  const resetSave = useSaveStore((s) => s.resetSave);

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [powerOff, setPowerOff] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const json = useSaveStore.getState().exportSave();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `np90-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('save file exported — keep it safe', 'success');
    if (confettiEnabled()) {
      confetti({
        particleCount: 36,
        spread: 60,
        origin: { y: 0.85 },
        colors: [CYAN, '#FBBF24', '#E8EAF4'],
        disableForReducedMotion: true,
      });
    }
  };

  const readFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    file
      .text()
      .then((text) => {
        const res = parseImport(text);
        if (res.ok) setPreview(res.preview);
        else {
          setPreview(null);
          setError(`invalid save: ${res.error}`);
        }
      })
      .catch(() => setError('invalid save: could not read file'));
  };

  const confirmImport = () => {
    if (!preview) return;
    const res = importSave(preview.json);
    if (res.ok) {
      setPreview(null);
      setError(null);
    } else {
      setError(`invalid save: ${res.error ?? 'unknown error'}`);
    }
  };

  const confirmReset = () => {
    setDialogOpen(false);
    setConfirmText('');
    if (reduced) {
      resetSave();
      pushToast('save file wiped. the void remembers nothing.', 'info');
      return;
    }
    setPowerOff(true);
    window.setTimeout(() => resetSave(), 480);
    window.setTimeout(() => {
      setPowerOff(false);
      pushToast('save file wiped. the void remembers nothing.', 'info');
    }, 900);
  };

  return (
    <section className="border-t border-line bg-abyss py-20 md:py-24" aria-label="save file manager">
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <Reveal>
          <h3 className="font-display text-[22px] font-semibold text-txt">save file manager</h3>
          <p className="mt-1 font-mono text-[13px] lowercase text-txt-dim">
            one save file. yours. move it, back it up, or burn it down.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <CornerPanel cornerColor={CYAN} className="mt-10 divide-y divide-line">
            {/* row 1: export */}
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-4">
                <Download size={20} className="mt-0.5 shrink-0 text-t1" />
                <div>
                  <p className="hud-label text-[13px] text-txt">export</p>
                  <p className="mt-1.5 max-w-[52ch] font-mono text-[13px] lowercase leading-relaxed text-txt-dim">
                    download your save as json. move browsers, keep your soul.
                  </p>
                </div>
              </div>
              <button
                onClick={doExport}
                className="hud-label shrink-0 rounded-lg border border-t1/60 bg-t1/10 px-5 py-2.5 text-[12px] text-t1 transition-all duration-200 hover:bg-t1/20 hover:shadow-glow-cyan"
              >
                export save
              </button>
            </div>

            {/* row 2: import */}
            <div className="flex flex-col gap-4 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <Upload size={20} className="mt-0.5 shrink-0 text-t1" />
                <div>
                  <p className="hud-label text-[13px] text-txt">import</p>
                  <p className="mt-1.5 max-w-[52ch] font-mono text-[13px] lowercase leading-relaxed text-txt-dim">
                    restore a previously exported save. merge is not supported — this replaces your
                    current save after confirmation.
                  </p>
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  readFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  readFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors duration-200',
                  dragOver
                    ? 'animate-pulse border-t1 bg-t1/10'
                    : 'border-line bg-void/40 hover:border-t1/50 hover:bg-t1/5',
                )}
              >
                <FileJson size={22} className="text-txt-faint" />
                <span className="font-mono text-[13px] lowercase text-txt-dim">
                  drop np90-save.json here or click to browse
                </span>
              </div>

              {error && (
                <p className="font-mono text-[13px] lowercase text-danger" role="alert">
                  {error}
                </p>
              )}

              {preview && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3 rounded-lg border border-t1/40 bg-t1/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="font-mono text-[13px] lowercase text-txt-dim">
                    found save: <span className="text-txt">{preview.handle}</span> · xp{' '}
                    {formatInt(preview.xp)} · {preview.papers} papers · {preview.bosses} bosses
                  </p>
                  <div className="flex shrink-0 gap-3">
                    <button
                      onClick={confirmImport}
                      className="hud-label rounded-lg border border-t1/60 bg-t1/10 px-4 py-2 text-[12px] text-t1 transition-colors hover:bg-t1/20"
                    >
                      load this save
                    </button>
                    <button
                      onClick={() => setPreview(null)}
                      className="hud-label rounded-lg border border-line px-4 py-2 text-[12px] text-txt-dim transition-colors hover:text-txt"
                    >
                      cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* row 3: danger zone */}
            <div className="border-t-2 border-danger/40">
              <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <div className="flex items-start gap-4">
                  <ShieldAlert size={20} className="mt-0.5 shrink-0 text-danger" />
                  <div>
                    <p className="hud-label text-[13px] text-danger">danger zone</p>
                    <p className="mt-1.5 max-w-[52ch] font-mono text-[13px] lowercase leading-relaxed text-txt-dim">
                      wipe the save file and start over. xp, badges, streaks — everything. there is
                      no undo.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDialogOpen(true)}
                  className="hud-label shrink-0 rounded-lg border border-danger/60 px-5 py-2.5 text-[12px] text-danger transition-all duration-200 hover:bg-danger/10 hover:shadow-glow-danger"
                >
                  reset save
                </button>
              </div>
            </div>
          </CornerPanel>
        </Reveal>
      </div>

      {/* reset confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-danger/40 bg-surface-2 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-danger">wipe the save file?</DialogTitle>
            <DialogDescription className="font-mono text-[13px] lowercase text-txt-dim">
              this deletes every paper, badge, streak, and xp point you have earned. the void
              remembers nothing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label htmlFor="reset-confirm" className="font-mono text-[12px] lowercase text-txt-faint">
              type <span className="font-bold text-danger">DELETE</span> to confirm
            </label>
            <input
              id="reset-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && confirmText === 'DELETE') confirmReset();
              }}
              autoComplete="off"
              spellCheck={false}
              className="rounded-md border border-line bg-void px-3 py-2 font-mono text-[14px] text-txt outline-none focus:border-danger/60"
              placeholder="DELETE"
            />
            <div className="mt-1 flex justify-end gap-3">
              <button
                onClick={() => setDialogOpen(false)}
                className="hud-label rounded-lg border border-line px-4 py-2 text-[12px] text-txt-dim transition-colors hover:text-txt"
              >
                cancel
              </button>
              <button
                onClick={confirmReset}
                disabled={confirmText !== 'DELETE'}
                className="hud-label rounded-lg border border-danger/60 bg-danger/10 px-4 py-2 text-[12px] text-danger transition-all enabled:hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                wipe it
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CRT poweroff overlay */}
      <AnimatePresence>{powerOff && <CrtPoweroff />}</AnimatePresence>
    </section>
  );
}
