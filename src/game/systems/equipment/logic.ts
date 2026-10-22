import type { GameState } from '../../state';
import type { Reason } from '../../core/types';
import type { PersonDef } from '../../content/types';
import { ITEMS, itemDef } from '../../content/registry';
import { PEOPLE } from '../../content/people';
import { notify } from '../../core/notify';
import { chance } from '../../core/rng';
import { roundMoney } from '../../core/format';
import { skillLevel } from '../progression/logic';
import { getItem } from '../inventory/logic';
import { channelReason } from '../activities/logic';
import { moneyReason } from '../finance/logic';
import type { ItemInstance } from '../inventory/state';

/** Items in this state can be used (studio, sound system, events). */
export function usable(it: ItemInstance | undefined): it is ItemInstance {
  return !!it && !it.broken && !it.locked;
}

/** Wears an item down. Low condition can make it break. Returns true if it broke. */
export function wearItem(d: GameState, uid: string, amount: number): boolean {
  const it = getItem(d, uid);
  if (!it || amount <= 0) return false;
  it.condition = Math.max(0, Math.round((it.condition - amount) * 10) / 10);
  if (!it.broken && it.condition < 25 && chance(d, (25 - it.condition) / 60)) {
    it.broken = true;
    const def = itemDef(it.defId);
    notify(d, { tone: 'danger', title: `Defekt: ${def.name}`, text: 'Das Gerät hat den Geist aufgegeben. Reparieren lassen oder selbst ran.', link: '/inventar' });
    return true;
  }
  return false;
}

export function needsRepair(it: ItemInstance): boolean {
  return it.broken === true || it.condition < 95;
}

export function repairParts(it: ItemInstance): number {
  const def = itemDef(it.defId);
  return roundMoney(Math.max(5, def.price * ((100 - it.condition) / 100) * 0.18 + (it.broken ? def.price * 0.08 : 0)));
}

/** Condition reached by repairing yourself. */
export function selfRepairTarget(s: GameState, it: ItemInstance): number {
  return Math.min(95, Math.round(it.condition + 20 + 6 * skillLevel(s, 'technik')));
}

export function selfRepairMinutes(it: ItemInstance): number {
  const def = itemDef(it.defId);
  return 3 + def.tier * 2 + (it.broken ? 3 : 0);
}

export function proRepairMinutes(it: ItemInstance): number {
  return 2 + itemDef(it.defId).tier * 3;
}

/** Crew technicians only charge for parts. */
export function proRepairCost(it: ItemInstance, person: PersonDef, s?: GameState): number {
  const inCrew = s?.crew.members.some((m) => m.personId === person.id && m.role === 'technician') ?? false;
  return roundMoney(repairParts(it) + (inCrew ? 0 : person.price * 0.4));
}

/** Technicians you know well enough to repair for you. */
export function repairContacts(s: GameState): PersonDef[] {
  return PEOPLE.filter((p) => p.roles.includes('technician') && s.people.people[p.id]?.met && s.people.people[p.id].trust >= 20);
}

export function repairBaseReason(s: GameState, uid: string): Reason {
  const it = getItem(s, uid);
  if (!it || !ITEMS.has(it.defId)) return 'Item nicht gefunden.';
  if (it.locked) return 'Item ist gerade gebunden.';
  if (!needsRepair(it)) return 'Ist in Top-Zustand.';
  return channelReason(s, 'workshop');
}

export function selfRepairReason(s: GameState, uid: string): Reason {
  const base = repairBaseReason(s, uid);
  if (base) return base;
  const it = getItem(s, uid)!;
  const def = itemDef(it.defId);
  const need = Math.max(1, def.tier);
  if (skillLevel(s, 'technik') < need) return `Für dieses Gerät brauchst du Technik Lv. ${need}.`;
  if (selfRepairTarget(s, it) <= it.condition && !it.broken) return 'Selbst bekommst du es nicht besser hin.';
  return moneyReason(s, repairParts(it));
}
