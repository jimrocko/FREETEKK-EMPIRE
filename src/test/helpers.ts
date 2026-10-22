import { produce } from 'immer';
import { createInitialState, type GameState } from '../game/state';
import { performAction, tick } from '../game/engine';
import type { ActionDef, ActionResult } from '../game/core/actions';

export const T0 = Date.UTC(2026, 0, 5, 12, 0, 0);

export function newGame(seed = 42, now = T0): GameState {
  return createInitialState({ now, seed, playerName: 'Testi' });
}

/** Runs an action on a plain (mutable) state. */
export function act<P>(s: GameState, action: ActionDef<P>, payload: P, now = s.clock.now): ActionResult {
  return performAction(s, action, payload, now);
}

export function advance(s: GameState, ms: number): void {
  tick(s, s.clock.now + ms);
}

/** Same as act, but through immer like the app does. */
export function actImmer<P>(s: GameState, action: ActionDef<P>, payload: P, now = s.clock.now): [GameState, ActionResult] {
  let result = { ok: false, reason: 'not run' } as ActionResult;
  const next = produce(s, (d) => {
    result = performAction(d as GameState, action, payload, now);
  });
  return [next, result];
}
