import type { SpotStats } from '../../content/types';
import { SPOTS } from '../../content/spots';

export interface SpotState {
  known: boolean;
  discoveredAt?: number;
  via?: string;
  /** 0–100: how well the player knows the real values. */
  intel: number;
  lastCheckedAt?: number;
  /** 0–100: how well-known the spot is in the scene. High fame attracts police and rivals. */
  fame: number;
  /** 0–100 */
  condition: number;
  status: 'open' | 'closed';
  /** Game day on which a closed spot reopens. */
  closedUntilDay?: number;
  /** Changes to the base stats caused by world events. */
  mods: Partial<SpotStats>;
  events: number;
}

export interface SpotsState {
  spots: Record<string, SpotState>;
}

export function createSpotState(def: (typeof SPOTS)[number]): SpotState {
  return { known: false, intel: 0, fame: def.fame, condition: def.condition, status: 'open', mods: {}, events: 0 };
}

export function createSpotsState(): SpotsState {
  const spots: Record<string, SpotState> = {};
  for (const def of SPOTS) spots[def.id] = createSpotState(def);
  return { spots };
}
