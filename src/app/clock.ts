/**
 * The app's notion of "now". A clock offset (hack menu, tests) can push time
 * forward to skip waiting; it is stored so it survives reloads.
 */
const OFFSET_KEY = 'tekklife.debug.offset';

let offset = 0;
try {
  offset = Number(globalThis.localStorage?.getItem(OFFSET_KEY) ?? 0) || 0;
} catch {
  offset = 0;
}

export function now(): number {
  return Date.now() + offset;
}

/** Moves the clock forward (never backward – the game only knows the future). */
export function addClockOffset(ms: number): void {
  if (!(ms > 0)) return;
  offset += ms;
  try {
    globalThis.localStorage?.setItem(OFFSET_KEY, String(offset));
  } catch {
    /* ignore */
  }
}

export function clockOffset(): number {
  return offset;
}
