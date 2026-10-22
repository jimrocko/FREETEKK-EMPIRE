import type { GoalDef, HomeDef, ItemDef, JobDef, MessageTemplateDef, PersonDef, PoiDef, RepTier, RumorDef, ShopDef, SpotDef } from './types';
import type { CityDef, DistrictDef } from './cities';
import { ALL_ITEMS } from './items';
import { JOBS } from './jobs';
import { GOALS } from './goals';
import { HOMES } from './homes';
import { REP_TIERS } from './reputation';
import { CITIES, DISTRICTS } from './cities';
import { SPOTS } from './spots';
import { POIS } from './pois';
import { SHOPS } from './shops';
import { RUMORS } from './rumors';
import { PEOPLE } from './people';
import { MESSAGE_TEMPLATES } from './messages';

function indexById<T extends { id: string }>(list: readonly T[]): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const entry of list) map.set(entry.id, entry);
  return map;
}

export const ITEMS = indexById(ALL_ITEMS);
export const JOBS_BY_ID = indexById(JOBS);
export const GOALS_BY_ID = indexById(GOALS);
export const HOMES_BY_ID = indexById(HOMES);
export const CITIES_BY_ID = indexById(CITIES);
export const DISTRICTS_BY_ID = indexById(DISTRICTS);
export const SPOTS_BY_ID = indexById(SPOTS);
export const POIS_BY_ID = indexById(POIS);
export const SHOPS_BY_ID = indexById(SHOPS);
export const RUMORS_BY_ID = indexById(RUMORS);
export const PERSONS_BY_ID = indexById(PEOPLE);
export const TEMPLATES_BY_ID = indexById(MESSAGE_TEMPLATES);

function getter<T>(map: ReadonlyMap<string, T>, kind: string): (id: string) => T {
  return (id) => {
    const def = map.get(id);
    if (!def) throw new Error(`Unknown ${kind}: ${id}`);
    return def;
  };
}

export const cityDef: (id: string) => CityDef = getter(CITIES_BY_ID, 'city');
export const districtDef: (id: string) => DistrictDef = getter(DISTRICTS_BY_ID, 'district');
export const spotDef: (id: string) => SpotDef = getter(SPOTS_BY_ID, 'spot');
export const poiDef: (id: string) => PoiDef = getter(POIS_BY_ID, 'poi');
export const shopDef: (id: string) => ShopDef = getter(SHOPS_BY_ID, 'shop');
export const rumorDef: (id: string) => RumorDef = getter(RUMORS_BY_ID, 'rumor');
export const personDef: (id: string) => PersonDef = getter(PERSONS_BY_ID, 'person');
export const templateDef: (id: string) => MessageTemplateDef = getter(TEMPLATES_BY_ID, 'message template');

export function itemDef(id: string): ItemDef {
  const def = ITEMS.get(id);
  if (!def) throw new Error(`Unknown item: ${id}`);
  return def;
}

export function jobDef(id: string): JobDef {
  const def = JOBS_BY_ID.get(id);
  if (!def) throw new Error(`Unknown job: ${id}`);
  return def;
}

export function goalDef(id: string): GoalDef {
  const def = GOALS_BY_ID.get(id);
  if (!def) throw new Error(`Unknown goal: ${id}`);
  return def;
}

export function homeDef(id: string): HomeDef {
  const def = HOMES_BY_ID.get(id);
  if (!def) throw new Error(`Unknown home: ${id}`);
  return def;
}

export interface RepTierInfo {
  tier: RepTier;
  index: number;
  next: RepTier | null;
  /** 0–1 progress toward the next tier. */
  progress: number;
}

export function repTierFor(rep: number): RepTierInfo {
  let index = 0;
  for (let i = 0; i < REP_TIERS.length; i++) if (rep >= REP_TIERS[i].min) index = i;
  const tier = REP_TIERS[index];
  const next = REP_TIERS[index + 1] ?? null;
  const progress = next ? Math.min(1, (rep - tier.min) / (next.min - tier.min)) : 1;
  return { tier, index, next, progress };
}
