import type { GameState } from '../../state';
import type { Reason } from '../../core/types';
import { MANUFACTURERS, MERCH_PRODUCTS, type ManufacturerDef, type MerchProductDef } from '../../content/merch';
import { requirementReason } from '../../core/conditions';
import { personDef } from '../../content/registry';
import { shortName } from '../people/logic';
import { activeMembers } from '../crew/logic';
import type { MerchStock } from './state';

export const MERCH_UNLOCK_REASON = 'Merch braucht eine Marke – gründe zuerst eine Crew.';

export function productDef(id: string): MerchProductDef {
  const p = MERCH_PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown merch product: ${id}`);
  return p;
}

export function manufacturerDef(id: string): ManufacturerDef {
  const m = MANUFACTURERS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown manufacturer: ${id}`);
  return m;
}

export function manufacturerReason(s: GameState, id: string): Reason {
  const m = MANUFACTURERS.find((x) => x.id === id);
  if (!m) return 'Unbekannter Hersteller.';
  if (m.personId && !s.people.people[m.personId]?.met) return `Du kennst ${shortName(personDef(m.personId))} noch nicht.`;
  return requirementReason(s, m.requires);
}

export function priceFor(s: GameState, productId: string): number {
  return s.merch.prices[productId] ?? productDef(productId).basePrice;
}

export function stockList(s: GameState): MerchStock[] {
  return Object.values(s.merch.stock).filter((x) => x.qty > 0);
}

export function totalPieces(s: GameState): number {
  return stockList(s).reduce((sum, x) => sum + x.qty, 0);
}

/**
 * How many pieces a crowd buys. Better brand, mood and quality sell more; a
 * price far above the perceived value sells less.
 */
export function merchDemand(s: GameState, st: MerchStock, visitors: number, mood: number): number {
  const product = productDef(st.productId);
  const price = priceFor(s, st.productId);
  const value = product.basePrice * (0.6 + st.quality / 100);
  const priceF = Math.max(0.1, Math.min(1.6, Math.pow(value / Math.max(0.5, price), 1.5)));
  const brandF = 0.5 + s.merch.brand / 100;
  return visitors * 0.06 * product.appeal * (mood / 70) * brandF * priceF;
}

/** Brand value grows with sold merch, good events and tracks; it fades slowly. */
export function addBrand(d: GameState, amount: number): void {
  d.merch.brand = Math.max(0, Math.round((d.merch.brand + amount) * 100) / 100);
}

export function stockKey(designId: string, productId: string): string {
  return `${designId}|${productId}`;
}

/** Litres and kilos of the whole merch stock (for event transport). */
export function stockLoad(s: GameState): { volumeL: number; weightKg: number } {
  let volumeL = 0;
  for (const st of stockList(s)) volumeL += st.qty * productDef(st.productId).volumeL;
  return { volumeL, weightKg: volumeL * 0.25 };
}

export interface StandResult {
  revenue: number;
  /** Production cost of the sold pieces (already paid when ordered). */
  cost: number;
  pieces: number;
  sold: Record<string, number>;
}

/**
 * Merch stand at an event. Without `roll` the expected (rounded down) result
 * is returned – used for the forecast.
 */
export function standSales(s: GameState, visitors: number, mood: number, share: number, roll?: () => number): StandResult {
  const boost = activeMembers(s, 'merch').length > 0 ? 1.25 : 1;
  const out: StandResult = { revenue: 0, cost: 0, pieces: 0, sold: {} };
  for (const [key, st] of Object.entries(s.merch.stock)) {
    if (st.qty <= 0) continue;
    const want = merchDemand(s, st, visitors, mood) * share * boost;
    const n = Math.min(st.qty, Math.floor(want) + (roll && roll() < want % 1 ? 1 : 0));
    if (n <= 0) continue;
    out.sold[key] = n;
    out.pieces += n;
    out.revenue += n * priceFor(s, st.productId);
    out.cost += n * st.unitCost;
  }
  out.revenue = Math.round(out.revenue * 100) / 100;
  out.cost = Math.round(out.cost * 100) / 100;
  return out;
}
