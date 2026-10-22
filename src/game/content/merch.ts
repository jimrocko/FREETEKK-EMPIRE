import type { Condition } from '../core/types';

export interface MerchProductDef {
  id: string;
  name: string;
  /** Storage per piece. */
  volumeL: number;
  /** Typical selling price. */
  basePrice: number;
  /** Share of buyers who want this product. */
  appeal: number;
}

export const MERCH_PRODUCTS: readonly MerchProductDef[] = [
  { id: 'merch.sticker', name: 'Sticker', volumeL: 0.01, basePrice: 1.5, appeal: 1.6 },
  { id: 'merch.patch', name: 'Patch', volumeL: 0.02, basePrice: 5, appeal: 0.9 },
  { id: 'merch.shirt', name: 'T-Shirt', volumeL: 0.6, basePrice: 22, appeal: 1 },
  { id: 'merch.hoodie', name: 'Hoodie', volumeL: 1.6, basePrice: 48, appeal: 0.5 },
  { id: 'merch.cap', name: 'Cap', volumeL: 1.2, basePrice: 24, appeal: 0.45 },
  { id: 'merch.poster', name: 'Poster', volumeL: 0.2, basePrice: 10, appeal: 0.4 },
];

export interface ManufacturerOffer {
  unitCost: number;
  minQty: number;
}

export interface ManufacturerDef {
  id: string;
  name: string;
  description: string;
  quality: number;
  /** Real minutes until an order is ready. */
  minutes: number;
  products: Partial<Record<string, ManufacturerOffer>>;
  personId?: string;
  requires?: Condition[];
}

export const MANUFACTURERS: readonly ManufacturerDef[] = [
  {
    id: 'man.online',
    name: 'Online-Druckerei',
    description: 'Hochladen, bezahlen, warten. Solide, nicht besonders.',
    quality: 55,
    minutes: 30,
    products: {
      'merch.sticker': { unitCost: 0.25, minQty: 100 },
      'merch.shirt': { unitCost: 7, minQty: 10 },
      'merch.hoodie': { unitCost: 18, minQty: 10 },
      'merch.cap': { unitCost: 8, minQty: 10 },
      'merch.poster': { unitCost: 2.5, minQty: 20 },
    },
  },
  {
    id: 'man.fynn',
    name: 'Fynns Siebdruck',
    description: 'Handgedruckt in Ostend. Kleine Auflagen, die man spürt.',
    quality: 80,
    minutes: 20,
    personId: 'p.fynn',
    requires: [{ t: 'trust', person: 'p.fynn', gte: 20 }],
    products: {
      'merch.shirt': { unitCost: 6, minQty: 20 },
      'merch.hoodie': { unitCost: 16, minQty: 20 },
      'merch.patch': { unitCost: 1.5, minQty: 50 },
      'merch.poster': { unitCost: 2, minQty: 20 },
    },
  },
  {
    id: 'man.factory',
    name: 'Textilfabrik Wolff',
    description: 'Industrielle Mengen, kleine Stückpreise. Für Marken, die laufen.',
    quality: 62,
    minutes: 60,
    requires: [
      { t: 'rep', gte: 500 },
      { t: 'skill', skill: 'business', gte: 5 },
    ],
    products: {
      'merch.sticker': { unitCost: 0.08, minQty: 1000 },
      'merch.shirt': { unitCost: 3.5, minQty: 200 },
      'merch.hoodie': { unitCost: 11, minQty: 100 },
      'merch.cap': { unitCost: 4, minQty: 200 },
      'merch.patch': { unitCost: 0.6, minQty: 500 },
    },
  },
];

export const MOTIFS: readonly string[] = [
  'Hase mit Kopfhörern',
  'Soundsystem-Silhouette',
  'Acid-Smiley',
  'Teknival-Karte',
  'Wald bei Nacht',
  'Bunker-Tür',
  'Kick-Drum-Wellenform',
  'Kranhaken am Hafen',
  'Mondfinsternis',
  'Lautsprecherwand',
];

/** Where the online shop opens. */
export const ONLINE_SHOP_REQUIRES: Condition[] = [
  { t: 'skill', skill: 'business', gte: 3 },
  { t: 'stat', stat: 'merchSold', gte: 25, label: 'Merch verkauft' },
];
export const ONLINE_SHOP_COST = 250;
