import type { GameState } from '../../state';
import type { PersonDef, Role, TraitId } from '../../content/types';
import { PEOPLE } from '../../content/people';
import { PERSONS_BY_ID, personDef } from '../../content/registry';
import { notify } from '../../core/notify';
import { chance, pick } from '../../core/rng';
import { gameDayAt } from '../../core/time';
import { incStat } from '../progression/logic';
import { isPoiKnown, isSpotKnown, revealPoi, revealSpot } from '../map/logic';
import type { PersonState } from './state';

export const ROLE_LABELS: Record<Role, string> = {
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

export const TRAIT_LABELS: Record<TraitId, string> = {
  loyal: 'Loyal',
  gierig: 'Geschäftstüchtig',
  chaotisch: 'Chaotisch',
  perfektionist: 'Perfektionist',
  misstrauisch: 'Misstrauisch',
  herzlich: 'Herzlich',
  partytier: 'Partytier',
  vorsichtig: 'Vorsichtig',
  ehrgeizig: 'Ehrgeizig',
  idealist: 'Idealist',
};

export const PERSON_STAT_LABELS: Record<keyof PersonDef['stats'], string> = {
  technik: 'Technik',
  organisation: 'Organisation',
  kreativ: 'Kreativität',
  netzwerk: 'Netzwerk',
  business: 'Business',
  zuverlaessigkeit: 'Zuverlässigkeit',
  erfahrung: 'Erfahrung',
  bekanntheit: 'Bekanntheit',
};

const VIA_TRUST: Record<string, number> = { intro: 15, job: 10, visit: 10, explore: 8, message: 12, party: 10, contact: 12 };

export function displayName(def: PersonDef): string {
  return def.nick ? `${def.name} „${def.nick}“` : def.name;
}

export function shortName(def: PersonDef): string {
  return def.nick ?? def.name;
}

export function personState(s: GameState, id: string): PersonState {
  return s.people.people[id];
}

export function knowsPerson(s: GameState, id: string): boolean {
  return s.people.people[id]?.met === true;
}

export function metPeople(s: GameState): PersonDef[] {
  return PEOPLE.filter((p) => s.people.people[p.id]?.met);
}

export function hasTrait(def: PersonDef, trait: TraitId): boolean {
  return def.traits.includes(trait);
}

export function trustLabel(trust: number): string {
  if (trust >= 85) return 'Unzertrennlich';
  if (trust >= 60) return 'Eng';
  if (trust >= 35) return 'Vertraut';
  if (trust >= 15) return 'Bekannt';
  return 'Flüchtig';
}

export function relationLabel(relation: number): string {
  if (relation >= 50) return 'begeistert';
  if (relation >= 20) return 'freundlich';
  if (relation > -20) return 'neutral';
  if (relation > -50) return 'genervt';
  return 'sauer';
}

export function today(s: GameState): number {
  return gameDayAt(s.clock, s.clock.now);
}

export function adjustTrust(d: GameState, id: string, amount: number): void {
  const st = d.people.people[id];
  const def = PERSONS_BY_ID.get(id);
  if (!st || !def || amount === 0) return;
  let v = amount;
  if (v > 0 && hasTrait(def, 'misstrauisch')) v *= 0.6;
  if (v > 0 && hasTrait(def, 'loyal')) v *= 1.2;
  st.trust = Math.max(0, Math.min(100, Math.round((st.trust + v) * 10) / 10));
}

export function adjustRelation(d: GameState, id: string, amount: number): void {
  const st = d.people.people[id];
  const def = PERSONS_BY_ID.get(id);
  if (!st || !def || amount === 0) return;
  let v = amount;
  if (v > 0 && hasTrait(def, 'herzlich')) v *= 1.5;
  st.relation = Math.max(-100, Math.min(100, Math.round(st.relation + v)));
}

export function adjustFavor(d: GameState, id: string, amount: number): void {
  const st = d.people.people[id];
  if (st) st.favor += amount;
}

/** Marks someone as met. Returns false if already known. */
export function meetPerson(d: GameState, id: string, via: string, opts: { trust?: number; silent?: boolean } = {}): boolean {
  const st = d.people.people[id];
  if (!st || st.met) return false;
  const def = personDef(id);
  st.met = true;
  st.metAt = d.clock.now;
  st.via = via;
  st.trust = Math.max(st.trust, opts.trust ?? VIA_TRUST[via] ?? 10);
  st.relation = Math.max(st.relation, 10);
  st.lastContactAt = d.clock.now;
  incStat(d, 'contacts');
  if (!opts.silent) {
    notify(d, {
      tone: 'discovery',
      title: `Neuer Kontakt: ${displayName(def)}`,
      text: `${def.roles.map((r) => ROLE_LABELS[r]).join(', ')} – ${def.bio}`,
      link: `/netzwerk/person/${id}`,
    });
  }
  return true;
}

/** All network neighbours (either side knows the other). */
export function neighbours(id: string): string[] {
  const def = PERSONS_BY_ID.get(id);
  const set = new Set(def?.knows ?? []);
  for (const p of PEOPLE) if (p.knows.includes(id)) set.add(p.id);
  set.delete(id);
  return [...set];
}

/** Reveals one of their contacts you did not know about. */
export function revealContact(d: GameState, id: string): string | null {
  const st = d.people.people[id];
  const def = PERSONS_BY_ID.get(id);
  if (!st || !def) return null;
  const hidden = def.knows.filter((k) => !st.revealed.includes(k));
  if (hidden.length === 0) return null;
  // Prefer people you have not met yet – that is where the value is.
  const unmet = hidden.filter((k) => !knowsPerson(d, k));
  const pickFrom = unmet.length > 0 ? unmet : hidden;
  const target = pick(d, pickFrom);
  st.revealed.push(target);
  return target;
}

/** They tell you about a spot or place they know and you don't. */
export function tellPlace(d: GameState, id: string): string | null {
  const st = d.people.people[id];
  const def = PERSONS_BY_ID.get(id);
  if (!st || !def) return null;
  const spots = (def.knowsSpots ?? []).filter((sp) => !isSpotKnown(d, sp));
  const pois = (def.knowsPois ?? []).filter((p) => !isPoiKnown(d, p));
  const options = [...spots.map((x) => ({ kind: 'spot' as const, id: x })), ...pois.map((x) => ({ kind: 'poi' as const, id: x }))];
  if (options.length === 0) return null;
  const choice = pick(d, options);
  if (choice.kind === 'spot') revealSpot(d, choice.id, 'contact', 55);
  else revealPoi(d, choice.id, 'contact');
  st.told.push(choice.id);
  return choice.id;
}

export function canTellMore(s: GameState, id: string): boolean {
  const def = PERSONS_BY_ID.get(id);
  if (!def) return false;
  return (def.knowsSpots ?? []).some((x) => !isSpotKnown(s, x)) || (def.knowsPois ?? []).some((x) => !isPoiKnown(s, x));
}

export type MeetEvent = { job: string } | { poi: string } | { district: string };

/** Chance to meet someone linked to a job, place or district. */
export function rollMeet(d: GameState, event: MeetEvent): string | null {
  const candidates: { id: string; chance: number }[] = [];
  for (const p of PEOPLE) {
    if (knowsPerson(d, p.id)) continue;
    for (const m of p.meet) {
      if ('job' in event && 'job' in m && m.job === event.job) candidates.push({ id: p.id, chance: m.chance });
      if ('poi' in event && 'poi' in m && m.poi === event.poi) candidates.push({ id: p.id, chance: m.chance });
      if ('district' in event && 'district' in m && m.district === event.district) {
        if ((d.map.districts[m.district]?.explored ?? 0) >= (m.minExplored ?? 0)) candidates.push({ id: p.id, chance: m.chance });
      }
    }
  }
  for (const c of candidates) {
    if (chance(d, c.chance)) {
      const via = 'job' in event ? 'job' : 'poi' in event ? 'visit' : 'explore';
      meetPerson(d, c.id, via);
      return c.id;
    }
  }
  return null;
}

/** Meets a random approachable stranger (e.g. at a party). */
export function meetSomeone(d: GameState, roles?: string[]): string | null {
  const pool = PEOPLE.filter(
    (p) => !knowsPerson(d, p.id) && p.introTrust <= 20 && p.meet.every((m) => !('reaches' in m)) && (!roles || p.roles.some((r) => roles.includes(r))),
  );
  if (pool.length === 0) return null;
  const p = pick(d, pool);
  meetPerson(d, p.id, 'party');
  return p.id;
}

export function introTrustNeeded(target: PersonDef): number {
  return Math.max(15, target.introTrust);
}
