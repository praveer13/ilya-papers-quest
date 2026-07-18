import { useState } from 'react';
import { motion } from 'framer-motion';
import type { DiagramNode, DiagramSpec } from '@/data/papers/schema';
import { useReducedMotion } from '@/lib/game/format';
import { cn } from '@/lib/utils';

/**
 * Diagram — bespoke per-paper architecture/flow figure (paper.md §3/S4).
 * Renders a hand-specced DiagramSpec (nodes + edges, 100-wide viewBox) with
 * track-colored strokes, a stroke-draw entry animation, and hover captions.
 * One spec per paper lives in the content data.
 */

const KIND_STYLE: Record<NonNullable<DiagramNode['kind']>, { fill: string; dash?: string }> = {
  box: { fill: 'rgba(26,26,44,0.9)' },
  op: { fill: 'rgba(18,18,31,0.9)', dash: '1.6 1.2' },
  io: { fill: 'rgba(10,10,20,0.9)' },
  mem: { fill: 'rgba(18,26,40,0.95)' },
};

function nodeDims(n: DiagramNode): { w: number; h: number } {
  const w = n.w ?? 16;
  return { w, h: n.kind === 'op' ? 9 : 10 };
}

export default function Diagram({
  spec,
  color,
  caption,
}: {
  spec: DiagramSpec;
  color: string;
  caption: string;
}) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const H = spec.height ?? 52;
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));

  /** clip a center→center line to the edge of the target/source boxes */
  const edgePts = (fromId: string, toId: string) => {
    const a = byId.get(fromId)!;
    const b = byId.get(toId)!;
    const da = nodeDims(a);
    const db = nodeDims(b);
    const clip = (p: DiagramNode, d: { w: number; h: number }, toward: DiagramNode) => {
      const dx = toward.x - p.x;
      const dy = toward.y - p.y;
      if (dx === 0 && dy === 0) return { x: p.x, y: p.y };
      const tx = dx !== 0 ? (d.w / 2 + 0.6) / Math.abs(dx) : Infinity;
      const ty = dy !== 0 ? (d.h / 2 + 0.6) / Math.abs(dy) : Infinity;
      const t = Math.min(tx, ty, 1);
      return { x: p.x + dx * t, y: p.y + dy * t };
    };
    return { p1: clip(a, da, b), p2: clip(b, db, a) };
  };

  const hoveredNode = hover ? byId.get(hover) : undefined;

  return (
    <figure className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border border-line bg-[#0A0A14]">
        <svg
          viewBox={`0 0 100 ${H}`}
          className="block w-full"
          role="img"
          aria-label={caption}
          style={{ minHeight: 220 }}
        >
          <defs>
            <marker
              id={`arr-${color.replace('#', '')}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill={color} opacity="0.8" />
            </marker>
          </defs>

          {/* edges under nodes */}
          {spec.edges.map((e, i) => {
            const { p1, p2 } = edgePts(e.from, e.to);
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            const lit = hover === e.from || hover === e.to;
            return (
              <g key={`${e.from}-${e.to}-${i}`}>
                <motion.line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={color}
                  strokeWidth={lit ? 0.9 : 0.55}
                  opacity={e.dashed ? 0.45 : lit ? 1 : 0.7}
                  strokeDasharray={e.dashed ? '2 1.6' : undefined}
                  markerEnd={`url(#arr-${color.replace('#', '')})`}
                  initial={reduced ? false : { pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.9, delay: reduced ? 0 : i * 0.08, ease: 'easeOut' }}
                />
                {e.label && (
                  <text
                    x={mx}
                    y={my - 1.2}
                    textAnchor="middle"
                    fontSize="2.6"
                    fill="#9AA1B8"
                    fontFamily='"JetBrains Mono", monospace'
                  >
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* nodes */}
          {spec.nodes.map((n, i) => {
            const { w, h } = nodeDims(n);
            const st = KIND_STYLE[n.kind ?? 'box'];
            const lit = hover === n.id;
            return (
              <motion.g
                key={n.id}
                initial={reduced ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: reduced ? 0 : 0.3 + i * 0.05 }}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                className="cursor-default"
              >
                <rect
                  x={n.x - w / 2}
                  y={n.y - h / 2}
                  width={w}
                  height={h}
                  rx={n.kind === 'op' ? h / 2 : 1.6}
                  fill={st.fill}
                  stroke={color}
                  strokeWidth={lit ? 0.9 : 0.55}
                  strokeDasharray={st.dash}
                  opacity={lit ? 1 : 0.9}
                  style={lit ? { filter: `drop-shadow(0 0 2px ${color})` } : undefined}
                />
                {n.kind === 'mem' && (
                  <rect
                    x={n.x - w / 2 + 1}
                    y={n.y - h / 2 + 1}
                    width={w - 2}
                    height={h - 2}
                    rx={1}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.3}
                    opacity={0.5}
                  />
                )}
                <text
                  x={n.x}
                  y={n.y + 0.9}
                  textAnchor="middle"
                  fontSize="3"
                  fontWeight={600}
                  fill="#E8EAF4"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  {n.label}
                </text>
              </motion.g>
            );
          })}
        </svg>

        {/* hover caption */}
        <div
          className={cn(
            'pointer-events-none absolute bottom-2 left-2 right-2 rounded-md border border-line bg-void/90 px-2.5 py-1.5 font-mono text-[11px] text-txt-dim transition-opacity',
            hoveredNode?.sub ? 'opacity-100' : 'opacity-0',
          )}
        >
          <span style={{ color }}>{hoveredNode?.label}</span>
          {hoveredNode?.sub ? ` — ${hoveredNode.sub}` : ''}
        </div>
      </div>
      <figcaption className="text-[13px] leading-relaxed text-txt-faint">{caption}</figcaption>
    </figure>
  );
}
