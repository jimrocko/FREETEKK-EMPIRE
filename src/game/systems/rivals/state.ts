import type { Tone } from '../../core/types';
import { RIVAL_CREWS } from '../../content/rivals';

export interface RivalEvent {
  id: string;
  crewId: string;
  spotId: string;
  startsAt: number;
  /** Game hours (= real minutes). */
  durationH: number;
  status: 'scheduled' | 'done' | 'cancelled';
  visitors?: number;
  mood?: number;
  raided?: boolean;
  /** The player plays a set there. */
  guest?: boolean;
  /** Short summary for the scene feed. */
  note?: string;
}

export interface RivalCrewState {
  active: boolean;
  appearedAt?: number;
  rep: number;
  money: number;
  /** People their sound system can serve. */
  reach: number;
  /** 0–100 */
  quality: number;
  members: number;
  knownSpots: string[];
  /** −100…100: how they feel about you. */
  relation: number;
  nextActionAt: number;
  /** Days in a row with negative money. */
  brokeDays: number;
  eventsHeld: number;
  bestVisitors: number;
  /** Their next planned party gets the player as guest DJ. */
  pendingGuest?: boolean;
  /** Last real time they contacted the player. */
  lastContactAt?: number;
  /** Game day of the last spot tip. */
  tipDay?: number;
  dissolved?: boolean;
}

export interface SceneNews {
  id: number;
  at: number;
  text: string;
  tone: Tone;
  crewId?: string;
  spotId?: string;
}

export interface Coop {
  crewId: string;
  until: number;
  share: number;
}

export interface RivalsState {
  crews: Record<string, RivalCrewState>;
  events: RivalEvent[];
  news: SceneNews[];
  nextId: number;
  /** Highest news id the player has seen. */
  seenNews: number;
  coop?: Coop;
}

export function createRivalState(def: (typeof RIVAL_CREWS)[number], now: number, index: number): RivalCrewState {
  return {
    active: !def.appears,
    ...(def.appears ? {} : { appearedAt: now }),
    rep: def.start.rep,
    money: def.start.money,
    reach: def.start.reach,
    quality: def.start.quality,
    members: def.start.members,
    knownSpots: [...def.spots],
    relation: 0,
    nextActionAt: now + (8 + index * 6) * 60_000,
    brokeDays: 0,
    eventsHeld: 0,
    bestVisitors: 0,
  };
}

export function createRivalsState(now: number): RivalsState {
  const crews: Record<string, RivalCrewState> = {};
  RIVAL_CREWS.forEach((def, i) => (crews[def.id] = createRivalState(def, now, i)));
  return { crews, events: [], news: [], nextId: 1, seenNews: 0 };
}
