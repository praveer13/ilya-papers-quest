import type { DiagramNode, DiagramSpec, PaperContent } from './schema';
import { track1Papers } from './track1';
import { track2Papers } from './track2';
import { track3Papers } from './track3';
import { track4Papers } from './track4';
import { track5Papers } from './track5';

/**
 * Paper content registry — merges all five tracks, keyed by the slugs in
 * `@/lib/game/papers`. Every roster slug must resolve to content here.
 */

type LooseNode = { id: string; label: string; sub?: string; x?: number; y?: number; kind?: DiagramNode['kind']; w?: number };
type LooseSpec = Omit<DiagramSpec, 'nodes'> & { nodes: LooseNode[] };

/** Auto-layout left-to-right for diagrams authored without coordinates. */
function layoutSpec(spec: LooseSpec): DiagramSpec {
  const needsLayout = spec.nodes.some((n) => n.x === undefined || n.y === undefined);
  if (!needsLayout) return spec as DiagramSpec;
  const n = spec.nodes.length;
  const nodes: DiagramNode[] = spec.nodes.map((node, i) => ({
    kind: 'box',
    ...node,
    x: node.x ?? (n === 1 ? 50 : 12 + (76 * i) / (n - 1)),
    y: node.y ?? 26 + (i % 2 === 0 ? -8 : 8),
  }));
  return { ...spec, height: spec.height ?? 52, nodes };
}

/** Tracks 3–5 were authored against a coordinate-free diagram spec; normalize here. */
function normalize(papers: unknown[]): PaperContent[] {
  return (papers as PaperContent[]).map((p) => ({
    ...p,
    mechanism: { ...p.mechanism, diagram: layoutSpec(p.mechanism.diagram as LooseSpec) },
  }));
}

export const ALL_PAPER_CONTENT: PaperContent[] = [
  ...track1Papers,
  ...track2Papers,
  ...normalize(track3Papers),
  ...normalize(track4Papers),
  ...normalize(track5Papers),
];

export const PAPER_CONTENT_BY_SLUG: Record<string, PaperContent> = Object.fromEntries(
  ALL_PAPER_CONTENT.map((p) => [p.slug, p]),
);

/** content lookup by slug (undefined → content not written yet) */
export function paperContent(slug: string): PaperContent | undefined {
  return PAPER_CONTENT_BY_SLUG[slug];
}

export { track1Papers, track2Papers, track3Papers, track4Papers, track5Papers };
export type { PaperContent, SectionId, QuizQuestion, DiagramSpec, LabSpec } from './schema';
export { SECTION_IDS, SECTION_LABELS } from './schema';
