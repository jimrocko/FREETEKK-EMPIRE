import type { GoalDef, HomeDef, ItemDef, JobDef, RepTier } from './types';
import { ALL_ITEMS } from './items';
import { JOBS } from './jobs';
import { GOALS } from './goals';
import { HOMES } from './homes';
import { REP_TIERS } from './reputation';

function indexById<T extends { id: string }>(list: readonly T[]): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const entry of list) map.set(entry.id, entry);
  return map;
}

export const ITEMS = indexById(ALL_ITEMS);
export const JOBS_BY_ID = indexById(JOBS);
export const GOALS_BY_ID = indexById(GOALS);
export const HOMES_BY_ID = indexById(HOMES);

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
