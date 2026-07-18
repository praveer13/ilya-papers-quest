import { useSaveStore } from './save';

/**
 * WebAudio-synthesized UI blips — design.md §10. No audio files.
 * All sounds < 200 ms, global volume −18 dB. Sounds only fire after the first
 * user gesture (call `armAudio()` once from a pointer/key listener) and never
 * fire when the player muted via the navbar toggle.
 */

const MASTER_GAIN = 0.126; // ≈ −18 dB

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let armed = false;

/** Call once from a global pointerdown/keydown listener. */
export function armAudio(): void {
  if (armed) return;
  armed = true;
  try {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
    master = null;
  }
}

function enabled(): boolean {
  return armed && ctx != null && master != null && useSaveStore.getState().profile.sound;
}

interface ToneOpts {
  freq: number;
  endFreq?: number;
  dur: number; // seconds
  type?: OscillatorType;
  gain?: number; // 0..1 relative
  delay?: number; // seconds from now
}

function tone({ freq, endFreq, dur, type = 'sine', gain = 1, delay = 0 }: ToneOpts): void {
  if (!enabled() || !ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq != null) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  /** two-note rising arp 660→880 Hz, 90 ms */
  correct(): void {
    tone({ freq: 660, dur: 0.09 });
    tone({ freq: 880, dur: 0.09, delay: 0.07 });
  },
  /** single 180 Hz triangle, 160 ms, quieter */
  wrong(): void {
    tone({ freq: 180, dur: 0.16, type: 'triangle', gain: 0.5 });
  },
  /** 1.2 kHz 30 ms tick */
  xp(): void {
    tone({ freq: 1200, dur: 0.03, gain: 0.6 });
  },
  /** 4-note arp C5-E5-G5-C6 */
  levelUp(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone({ freq: f, dur: 0.11, delay: i * 0.08 }));
  },
  /** noise burst 120 ms lowpass — boss hit */
  bossHit(): void {
    if (!enabled() || !ctx || !master) return;
    const t0 = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = 0.8;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
  },
  /** combo blip — pitch rises a semitone per tier */
  combo(tier: number): void {
    const base = 660 * Math.pow(2, Math.min(tier, 12) / 12);
    tone({ freq: base, dur: 0.06, gain: 0.7 });
  },
} as const;
