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
import { minutes } from './time';

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
  }
}

export function describeEffects(list: readonly Effect[] | undefined): string {
  if (!list) return '';
  return list.map(describeEffect).filter(Boolean).join(' · ');
}
