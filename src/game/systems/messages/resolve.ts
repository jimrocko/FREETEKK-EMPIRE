import type { Condition, Effect } from '../../core/types';

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

export function fillText(text: string, vars: { name: string; player: string }): string {
  return text.replace(/\{name\}/g, vars.name).replace(/\{player\}/g, vars.player);
}
