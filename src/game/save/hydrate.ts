import { createSlices, type GameState } from '../state';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Recursively fills keys that are missing in `target` from `defaults`. Arrays and existing values are kept. */
export function fillDefaults(target: Record<string, unknown>, defaults: Record<string, unknown>): void {
  for (const [key, def] of Object.entries(defaults)) {
    const cur = target[key];
    if (cur === undefined) {
      target[key] = structuredClone(def);
    } else if (isPlainObject(cur) && isPlainObject(def)) {
      fillDefaults(cur, def);
    }
  }
}

/** Makes a loaded save complete: adds slices and fields introduced after it was written. */
export function hydrate(raw: Record<string, unknown>): GameState {
  const meta = isPlainObject(raw.meta) ? raw.meta : {};
  const now = typeof (raw.clock as { now?: unknown })?.now === 'number' ? (raw.clock as { now: number }).now : 0;
  const seed = typeof meta.seed === 'number' ? meta.seed : 1;
  const defaults = createSlices(now, seed) as unknown as Record<string, unknown>;
  fillDefaults(raw, defaults);
  return raw as unknown as GameState;
}

/** Basic sanity checks; returns a list of problems (empty = fine). */
export function validateState(s: GameState): string[] {
  const problems: string[] = [];
  const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (!finite(s.clock?.now)) problems.push('clock.now');
  if (!finite(s.clock?.origin)) problems.push('clock.origin');
  if (!finite(s.finance?.cash)) problems.push('finance.cash');
  if (!finite(s.rng?.s)) problems.push('rng');
  if (!Array.isArray(s.activities?.running)) problems.push('activities');
  if (!isPlainObject(s.inventory?.items)) problems.push('inventory');
  return problems;
}
