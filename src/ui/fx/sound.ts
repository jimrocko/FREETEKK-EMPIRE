/**
 * Tiny synthesized sound effects (Web Audio, no files). UI-only – the game
 * logic never depends on them. Can be switched off in the settings.
 */
const KEY = 'tekklife.sound';

let ctx: AudioContext | null = null;
let enabled = readSetting();

function readSetting(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Private mode: the setting just isn't remembered.
  }
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  freq: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  cutoff?: number;
  cutoffTo?: number;
}

function tone(o: ToneOpts): void {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + (o.delay ?? 0);
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
  const peak = o.gain ?? 0.05;
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  let node: AudioNode = osc;
  if (o.cutoff) {
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 12;
    filter.frequency.setValueAtTime(o.cutoff, t0);
    if (o.cutoffTo) filter.frequency.exponentialRampToValueAtTime(o.cutoffTo, t0 + o.dur);
    osc.connect(filter);
    node = filter;
  }
  node.connect(amp);
  amp.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.02);
}

export const sfx = {
  /** Button press. */
  tap(): void {
    tone({ freq: 1600, to: 900, dur: 0.035, type: 'square', gain: 0.018 });
  },
  /** Action worked. */
  ok(): void {
    tone({ freq: 660, dur: 0.07, type: 'triangle', gain: 0.05 });
    tone({ freq: 990, dur: 0.1, type: 'triangle', gain: 0.05, delay: 0.06 });
  },
  /** Money in. */
  coin(): void {
    tone({ freq: 1318, dur: 0.06, type: 'square', gain: 0.025 });
    tone({ freq: 1976, dur: 0.12, type: 'square', gain: 0.025, delay: 0.05 });
  },
  /** Not possible. */
  error(): void {
    tone({ freq: 220, to: 110, dur: 0.18, type: 'sawtooth', gain: 0.035, cutoff: 1200 });
  },
  /** Level up, new status, big goal: a little acid line on a kick. */
  fanfare(): void {
    tone({ freq: 150, to: 40, dur: 0.3, type: 'sine', gain: 0.22 });
    const notes = [110, 165, 220, 330, 440];
    notes.forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'sawtooth', gain: 0.05, delay: 0.08 + i * 0.09, cutoff: 400 + i * 500, cutoffTo: 3000 }));
  },
};
