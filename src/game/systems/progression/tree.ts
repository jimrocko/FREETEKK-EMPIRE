import type { GameState } from '../../state';
import type { Reason } from '../../core/types';
import { UNLOCKS, type UnlockDef } from '../../content/unlocks';
import { defineAction } from '../../core/actions';
import { requirementReason } from '../../core/conditions';
import { notify } from '../../core/notify';
import { moneyReason, spend } from '../finance/logic';
import { incStat, isUnlocked, unlock } from './logic';

export const UNLOCKS_BY_ID: ReadonlyMap<string, UnlockDef> = new Map(UNLOCKS.map((u) => [u.id, u]));

export function unlockName(id: string): string {
  return UNLOCKS_BY_ID.get(id)?.name ?? id;
}

/** Reason text for things gated by an unlock (null when unlocked). */
export function needsUnlock(s: GameState, id: string | undefined): Reason {
  if (!id || isUnlocked(s, id)) return null;
  return `Benötigt Freischaltung: ${unlockName(id)}`;
}

export function unlockReason(s: GameState, id: string): Reason {
  const u = UNLOCKS_BY_ID.get(id);
  if (!u) return 'Unbekannte Freischaltung.';
  if (isUnlocked(s, id)) return 'Schon freigeschaltet.';
  for (const r of u.requires ?? []) if (!isUnlocked(s, r)) return `Erst: ${unlockName(r)}`;
  const cond = requirementReason(s, u.conditions);
  if (cond) return cond;
  if (s.progression.points < u.cost) return `Zu wenig Szenepunkte (${s.progression.points} / ${u.cost}).`;
  return u.money ? moneyReason(s, u.money) : null;
}

export type UnlockStatus = 'done' | 'available' | 'blocked';

export function unlockStatus(s: GameState, id: string): UnlockStatus {
  if (isUnlocked(s, id)) return 'done';
  return unlockReason(s, id) ? 'blocked' : 'available';
}

export function availableUnlocks(s: GameState): UnlockDef[] {
  return UNLOCKS.filter((u) => unlockStatus(s, u.id) === 'available');
}

export const buyUnlock = defineAction<{ id: string }>({
  id: 'progression.unlock',
  check: (s, p) => unlockReason(s, p.id),
  run: (d, p) => {
    const u = UNLOCKS_BY_ID.get(p.id)!;
    d.progression.points -= u.cost;
    if (u.money) spend(d, u.money, 'other', `Freischaltung: ${u.name}`);
    unlock(d, u.id);
    incStat(d, 'unlocks');
    notify(d, { tone: 'discovery', title: `Freigeschaltet: ${u.name}`, text: u.enables.join(' · '), link: '/fortschritt/baum', big: true });
    return `${u.name} freigeschaltet.`;
  },
});
