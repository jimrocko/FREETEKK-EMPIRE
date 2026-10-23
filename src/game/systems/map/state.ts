import { CITIES, DISTRICTS } from '../../content/cities';
import { POIS } from '../../content/pois';

export interface DistrictState {
  /** 0–100 */
  explored: number;
  visits: number;
}

export interface PoiState {
  at: number;
  via: string;
}

export interface RumorState {
  heardAt: number;
  via: string;
  resolved?: boolean;
}

export interface MapState {
  cityId: string;
  districts: Record<string, DistrictState>;
  /** Known places (id → discovery info). */
  pois: Record<string, PoiState>;
  rumors: Record<string, RumorState>;
  /** Rented storage places (poi id → since). */
  rentals: Record<string, { since: number }>;
  /** City id → 0–100: how well that scene knows you (home city: always 100). */
  cityFame: Record<string, number>;
}

export function createMapState(now: number, cityId = 'city.steinhafen'): MapState {
  const city = CITIES.find((c) => c.id === cityId)!;
  const districts: Record<string, DistrictState> = {};
  for (const d of DISTRICTS) {
    if (d.cityId !== cityId) continue;
    districts[d.id] = { explored: city.startExplored[d.id] ?? 0, visits: 0 };
  }
  const pois: Record<string, PoiState> = {};
  for (const p of POIS) {
    if (p.cityId === cityId && p.explore === 0 && (city.startExplored[p.districtId] ?? 0) > 0) pois[p.id] = { at: now, via: 'start' };
  }
  return { cityId, districts, pois, rumors: {}, rentals: {}, cityFame: {} };
}
