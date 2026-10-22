import type { ItemCategory } from './types';

/** Contacts who buy your gear at a fairer price than the second-hand dealer. */
export interface TradePartnerDef {
  personId: string;
  /** Share of the fair resale value they pay. */
  factor: number;
  /** Trust needed before they deal with you. */
  trust: number;
  /** Item categories they take (none = all except goods). */
  categories?: ItemCategory[];
  note: string;
}

export const TRADE_PARTNERS: readonly TradePartnerDef[] = [
  { personId: 'p.lukas', factor: 0.85, trust: 25, note: 'Nimmt fast alles, zahlt fair.' },
  { personId: 'p.marek', factor: 0.92, trust: 40, categories: ['sound', 'light', 'power'], note: 'Nur Ton-, Licht- und Stromtechnik – die aber gut.' },
  { personId: 'p.kemal', factor: 0.88, trust: 35, categories: ['music', 'gadget'], note: 'Studio-Geräte und Gadgets für den Laden.' },
];
