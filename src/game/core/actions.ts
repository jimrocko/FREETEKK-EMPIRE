import type { GameState } from '../state';
import type { Reason } from './types';

/**
 * A player command. `check` returns a human readable reason when the action is
 * not possible (the UI shows it on disabled buttons); `run` mutates the draft
 * and may return a short confirmation text.
 */
export interface ActionDef<P> {
  id: string;
  check: (s: GameState, payload: P) => Reason;
  run: (d: GameState, payload: P) => string | void;
}

export function defineAction<P>(def: ActionDef<P>): ActionDef<P> {
  return def;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; reason: string };
