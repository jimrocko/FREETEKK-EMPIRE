import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { PERSONS_BY_ID, personDef } from '../../content/registry';
import { channelReason, startActivity } from '../activities/logic';
import { moneyReason, spend } from '../finance/logic';
import { addXp, incStat } from '../progression/logic';
import { mobilityFactor } from '../map/logic';
import {
  adjustFavor,
  adjustRelation,
  adjustTrust,
  canTellMore,
  displayName,
  introTrustNeeded,
  knowsPerson,
  meetPerson,
  revealContact,
  shortName,
  tellPlace,
  today,
} from './logic';
import { chance } from '../../core/rng';

export const MEETUP_COST = 12;
export const MEETUP_MIN = 6;

function metReason(s: Parameters<typeof knowsPerson>[0], id: string): string | null {
  if (!PERSONS_BY_ID.has(id)) return 'Unbekannte Person.';
  if (!knowsPerson(s, id)) return 'Ihr kennt euch noch nicht.';
  return null;
}

export const writeTo = defineAction<{ personId: string }>({
  id: 'people.write',
  check: (s, p) => {
    const r = metReason(s, p.personId);
    if (r) return r;
    if (s.people.people[p.personId].lastWriteDay === today(s)) return 'Ihr habt heute schon geschrieben – morgen wieder.';
    return null;
  },
  run: (d, p) => {
    const st = d.people.people[p.personId];
    const def = personDef(p.personId);
    st.lastWriteDay = today(d);
    st.lastContactAt = d.clock.now;
    adjustRelation(d, p.personId, 3);
    adjustTrust(d, p.personId, 1);
    addXp(d, 'netzwerk', 2);
    incStat(d, 'chats');
    if (st.trust >= 15 && chance(d, 0.3)) {
      const c = revealContact(d, p.personId);
      if (c) return `${shortName(def)} erwähnt ${displayName(personDef(c))}.`;
    }
    return `Du hast ${shortName(def)} geschrieben.`;
  },
});

export const meetUp = defineAction<{ personId: string }>({
  id: 'people.meet',
  check: (s, p) => {
    const r = metReason(s, p.personId);
    if (r) return r;
    if (s.people.people[p.personId].lastMeetDay === today(s)) return 'Ihr habt euch heute schon getroffen.';
    if (s.activities.running.some((a) => a.kind === 'meetup' && a.payload.personId === p.personId)) return 'Ihr trefft euch gerade.';
    return moneyReason(s, MEETUP_COST) ?? channelReason(s, 'social');
  },
  run: (d, p) => {
    const def = personDef(p.personId);
    spend(d, MEETUP_COST, 'network', `Treffen mit ${shortName(def)}`);
    d.people.people[p.personId].lastMeetDay = today(d);
    startActivity(d, {
      kind: 'meetup',
      channel: 'social',
      label: `Treffen mit ${shortName(def)}`,
      durationMs: minutes(Math.max(2, MEETUP_MIN * mobilityFactor(d))),
      payload: { personId: def.id },
    });
    return `Du triffst dich mit ${shortName(def)}.`;
  },
});

export const askIntro = defineAction<{ personId: string; targetId: string }>({
  id: 'people.intro',
  check: (s, p) => {
    const r = metReason(s, p.personId);
    if (r) return r;
    const via = personDef(p.personId);
    const st = s.people.people[p.personId];
    const target = PERSONS_BY_ID.get(p.targetId);
    if (!target || !via.knows.includes(target.id) || !st.revealed.includes(target.id)) return 'Diesen Kontakt kennst du nicht.';
    if (knowsPerson(s, target.id)) return 'Ihr kennt euch schon.';
    const need = introTrustNeeded(target);
    if (st.trust < need) return `${shortName(via)} vertraut dir noch nicht genug (${Math.floor(st.trust)} / ${need}).`;
    if (st.lastIntroDay === today(s)) return `${shortName(via)} hat dich heute schon jemandem vorgestellt.`;
    return null;
  },
  run: (d, p) => {
    const st = d.people.people[p.personId];
    st.lastIntroDay = today(d);
    adjustFavor(d, p.personId, -1);
    meetPerson(d, p.targetId, 'intro', { trust: 12 + Math.round(st.trust / 10) });
    incStat(d, 'intros');
    addXp(d, 'netzwerk', 8);
    return `${shortName(personDef(p.personId))} stellt dich ${shortName(personDef(p.targetId))} vor.`;
  },
});

export const callFavor = defineAction<{ personId: string }>({
  id: 'people.favor',
  check: (s, p) => {
    const r = metReason(s, p.personId);
    if (r) return r;
    const st = s.people.people[p.personId];
    if (st.favor <= 0) return 'Diese Person schuldet dir nichts.';
    const def = personDef(p.personId);
    const unmet = def.knows.filter((k) => !knowsPerson(s, k));
    if (!canTellMore(s, p.personId) && unmet.length === 0) return 'Sie kann dir gerade nicht weiterhelfen.';
    return null;
  },
  run: (d, p) => {
    const st = d.people.people[p.personId];
    const def = personDef(p.personId);
    st.favor -= 1;
    const place = tellPlace(d, p.personId);
    if (place) return `${shortName(def)} löst den Gefallen ein und verrät dir einen Ort.`;
    const target = def.knows.find((k) => !knowsPerson(d, k))!;
    if (!st.revealed.includes(target)) st.revealed.push(target);
    meetPerson(d, target, 'intro', { trust: 15 });
    return `${shortName(def)} löst den Gefallen ein und bringt dich mit ${shortName(personDef(target))} zusammen.`;
  },
});
