import type { GameState } from '../../state';
import type { ItemDef, Rarity, ShopDef } from '../../content/types';
import { ALL_ITEMS } from '../../content/items';
import { isUnlocked } from '../progression/logic';
import { SELLER_NAMES, SELLER_NOTES } from '../../content/market';
import { SHOPS } from '../../content/shops';
import { fmtMoney } from '../../core/format';
import { notify } from '../../core/notify';
import { dayStartAt } from '../../core/time';
import { chance, pick, pickWeighted, randInt, randRange } from '../../core/rng';
import { countTag, resaleValue } from '../inventory/logic';
import { skillLevel } from '../progression/logic';
import type { MarketOffer } from './state';

export const MAX_OFFERS = 8;

const RARITY_WEIGHT: Record<Rarity, number> = { common: 10, uncommon: 4, rare: 1.2, legendary: 0.2 };

function tierWeight(tier: number): number {
  if (tier <= 2) return 1;
  return Math.pow(0.5, tier - 2);
}

/** Rounds to „human“ prices: 5 € below 200 €, 10 € below 2.000 €, 50 € above. */
export function nicePrice(value: number): number {
  const step = value < 200 ? 5 : value < 2000 ? 10 : 50;
  return Math.max(step, Math.round(value / step) * step);
}

/** Shops the player can buy from (online + discovered stores). */
export function knownShops(s: GameState): ShopDef[] {
  return SHOPS.filter((shop) => !shop.poiId || s.map.pois[shop.poiId] !== undefined);
}

export function shopItems(shopId: string): ItemDef[] {
  return ALL_ITEMS.filter((def) => def.shops?.includes(shopId));
}

export function shopPrice(shop: ShopDef, def: ItemDef): number {
  return Math.round(def.price * shop.priceFactor);
}

/** Every item the player can currently buy new, with the best known price. */
export function shopCatalog(s: GameState): { def: ItemDef; shop: ShopDef; price: number }[] {
  const best = new Map<string, { def: ItemDef; shop: ShopDef; price: number }>();
  for (const shop of knownShops(s)) {
    for (const def of shopItems(shop.id)) {
      const price = shopPrice(shop, def);
      const cur = best.get(def.id);
      if (!cur || price < cur.price) best.set(def.id, { def, shop, price });
    }
  }
  return [...best.values()];
}

export function undiscoveredShopCount(s: GameState): number {
  return SHOPS.length - knownShops(s).length;
}

export function usedPool(): ItemDef[] {
  return ALL_ITEMS.filter((def) => def.usedMarket);
}

export function generateOffer(d: GameState, opts: { factor?: number; defId?: string } = {}): MarketOffer | null {
  const pool = usedPool().filter((it) => !it.unlock || isUnlocked(d, it.unlock));
  const def = opts.defId ? ALL_ITEMS.find((it) => it.id === opts.defId) : pickWeighted(d, pool, (it) => RARITY_WEIGHT[it.rarity ?? 'common'] * tierWeight(it.tier));
  if (!def) return null;
  const condition = randInt(d, 30, 95);
  const roll = randRange(d, 0, 1);
  const factor = opts.factor ?? (roll < 0.15 ? randRange(d, 0.65, 0.8) : roll < 0.75 ? randRange(d, 0.85, 1.1) : randRange(d, 1.15, 1.4));
  const fair = resaleValue(def, condition);
  const price = nicePrice(fair * factor);
  const lifetimeDays = randInt(d, 1, 3);
  const day = d.clock.lastDay;
  return {
    id: `o${d.market.nextId++}`,
    defId: def.id,
    condition,
    price,
    seller: pick(d, SELLER_NAMES),
    note: pick(d, SELLER_NOTES),
    createdAt: d.clock.now,
    expiresAt: dayStartAt(d.clock, day + lifetimeDays),
    ...(price < fair * 0.82 ? { deal: true } : {}),
  };
}

/** Removes expired offers and posts new ones (once per game day). */
export function refreshOffers(d: GameState, day: number, opts: { silent?: boolean; count?: number } = {}): void {
  const m = d.market;
  m.offers = m.offers.filter((o) => o.expiresAt > d.clock.now);
  let count = opts.count ?? randInt(d, 2, 4);
  if (countTag(d, 'phone') > 0 && chance(d, 0.3)) count++;
  const added: MarketOffer[] = [];
  for (let i = 0; i < count && m.offers.length < MAX_OFFERS; i++) {
    const offer = generateOffer(d);
    if (offer) {
      m.offers.push(offer);
      added.push(offer);
    }
  }
  m.lastRefreshDay = day;
  const deal = added.find((o) => o.deal);
  if (deal && !opts.silent) {
    const def = ALL_ITEMS.find((it) => it.id === deal.defId);
    notify(d, {
      tone: 'discovery',
      title: 'Schnäppchen auf dem Gebrauchtmarkt',
      text: `${def?.name ?? 'Ein Gerät'} für ${fmtMoney(deal.price)} – deutlich unter Wert.`,
      link: '/markt',
    });
  }
}

export function haggleChance(s: GameState, offer: MarketOffer): number {
  const fair = resaleValue(ALL_ITEMS.find((it) => it.id === offer.defId)!, offer.condition);
  const ratio = offer.price / fair;
  let p = 0.35 + 0.05 * (skillLevel(s, 'business') - 1);
  if (ratio > 1.1) p += 0.15;
  if (ratio < 0.85) p -= 0.15;
  return Math.max(0.1, Math.min(0.85, p));
}

/** Listing price boost for a phone with a good camera. */
export function listingBonus(s: GameState): number {
  return countTag(s, 'camera') > 0 ? 0.05 : 0;
}

export function offerTimeLeft(s: GameState, offer: MarketOffer): number {
  return Math.max(0, offer.expiresAt - s.clock.now);
}

