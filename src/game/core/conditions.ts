import type { GameState } from '../state';
import type { Condition, Reason } from './types';
import { fmtMoney, fmtNumber } from './format';
import { SKILL_DEFS } from '../content/skills';
import { GOALS_BY_ID, ITEMS, repTierFor } from '../content/registry';
import { REP_TIERS } from '../content/reputation';
import { gameDayAt } from './time';
import { hasFlag, isUnlocked, skillLevel, stat } from '../systems/progression/logic';
import { countItem, countTag } from '../systems/inventory/logic';

export function checkCondition(s: GameState, c: Condition): boolean {
  switch (c.t) {
    case 'money':
      return s.finance.cash >= c.gte;
    case 'rep':
      return s.progression.reputation >= c.gte;
    case 'skill':
      return skillLevel(s, c.skill) >= c.gte;
    case 'item':
      return countItem(s, c.item) >= (c.count ?? 1);
    case 'itemTag':
      return countTag(s, c.tag) >= (c.count ?? 1);
    case 'stat':
      return stat(s, c.stat) >= c.gte;
    case 'flag':
      return hasFlag(s, c.flag);
    case 'unlocked':
      return isUnlocked(s, c.id);
    case 'goal':
      return s.goals.done[c.id] !== undefined;
    case 'day':
      return gameDayAt(s.clock, s.clock.now) >= c.gte;
    case 'all':
      return c.of.every((x) => checkCondition(s, x));
    case 'any':
      return c.of.some((x) => checkCondition(s, x));
    case 'not':
      return !checkCondition(s, c.c);
  }
}

export function checkAll(s: GameState, list: readonly Condition[] | undefined): boolean {
  if (!list) return true;
  return list.every((c) => checkCondition(s, c));
}

function repName(gte: number): string {
  const exact = REP_TIERS.find((t) => t.min === gte);
  return exact ? `Reputation „${exact.name}“` : `Reputation ${fmtNumber(gte)} (${repTierFor(gte).tier.name})`;
}

const TAG_LABELS: Record<string, string> = {
  mobility: 'ein Fahrrad o. Ä.',
  computer: 'einen Computer',
  studio: 'ein Studio-Gerät',
  classic: 'ein klassisches Gerät',
  phone: 'ein Smartphone',
  camera: 'ein Handy mit guter Kamera',
  transport: 'ein Transportmittel',
};

/** Human readable description, e.g. „Netzwerk Lv. 2“. */
export function describeCondition(c: Condition): string {
  switch (c.t) {
    case 'money':
      return `${fmtMoney(c.gte)} Bargeld`;
    case 'rep':
      return repName(c.gte);
    case 'skill':
      return `${SKILL_DEFS[c.skill].name} Lv. ${c.gte}`;
    case 'item': {
      const name = ITEMS.get(c.item)?.name ?? c.item;
      return (c.count ?? 1) > 1 ? `${c.count}× ${name}` : name;
    }
    case 'itemTag':
      return `Besitz: ${TAG_LABELS[c.tag] ?? c.tag}`;
    case 'stat':
      return `${c.label ?? c.stat}: ${fmtNumber(c.gte)}`;
    case 'flag':
      return c.label ?? c.flag;
    case 'unlocked':
      return `Freigeschaltet: ${c.label ?? c.id}`;
    case 'goal':
      return `Ziel „${GOALS_BY_ID.get(c.id)?.title ?? c.id}“`;
    case 'day':
      return `Ab Tag ${c.gte}`;
    case 'all':
      return c.of.map(describeCondition).join(' und ');
    case 'any':
      return c.of.map(describeCondition).join(' oder ');
    case 'not':
      return c.label ?? `nicht: ${describeCondition(c.c)}`;
  }
}

export function firstUnmet(s: GameState, list: readonly Condition[] | undefined): Condition | null {
  if (!list) return null;
  for (const c of list) if (!checkCondition(s, c)) return c;
  return null;
}

/** Reason text for the first unmet condition, or null when all are met. */
export function requirementReason(s: GameState, list: readonly Condition[] | undefined): Reason {
  const c = firstUnmet(s, list);
  return c ? `Benötigt: ${describeCondition(c)}` : null;
}

export interface ConditionProgress {
  current: number;
  target: number;
}

/** Numeric progress for countable conditions (for progress bars). */
export function conditionProgress(s: GameState, c: Condition): ConditionProgress | null {
  switch (c.t) {
    case 'money':
      return { current: Math.max(0, s.finance.cash), target: c.gte };
    case 'rep':
      return { current: s.progression.reputation, target: c.gte };
    case 'skill':
      return { current: skillLevel(s, c.skill), target: c.gte };
    case 'stat':
      return { current: stat(s, c.stat), target: c.gte };
    case 'item':
      return { current: countItem(s, c.item), target: c.count ?? 1 };
    case 'itemTag':
      return { current: countTag(s, c.tag), target: c.count ?? 1 };
    default:
      return null;
  }
}
