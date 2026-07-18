import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { RANKS, rankForXp, type Rank } from '@/lib/game/ranks';
import { formatInt, useReducedMotion } from '@/lib/game/format';
import { cn } from '@/lib/utils';
import Reveal from './Reveal';
import Tip from './Tip';

/**
 * Section 2 — Rank Ladder (achievements.md §2): 10 rank nodes on a gold
 * track line. Current rank enlarged (72px) with breathing glow + YOU ARE
 * HERE tag; passed solid gold with check; future 40% opacity. The gold fill
 * stops exactly at the player's XP fraction along the track. Horizontal on
 * desktop, vertical timeline on mobile.
 */

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const GOLD = '#FBBF24';

type NodeState = 'passed' | 'current' | 'future';

/** fraction (0..1) of the player's xp along the rank-1 → rank-10 track */
function ladderFraction(xp: number): number {
  const cur = rankForXp(xp);
  if (cur.n >= RANKS.length) return 1;
  const next = RANKS[cur.n]; // cur.n is 1-based → next element
  const span = next.xp - cur.xp;
  const f = span > 0 ? Math.min(1, Math.max(0, (xp - cur.xp) / span)) : 0;
  return (cur.n - 1 + f) / (RANKS.length - 1);
}

function tipLabel(rank: Rank, state: NodeState, xp: number): string {
  if (state === 'passed') return `${rank.name.toLowerCase()} — cleared`;
  if (state === 'current') return `${rank.name.toLowerCase()} — you are here`;
  const delta = rank.xp - xp;
  return `reach ${rank.name.toLowerCase()} at ${formatInt(rank.xp)} xp · ${formatInt(delta)} to go`;
}

function RankNode({
  rank,
  state,
  xp,
  delay,
  layout = 'stack',
}: {
  rank: Rank;
  state: NodeState;
  xp: number;
  delay: number;
  layout?: 'stack' | 'row';
}) {
  const reduced = useReducedMotion();
  const isCarmack = rank.n >= RANKS.length;
  const size = state === 'current' ? 72 : 40;

  const body = (
    <div
      tabIndex={0}
      role="img"
      aria-label={`rank ${rank.n}: ${rank.name} — ${tipLabel(rank, state, xp)}`}
      className={cn(
        'flex outline-none',
        layout === 'stack' ? 'flex-col items-center' : 'flex-row items-center gap-4',
        state === 'future' && 'opacity-40',
      )}
    >
      <div className="relative flex size-[72px] shrink-0 items-center justify-center">
        {state === 'current' && (
          <span
            className={cn(
              'absolute -top-6 whitespace-nowrap rounded-sm bg-xp px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-void',
              layout === 'stack' ? 'left-1/2 -translate-x-1/2' : 'left-0',
            )}
          >
            you are here
          </span>
        )}
        {isCarmack ? (
          <img
            src="/badge-carmack.png"
            alt="Carmack Tier medal"
            width={size}
            height={size}
            className={cn('rounded-full', state === 'current' && !reduced && 'rank-breathe')}
            style={{ width: size, height: size }}
          />
        ) : (
          <span
            className={cn(
              'inline-flex items-center justify-center font-mono font-bold',
              state === 'current' && !reduced && 'rank-breathe-hex',
            )}
            style={{
              width: size,
              height: size,
              fontSize: size * 0.4,
              clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
              ...(state === 'passed'
                ? { backgroundColor: GOLD, color: '#07070D' }
                : state === 'current'
                  ? { backgroundColor: '#1A1A2C', color: GOLD, boxShadow: 'inset 0 0 0 2px rgba(251,191,36,0.8)' }
                  : { backgroundColor: '#12121F', color: '#5B6178', boxShadow: 'inset 0 0 0 1.5px #24243A' }),
            }}
          >
            {state === 'passed' ? <Check size={size * 0.42} strokeWidth={3} /> : rank.n}
          </span>
        )}
      </div>
      <div className={cn('flex flex-col', layout === 'stack' && 'w-[104px] items-center text-center')}>
        <span
          className={cn(
            'mt-1 font-mono text-[11px] uppercase leading-snug tracking-[0.08em] text-txt-dim',
            layout === 'row' && 'whitespace-nowrap',
          )}
        >
          {String(rank.n).padStart(2, '0')} · {rank.name.toLowerCase()}
        </span>
        <span className="font-mono text-[11px] text-txt-faint">{formatInt(rank.xp)} xp</span>
      </div>
    </div>
  );

  const node = <Tip label={tipLabel(rank, state, xp)}>{body}</Tip>;

  if (reduced) return node;
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, delay }}
    >
      {node}
    </motion.div>
  );
}

export default function RankLadder({ xp }: { xp: number }) {
  const reduced = useReducedMotion();
  const current = rankForXp(xp);
  const frac = ladderFraction(xp);
  const stateOf = (rank: Rank): NodeState =>
    rank.n < current.n ? 'passed' : rank.n === current.n ? 'current' : 'future';

  return (
    <section className="py-20 md:py-24" aria-label="rank ladder">
      <style>{`
        @keyframes rank-breathe {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(251,191,36,0.35)); }
          50% { filter: drop-shadow(0 0 18px rgba(251,191,36,0.65)); }
        }
        .rank-breathe { animation: rank-breathe 2.4s ease-in-out infinite; }
        .rank-breathe-hex { animation: rank-breathe 2.4s ease-in-out infinite; }
      `}</style>
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <Reveal>
          <h3 className="font-display text-[22px] font-semibold text-txt">rank ladder</h3>
          <p className="mt-1 font-mono text-[13px] lowercase text-txt-dim">
            10 ranks · carmack tier at 15,000 xp
          </p>
        </Reveal>

        {/* desktop: horizontal timeline (scrolls on narrower viewports) */}
        <div className="mt-16 hidden overflow-x-auto pb-3 md:block">
          <div className="relative mx-9 min-w-[1060px]">
            {/* neutral track draws left→right */}
            <motion.div
              aria-hidden
              className="absolute inset-x-0 top-[35px] h-[3px] origin-left rounded-full bg-line"
              initial={reduced ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1, ease: EASE }}
            />
            {/* gold fill stops at the player's xp fraction */}
            <motion.div
              aria-hidden
              className="absolute left-0 top-[35px] h-[3px] origin-left rounded-full"
              style={{
                width: `${frac * 100}%`,
                background: `linear-gradient(90deg, rgba(251,191,36,0.45), ${GOLD})`,
                boxShadow: '0 0 12px rgba(251,191,36,0.45)',
              }}
              initial={reduced ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1.2, delay: 0.35, ease: EASE }}
            />
            <div className="relative flex justify-between">
              {RANKS.map((rank, i) => (
                <div
                  key={rank.n}
                  className="relative flex w-px justify-center"
                  style={{ zIndex: rank.n === current.n ? 2 : 1 }}
                >
                  <RankNode rank={rank} state={stateOf(rank)} xp={xp} delay={0.15 + i * 0.06} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* mobile: vertical timeline */}
        <div className="relative mt-10 md:hidden">
          <motion.div
            aria-hidden
            className="absolute bottom-5 left-[34px] top-6 w-[3px] origin-top rounded-full bg-line"
            initial={reduced ? false : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1, ease: EASE }}
          />
          <motion.div
            aria-hidden
            className="absolute left-[34px] top-6 w-[3px] origin-top rounded-full"
            style={{
              height: `calc((100% - 44px) * ${frac})`,
              background: `linear-gradient(180deg, rgba(251,191,36,0.45), ${GOLD})`,
              boxShadow: '0 0 12px rgba(251,191,36,0.45)',
            }}
            initial={reduced ? false : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1.2, delay: 0.35, ease: EASE }}
          />
          <div className="flex flex-col gap-7">
            {RANKS.map((rank, i) => (
              <div key={rank.n} className="relative">
                <RankNode rank={rank} state={stateOf(rank)} xp={xp} delay={0.1 + i * 0.06} layout="row" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
