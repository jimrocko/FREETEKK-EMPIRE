import type { GameState } from '../state';
import type { Effect } from './types';
import { fmtMoney, fmtNumber } from './format';
import { notify } from './notify';
import { SKILL_DEFS } from '../content/skills';
import { ITEMS } from '../content/registry';
import { earn, spend } from '../systems/finance/logic';
import { addRep, addXp, setFlag, unlock } from '../systems/progression/logic';
import { addItem } from '../systems/inventory/logic';

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
    case 'flag':
    case 'notify':
      return '';
  }
}

export function describeEffects(list: readonly Effect[] | undefined): string {
  if (!list) return '';
  return list.map(describeEffect).filter(Boolean).join(' · ');
}
