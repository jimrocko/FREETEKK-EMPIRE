import type { GameState } from '../state';
import type { Condition, Reason } from './types';
import { fmtMoney, fmtNumber } from './format';
import { SKILL_DEFS } from '../content/skills';
import { DISTRICTS_BY_ID, GOALS_BY_ID, ITEMS, POIS_BY_ID, SPOTS_BY_ID, repTierFor } from '../content/registry';
import { REP_TIERS } from '../content/reputation';
import { gameDayAt } from './time';
import { hasFlag, isUnlocked, skillLevel, stat } from '../systems/progression/logic';
import { countItem, countTag } from '../systems/inventory/logic';
import { CHANNEL_LABELS, channelCapacity, channelUsage } from '../systems/activities/logic';
import { CITIES_BY_ID, PERSONS_BY_ID, RIVALS_BY_ID } from '../content/registry';
import { systemStats } from '../systems/sound/logic';
import { fmtNumber as fmtN } from './format';

/** Kept here (not in map/cities) to avoid an import cycle. */
function cityFameOf(s: GameState, cityId: string): number {
  return cityId === s.player.homeCity ? 100 : (s.map.cityFame[cityId] ?? 0);
}

export function bestSystem(s: GameState, key: 'reach' | 'quality'): number {
  let best = 0;
  for (const sys of s.sound.systems) best = Math.max(best, systemStats(s, sys)[key]);
  return best;
}

export function checkCondition(s: GameState, c: Condition): boolean {
  switch (c.t) {
    case 'money':
      return s.finance.cash >= c.gte;
    case 'rep':
      return s.progression.reputation >= c.gte;
    case 'skill':
      return skillLevel(s, c.skill) >= c.gte;
    case 'item':
      return countItem(s, c.item) >= (c.count ?? 1);
    case 'itemTag':
      return countTag(s, c.tag) >= (c.count ?? 1);
    case 'stat':
      return stat(s, c.stat) >= c.gte;
    case 'flag':
      return hasFlag(s, c.flag);
    case 'unlocked':
      return isUnlocked(s, c.id);
    case 'goal':
      return s.goals.done[c.id] !== undefined;
    case 'day':
      return gameDayAt(s.clock, s.clock.now) >= c.gte;
    case 'districtExplored':
      return (s.map.districts[c.district]?.explored ?? 0) >= c.gte;
    case 'spotKnown':
      return s.spots.spots[c.spot]?.known === true;
    case 'spotsKnown':
      return Object.values(s.spots.spots).filter((x) => x.known).length >= c.gte;
    case 'poiKnown':
      return s.map.pois[c.poi] !== undefined;
    case 'knows':
      return s.people.people[c.person]?.met === true;
    case 'trust':
      return (s.people.people[c.person]?.met ? s.people.people[c.person].trust : 0) >= c.gte;
    case 'contacts':
      return Object.values(s.people.people).filter((p) => p.met).length >= c.gte;
    case 'knowsRole':
      return Object.entries(s.people.people).filter(([id, p]) => p.met && PERSONS_BY_ID.get(id)?.roles.includes(c.role as never)).length >= (c.count ?? 1);
    case 'trusted':
      return Object.values(s.people.people).filter((p) => p.met && p.trust >= c.trust).length >= c.count;
    case 'channelFree':
      return channelUsage(s, c.channel) < channelCapacity(s, c.channel);
    case 'crewFounded':
      return s.crew.founded;
    case 'crewSize':
      return s.crew.members.length >= c.gte;
    case 'systemReach':
      return bestSystem(s, 'reach') >= c.gte;
    case 'systemQuality':
      return bestSystem(s, 'quality') >= c.gte;
    case 'brand':
      return s.merch.brand >= c.gte;
    case 'bank':
      return s.finance.bank >= c.gte;
    case 'rivalRelation':
      return (s.rivals.crews[c.rival]?.relation ?? 0) >= c.gte;
    case 'rivalActive':
      return s.rivals.crews[c.rival]?.active === true;
    case 'outrank':
      return s.progression.reputation > (s.rivals.crews[c.rival]?.rep ?? 0);
    case 'cityFame':
      return cityFameOf(s, c.city) >= c.gte;
    case 'all':
      return c.of.every((x) => checkCondition(s, x));
    case 'any':
      return c.of.some((x) => checkCondition(s, x));
    case 'not':
      return !checkCondition(s, c.c);
  }
}

export function checkAll(s: GameState, list: readonly Condition[] | undefined): boolean {
  if (!list) return true;
  return list.every((c) => checkCondition(s, c));
}

function repName(gte: number): string {
  const exact = REP_TIERS.find((t) => t.min === gte);
  return exact ? `Reputation „${exact.name}“` : `Reputation ${fmtNumber(gte)} (${repTierFor(gte).tier.name})`;
}

const ROLE_NAMES: Record<string, string> = {
  dj: 'DJ',
  producer: 'Producer',
  artist: 'Live-Act',
  technician: 'Technik',
  driver: 'Fahrer',
  organizer: 'Veranstalter',
  booker: 'Booker',
  promoter: 'Promotion',
  designer: 'Design',
  merch: 'Merch',
  manager: 'Management',
  supplier: 'Lieferant',
  landlord: 'Vermieter',
  shopkeeper: 'Händler',
  journalist: 'Presse',
  security: 'Security',
  scout: 'Ortskenner',
};

const TAG_LABELS: Record<string, string> = {
  mobility: 'ein Fahrrad o. Ä.',
  computer: 'einen Computer',
  studio: 'ein Studio-Gerät',
  classic: 'ein klassisches Gerät',
  phone: 'ein Smartphone',
  camera: 'ein Handy mit guter Kamera',
  transport: 'ein Transportmittel',
  drums: 'einen Drumcomputer',
  synth: 'einen Synthesizer',
  sampler: 'einen Sampler',
};

/** Human readable description, e.g. „Netzwerk Lv. 2“. */
export function describeCondition(c: Condition): string {
  switch (c.t) {
    case 'money':
      return `${fmtMoney(c.gte)} Bargeld`;
    case 'rep':
      return repName(c.gte);
    case 'skill':
      return `${SKILL_DEFS[c.skill].name} Lv. ${c.gte}`;
    case 'item': {
      const name = ITEMS.get(c.item)?.name ?? c.item;
      return (c.count ?? 1) > 1 ? `${c.count}× ${name}` : name;
    }
    case 'itemTag':
      return `Besitz: ${TAG_LABELS[c.tag] ?? c.tag}`;
    case 'stat':
      return `${c.label ?? c.stat}: ${fmtNumber(c.gte)}`;
    case 'flag':
      return c.label ?? c.flag;
    case 'unlocked':
      return `Freigeschaltet: ${c.label ?? c.id}`;
    case 'goal':
      return `Ziel „${GOALS_BY_ID.get(c.id)?.title ?? c.id}“`;
    case 'day':
      return `Ab Tag ${c.gte}`;
    case 'districtExplored':
      return `${DISTRICTS_BY_ID.get(c.district)?.name ?? c.district} zu ${c.gte} % erkundet`;
    case 'spotKnown':
      return `Spot „${SPOTS_BY_ID.get(c.spot)?.name ?? c.spot}“ bekannt`;
    case 'spotsKnown':
      return `${c.gte} Spots bekannt`;
    case 'poiKnown':
      return `Ort „${POIS_BY_ID.get(c.poi)?.name ?? c.poi}“ bekannt`;
    case 'knows':
      return `Kontakt: ${PERSONS_BY_ID.get(c.person)?.name ?? c.person}`;
    case 'trust':
      return `Vertrauen von ${PERSONS_BY_ID.get(c.person)?.name ?? c.person} ≥ ${c.gte}`;
    case 'contacts':
      return `${c.gte} Kontakte`;
    case 'knowsRole':
      return `${(c.count ?? 1) > 1 ? `${c.count} ` : ''}Kontakt${(c.count ?? 1) > 1 ? 'e' : ''}: ${ROLE_NAMES[c.role] ?? c.role}`;
    case 'trusted':
      return `${c.count} ${c.count === 1 ? 'Kontakt' : 'Kontakte'} mit Vertrauen ≥ ${c.trust}`;
    case 'channelFree':
      return `freier Slot: ${CHANNEL_LABELS[c.channel]}`;
    case 'crewFounded':
      return 'Eigene Crew gegründet';
    case 'crewSize':
      return `${c.gte} Leute in der Crew`;
    case 'systemReach':
      return `Soundsystem für ${fmtN(c.gte)} Leute`;
    case 'systemQuality':
      return `Soundsystem-Qualität ${c.gte}`;
    case 'brand':
      return `Markenwert ${fmtN(c.gte)}`;
    case 'bank':
      return `${fmtN(c.gte)} € auf dem Konto`;
    case 'rivalRelation':
      return `Verhältnis zu ${RIVALS_BY_ID.get(c.rival)?.name ?? 'Crew'}: ${c.gte}`;
    case 'rivalActive':
      return `${RIVALS_BY_ID.get(c.rival)?.name ?? 'Crew'} ist aktiv`;
    case 'outrank':
      return `Mehr Reputation als ${RIVALS_BY_ID.get(c.rival)?.name ?? 'die Crew'}`;
    case 'cityFame':
      return `Bekanntheit in ${CITIES_BY_ID.get(c.city)?.name ?? c.city}: ${c.gte} %`;
    case 'all':
      return c.of.map(describeCondition).join(' und ');
    case 'any':
      return c.of.map(describeCondition).join(' oder ');
    case 'not':
      return c.label ?? `nicht: ${describeCondition(c.c)}`;
  }
}

export function firstUnmet(s: GameState, list: readonly Condition[] | undefined): Condition | null {
  if (!list) return null;
  for (const c of list) if (!checkCondition(s, c)) return c;
  return null;
}

/** Reason text for the first unmet condition, or null when all are met. */
export function requirementReason(s: GameState, list: readonly Condition[] | undefined): Reason {
  const c = firstUnmet(s, list);
  return c ? `Benötigt: ${describeCondition(c)}` : null;
}

export interface ConditionProgress {
  current: number;
  target: number;
}

/** Numeric progress for countable conditions (for progress bars). */
export function conditionProgress(s: GameState, c: Condition): ConditionProgress | null {
  switch (c.t) {
    case 'money':
      return { current: Math.max(0, s.finance.cash), target: c.gte };
    case 'rep':
      return { current: s.progression.reputation, target: c.gte };
    case 'skill':
      return { current: skillLevel(s, c.skill), target: c.gte };
    case 'stat':
      return { current: stat(s, c.stat), target: c.gte };
    case 'item':
      return { current: countItem(s, c.item), target: c.count ?? 1 };
    case 'itemTag':
      return { current: countTag(s, c.tag), target: c.count ?? 1 };
    case 'districtExplored':
      return { current: s.map.districts[c.district]?.explored ?? 0, target: c.gte };
    case 'spotsKnown':
      return { current: Object.values(s.spots.spots).filter((x) => x.known).length, target: c.gte };
    case 'contacts':
      return { current: Object.values(s.people.people).filter((p) => p.met).length, target: c.gte };
    case 'trusted':
      return { current: Object.values(s.people.people).filter((p) => p.met && p.trust >= c.trust).length, target: c.count };
    case 'crewSize':
      return { current: s.crew.members.length, target: c.gte };
    case 'systemReach':
      return { current: bestSystem(s, 'reach'), target: c.gte };
    case 'systemQuality':
      return { current: bestSystem(s, 'quality'), target: c.gte };
    case 'brand':
      return { current: Math.floor(s.merch.brand), target: c.gte };
    case 'bank':
      return { current: Math.floor(s.finance.bank), target: c.gte };
    case 'trust':
      return { current: Math.floor(s.people.people[c.person]?.trust ?? 0), target: c.gte };
    case 'outrank':
      return { current: Math.floor(s.progression.reputation), target: Math.floor(s.rivals.crews[c.rival]?.rep ?? 0) + 1 };
    case 'cityFame':
      return { current: Math.floor(cityFameOf(s, c.city)), target: c.gte };
    default:
      return null;
  }
}
