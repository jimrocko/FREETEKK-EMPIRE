import { defineAction } from '../../core/actions';
import { minutes, gameDayAt, GAME_HOUR_MS } from '../../core/time';
import { RIVALS_BY_ID, rivalDef } from '../../content/registry';
import { crewVerb } from '../../content/rivals';
import { chance } from '../../core/rng';
import { channelReason, startActivity } from '../activities/logic';
import { moneyReason, spend } from '../finance/logic';
import { addNews, adjustRivalRelation, coopReason, eventEndsAt, rivalRelationLabel } from './logic';
import { revealSpot } from '../map/logic';

export const VISIT_COST = 10;

export const visitRivalParty = defineAction<{ eventId: string }>({
  id: 'rivals.visit',
  check: (s, p) => {
    const ev = s.rivals.events.find((e) => e.id === p.eventId);
    if (!ev || ev.status !== 'scheduled') return 'Diese Party findet nicht statt.';
    if (s.clock.now < ev.startsAt - 2 * GAME_HOUR_MS) return 'Die Party hat noch nicht angefangen (ab zwei Stunden vorher geht’s los).';
    if (s.clock.now >= eventEndsAt(ev)) return 'Die Party ist schon vorbei.';
    if (s.activities.running.some((a) => a.kind === 'rival-visit' && a.payload.eventId === ev.id)) return 'Du bist schon auf dem Weg.';
    return channelReason(s, 'social') ?? moneyReason(s, VISIT_COST);
  },
  run: (d, p) => {
    const ev = d.rivals.events.find((e) => e.id === p.eventId)!;
    const def = rivalDef(ev.crewId);
    spend(d, VISIT_COST, 'network', `Eintritt bei ${def.name}`);
    startActivity(d, { kind: 'rival-visit', channel: 'social', label: `Party von ${def.name}`, durationMs: minutes(5), payload: { eventId: ev.id, crewId: def.id } });
    return `Du gehst zur Party von ${def.name}.`;
  },
});

export const proposeCoop = defineAction<{ crewId: string }>({
  id: 'rivals.coop',
  check: (s, p) => coopReason(s, p.crewId),
  run: (d, p) => {
    const def = rivalDef(p.crewId);
    const crew = d.rivals.crews[p.crewId];
    crew.lastContactAt = d.clock.now;
    const odds = Math.min(0.9, 0.25 + def.cooperation / 200 + crew.relation / 200);
    if (chance(d, odds)) {
      d.rivals.coop = { crewId: def.id, until: d.clock.now + 5 * 24 * GAME_HOUR_MS, share: 0.25 };
      adjustRivalRelation(d, def.id, 5);
      addNews(d, `${def.name} und du planen eine gemeinsame Party.`, 'success', { crewId: def.id });
      return `${def.name} ${crewVerb(def, 'sind', 'ist')} dabei! Deine nächste Party in den nächsten 5 Tagen wird gemeinsam beworben – sie bekommen 25 % von Eintritt und Bar.`;
    }
    adjustRivalRelation(d, def.id, -3);
    return `${def.name} ${crewVerb(def, 'haben', 'hat')} gerade keinen Kopf dafür.`;
  },
});

export const askSpotTip = defineAction<{ crewId: string }>({
  id: 'rivals.tip',
  check: (s, p) => {
    const def = RIVALS_BY_ID.get(p.crewId);
    const crew = s.rivals.crews[p.crewId];
    if (!def || !crew?.active) return 'Diese Crew ist gerade nicht aktiv.';
    if (crew.relation < 40) return `Dafür müsst ihr euch besser verstehen (jetzt: ${rivalRelationLabel(crew.relation)}).`;
    if (crew.tipDay === gameDayAt(s.clock, s.clock.now)) return 'Heute haben sie dir schon was verraten.';
    if (!crew.knownSpots.some((id) => !s.spots.spots[id]?.known)) return 'Sie kennen keinen Spot, den du nicht kennst.';
    return null;
  },
  run: (d, p) => {
    const def = rivalDef(p.crewId);
    const crew = d.rivals.crews[p.crewId];
    const id = crew.knownSpots.find((x) => !d.spots.spots[x]?.known)!;
    revealSpot(d, id, 'contact', 45);
    crew.tipDay = gameDayAt(d.clock, d.clock.now);
    adjustRivalRelation(d, def.id, -2);
    return `${def.name} ${crewVerb(def, 'verraten', 'verrät')} dir einen Spot.`;
  },
});

export const markSceneRead = defineAction<Record<string, never>>({
  id: 'rivals.read',
  check: () => null,
  run: (d) => {
    const last = d.rivals.news[d.rivals.news.length - 1];
    if (last) d.rivals.seenNews = last.id;
  },
});
