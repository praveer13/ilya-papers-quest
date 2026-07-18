import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * CornerPanel — the signature HUD primitive (design.md §8): a --surface panel
 * whose four corners get L-brackets (12px default), colored per context
 * (track color, gold for rewards, red for boss). Used for briefing panels,
 * quiz containers, boss frames, stat cards, modals.
 */

export interface CornerPanelProps {
  children: ReactNode;
  /** bracket color (hex). default: panel border color */
  cornerColor?: string;
  /** bracket arm length in px (default 12) */
  cornerSize?: number;
  /** bracket stroke width in px (default 2) */
  cornerWidth?: number;
  /** raised surface-2 background */
  raised?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

const POSITIONS = [
  { pos: { top: -1, left: -1 }, borders: ['borderTop', 'borderLeft'] },
  { pos: { top: -1, right: -1 }, borders: ['borderTop', 'borderRight'] },
  { pos: { bottom: -1, left: -1 }, borders: ['borderBottom', 'borderLeft'] },
  { pos: { bottom: -1, right: -1 }, borders: ['borderBottom', 'borderRight'] },
] as const;

export default function CornerPanel({
  children,
  cornerColor = '#24243A',
  cornerSize = 12,
  cornerWidth = 2,
  raised = false,
  className,
  style,
  onClick,
}: CornerPanelProps) {
  return (
    <div
      className={cn('relative', raised ? 'panel-2' : 'panel', className)}
      style={style}
      onClick={onClick}
    >
      {POSITIONS.map(({ pos, borders }, i) => {
        const s: CSSProperties = {
          ...pos,
          width: cornerSize,
          height: cornerSize,
          borderStyle: 'solid',
          borderWidth: 0,
        };
        for (const b of borders) s[b] = `${cornerWidth}px solid ${cornerColor}`;
        return <span key={i} aria-hidden className="pointer-events-none absolute" style={s} />;
      })}
      {children}
    </div>
  );
}
