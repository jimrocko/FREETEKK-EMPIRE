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
  /** Sold new in the shop. */
  shop?: boolean;
  /** Shop only lists it once these conditions hold. */
  shopRequires?: Condition[];
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
