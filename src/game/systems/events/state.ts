export type SoundChoice = { kind: 'own'; systemId: string } | { kind: 'rental'; optionId: string };

export interface EventPlanInput {
  name: string;
  spotId: string;
  /** Real time the night starts (22:00 game time). */
  startsAt: number;
  /** Game hours (= real minutes). */
  durationH: number;
  /** Entry fee in € (0 = donations). */
  entry: number;
  /** Person ids or 'self'. */
  lineup: string[];
  sound: SoundChoice;
  transport: 'own' | 'rent';
  promo: string[];
  /** Goods item id → price per serving. Goods listed here are brought along. */
  prices: Record<string, number>;
  freeWater: boolean;
  helpers: number;
  awareness: boolean;
  medics: boolean;
  /** Bring the merch stock and run a stand. */
  merch?: boolean;
}

export type TaskStatus = 'open' | 'running' | 'done';
export type Weather = 'klar' | 'bewölkt' | 'regen' | 'sturm';

export interface EventScores {
  mood: number;
  sound: number;
  lineup: number;
  location: number;
  organisation: number;
  supply: number;
  safety: number;
}

export interface EventReport {
  visitors: number;
  demand: number;
  revenue: Record<string, number>;
  costs: Record<string, number>;
  profit: number;
  scores: EventScores;
  incidents: string[];
  highlights: string[];
  rep: number;
  xp: Partial<Record<string, number>>;
  newPeople: string[];
  played: string[];
  weather: Weather;
  hoursPlayed: number;
}

export interface GameEvent extends EventPlanInput {
  id: string;
  createdAt: number;
  status: 'scheduled' | 'running' | 'done' | 'cancelled';
  tasks: Record<string, TaskStatus>;
  /** Costs paid when planning (label → €). */
  paid: Record<string, number>;
  endsAt?: number;
  weather?: Weather;
  report?: EventReport;
  cancelReason?: string;
  /** Demand changes from random events (+0.2 = +20 %). */
  boosts?: { label: string; value: number }[];
}

export interface EventsState {
  list: GameEvent[];
  nextId: number;
}

export function createEventsState(): EventsState {
  return { list: [], nextId: 1 };
}
