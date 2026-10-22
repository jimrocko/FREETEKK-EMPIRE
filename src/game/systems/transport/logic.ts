import type { GameState } from '../../state';
import type { ItemDef } from '../../content/types';
import { ITEMS } from '../../content/registry';

export interface VehicleInfo {
  key: string;
  def: ItemDef;
  rented: boolean;
  until?: number;
  condition: number;
}

/** Owned (working) vehicles and active rentals. */
export function vehicles(s: GameState): VehicleInfo[] {
  const out: VehicleInfo[] = [];
  for (const it of Object.values(s.inventory.items)) {
    const def = ITEMS.get(it.defId);
    if (def?.category === 'vehicle' && !it.broken && !it.locked) out.push({ key: it.uid, def, rented: false, condition: it.condition });
  }
  for (const r of s.transport.rentals) {
    const def = ITEMS.get(r.defId);
    if (def) out.push({ key: r.id, def, rented: true, until: r.until, condition: 90 });
  }
  return out;
}

export interface TransportCapacity {
  volumeL: number;
  weightKg: number;
  count: number;
}

export function transportCapacity(s: GameState): TransportCapacity {
  let volumeL = 0;
  let weightKg = 0;
  const list = vehicles(s);
  for (const v of list) {
    volumeL += v.def.stats?.capacityL ?? 0;
    weightKg += v.def.stats?.maxLoadKg ?? 0;
  }
  return { volumeL, weightKg, count: list.length };
}

/** Can the given load be moved in one go? */
export function fitsTransport(s: GameState, volumeL: number, weightKg: number): boolean {
  const cap = transportCapacity(s);
  return volumeL <= cap.volumeL && weightKg <= cap.weightKg;
}
