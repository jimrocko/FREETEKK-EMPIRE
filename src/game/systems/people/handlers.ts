import type { ActivityHandler } from '../activities/handler';
import type { SkillId } from '../../core/types';
import type { Role } from '../../content/types';
import { personDef } from '../../content/registry';
import { notify } from '../../core/notify';
import { chance, randInt } from '../../core/rng';
import { addXp, incStat, skillLevel } from '../progression/logic';
import { adjustRelation, adjustTrust, displayName, revealContact, shortName, tellPlace } from './logic';

const ROLE_SKILL: Partial<Record<Role, SkillId>> = {
  dj: 'produktion',
  producer: 'produktion',
  artist: 'produktion',
  technician: 'technik',
  driver: 'organisation',
  organizer: 'organisation',
  booker: 'netzwerk',
  promoter: 'netzwerk',
  designer: 'business',
  merch: 'business',
  manager: 'business',
  supplier: 'business',
  shopkeeper: 'business',
  landlord: 'organisation',
  journalist: 'netzwerk',
  security: 'organisation',
  scout: 'netzwerk',
};

export const meetupHandler: ActivityHandler = {
  cancelLabel: 'Treffen absagen',
  complete(d, a) {
    const id = String(a.payload.personId);
    const def = personDef(id);
    const st = d.people.people[id];
    if (!st) return;
    // Trust grows quickly at first and slowly once you are close.
    const gain = (randInt(d, 5, 9) + Math.floor((skillLevel(d, 'netzwerk') - 1) / 2)) * (1 - st.trust / 130);
    adjustTrust(d, id, gain);
    adjustRelation(d, id, 5);
    st.meetings++;
    st.lastContactAt = d.clock.now;
    incStat(d, 'meetups');
    addXp(d, 'netzwerk', 6);
    const skill = ROLE_SKILL[def.roles[0]];
    if (skill) addXp(d, skill, 3);
    const parts = [`Vertrauen ${Math.floor(st.trust)}`];
    if (st.trust >= 10 && chance(d, 0.6)) {
      const c = revealContact(d, id);
      if (c) parts.push(`erzählt von ${displayName(personDef(c))}`);
    }
    if (st.trust >= 25 && chance(d, 0.5)) {
      const place = tellPlace(d, id);
      if (place) parts.push('verrät dir einen Ort');
    }
    notify(d, { tone: 'success', title: `Treffen mit ${shortName(def)}`, text: parts.join(' · '), link: `/netzwerk/person/${id}` });
  },
};
