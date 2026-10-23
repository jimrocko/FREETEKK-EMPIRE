import type { GameState } from '../../state';
import type { Reason } from '../../core/types';
import { CITIES, DISTRICTS, type CityDef } from '../../content/cities';
import { POIS } from '../../content/pois';
import { CITIES_BY_ID, cityDef } from '../../content/registry';
import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { notify } from '../../core/notify';
import type { ActivityHandler } from '../activities/handler';
import { channelReason, startActivity } from '../activities/logic';
import { moneyReason, spend } from '../finance/logic';
import { countTag } from '../inventory/logic';
import { incStat, setFlag } from '../progression/logic';
import { needsUnlock } from '../progression/tree';

export function currentCity(s: GameState): CityDef {
  return cityDef(s.map.cityId);
}

/** 0–100: how well the scene of a city knows you. Your home city always knows you. */
export function cityFame(s: GameState, cityId: string): number {
  return cityId === s.player.homeCity ? 100 : (s.map.cityFame[cityId] ?? 0);
}

/** Crowd multiplier of a city: scene size × how well they know you there. */
export function cityCrowdFactor(s: GameState, cityId: string): number {
  const city = CITIES_BY_ID.get(cityId);
  if (!city) return 1;
  return city.sceneSize * (0.35 + 0.65 * (cityFame(s, cityId) / 100));
}

export function addCityFame(d: GameState, cityId: string, amount: number): void {
  if (cityId === d.player.homeCity) return;
  d.map.cityFame[cityId] = Math.min(100, Math.round(((d.map.cityFame[cityId] ?? 0) + amount) * 10) / 10);
}

/** Cities you may travel to (unlocked ones). */
export function reachableCities(s: GameState): CityDef[] {
  return CITIES.filter((c) => !needsUnlock(s, c.travel.unlock));
}

export function travelCost(s: GameState, city: CityDef): number {
  // With your own vehicle you only pay fuel.
  return Math.round(city.travel.cost * (countTag(s, 'vehicle') > 0 ? 0.6 : 1));
}

export function travelReason(s: GameState, cityId: string): Reason {
  const city = CITIES_BY_ID.get(cityId);
  if (!city) return 'Unbekannte Stadt.';
  if (s.map.cityId === cityId) return 'Du bist schon hier.';
  const locked = needsUnlock(s, city.travel.unlock);
  if (locked) return locked;
  if (s.activities.running.some((a) => a.kind === 'travel')) return 'Du bist schon unterwegs.';
  const here = s.events.list.find((e) => e.status === 'scheduled' || e.status === 'running');
  if (here) return `Erst „${here.name}“ durchziehen oder absagen.`;
  return channelReason(s, 'explore') ?? moneyReason(s, travelCost(s, city));
}

/** Makes the districts and starting places of a city known on the first visit. */
export function initCity(d: GameState, cityId: string): void {
  const city = cityDef(cityId);
  for (const dist of DISTRICTS) {
    if (dist.cityId !== cityId || d.map.districts[dist.id]) continue;
    d.map.districts[dist.id] = { explored: city.startExplored[dist.id] ?? 0, visits: 0 };
  }
  for (const p of POIS) {
    if (p.cityId === cityId && p.explore === 0 && !d.map.pois[p.id] && (city.startExplored[p.districtId] ?? 0) > 0) d.map.pois[p.id] = { at: d.clock.now, via: 'start' };
  }
}

export const travel = defineAction<{ cityId: string }>({
  id: 'map.travel',
  check: (s, p) => travelReason(s, p.cityId),
  run: (d, p) => {
    const city = cityDef(p.cityId);
    spend(d, travelCost(d, city), 'vehicle', `Reise nach ${city.name}`);
    startActivity(d, { kind: 'travel', channel: 'explore', label: `Reise nach ${city.name}`, durationMs: minutes(city.travel.minutes), payload: { cityId: city.id } });
    return `Auf nach ${city.name}!`;
  },
});

export const travelHandler: ActivityHandler = {
  complete(d, a) {
    const city = cityDef(String(a.payload.cityId));
    d.map.cityId = city.id;
    d.player.cityId = city.id;
    initCity(d, city.id);
    if (!d.progression.flags[`visited:${city.id}`]) {
      setFlag(d, `visited:${city.id}`);
      incStat(d, 'citiesVisited');
    }
    notify(d, { tone: 'discovery', title: `Angekommen in ${city.name}`, text: city.description, link: '/karte' });
  },
};
