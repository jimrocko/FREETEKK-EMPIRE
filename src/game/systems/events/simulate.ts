import type { GameState } from '../../state';
import { PEOPLE } from '../../content/people';
import { ITEMS, spotDef } from '../../content/registry';
import { CONSUMPTION, PROMO_CHANNELS } from '../../content/events';
import { gameTimeAt } from '../../core/time';
import { skillLevel } from '../progression/logic';
import { activeMembers } from '../crew/logic';
import { effectiveStats } from '../spots/logic';
import { doneTracks } from '../music/logic';
import { networkSize } from './util';
import { dayFactor, goodsLoad, soundSummary, type SoundSummary } from './plan';
import type { EventPlanInput, EventScores, Weather } from './state';

/** Randomness source: returns a value in [0, 1). Forecasts pass a constant 0.5. */
export type Roll = () => number;

export interface Performer {
  id: string;
  draw: number;
  skill: number;
  reliability: number;
}

export function performers(s: GameState, lineup: string[]): Performer[] {
  return lineup.map((id) => {
    if (id === 'self') {
      const best = doneTracks(s).reduce((m, t) => Math.max(m, t.score), 0);
      const uploaded = doneTracks(s).filter((t) => t.uploadedAt !== undefined).length;
      return {
        id,
        draw: Math.round(s.progression.reputation / 20 + best / 5 + uploaded * 2),
        skill: Math.min(100, 20 + 5 * skillLevel(s, 'produktion') + best * 0.3),
        reliability: 100,
      };
    }
    const p = PEOPLE.find((x) => x.id === id)!;
    return { id, draw: p.stats.bekanntheit, skill: (p.stats.kreativ + p.stats.erfahrung) / 2, reliability: p.stats.zuverlaessigkeit };
  });
}

/** Expected reach of the chosen promotion (people who hear about it). `plannedAt` is when it was announced. */
export function promoReach(s: GameState, plan: Pick<EventPlanInput, 'promo' | 'startsAt'>, flyerDone: boolean, plannedAt: number): number {
  let reach = 0;
  for (const id of plan.promo) {
    const ch = PROMO_CHANNELS.find((c) => c.id === id);
    if (!ch) continue;
    if (id === 'promo.word') reach += 6 * networkSize(s) + s.progression.reputation * 0.3;
    else if (id === 'promo.flyer') reach += ch.reach * (1 + 0.05 * (skillLevel(s, 'netzwerk') - 1)) * (flyerDone ? 1 : 0.5);
    else if (id === 'promo.social') reach += ch.reach * (s.people.people['p.kim']?.met ? 1.25 : 1);
    else reach += ch.reach + (id === 'promo.infoline' ? s.progression.reputation * 0.2 : 0);
  }
  return reach * leadFactor(plan.startsAt, plannedAt);
}

/** More time between announcement and party = more people hear about it (game hours = real minutes). */
export function leadFactor(startsAt: number, plannedAt: number): number {
  const hours = Math.max(0, (startsAt - plannedAt) / 60_000);
  return Math.min(1.2, 0.4 + 0.6 * Math.sqrt(hours / 48));
}

export function priceFactor(entry: number): number {
  return 1.15 * Math.exp(-entry / 25);
}

export function promoHeat(plan: Pick<EventPlanInput, 'promo'>): number {
  return plan.promo.reduce((sum, id) => sum + (PROMO_CHANNELS.find((c) => c.id === id)?.heat ?? 0), 0);
}

export interface EventInputs {
  spotId: string;
  capacity: number;
  demand: number;
  sound: SoundSummary;
  performers: Performer[];
  powerOk: boolean;
  weather: Weather;
  hours: number;
}

export function weatherMood(weather: Weather, exposure: number): number {
  if (weather === 'regen') return 1 - 0.4 * (exposure / 100);
  if (weather === 'sturm') return 1 - 0.7 * (exposure / 100);
  if (weather === 'bewölkt') return 1 - 0.05 * (exposure / 100);
  return 1;
}

export function weatherAttendance(weather: Weather, exposure: number): number {
  if (weather === 'regen') return 1 - 0.35 * (exposure / 100);
  if (weather === 'sturm') return 1 - 0.6 * (exposure / 100);
  return 1;
}

export function rollWeather(r: number): Weather {
  if (r < 0.55) return 'klar';
  if (r < 0.8) return 'bewölkt';
  if (r < 0.95) return 'regen';
  return 'sturm';
}

/** Expected demand (people who want to come). */
export function demandFor(s: GameState, plan: EventPlanInput, flyerDone: boolean, weather: Weather, roll: Roll, plannedAt: number): number {
  const spot = spotDef(plan.spotId);
  const st = s.spots.spots[plan.spotId];
  const perf = performers(s, plan.lineup);
  const draw = perf.reduce((sum, p) => sum + p.draw, 0) * 1.5;
  const base = promoReach(s, plan, flyerDone, plannedAt) * 0.35 + s.progression.reputation * 0.6 + draw + (st?.fame ?? 0) * 2 + effectiveStats(s, plan.spotId).atmosphere * 0.3;
  const weekday = gameTimeAt(s.clock, plan.startsAt).weekday;
  const random = 0.85 + roll() * 0.3;
  return Math.max(0, Math.round(base * dayFactor(weekday) * priceFactor(plan.entry) * weatherAttendance(weather, spot.stats.weather) * random));
}

export interface SupplyResult {
  sold: Record<string, number>;
  revenue: number;
  coverage: number;
  servingsUsed: Record<string, number>;
  waterFree: boolean;
}

/** Bar: what visitors want vs. what was brought. */
export function supplyResult(s: GameState, plan: EventPlanInput, visitors: number, hours: number): SupplyResult {
  const load = goodsLoad(s, plan);
  const sold: Record<string, number> = {};
  const servingsUsed: Record<string, number> = {};
  let revenue = 0;
  let wantTotal = 0;
  let gotTotal = 0;
  for (const [type, rate] of Object.entries(CONSUMPTION)) {
    const want = visitors * rate * hours;
    const have = load.servings[type] ?? 0;
    const got = Math.min(want, have);
    servingsUsed[type] = Math.ceil(got);
    const weight = type === 'water' ? 2 : 1;
    wantTotal += want * weight;
    gotTotal += got * weight;
    const defId = Object.keys(plan.prices).find((id) => ITEMS.get(id)?.type === type);
    const price = type === 'water' && plan.freeWater ? 0 : defId ? plan.prices[defId] : 0;
    sold[type] = Math.round(got);
    revenue += got * price;
  }
  return { sold, revenue, coverage: wantTotal > 0 ? gotTotal / wantTotal : 1, servingsUsed, waterFree: plan.freeWater };
}

export interface ScoreInput {
  visitors: number;
  sound: SoundSummary;
  powerOk: boolean;
  performersPresent: Performer[];
  weather: Weather;
  supplyCoverage: number;
  hasGoods: boolean;
  tasksDone: number;
  helpers: number;
  awareness: boolean;
  medics: boolean;
}

export function scoresFor(s: GameState, plan: EventPlanInput, i: ScoreInput, roll: Roll): EventScores {
  const spot = spotDef(plan.spotId);
  const stats = effectiveStats(s, plan.spotId);
  const cond = s.spots.spots[plan.spotId]?.condition ?? spot.condition;
  const crew = activeMembers(s);
  const organizers = crew.filter((m) => m.role === 'organizer' || m.role === 'manager').length;
  const securityCrew = crew.filter((m) => m.role === 'security').length;

  const reachRatio = i.visitors > 0 ? Math.min(1, i.sound.reach / i.visitors) : 1;
  const sound = i.sound.quality * Math.sqrt(reachRatio) * (i.powerOk ? 1 : 0.55);
  const lineup = i.performersPresent.length > 0 ? i.performersPresent.reduce((sum, p) => sum + p.skill, 0) / i.performersPresent.length : 0;
  const location = stats.atmosphere * (0.6 + 0.4 * (cond / 100)) * weatherMood(i.weather, stats.weather);
  const staff = 1 + crew.length + i.helpers;
  const overload = Math.max(0, i.visitors - staff * 60) / 10;
  const organisation = 25 + skillLevel(s, 'organisation') * 6 + organizers * 10 + i.helpers * 4 + i.tasksDone * 20 + (i.awareness ? 5 : 0) - overload;
  const supply = i.hasGoods ? 100 * i.supplyCoverage : 15;
  const safety = stats.security * 0.6 + (i.awareness ? 20 : 0) + (i.medics ? 15 : 0) + securityCrew * 15;
  const light = i.sound.lightFx * 0.1;
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const base =
    0.32 * clamp(sound) + 0.25 * clamp(lineup) + 0.15 * clamp(location) + 0.1 * clamp(supply) + 0.1 * clamp(organisation) + 0.08 * clamp(safety) + light + (plan.freeWater ? 4 : 0);
  const mood = base + (roll() - 0.5) * 12;
  return {
    mood: clamp(mood),
    sound: clamp(sound),
    lineup: clamp(lineup),
    location: clamp(location),
    organisation: clamp(organisation),
    supply: clamp(supply),
    safety: clamp(safety),
  };
}

export interface Forecast {
  demand: number;
  visitors: number;
  capacity: number;
  sound: SoundSummary;
  powerOk: boolean;
  mood: number;
  revenue: number;
  costs: number;
  policeRisk: number;
  failureRisk: number;
  weatherRisk: boolean;
  /** 0–1: how much of the expected thirst the drinks cover. */
  supplyCoverage: number;
  /** Chance that at least one booked DJ does not show up. */
  noShowRisk: number;
}

export function powerAvailable(s: GameState, plan: EventPlanInput, sound: SoundSummary): boolean {
  return effectiveStats(s, plan.spotId).powerKw + sound.generatorKw >= sound.powerKw;
}

export function policeRisk(s: GameState, plan: EventPlanInput, visitors: number): number {
  const spot = spotDef(plan.spotId);
  const stats = effectiveStats(s, plan.spotId);
  const base = spot.legality === 'illegal' ? 0.12 : spot.legality === 'grey' ? 0.04 : 0;
  if (base === 0) return 0;
  const fame = s.spots.spots[plan.spotId]?.fame ?? 0;
  const noisy = stats.noise < 50 && visitors > 100 ? 1.3 : 1;
  const security = activeMembers(s, 'security').length > 0 ? 0.8 : 1;
  const promised = plan.spotId === 'spot.kai7' && s.progression.flags['sanne.kai7'] ? 0.4 : 1;
  return Math.min(0.85, (base * (1 + fame / 50) + promoHeat(plan)) * noisy * (1 - stats.security / 200) * security * promised);
}

/** Expected outcome without randomness – shown while planning. */
export function forecast(s: GameState, plan: EventPlanInput): Forecast | null {
  const sound = soundSummary(s, plan);
  if (!sound || !s.spots.spots[plan.spotId]?.known) return null;
  const spot = spotDef(plan.spotId);
  const stats = effectiveStats(s, plan.spotId);
  const half: Roll = () => 0.5;
  const demand = demandFor(s, plan, true, 'klar', half, s.clock.now);
  const visitors = Math.min(demand, stats.capacity);
  const powerOk = powerAvailable(s, plan, sound);
  const supply = supplyResult(s, plan, visitors, plan.durationH);
  const scores = scoresFor(
    s,
    plan,
    {
      visitors,
      sound,
      powerOk,
      performersPresent: performers(s, plan.lineup),
      weather: 'klar',
      supplyCoverage: supply.coverage,
      hasGoods: Object.keys(plan.prices).length > 0,
      tasksDone: 1,
      helpers: plan.helpers,
      awareness: plan.awareness,
      medics: plan.medics,
    },
    half,
  );
  const entryRevenue = plan.entry > 0 ? visitors * plan.entry * 0.92 : visitors * 1.8 * (scores.mood / 100);
  const fees = plan.lineup.reduce((sum, id) => sum + (id === 'self' ? 0 : performerFeeSafe(s, id)), 0);
  return {
    demand,
    visitors,
    capacity: stats.capacity,
    sound,
    powerOk,
    mood: scores.mood,
    revenue: Math.round(entryRevenue + supply.revenue),
    costs: fees,
    policeRisk: policeRisk(s, plan, visitors),
    failureRisk: Math.max(0, (100 - sound.reliability) / 120),
    weatherRisk: spot.stats.weather > 50,
    supplyCoverage: Object.keys(plan.prices).length > 0 ? supply.coverage : 0,
    noShowRisk: 1 - performers(s, plan.lineup).reduce((p, x) => p * (x.id === 'self' ? 1 : 1 - (100 - x.reliability) / 300), 1),
  };
}

function performerFeeSafe(s: GameState, id: string): number {
  const isCrew = s.crew.members.some((m) => m.personId === id);
  return isCrew ? 0 : (PEOPLE.find((p) => p.id === id)?.price ?? 0);
}
