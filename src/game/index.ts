/** Public API of the game logic. The UI imports from here. */
export type { GameState } from './state';
export { createInitialState, STATE_VERSION } from './state';
export { tick, performAction, checkAction, catchUp, offlineCapMs, type CatchUpReport } from './engine';
export type { ActionDef, ActionResult } from './core/actions';
export { SYSTEMS } from './systems';
