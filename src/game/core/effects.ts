import type { GameState } from '../state';
import type { Effect } from './types';
import { fmtMoney, fmtNumber } from './format';
import { notify } from './notify';
import { SKILL_DEFS } from '../content/skills';
import { DISTRICTS_BY_ID, ITEMS, PERSONS_BY_ID, POIS_BY_ID, SPOTS_BY_ID } from '../content/registry';
import { earn, spend } from '../systems/finance/logic';
import { addRep, addXp, setFlag, unlock } from '../systems/progression/logic';
import { addItem } from '../systems/inventory/logic';
import { hearRumor, revealPoi, revealSpot } from '../systems/map/logic';
import { adjustFavor, adjustRelation, adjustTrust, meetPerson, meetSomeone } from '../systems/people/logic';
import { queueMessage } from '../systems/messages/logic';
import { CHANNEL_LABELS, startActivity } from '../systems/activities/logic';
import { GAME_DAY_MS, minutes } from './time';
import { RIVALS_BY_ID } from '../content/registry';
import { pick } from './rng';
import { addModifier } from '../systems/happenings/logic';
import { addNews, adjustRivalRelation } from '../systems/rivals/logic';
import { wearItem } from '../systems/equipment/logic';
import { generateOffer } from '../systems/market/logic';
import { SPOTS } from '../content/spots';
import type { GameEvent } from '../systems/events/state';

function targetEvent(d: GameState, id?: string): GameEvent | undefined {
  if (id) return d.events.list.find((e) => e.id === id && e.status === 'scheduled');
  return d.events.list.filter((e) => e.status === 'scheduled').sort((a, b) => a.startsAt - b.startsAt)[0];
}

function targetSpot(d: GameState, id?: string): string | undefined {
  if (id) return id;
  const next = targetEvent(d);
  if (next) return next.spotId;
  return [...d.events.list].reverse().find((e) => e.status === 'done')?.spotId;
}

export function applyEffect(d: GameState, e: Effect): void {
  switch (e.t) {
    case 'money':
      if (e.amount >= 0) earn(d, e.amount, e.category, e.label ?? 'Belohnung');
      else spend(d, -e.amount, e.category, e.label ?? 'Kosten');
      return;
    case 'xp':
      addXp(d, e.skill, e.amount);
      return;
    case 'rep':
      addRep(d, e.amount);
      return;
    case 'item':
      addItem(d, e.item, { qty: e.qty, condition: e.condition });
      return;
    case 'flag':
      setFlag(d, e.flag, e.value ?? 1);
      return;
    case 'unlock':
      unlock(d, e.id);
      return;
    case 'notify':
      notify(d, { tone: e.tone, title: e.title, text: e.text });
      return;
    case 'revealSpot':
      revealSpot(d, e.spot, 'contact', e.intel ?? 35);
      return;
    case 'revealPoi':
      revealPoi(d, e.poi, 'contact');
      return;
    case 'rumor':
      hearRumor(d, e.rumor, 'contact');
      return;
    case 'trust':
      adjustTrust(d, e.person, e.amount);
      return;
    case 'relation':
      adjustRelation(d, e.person, e.amount);
      return;
    case 'favor':
      adjustFavor(d, e.person, e.amount);
      return;
    case 'meet':
      meetPerson(d, e.person, 'contact');
      return;
    case 'meetSomeone':
      meetSomeone(d, e.roles);
      return;
    case 'message':
      if (e.from) queueMessage(d, e.template, e.from, e.delayMin ?? 0);
      return;
    case 'task':
      startActivity(d, { kind: 'task', channel: e.channel, label: e.label, durationMs: minutes(e.minutes), payload: { effects: JSON.stringify(e.effects) } });
      return;
    case 'explore': {
      const st = (d.map.districts[e.district] ??= { explored: 0, visits: 0 });
      st.explored = Math.min(100, st.explored + e.amount);
      st.visits++;
      return;
    }
    case 'rivalRelation':
      adjustRivalRelation(d, e.rival, e.amount);
      return;
    case 'coop': {
      const def = RIVALS_BY_ID.get(e.rival);
      if (!def) return;
      d.rivals.coop = { crewId: e.rival, until: d.clock.now + e.days * GAME_DAY_MS, share: e.share };
      addNews(d, `${def.name} und du planen eine gemeinsame Party.`, 'success', { crewId: e.rival });
      return;
    }
    case 'rivalBooking': {
      const crew = d.rivals.crews[e.rival];
      if (!crew) return;
      const next = d.rivals.events.filter((x) => x.crewId === e.rival && x.status === 'scheduled').sort((a, b) => a.startsAt - b.startsAt)[0];
      if (next) next.guest = true;
      else crew.pendingGuest = true;
      return;
    }
    case 'rivalSpotTip': {
      const crew = d.rivals.crews[e.rival];
      const unknown = (crew?.knownSpots ?? []).filter((id) => !d.spots.spots[id]?.known);
      if (unknown.length === 0) return;
      revealSpot(d, pick(d, unknown), 'contact', 45);
      if (crew) crew.tipDay = Math.floor((d.clock.now - d.clock.origin) / GAME_DAY_MS);
      return;
    }
    case 'eventBoost': {
      const ev = targetEvent(d, e.event);
      if (ev) (ev.boosts ??= []).push({ label: e.label, value: e.amount });
      return;
    }
    case 'spotChange': {
      const id = targetSpot(d, e.spot);
      const st = id ? d.spots.spots[id] : undefined;
      if (!st) return;
      if (e.fame) st.fame = Math.max(0, Math.min(100, st.fame + e.fame));
      if (e.condition) st.condition = Math.max(10, Math.min(100, st.condition + e.condition));
      return;
    }
    case 'modifier':
      addModifier(d, e.kind, e.value, e.hours, e.label);
      return;
    case 'wearItem':
      wearItem(d, e.uid, e.amount);
      return;
    case 'discoverSpot': {
      const pool = SPOTS.filter((sp) => sp.cityId === d.map.cityId && !d.spots.spots[sp.id]?.known);
      if (pool.length > 0) revealSpot(d, pick(d, pool).id, 'contact', e.intel ?? 30);
      return;
    }
    case 'lineupSwap': {
      const ev = d.events.list.find((x) => x.id === e.event && x.status === 'scheduled');
      if (!ev) return;
      const rest = ev.lineup.filter((id) => id !== e.person);
      if (e.to === 'self' && !rest.includes('self')) rest.push('self');
      if (e.to === 'sub') rest.push('sub');
      ev.lineup = rest;
      return;
    }
    case 'rareOffer': {
      const offer = generateOffer(d, { factor: e.factor, defId: e.item });
      if (offer) d.market.offers.push(offer);
      return;
    }
  }
}

export function applyEffects(d: GameState, list: readonly Effect[] | undefined): void {
  if (!list) return;
  for (const e of list) applyEffect(d, e);
}

/** Short human readable text, e.g. „+20 €“, „+15 XP Business“. Empty for silent effects. */
export function describeEffect(e: Effect): string {
  switch (e.t) {
    case 'money':
      return fmtMoney(e.amount, { sign: true });
    case 'xp':
      return `+${fmtNumber(e.amount)} XP ${SKILL_DEFS[e.skill].name}`;
    case 'rep':
      return `${e.amount >= 0 ? '+' : ''}${fmtNumber(e.amount)} Reputation`;
    case 'item': {
      const name = ITEMS.get(e.item)?.name ?? e.item;
      return (e.qty ?? 1) > 1 ? `${e.qty}× ${name}` : name;
    }
    case 'unlock':
      return `Freischaltung: ${e.label ?? e.id}`;
    case 'revealSpot':
      return `Spot: ${SPOTS_BY_ID.get(e.spot)?.name ?? e.spot}`;
    case 'revealPoi':
      return `Ort: ${POIS_BY_ID.get(e.poi)?.name ?? e.poi}`;
    case 'rumor':
      return 'ein Gerücht';
    case 'trust':
      return `${e.amount >= 0 ? '+' : ''}${fmtNumber(e.amount)} Vertrauen (${PERSONS_BY_ID.get(e.person)?.name ?? 'Kontakt'})`;
    case 'meet':
      return `Kontakt: ${PERSONS_BY_ID.get(e.person)?.name ?? e.person}`;
    case 'meetSomeone':
      return 'neue Leute kennenlernen';
    case 'task':
      return `${CHANNEL_LABELS[e.channel]}: ${e.label} (${e.minutes} Min)`;
    case 'explore':
      return `+${e.amount} % ${DISTRICTS_BY_ID.get(e.district)?.name ?? e.district}`;
    case 'relation':
    case 'favor':
    case 'message':
      return '';
    case 'flag':
    case 'notify':
      return '';
    case 'rivalRelation':
      return `${e.amount >= 0 ? '+' : ''}${fmtNumber(e.amount)} Verhältnis (${RIVALS_BY_ID.get(e.rival)?.name ?? 'Crew'})`;
    case 'coop':
      return `Gemeinsame Party mit ${RIVALS_BY_ID.get(e.rival)?.name ?? 'Crew'} (${Math.round(e.share * 100)} % Anteil für sie)`;
    case 'rivalBooking':
      return `Gastset bei ${RIVALS_BY_ID.get(e.rival)?.name ?? 'Crew'}`;
    case 'rivalSpotTip':
      return 'ein Spot-Tipp';
    case 'eventBoost':
      return `${e.amount >= 0 ? '+' : ''}${Math.round(e.amount * 100)} % Gäste beim nächsten Event`;
    case 'spotChange':
      return [e.fame ? `Bekanntheit ${e.fame > 0 ? '+' : ''}${e.fame}` : '', e.condition ? `Zustand ${e.condition > 0 ? '+' : ''}${e.condition}` : ''].filter(Boolean).join(', ');
    case 'modifier':
      return e.label;
    case 'wearItem':
      return `Verschleiß −${e.amount}`;
    case 'discoverSpot':
      return 'ein neuer Spot';
    case 'lineupSwap':
      return e.to === 'self' ? 'du spielst selbst' : e.to === 'sub' ? 'Ersatz-DJ' : 'Line-up ohne Ersatz';
    case 'rareOffer':
      return `Angebot: ${ITEMS.get(e.item)?.name ?? e.item}`;
  }
}

export function describeEffects(list: readonly Effect[] | undefined): string {
  if (!list) return '';
  return list.map(describeEffect).filter(Boolean).join(' · ');
}
