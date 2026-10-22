import { createClock, type ClockState } from './core/time';
import { createRng, hashString, type RngState } from './core/rng';
import { createNotificationsState, notify, type NotificationsState } from './core/notify';
import { createFinanceState, type FinanceState } from './systems/finance/state';
import { createProgressionState, type ProgressionState } from './systems/progression/state';
import { createInventoryState, type InventoryState } from './systems/inventory/state';
import { createActivitiesState, type ActivitiesState } from './systems/activities/state';
import { createMarketState, type MarketState } from './systems/market/state';
import { createGoalsState, type GoalsState } from './systems/goals/state';
import { createMapState, type MapState } from './systems/map/state';
import { createSpotsState, type SpotsState } from './systems/spots/state';
import { addItem } from './systems/inventory/logic';
import { refreshOffers } from './systems/market/logic';

/** Bump when the shape of GameState changes and add a migration in save/migrations.ts. */
export const STATE_VERSION = 1;

export interface MetaState {
  version: number;
  createdAt: number;
  lastSavedAt: number;
  /** Real time spent with the game open. */
  playTimeMs: number;
  seed: number;
}

export interface PlayerState {
  name: string;
  cityId: string;
  homeId: string;
}

export interface GameState {
  meta: MetaState;
  clock: ClockState;
  rng: RngState;
  player: PlayerState;
  finance: FinanceState;
  progression: ProgressionState;
  inventory: InventoryState;
  activities: ActivitiesState;
  market: MarketState;
  goals: GoalsState;
  map: MapState;
  spots: SpotsState;
  notifications: NotificationsState;
}

export interface NewGameOptions {
  now: number;
  seed?: number;
  playerName?: string;
}

/** Fresh slices – also used by `hydrate` to fill in slices missing from old saves. */
export function createSlices(now: number, seed: number): GameState {
  return {
    meta: { version: STATE_VERSION, createdAt: now, lastSavedAt: now, playTimeMs: 0, seed },
    clock: createClock(now),
    rng: createRng(seed),
    player: { name: 'Namenlos', cityId: 'city.steinhafen', homeId: 'home.zimmer' },
    finance: createFinanceState(),
    progression: createProgressionState(),
    inventory: createInventoryState(),
    activities: createActivitiesState(),
    market: createMarketState(),
    goals: createGoalsState(),
    map: createMapState(now),
    spots: createSpotsState(),
    notifications: createNotificationsState(),
  };
}

export function createInitialState(opts: NewGameOptions): GameState {
  const seed = (opts.seed ?? hashString(String(opts.now))) >>> 0;
  const state = createSlices(opts.now, seed);
  const name = opts.playerName?.trim();
  if (name) state.player.name = name.slice(0, 24);

  addItem(state, 'item.phone-basic', { condition: 55 });
  addItem(state, 'item.headphones-cheap', { condition: 70 });
  refreshOffers(state, 1, { silent: true, count: 5 });

  notify(state, {
    tone: 'info',
    title: 'Willkommen in Steinhafen',
    text: '500 € auf der Hand, ein altes Handy und ein kleines Zimmer. Starte mit einem Nebenjob und schau dich auf dem Gebrauchtmarkt um.',
    link: '/jobs',
  });
  return state;
}
