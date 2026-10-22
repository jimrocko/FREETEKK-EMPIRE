import type { Condition, Effect, LedgerCategory, SkillId } from '../core/types';

export type ItemCategory = 'gadget' | 'music' | 'sound' | 'light' | 'power' | 'vehicle' | 'goods' | 'merch' | 'media' | 'misc';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface ItemDef {
  id: string;
  name: string;
  /** Fictional brand. */
  brand?: string;
  category: ItemCategory;
  /** Fine-grained type: 'phone', 'laptop', 'drum-machine', 'groovebox', 'sub', … */
  type: string;
  /** Rough performance class 1–6. */
  tier: number;
  /** New price in €. */
  price: number;
  /** Base quality 0–100. */
  quality: number;
  weightKg: number;
  /** Storage volume in litres. */
  volumeL: number;
  stackable?: boolean;
  rarity?: Rarity;
  /** Type-specific values (e.g. powerW, acid, groove, capacityL). */
  stats?: Record<string, number>;
  upkeepPerDay?: number;
  tags?: string[];
  /** Shops that sell it new (see content/shops.ts). */
  shops?: string[];
  /** Can show up on the used market. */
  usedMarket?: boolean;
  description: string;
}

export interface JobBonus {
  chance: number;
  min: number;
  max: number;
  text: string;
}

export interface JobDef {
  id: string;
  name: string;
  description: string;
  /** Real minutes. */
  durationMin: number;
  pay: number;
  xp: Partial<Record<SkillId, number>>;
  rep?: number;
  bonus?: JobBonus;
  requires?: Condition[];
  /** Hidden in the list until these conditions hold (teaser otherwise). */
  visibleWhen?: Condition[];
}

export type GoalSize = 'small' | 'medium' | 'large' | 'long';

export interface GoalDef {
  id: string;
  title: string;
  description: string;
  size: GoalSize;
  path?: SkillId | 'mixed';
  /** Goal is only shown once these hold. */
  requires?: Condition[];
  complete: Condition[];
  rewards: Effect[];
}

export interface RepTier {
  id: string;
  name: string;
  min: number;
  description: string;
}

export interface RecurringCostDef {
  id: string;
  label: string;
  perDay: number;
  category: LedgerCategory;
  requires?: Condition[];
}

export interface HomeDef {
  id: string;
  name: string;
  capacityL: number;
  description: string;
}

export type SpotType =
  | 'industrial'
  | 'warehouse'
  | 'bunker'
  | 'forest'
  | 'field'
  | 'quarry'
  | 'lakeside'
  | 'hall'
  | 'basement'
  | 'rooftop'
  | 'yard'
  | 'tracks'
  | 'canteen';

export type Legality = 'legal' | 'grey' | 'illegal';

/** Values 0–100 unless noted. */
export interface SpotStats {
  /** People. */
  capacity: number;
  atmosphere: number;
  /** Zufahrt: how easy it is to get gear in and out. */
  access: number;
  /** Available power in kW (0 = none, generator needed). */
  powerKw: number;
  /** Lärmverträglichkeit: how loud you can get without trouble. */
  noise: number;
  /** Wetterabhängigkeit: 0 = indoor, 100 = fully exposed. */
  weather: number;
  /** Sicherheit: safety from police, owners and accidents. */
  security: number;
  /** Parking spaces for vehicles. */
  vehicles: number;
  /** Versorgung/Infrastruktur: toilets, water, light. */
  infrastructure: number;
}

export interface SpotDef {
  id: string;
  cityId: string;
  districtId: string;
  name: string;
  type: SpotType;
  description: string;
  /** Position on the city map. */
  pos: [number, number];
  stats: SpotStats;
  legality: Legality;
  /** Rent per event (0 for squats/outdoor). */
  rent: number;
  /** Starting condition 0–100. */
  condition: number;
  /** Starting fame 0–100. */
  fame: number;
  /** Technical features: 'roof', 'toilets', 'water', 'lighting', 'stage', 'loading', 'heating'. */
  features: string[];
  /** Explored % at which exploration can find it; omit for rumor/contact-only spots. */
  explore?: number;
}

export type PoiKind = 'shop' | 'hangout' | 'club' | 'storage';

export interface PoiVisit {
  label: string;
  durationMin: number;
  cost: number;
  xp: Partial<Record<SkillId, number>>;
  rep?: number;
  /** Chance per visit to hear one of the rumors linked to this place. */
  rumorChance: number;
}

export interface PoiDef {
  id: string;
  cityId: string;
  districtId: string;
  kind: PoiKind;
  name: string;
  description: string;
  pos: [number, number];
  /** Explored % needed to find it; omit for rumor-only places. */
  explore?: number;
  /** Shop id this place sells under. */
  shopId?: string;
  visit?: PoiVisit;
  storage?: { capacityL: number; perDay: number; deposit: number };
}

export interface ShopDef {
  id: string;
  name: string;
  description: string;
  priceFactor: number;
  /** Place on the map that must be known (none = always available). */
  poiId?: string;
}

export type RumorSource =
  | { job: string }
  | { poi: string }
  | { district: string; minExplored: number };

export interface RumorDef {
  id: string;
  text: string;
  target: { kind: 'spot' | 'poi'; id: string };
  sources: RumorSource[];
  /** Real minutes to follow up. */
  followMin: number;
}
