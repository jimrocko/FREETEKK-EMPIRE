import type { GameState } from '../../state';
import type { Reason } from '../../core/types';
import type { ItemDef, Rarity } from '../../content/types';
import { ITEMS, POIS_BY_ID, homeDef, itemDef } from '../../content/registry';
import { fmtNumber, roundMoney } from '../../core/format';
import type { ItemInstance } from './state';

const RARITY_VALUE: Record<Rarity, number> = { common: 1, uncommon: 1.15, rare: 1.4, legendary: 2 };

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Gewöhnlich',
  uncommon: 'Ungewöhnlich',
  rare: 'Selten',
  legendary: 'Legendär',
};

/** Fair second-hand value per unit (broken items are worth half). */
export function resaleValue(def: ItemDef, condition: number, broken = false): number {
  const rarity = RARITY_VALUE[def.rarity ?? 'common'];
  return roundMoney(def.price * 0.6 * (0.25 + 0.75 * (condition / 100)) * rarity * (broken ? 0.5 : 1));
}

/** What the second-hand dealer pays instantly per unit. */
export function dealerPrice(def: ItemDef, condition: number, broken = false): number {
  return roundMoney(resaleValue(def, condition, broken) * 0.7);
}

export function getItem(s: GameState, uid: string): ItemInstance | undefined {
  return s.inventory.items[uid];
}

export function ownedItems(s: GameState): ItemInstance[] {
  return Object.values(s.inventory.items).sort((a, b) => a.acquiredAt - b.acquiredAt || a.uid.localeCompare(b.uid));
}

export function countItem(s: GameState, defId: string): number {
  let n = 0;
  for (const it of Object.values(s.inventory.items)) if (it.defId === defId) n += it.qty;
  return n;
}

export function countTag(s: GameState, tag: string): number {
  let n = 0;
  for (const it of Object.values(s.inventory.items)) {
    if (ITEMS.get(it.defId)?.tags?.includes(tag)) n += it.qty;
  }
  return n;
}

/** Storage used at home and in rented space. Vehicles are parked outside. */
export function usedVolume(s: GameState): number {
  let v = 0;
  for (const it of Object.values(s.inventory.items)) {
    const def = ITEMS.get(it.defId);
    if (def && def.category !== 'vehicle') v += def.volumeL * it.qty;
  }
  return v;
}

export function storageCapacity(s: GameState): number {
  let cap = homeDef(s.player.homeId).capacityL;
  for (const id of Object.keys(s.map.rentals)) cap += POIS_BY_ID.get(id)?.storage?.capacityL ?? 0;
  return cap;
}

export function freeVolume(s: GameState): number {
  return storageCapacity(s) - usedVolume(s);
}

export function spaceReason(s: GameState, defId: string, qty = 1): Reason {
  const need = itemDef(defId).volumeL * qty;
  const free = freeVolume(s);
  if (need > free) return `Kein Platz: ${fmtNumber(need)} L benötigt, ${fmtNumber(Math.max(0, free))} L frei.`;
  return null;
}

export function inventoryValue(s: GameState): number {
  let v = 0;
  for (const it of Object.values(s.inventory.items)) {
    const def = ITEMS.get(it.defId);
    if (def) v += resaleValue(def, it.condition, it.broken) * it.qty;
  }
  return roundMoney(v);
}

export interface AddItemOptions {
  qty?: number;
  condition?: number;
  paid?: number;
}

export function addItem(d: GameState, defId: string, opts: AddItemOptions = {}): ItemInstance {
  const def = itemDef(defId);
  const qty = Math.max(1, Math.floor(opts.qty ?? 1));
  const paid = roundMoney(opts.paid ?? 0);
  if (def.stackable) {
    const stack = Object.values(d.inventory.items).find((it) => it.defId === defId && !it.locked);
    if (stack) {
      stack.qty += qty;
      stack.paid = roundMoney(stack.paid + paid);
      return stack;
    }
  }
  const uid = `i${d.inventory.nextUid++}`;
  const inst: ItemInstance = {
    uid,
    defId,
    qty: def.stackable ? qty : 1,
    condition: Math.max(0, Math.min(100, Math.round(opts.condition ?? 100))),
    acquiredAt: d.clock.now,
    paid,
  };
  d.inventory.items[uid] = inst;
  // Non-stackables with qty > 1 become separate instances.
  if (!def.stackable && qty > 1) {
    for (let i = 1; i < qty; i++) addItem(d, defId, { condition: opts.condition, paid: 0 });
  }
  return inst;
}

/** Removes `qty` units (default: all) of an instance. */
export function removeItem(d: GameState, uid: string, qty?: number): void {
  const it = d.inventory.items[uid];
  if (!it) return;
  const n = qty ?? it.qty;
  if (n >= it.qty) {
    delete d.inventory.items[uid];
  } else {
    const share = it.paid * (n / it.qty);
    it.qty -= n;
    it.paid = roundMoney(it.paid - share);
  }
}

/** Sound system the item belongs to (if any). */
export function systemOf(s: GameState, uid: string): { id: string; name: string } | undefined {
  return s.sound.systems.find((sys) => sys.components.includes(uid));
}

export function sellableReason(s: GameState, uid: string): Reason {
  const it = getItem(s, uid);
  if (!it) return 'Item nicht gefunden.';
  if (it.locked) return 'Item ist gerade gebunden (z. B. inseriert).';
  const sys = systemOf(s, uid);
  if (sys) return `Gehört zum Soundsystem „${sys.name}“ – erst dort entfernen.`;
  return null;
}
