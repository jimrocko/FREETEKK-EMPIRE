import { useSyncExternalStore } from 'react';

/** Whether the hack menu overlay is open (UI-only state). */
let open = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function openHack(): void {
  open = true;
  emit();
}

export function closeHack(): void {
  open = false;
  emit();
}

export function useHackOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
  );
}

/** Secret door: five quick taps on your emblem. */
let taps: number[] = [];
export function secretTap(at: number): boolean {
  taps = [...taps.filter((t) => at - t < 2000), at];
  if (taps.length >= 5) {
    taps = [];
    openHack();
    return true;
  }
  return false;
}
