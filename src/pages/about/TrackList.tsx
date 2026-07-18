import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import TrackChip from '@/components/game/TrackChip';
import { TRACKS } from '@/lib/game/tracks';
import { paperBySlug, papersByTrack } from '@/lib/game/papers';
import { trackProgress } from '@/lib/game/unlocks';
import { useReducedMotion } from '@/lib/game/format';
import { useSaveStore } from '@/lib/game/save';
import Reveal from '../achievements/Reveal';

/**
 * Section 2 — The List (about.md §2): five compact track rows (chip, paper
 * count, three representative titles, live mini progress bar when started).
 * Hover → track-color wash; click → /map (lane anchored).
 */

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** three representative papers per track (slugs resolved against the roster) */
const REPRESENTATIVE: Record<string, [string, string, string]> = {
  t1: ['char-rnn', 'lstm-1997', 'rnn-dropout-2014'],
  t2: ['seq2seq-2014', 'bahdanau-2014', 'transformer-2017'],
  t3: ['alexnet-2012', 'resnet-2015', 'dilated-conv-2015'],
  t4: ['batchnorm-2015', 'dropout-2014', 'adam-2014'],
  t5: ['deep-speech-2014', 'scaling-laws-2020', 'gpipe-2018'],
};

export default function TrackList() {
  const reduced = useReducedMotion();
  const save = useSaveStore();

  return (
    <section className="border-t border-line bg-abyss py-20 md:py-24" aria-label="the list">
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <Reveal>
          <h2 className="font-display text-[clamp(26px,4vw,32px)] font-semibold text-txt">the list</h2>
          <p className="mt-1 font-mono text-[13px] lowercase text-txt-dim">
            {'// reconstructed — see the fine print below'}
          </p>
        </Reveal>

        <div className="mt-10 flex flex-col gap-3">
          {TRACKS.map((track, i) => {
            const lane = papersByTrack(track.id);
            const bonus = lane.filter((p) => p.bonus).length;
            const prog = trackProgress(save, track.id);
            const titles = REPRESENTATIVE[track.id]
              .map((slug) => paperBySlug(slug)?.title)
              .filter((t): t is string => !!t);

            const row = (
              <Link
                to={`/map#${track.id}`}
                style={{ '--row': track.color } as CSSProperties}
                className="grid grid-cols-1 gap-3 rounded-xl border border-line px-5 py-4 transition-colors duration-200 ease-expo-out md:grid-cols-[auto_auto_1fr_auto] md:items-center md:gap-6 bg-[color-mix(in_srgb,var(--row)_4%,transparent)] hover:border-[color-mix(in_srgb,var(--row)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--row)_8%,transparent)]"
                aria-label={`track ${track.num}: ${track.name} — open on the quest map`}
              >
                <TrackChip track={track} />
                <span className="whitespace-nowrap font-mono text-[12px] lowercase text-txt-dim">
                  {prog.total} files
                  {bonus > 0 && <span className="text-txt-faint"> · {bonus} ★ bonus</span>}
                </span>
                <span className="truncate text-[13px] text-txt-dim" title={titles.join(' · ')}>
                  {titles.join(' · ')}
                </span>
                <span className="flex items-center gap-2.5">
                  {!prog.unlocked ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[12px] lowercase text-txt-faint">
                      <Lock size={12} />
                      locked — {track.unlockHint}
                    </span>
                  ) : prog.mastered > 0 || prog.bossCleared ? (
                    <>
                      <span className="h-[4px] w-24 overflow-hidden rounded-full bg-line">
                        <span
                          className="block h-full rounded-full transition-[width] duration-500 ease-expo-out"
                          style={{
                            width: `${(prog.mastered / prog.total) * 100}%`,
                            backgroundColor: track.color,
                          }}
                        />
                      </span>
                      <span className="font-mono text-[12px] text-txt-dim">
                        {prog.mastered}/{prog.total}
                        {prog.bossCleared && <span style={{ color: track.color }}> · boss ✓</span>}
                      </span>
                    </>
                  ) : (
                    <span className="font-mono text-[12px] lowercase text-txt-faint">not started</span>
                  )}
                </span>
              </Link>
            );

            if (reduced) return <div key={track.id}>{row}</div>;
            return (
              <motion.div
                key={track.id}
                initial={{ x: -32, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
              >
                {row}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
