import type { GameState } from '../../state';
import type { Reason } from '../../core/types';
import type { DistrictDef } from '../../content/cities';
import type { PoiDef, RumorDef, RumorSource, SpotDef } from '../../content/types';
import { DISTRICTS } from '../../content/cities';
import { POIS } from '../../content/pois';
import { SPOTS } from '../../content/spots';
import { RUMORS } from '../../content/rumors';
import { ITEMS, poiDef, rumorDef, spotDef } from '../../content/registry';
import { requirementReason } from '../../core/conditions';
import { notify } from '../../core/notify';
import { chance, pick } from '../../core/rng';
import { incStat, skillLevel } from '../progression/logic';
import type { DistrictState } from './state';

export function cityDistricts(s: GameState): DistrictDef[] {
  return DISTRICTS.filter((d) => d.cityId === s.map.cityId);
}

export function districtState(s: GameState, id: string): DistrictState {
  return s.map.districts[id] ?? { explored: 0, visits: 0 };
}

export function districtLockReason(s: GameState, d: DistrictDef): Reason {
  return requirementReason(s, d.requires);
}

/** Best travel multiplier of owned vehicles/bikes (1 = on foot). */
export function mobilityFactor(s: GameState): number {
  let best = 1;
  for (const it of Object.values(s.inventory.items)) {
    const travel = ITEMS.get(it.defId)?.stats?.travel;
    if (travel && travel < best) best = travel;
  }
  return best;
}

export function exploreDurationMin(s: GameState, d: DistrictDef): number {
  return Math.max(1, Math.round(d.exploreMin * mobilityFactor(s) * 10) / 10);
}

/** Explored % gained by the next exploration: diminishing, boosted by the network skill. */
export function exploreGain(s: GameState, d: DistrictDef): number {
  const explored = districtState(s, d.id).explored;
  const skill = 1 + 0.04 * (skillLevel(s, 'netzwerk') - 1);
  return Math.max(3, Math.round(d.exploreGain * (1 - explored / 140) * skill));
}

/** A bit of exploring on the side (walks, rides): a random open district of the current city. Returns its name. */
export function exploreSomewhere(d: GameState, amount: number): string | null {
  const open = cityDistricts(d).filter((x) => !districtLockReason(d, x) && districtState(d, x.id).explored < 100);
  if (open.length === 0) return null;
  const def = pick(d, open);
  const st = (d.map.districts[def.id] ??= { explored: 0, visits: 0 });
  st.explored = Math.min(100, st.explored + amount);
  const next = findableIn(d, def.id, st.explored).sort((a, b) => a.threshold - b.threshold)[0];
  if (next && chance(d, 0.3)) {
    if (next.kind === 'spot') revealSpot(d, next.id, 'explore', 25);
    else revealPoi(d, next.id, 'explore');
  }
  return def.name;
}

// ── Knowledge ─────────────────────────────────────────────

export function isPoiKnown(s: GameState, id: string): boolean {
  return s.map.pois[id] !== undefined;
}

export function isSpotKnown(s: GameState, id: string): boolean {
  return s.spots.spots[id]?.known === true;
}

export function knownPois(s: GameState): PoiDef[] {
  return POIS.filter((p) => isPoiKnown(s, p.id));
}

export function knownSpotsIn(s: GameState, districtId: string): SpotDef[] {
  return SPOTS.filter((sp) => sp.districtId === districtId && isSpotKnown(s, sp.id));
}

export function knownPoisIn(s: GameState, districtId: string): PoiDef[] {
  return POIS.filter((p) => p.districtId === districtId && isPoiKnown(s, p.id));
}

/** Places that exploration could still reveal in a district at the given explored %. */
export function findableIn(s: GameState, districtId: string, explored: number): { kind: 'spot' | 'poi'; id: string; threshold: number }[] {
  const out: { kind: 'spot' | 'poi'; id: string; threshold: number }[] = [];
  for (const sp of SPOTS) {
    if (sp.districtId === districtId && sp.explore !== undefined && sp.explore <= explored && !isSpotKnown(s, sp.id)) {
      out.push({ kind: 'spot', id: sp.id, threshold: sp.explore });
    }
  }
  for (const p of POIS) {
    if (p.districtId === districtId && p.explore !== undefined && p.explore <= explored && !isPoiKnown(s, p.id)) {
      out.push({ kind: 'poi', id: p.id, threshold: p.explore });
    }
  }
  return out;
}

/** True when a district still hides something exploring can find. */
export function hasUndiscovered(s: GameState, districtId: string): boolean {
  return findableIn(s, districtId, 100).length > 0;
}

export const VIA_LABELS: Record<string, string> = {
  start: 'Kennst du schon immer',
  explore: 'Beim Erkunden entdeckt',
  rumor: 'Einem Gerücht nachgegangen',
  contact: 'Von einem Kontakt',
  rival: 'Bei einer anderen Crew entdeckt',
  project: 'Dein eigenes Projekt',
  admin: 'Per Hack aufgedeckt',
};

export function revealPoi(d: GameState, id: string, via: string, opts: { silent?: boolean } = {}): boolean {
  if (isPoiKnown(d, id)) return false;
  d.map.pois[id] = { at: d.clock.now, via };
  incStat(d, 'poisFound');
  if (!opts.silent) {
    const def = poiDef(id);
    notify(d, { tone: 'discovery', title: `Neuer Ort: ${def.name}`, text: def.description, link: `/karte/ort/${id}` });
  }
  return true;
}

export function revealSpot(d: GameState, id: string, via: string, intel = 35, opts: { silent?: boolean } = {}): boolean {
  const st = d.spots.spots[id];
  if (!st || st.known) return false;
  st.known = true;
  st.discoveredAt = d.clock.now;
  st.via = via;
  st.intel = Math.max(st.intel, intel);
  incStat(d, 'spotsFound');
  if (!opts.silent) {
    const def = spotDef(id);
    notify(d, { tone: 'discovery', title: `Spot entdeckt: ${def.name}`, text: def.description, link: `/karte/spot/${id}` });
  }
  return true;
}

// ── Rumors ────────────────────────────────────────────────

function rumorTargetKnown(s: GameState, r: RumorDef): boolean {
  return r.target.kind === 'spot' ? isSpotKnown(s, r.target.id) : isPoiKnown(s, r.target.id);
}

function sourceMatches(src: RumorSource, event: RumorSource, s: GameState): boolean {
  if ('job' in src) return 'job' in event && event.job === src.job;
  if ('poi' in src) return 'poi' in event && event.poi === src.poi;
  return 'district' in event && event.district === src.district && districtState(s, src.district).explored >= src.minExplored;
}

export function openRumors(s: GameState): RumorDef[] {
  return RUMORS.filter((r) => s.map.rumors[r.id] && !s.map.rumors[r.id].resolved && !rumorTargetKnown(s, r));
}

export function hearRumor(d: GameState, id: string, via: string): boolean {
  const r = rumorDef(id);
  if (d.map.rumors[id] || rumorTargetKnown(d, r)) return false;
  d.map.rumors[id] = { heardAt: d.clock.now, via };
  incStat(d, 'rumorsHeard');
  notify(d, { tone: 'discovery', title: 'Neues Gerücht', text: r.text, link: '/karte/geruechte' });
  return true;
}

/** Rolls for a rumor linked to the given event (job finished, place visited, district explored). */
export function rollRumor(d: GameState, event: RumorSource, p: number, via: string): string | null {
  const candidates = RUMORS.filter((r) => !d.map.rumors[r.id] && !rumorTargetKnown(d, r) && r.sources.some((src) => sourceMatches(src, event, d)));
  if (candidates.length === 0 || !chance(d, p)) return null;
  const r = pick(d, candidates);
  hearRumor(d, r.id, via);
  return r.id;
}

// ── Storage ───────────────────────────────────────────────

export function rentedStorage(s: GameState): PoiDef[] {
  return POIS.filter((p) => p.storage && s.map.rentals[p.id]);
}

export function rentedCapacity(s: GameState): number {
  return rentedStorage(s).reduce((sum, p) => sum + (p.storage?.capacityL ?? 0), 0);
}
