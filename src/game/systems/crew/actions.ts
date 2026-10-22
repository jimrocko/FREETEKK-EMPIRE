import { defineAction } from '../../core/actions';
import type { Role } from '../../content/types';
import { personDef } from '../../content/registry';
import { notify } from '../../core/notify';
import { incStat } from '../progression/logic';
import { ROLE_LABELS, adjustRelation, shortName } from '../people/logic';
import { foundReason, isCrewMember, recruitReason, wageFor } from './logic';

export const foundCrew = defineAction<{ name: string }>({
  id: 'crew.found',
  check: (s, p) => foundReason(s, p.name),
  run: (d, p) => {
    d.crew.founded = true;
    d.crew.name = p.name.trim();
    d.crew.foundedAt = d.clock.now;
    incStat(d, 'crewFounded');
    notify(d, { tone: 'discovery', title: `${d.crew.name} ist gegründet`, text: 'Ab jetzt seid ihr eine Crew. Hol Leute dazu, die dir vertrauen.', link: '/crew' });
    return `Crew „${d.crew.name}“ gegründet.`;
  },
});

export const recruit = defineAction<{ personId: string; role: Role }>({
  id: 'crew.recruit',
  check: (s, p) => recruitReason(s, p.personId, p.role),
  run: (d, p) => {
    const person = personDef(p.personId);
    const trust = d.people.people[p.personId].trust;
    d.crew.members.push({
      personId: person.id,
      role: p.role,
      joinedAt: d.clock.now,
      morale: Math.min(90, 45 + trust / 3),
      wagePerDay: wageFor(person),
    });
    adjustRelation(d, person.id, 8);
    incStat(d, 'recruits');
    return `${shortName(person)} ist jetzt bei euch (${ROLE_LABELS[p.role]}).`;
  },
});

export const dismiss = defineAction<{ personId: string }>({
  id: 'crew.dismiss',
  check: (s, p) => (isCrewMember(s, p.personId) ? null : 'Nicht in der Crew.'),
  run: (d, p) => {
    d.crew.members = d.crew.members.filter((m) => m.personId !== p.personId);
    adjustRelation(d, p.personId, -10);
    return `${shortName(personDef(p.personId))} ist raus aus der Crew.`;
  },
});

export const renameCrew = defineAction<{ name: string }>({
  id: 'crew.rename',
  check: (s, p) => {
    if (!s.crew.founded) return 'Noch keine Crew.';
    const n = p.name.trim();
    return n.length < 2 || n.length > 28 ? 'Der Crew-Name braucht 2–28 Zeichen.' : null;
  },
  run: (d, p) => {
    d.crew.name = p.name.trim();
  },
});
