import type { GameState } from '../../state';
import { isUnlocked } from '../progression/logic';
import type { Condition, Reason } from '../../core/types';
import type { PersonDef, Role } from '../../content/types';
import { PEOPLE } from '../../content/people';
import { PERSONS_BY_ID, repTierFor } from '../../content/registry';
import { requirementReason } from '../../core/conditions';
import { ROLE_LABELS, hasTrait, knowsPerson, shortName } from '../people/logic';
import type { CrewMember } from './state';

export const CREW_FOUND_REQUIRES: Condition[] = [
  { t: 'rep', gte: 40 },
  { t: 'contacts', gte: 5 },
];

export const RECRUIT_TRUST = 40;

/** Lifts (or lowers) everyone's motivation. */
export function boostMorale(d: GameState, amount: number): void {
  for (const m of d.crew.members) m.morale = Math.max(0, Math.min(100, m.morale + amount));
}

/** What each role adds to the crew (shown in the UI). */
export const ROLE_BENEFITS: Partial<Record<Role, string>> = {
  technician: '+1 Werkstatt-Slot, Reparaturen nur zum Teilepreis',
  driver: '+1 Besorgungs-Slot, fährt einen zweiten Wagen',
  organizer: '+1 Event-Vorbereitungs-Slot',
  producer: '+1 Studio-Slot',
  artist: '+1 Studio-Slot',
  dj: 'Spielt auf euren Events',
  promoter: 'Mehr Reichweite für eure Events',
  designer: 'Flyer und Designs für Events und Merch',
  merch: 'Kümmert sich um Merch-Verkauf',
  security: 'Sicherheit und Awareness auf Events',
  booker: 'Bekannte DJs schon früher und 15 % günstiger (Freischaltung „Management“)',
  manager: '+2 Plätze in der Crew (Freischaltung „Management“)',
};

/** Roles that need the "Management" unlock. */
export const MANAGED_ROLES: Role[] = ['manager', 'booker'];

export function crewLimit(s: GameState): number {
  return 2 + repTierFor(s.progression.reputation).index + (activeMembers(s, 'manager').length > 0 ? 2 : 0);
}

/** A booker in the crew gets known DJs earlier and cheaper. */
export function hasBooker(s: GameState): boolean {
  return activeMembers(s, 'booker').length > 0;
}

export function isCrewMember(s: GameState, personId: string): boolean {
  return s.crew.members.some((m) => m.personId === personId);
}

export function crewMember(s: GameState, personId: string): CrewMember | undefined {
  return s.crew.members.find((m) => m.personId === personId);
}

/** Members currently motivated enough to help. */
export function activeMembers(s: GameState, role?: Role): CrewMember[] {
  return s.crew.members.filter((m) => m.morale >= 30 && (!role || m.role === role));
}

export function wageFor(p: PersonDef): number {
  const base = Math.max(5, Math.round(p.price * 0.15));
  return hasTrait(p, 'idealist') ? Math.max(5, Math.round(base * 0.6)) : base;
}

export function foundReason(s: GameState, name: string): Reason {
  if (s.crew.founded) return 'Ihr seid schon eine Crew.';
  const req = requirementReason(s, CREW_FOUND_REQUIRES);
  if (req) return req;
  const n = name.trim();
  if (n.length < 2 || n.length > 28) return 'Der Crew-Name braucht 2–28 Zeichen.';
  return null;
}

export function recruitReason(s: GameState, personId: string, role: Role): Reason {
  if (!s.crew.founded) return 'Gründe zuerst eine Crew.';
  const p = PERSONS_BY_ID.get(personId);
  if (!p || !knowsPerson(s, personId)) return 'Unbekannte Person.';
  if (p.crewable === false) return `${shortName(p)} hat eigene Projekte und will in keine Crew.`;
  if (isCrewMember(s, personId)) return 'Ist schon in der Crew.';
  if (!p.roles.includes(role)) return `${shortName(p)} macht nicht: ${ROLE_LABELS[role]}.`;
  if (MANAGED_ROLES.includes(role) && !isUnlocked(s, 'u.management')) return `${ROLE_LABELS[role]} braucht die Freischaltung „Management“.`;
  const st = s.people.people[personId];
  if (st.trust < RECRUIT_TRUST) return `${shortName(p)} vertraut dir noch nicht genug (${Math.floor(st.trust)} / ${RECRUIT_TRUST}).`;
  if (st.relation < 0) return `${shortName(p)} ist gerade nicht gut auf dich zu sprechen.`;
  if (s.crew.members.length >= crewLimit(s)) return `Mehr als ${crewLimit(s)} Leute kannst du mit deinem Ruf noch nicht halten.`;
  return null;
}

/** People who could join (met, crewable, not yet in the crew). */
export function candidates(s: GameState): PersonDef[] {
  return PEOPLE.filter((p) => knowsPerson(s, p.id) && p.crewable !== false && !isCrewMember(s, p.id));
}
