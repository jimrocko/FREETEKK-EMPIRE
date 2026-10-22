import type { GameState } from '../../state';
import type { Legality, SpotDef, SpotStats } from '../../content/types';
import { SPOTS } from '../../content/spots';
import { spotDef } from '../../content/registry';
import { fmtNumber } from '../../core/format';
import { gameDayAt } from '../../core/time';
import type { SpotState } from './state';
import { mobilityFactor } from '../map/logic';

export const LEGALITY_LABELS: Record<Legality, string> = {
  legal: 'Legal',
  grey: 'Grauzone',
  illegal: 'Illegal',
};

export const SPOT_TYPE_LABELS: Record<SpotDef['type'], string> = {
  industrial: 'Industriehalle',
  warehouse: 'Lagerhalle',
  bunker: 'Bunker',
  forest: 'Wald',
  field: 'Brache',
  quarry: 'Steinbruch',
  lakeside: 'Seeufer',
  hall: 'Halle',
  basement: 'Keller',
  rooftop: 'Dach',
  yard: 'Hof',
  tracks: 'Gleisbrache',
  canteen: 'Kantine',
};

export const FEATURE_LABELS: Record<string, string> = {
  roof: 'Überdacht',
  toilets: 'Toiletten',
  water: 'Wasser',
  lighting: 'Licht',
  stage: 'Bühne',
  loading: 'Laderampe',
  heating: 'Heizung',
};

export function spotState(s: GameState, id: string): SpotState {
  return s.spots.spots[id];
}

export function knownSpots(s: GameState): SpotDef[] {
  return SPOTS.filter((sp) => s.spots.spots[sp.id]?.known);
}

/** Base stats plus world modifications. */
export function effectiveStats(s: GameState, id: string): SpotStats {
  const def = spotDef(id);
  const mods = s.spots.spots[id]?.mods ?? {};
  const out = { ...def.stats };
  for (const [k, v] of Object.entries(mods) as [keyof SpotStats, number][]) {
    const max = k === 'capacity' || k === 'powerKw' || k === 'vehicles' ? Number.POSITIVE_INFINITY : 100;
    out[k] = Math.max(0, Math.min(max, out[k] + v));
  }
  return out;
}

export function spotCheckMinutes(s: GameState, id: string): number {
  const access = effectiveStats(s, id).access;
  return Math.max(2, Math.round((3 + (100 - access) / 20) * mobilityFactor(s)));
}

/** Days since the last check (Infinity if never). */
export function daysSinceCheck(s: GameState, id: string): number {
  const at = s.spots.spots[id]?.lastCheckedAt;
  if (at === undefined) return Number.POSITIVE_INFINITY;
  return gameDayAt(s.clock, s.clock.now) - gameDayAt(s.clock, at);
}

export const STAT_LABELS: Record<keyof SpotStats, string> = {
  capacity: 'Kapazität',
  atmosphere: 'Atmosphäre',
  access: 'Zufahrt',
  powerKw: 'Strom',
  noise: 'Lärmverträglichkeit',
  weather: 'Wetterabhängigkeit',
  security: 'Sicherheit',
  vehicles: 'Platz für Fahrzeuge',
  infrastructure: 'Versorgung',
};

export const STAT_ORDER: (keyof SpotStats)[] = ['capacity', 'atmosphere', 'access', 'powerKw', 'noise', 'weather', 'security', 'vehicles', 'infrastructure'];

function band(v: number): string {
  if (v >= 80) return 'sehr hoch';
  if (v >= 60) return 'hoch';
  if (v >= 40) return 'mittel';
  if (v >= 20) return 'niedrig';
  return 'sehr niedrig';
}

export interface StatView {
  key: keyof SpotStats;
  label: string;
  text: string;
  /** 0–1 for bars, null when unknown. */
  bar: number | null;
  exact: boolean;
}

/**
 * What the player knows about a stat. With low intel the values are rough
 * estimates; checking the spot reveals exact numbers.
 */
export function statView(s: GameState, id: string, key: keyof SpotStats): StatView {
  const st = s.spots.spots[id];
  const v = effectiveStats(s, id)[key];
  const intel = st?.intel ?? 0;
  const label = STAT_LABELS[key];
  const exact = intel >= 100;
  if (key === 'capacity') {
    if (exact) return { key, label, text: `${fmtNumber(v)} Leute`, bar: null, exact };
    const spread = Math.max(0.15, (100 - intel) / 100);
    const lo = Math.max(10, Math.round((v * (1 - spread)) / 10) * 10);
    const hi = Math.round((v * (1 + spread)) / 10) * 10;
    return { key, label, text: `ca. ${fmtNumber(lo)}–${fmtNumber(hi)} Leute`, bar: null, exact };
  }
  if (key === 'powerKw') {
    if (exact) return { key, label, text: v > 0 ? `${fmtNumber(v)} kW` : 'kein Strom', bar: null, exact };
    if (intel >= 30) return { key, label, text: v > 0 ? 'Strom vorhanden?' : 'eher kein Strom?', bar: null, exact };
    return { key, label, text: 'unbekannt', bar: null, exact };
  }
  if (key === 'vehicles') {
    if (exact) return { key, label, text: `${fmtNumber(v)} Fahrzeuge`, bar: null, exact };
    return { key, label, text: intel >= 30 ? (v >= 8 ? 'viel Platz?' : v >= 3 ? 'etwas Platz?' : 'kaum Platz?') : 'unbekannt', bar: null, exact };
  }
  if (exact) return { key, label, text: `${fmtNumber(v)} / 100`, bar: v / 100, exact };
  if (intel >= 30) return { key, label, text: `${band(v)}?`, bar: null, exact };
  return { key, label, text: 'unbekannt', bar: null, exact };
}
