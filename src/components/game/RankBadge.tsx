import { cn } from '@/lib/utils';
import type { Rank } from '@/lib/game/ranks';

/**
 * RankBadge — hexagonal chip with rank # (design.md §12). Rank 10
 * (Carmack Tier) renders the badge-carmack.png medal instead.
 */

export interface RankBadgeProps {
  rank: Rank;
  size?: number; // px, default 28
  showName?: boolean;
  className?: string;
}

export default function RankBadge({ rank, size = 28, showName = false, className }: RankBadgeProps) {
  const isCarmack = rank.n >= 10;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {isCarmack ? (
        <img
          src="/badge-carmack.png"
          alt="Carmack Tier medal"
          width={size}
          height={size}
          className="rounded-full"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="inline-flex items-center justify-center bg-surface-2 font-mono font-bold text-xp"
          style={{
            width: size,
            height: size,
            fontSize: size * 0.44,
            clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
            boxShadow: 'inset 0 0 0 1.5px rgba(251,191,36,0.55)',
          }}
        >
          {rank.n}
        </span>
      )}
      {showName && (
        <span className="hud-label text-txt-dim">{rank.name}</span>
      )}
    </span>
  );
}
