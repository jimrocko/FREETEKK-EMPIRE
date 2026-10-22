import type { GameState } from '../../state';

/** Number of people you know. */
export function networkSize(s: GameState): number {
  let n = 0;
  for (const p of Object.values(s.people.people)) if (p.met) n++;
  return n;
}
