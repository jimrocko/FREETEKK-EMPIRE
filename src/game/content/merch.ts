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
  /** Unlock needed before it can be produced. */
  unlock?: string;
}

export const MERCH_PRODUCTS: readonly MerchProductDef[] = [
  { id: 'merch.sticker', name: 'Sticker', volumeL: 0.01, basePrice: 1.5, appeal: 1.6 },
  { id: 'merch.patch', name: 'Patch', volumeL: 0.02, basePrice: 5, appeal: 0.9 },
  { id: 'merch.shirt', name: 'T-Shirt', volumeL: 0.6, basePrice: 22, appeal: 1 },
  { id: 'merch.hoodie', name: 'Hoodie', volumeL: 1.6, basePrice: 48, appeal: 0.5 },
  { id: 'merch.cap', name: 'Cap', volumeL: 1.2, basePrice: 24, appeal: 0.45 },
  { id: 'merch.poster', name: 'Poster', volumeL: 0.2, basePrice: 10, appeal: 0.4 },
  { id: 'merch.bag', name: 'Jutebeutel', volumeL: 0.3, basePrice: 12, appeal: 0.8, unlock: 'u.merchline' },
  { id: 'merch.flag', name: 'Fahne', volumeL: 0.5, basePrice: 30, appeal: 0.3, unlock: 'u.merchline' },
  { id: 'merch.vinyl', name: 'Vinyl-EP', volumeL: 0.4, basePrice: 25, appeal: 0.35, unlock: 'u.vinyl' },
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
      'merch.bag': { unitCost: 3, minQty: 25 },
      'merch.flag': { unitCost: 11, minQty: 10 },
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
      'merch.bag': { unitCost: 2.5, minQty: 30 },
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
      'merch.bag': { unitCost: 1.8, minQty: 200 },
      'merch.flag': { unitCost: 6, minQty: 50 },
    },
  },
  {
    id: 'man.presswerk',
    name: 'Presswerk Nordhafen',
    description: 'Schwarzes Vinyl, 180 Gramm, mit Innenhülle. Lange Wartezeit, dafür hält es ewig.',
    quality: 88,
    minutes: 120,
    requires: [{ t: 'unlocked', id: 'u.vinyl', label: 'Vinyl-Pressung' }],
    products: {
      'merch.vinyl': { unitCost: 7, minQty: 100 },
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
