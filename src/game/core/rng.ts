/**
 * Deterministic random number generator (mulberry32).
 * The generator state lives inside the game state so that simulations are
 * reproducible and survive save/load.
 */

export interface RngState {
  s: number;
}

export interface HasRng {
  rng: RngState;
}

export function createRng(seed: number): RngState {
  return { s: seed >>> 0 };
}

/** Advances the generator and returns a float in [0, 1). */
export function nextRandom(r: RngState): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rand(d: HasRng): number {
  return nextRandom(d.rng);
}

/** Integer in [min, max] (inclusive). */
export function randInt(d: HasRng, min: number, max: number): number {
  return min + Math.floor(rand(d) * (max - min + 1));
}

/** Float in [min, max). */
export function randRange(d: HasRng, min: number, max: number): number {
  return min + rand(d) * (max - min);
}

export function chance(d: HasRng, p: number): boolean {
  return rand(d) < p;
}

export function pick<T>(d: HasRng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() on empty list');
  return items[Math.floor(rand(d) * items.length)];
}

export function pickWeighted<T>(d: HasRng, items: readonly T[], weight: (item: T) => number): T | undefined {
  let total = 0;
  for (const it of items) total += Math.max(0, weight(it));
  if (total <= 0) return undefined;
  let roll = rand(d) * total;
  for (const it of items) {
    roll -= Math.max(0, weight(it));
    if (roll < 0) return it;
  }
  return items[items.length - 1];
}

export function shuffle<T>(d: HasRng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand(d) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Stable 32-bit hash for strings (used for seeds). */
export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
