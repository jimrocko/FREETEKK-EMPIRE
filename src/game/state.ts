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
import { createPeopleState, type PeopleState } from './systems/people/state';
import { createMessagesState, type MessagesState } from './systems/messages/state';
import { createMusicState, type MusicState } from './systems/music/state';
import { createCrewState, type CrewState } from './systems/crew/state';
import { createSoundState, type SoundState } from './systems/sound/state';
import { createTransportState, type TransportState } from './systems/transport/state';
import { createEventsState, type EventsState } from './systems/events/state';
import { createMerchState, type MerchState } from './systems/merch/state';
import { createRivalsState, type RivalsState } from './systems/rivals/state';
import { createHappeningsState, type HappeningsState } from './systems/happenings/state';
import { createProjectsState, type ProjectsState } from './systems/projects/state';
import { createLegacyState, type LegacyState } from './systems/legacy/state';
import { createLifestyleState, type LifestyleState } from './systems/lifestyle/state';
import type { ScenarioDef } from './content/legacy';
import { applyStart } from './systems/legacy/logic';
import { SCENARIOS } from './content/legacy';
import { cityDef } from './content/registry';
import { addItem } from './systems/inventory/logic';
import { refreshOffers } from './systems/market/logic';

/** Bump when the shape of GameState changes and add a migration in save/migrations.ts. */
export const STATE_VERSION = 2;

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
  /** Where your scene knows you best (crowds there are not scaled by city fame). */
  homeCity: string;
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
  people: PeopleState;
  messages: MessagesState;
  music: MusicState;
  crew: CrewState;
  sound: SoundState;
  transport: TransportState;
  events: EventsState;
  merch: MerchState;
  rivals: RivalsState;
  happenings: HappeningsState;
  projects: ProjectsState;
  legacy: LegacyState;
  lifestyle: LifestyleState;
  notifications: NotificationsState;
}

export interface NewGameOptions {
  now: number;
  seed?: number;
  playerName?: string;
  /** Start scenario (default: the classic start). */
  scenario?: ScenarioDef;
  /** Carried over from earlier runs. */
  legacy?: LegacyState;
}

/** Fresh slices – also used by `hydrate` to fill in slices missing from old saves. */
export function createSlices(now: number, seed: number): GameState {
  return {
    meta: { version: STATE_VERSION, createdAt: now, lastSavedAt: now, playTimeMs: 0, seed },
    clock: createClock(now),
    rng: createRng(seed),
    player: { name: 'Namenlos', cityId: 'city.steinhafen', homeId: 'home.zimmer', homeCity: 'city.steinhafen' },
    finance: createFinanceState(),
    progression: createProgressionState(),
    inventory: createInventoryState(),
    activities: createActivitiesState(),
    market: createMarketState(),
    goals: createGoalsState(),
    map: createMapState(now),
    spots: createSpotsState(),
    people: createPeopleState(now),
    messages: createMessagesState(now),
    music: createMusicState(),
    crew: createCrewState(),
    sound: createSoundState(),
    transport: createTransportState(),
    events: createEventsState(),
    merch: createMerchState(),
    rivals: createRivalsState(now),
    happenings: createHappeningsState(now),
    projects: createProjectsState(),
    legacy: createLegacyState(),
    lifestyle: createLifestyleState(),
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
  if (opts.legacy) state.legacy = structuredClone(opts.legacy);
  const scenario = opts.scenario ?? SCENARIOS[0];
  applyStart(state, scenario);
  refreshOffers(state, 1, { silent: true, count: 5 });

  const city = cityDef(state.map.cityId);
  notify(state, {
    tone: 'info',
    title: state.legacy.runs > 0 ? `Kapitel ${state.legacy.runs + 1}: ${scenario.name}` : `Willkommen in ${city.name}`,
    text:
      state.legacy.runs > 0
        ? `${scenario.description} Dein Vermächtnis: ${state.legacy.runs} ${state.legacy.runs === 1 ? 'Lauf' : 'Läufe'} vor dir.`
        : '500 € auf der Hand, ein altes Handy und ein kleines Zimmer. Starte mit einem Nebenjob und schau dich auf dem Gebrauchtmarkt um.',
    link: '/jobs',
  });
  return state;
}
