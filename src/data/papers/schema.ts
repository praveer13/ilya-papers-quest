/**
 * Paper content schema — paper.md §6.
 *
 * Metadata (title, authors, year, xp, difficulty, minutes, hook) already lives
 * in `@/lib/game/papers` (the scaffold roster, keyed by slug). This schema
 * carries the *level content*: the 7 sections + lab spec + quiz pool. The
 * Paper page merges both records by slug.
 */

export type SectionId =
  | 'briefing'
  | 'eli-engineer'
  | 'intuitions'
  | 'mechanism'
  | 'lab'
  | 'bugs'
  | 'field-notes';

export const SECTION_IDS: SectionId[] = [
  'briefing',
  'eli-engineer',
  'intuitions',
  'mechanism',
  'lab',
  'bugs',
  'field-notes',
];

export const SECTION_LABELS: Record<SectionId, string> = {
  briefing: 'MISSION BRIEFING',
  'eli-engineer': 'ELI-ENGINEER',
  intuitions: 'KEY INTUITIONS',
  mechanism: 'CORE MECHANISM',
  lab: 'LAB // interactive',
  bugs: 'BUG REPORTS',
  'field-notes': 'FIELD NOTES',
};

// ---------------------------------------------------------------------------
// sections
// ---------------------------------------------------------------------------

export interface Briefing {
  /** 2–3 short paragraphs — why this paper matters */
  paragraphs: string[];
  /** mono `stakes:` line */
  stakes: string;
}

export interface EliEngineer {
  /** short prose framing (≤ ~350 words total) */
  prose: string[];
  /** the code-flavored analogy block */
  code: { lang: string; file: string; snippet: string };
}

export interface Intuition {
  /** punchy engineering metaphor, e.g. "A context vector is a lossy zip file" */
  title: string;
  /** 2–4 sentence explanation */
  body: string;
  /** `tell me more` drawer — extra 2–3 sentences */
  more?: string;
}

// ---------------------------------------------------------------------------
// mechanism (equation + diagram)
// ---------------------------------------------------------------------------

export interface DiagramNode {
  id: string;
  /** center x/y in a 0..100 × 0..`height` viewBox space */
  x: number;
  y: number;
  label: string;
  /** hover caption / subtitle */
  sub?: string;
  /** width in viewBox units (default 18) */
  w?: number;
  kind?: 'box' | 'op' | 'io' | 'mem';
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface DiagramSpec {
  /** viewBox height in units (width fixed 100). default 52 */
  height?: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface Mechanism {
  /** KaTeX display math */
  latex: string;
  /** term-by-term legend: symbol chip → plain-English meaning */
  terms: { symbol: string; meaning: string }[];
  diagram: DiagramSpec;
  /** figure caption under the diagram */
  caption: string;
}

// ---------------------------------------------------------------------------
// lab / bugs / field notes
// ---------------------------------------------------------------------------

export interface LabSpec {
  /** shown in the DemoFrame HUD header: `LAB // <name>` */
  name: string;
  /** footer hint bar: the gesture, e.g. `drag the slider · watch the gradient die` */
  hint: string;
  /** human-readable completion rule (shown as micro caption) */
  completion: string;
}

export interface BugReport {
  /** gotcha title, e.g. `sigmoid isn't "smoother" — it's a gradient killer` */
  title: string;
  /** `fix:` resolution line */
  fix: string;
}

export interface FieldNotes {
  /** slugs of sibling papers this one builds on */
  buildsOn: string[];
  /** slugs of papers this one unlocks / leads to */
  unlocks: string[];
  /** external further-reading links */
  further: { label: string; url: string }[];
  /** bibtex-style citation (copy-able mono block) */
  citation: string;
}

// ---------------------------------------------------------------------------
// quiz
// ---------------------------------------------------------------------------

export type QuizQuestion =
  | { type: 'mcq'; q: string; options: string[]; answer: number; why: string; tag: SectionId }
  | { type: 'tf'; q: string; answer: boolean; why: string; tag: SectionId }
  | { type: 'order'; q: string; items: string[]; answer: number[]; why: string; tag: SectionId }
  | { type: 'fill'; q: string; tokens: string[]; answer: string[]; why: string; tag: SectionId };

// ---------------------------------------------------------------------------
// the full level content record
// ---------------------------------------------------------------------------

export interface PaperContent {
  slug: string;
  /** venue / journal line, e.g. "NeurIPS 2017" */
  venue: string;
  /** original source URL (arXiv / blog / DOI) — always present */
  sourceUrl: string;
  briefing: Briefing;
  eliEngineer: EliEngineer;
  /** 3–4 intuition cards */
  intuitions: Intuition[];
  mechanism: Mechanism;
  lab: LabSpec;
  /** 2–4 bug reports */
  bugs: BugReport[];
  fieldNotes: FieldNotes;
  /** quiz pool (6–8); each attempt draws 5 */
  quiz: QuizQuestion[];
}
