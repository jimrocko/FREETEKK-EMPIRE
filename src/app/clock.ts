/**
 * The app's notion of "now". In development a debug offset can push time
 * forward to test timers and offline progress without waiting.
 */
const OFFSET_KEY = 'tekklife.debug.offset';

export const DEBUG_ENABLED: boolean =
  import.meta.env.DEV || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug'));

let offset = 0;
if (DEBUG_ENABLED) {
  try {
    offset = Number(globalThis.localStorage?.getItem(OFFSET_KEY) ?? 0) || 0;
  } catch {
    offset = 0;
  }
}

export function now(): number {
  return Date.now() + offset;
}

export function addDebugOffset(ms: number): void {
  if (!DEBUG_ENABLED) return;
  offset += ms;
  try {
    globalThis.localStorage?.setItem(OFFSET_KEY, String(offset));
  } catch {
    /* ignore */
  }
}

export function debugOffset(): number {
  return offset;
}
