import type { Condition, Effect } from '../../core/types';
import { RIVAL_BY_LEADER } from '../../content/registry';

/** Replaces '$from' with the actual sender in effects (including nested task effects). */
export function resolveEffects(list: readonly Effect[] | undefined, from: string): Effect[] {
  if (!list) return [];
  return list.map((e) => {
    switch (e.t) {
      case 'trust':
      case 'relation':
      case 'favor':
      case 'meet':
        return e.person === '$from' ? { ...e, person: from } : e;
      case 'message':
        return e.from === '$from' || e.from === undefined ? { ...e, from } : e;
      case 'task':
        return { ...e, effects: resolveEffects(e.effects, from) };
      case 'rivalRelation':
      case 'coop':
      case 'rivalBooking':
      case 'rivalSpotTip':
        return e.rival === '$rival' ? { ...e, rival: RIVAL_BY_LEADER.get(from)?.id ?? e.rival } : e;
      default:
        return e;
    }
  });
}

export function resolveConditions(list: readonly Condition[] | undefined, from: string): Condition[] {
  if (!list) return [];
  return list.map((c) => {
    switch (c.t) {
      case 'trust':
      case 'knows':
        return c.person === '$from' ? { ...c, person: from } : c;
      case 'rivalRelation':
      case 'rivalActive':
        return c.rival === '$rival' ? { ...c, rival: RIVAL_BY_LEADER.get(from)?.id ?? c.rival } : c;
      case 'all':
      case 'any':
        return { ...c, of: resolveConditions(c.of, from) };
      case 'not':
        return { ...c, c: resolveConditions([c.c], from)[0] };
      default:
        return c;
    }
  });
}

/** Conditions of a rival template, checked before a leader is picked. */
export function resolveConditionsRival(list: readonly Condition[] | undefined, rivalId: string): Condition[] {
  const leader = [...RIVAL_BY_LEADER.values()].find((r) => r.id === rivalId)?.leaderId ?? '';
  return resolveConditions(list, leader);
}

export function fillText(text: string, vars: { name: string; player: string; from?: string }): string {
  const crew = vars.from ? (RIVAL_BY_LEADER.get(vars.from)?.name ?? '') : '';
  return text.replace(/\{name\}/g, vars.name).replace(/\{player\}/g, vars.player).replace(/\{crew\}/g, crew);
}
