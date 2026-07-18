import { cn } from '@/lib/utils';
import type { Track } from '@/lib/game/tracks';

/**
 * TrackChip — 999px chip, track color dot + name, 12px mono uppercase
 * (design.md §12).
 */

export interface TrackChipProps {
  track: Track;
  /** full name instead of short tag */
  full?: boolean;
  className?: string;
}

export default function TrackChip({ track, full = false, className }: TrackChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-2.5 py-1',
        'font-mono text-[12px] uppercase leading-none tracking-[0.08em] text-txt-dim',
        className,
      )}
    >
      <span
        className="inline-block size-[7px] rounded-full"
        style={{ backgroundColor: track.color, boxShadow: `0 0 8px ${track.color}` }}
      />
      {full ? track.name : `T${track.num} · ${track.short}`}
    </span>
  );
}
