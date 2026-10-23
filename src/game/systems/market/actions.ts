import { defineAction } from '../../core/actions';
import { needsUnlock } from '../progression/tree';
import { fmtMoney } from '../../core/format';
import { minutes } from '../../core/time';
import { chance, randInt, randRange } from '../../core/rng';
import { ITEMS, itemDef } from '../../content/registry';
import { LISTING_PRESETS, type ListingPresetId } from '../../content/market';
import { moneyReason, spend } from '../finance/logic';
import { addXp, incStat } from '../progression/logic';
import { addItem, getItem, resaleValue, sellableReason, spaceReason } from '../inventory/logic';
import { channelReason, startActivity } from '../activities/logic';
import { haggleChance, knownShops, listingBonus, nicePrice, shopPrice } from './logic';

export const buyNew = defineAction<{ defId: string; shopId: string }>({
  id: 'market.buyNew',
  check: (s, p) => {
    const shop = knownShops(s).find((x) => x.id === p.shopId);
    if (!shop) return 'Diesen Laden kennst du nicht.';
    const def = ITEMS.get(p.defId);
    if (!def?.shops?.includes(shop.id)) return 'Nicht im Sortiment.';
    return needsUnlock(s, def.unlock) ?? moneyReason(s, shopPrice(shop, def)) ?? spaceReason(s, def.id);
  },
  run: (d, p) => {
    const shop = knownShops(d).find((x) => x.id === p.shopId)!;
    const def = itemDef(p.defId);
    const price = shopPrice(shop, def);
    spend(d, price, 'equipment', `Neu gekauft: ${def.name} (${shop.name})`);
    addItem(d, def.id, { condition: 100, paid: price });
    incStat(d, 'itemsBought');
    return `${def.name} gekauft.`;
  },
});

export const buyUsed = defineAction<{ offerId: string }>({
  id: 'market.buyUsed',
  check: (s, p) => {
    const offer = s.market.offers.find((o) => o.id === p.offerId);
    if (!offer) return 'Angebot ist nicht mehr verfügbar.';
    return moneyReason(s, offer.price) ?? spaceReason(s, offer.defId);
  },
  run: (d, p) => {
    const idx = d.market.offers.findIndex((o) => o.id === p.offerId);
    const offer = d.market.offers[idx];
    const def = itemDef(offer.defId);
    spend(d, offer.price, 'equipment', `Gebraucht gekauft: ${def.name}`);
    addItem(d, def.id, { condition: offer.condition, paid: offer.price });
    d.market.offers.splice(idx, 1);
    incStat(d, 'itemsBought');
    incStat(d, 'usedBought');
    return `${def.name} von ${offer.seller} gekauft.`;
  },
});

export const haggle = defineAction<{ offerId: string }>({
  id: 'market.haggle',
  check: (s, p) => {
    const offer = s.market.offers.find((o) => o.id === p.offerId);
    if (!offer) return 'Angebot ist nicht mehr verfügbar.';
    if (offer.negotiated) return 'Mit diesem Verkäufer hast du schon verhandelt.';
    return null;
  },
  run: (d, p) => {
    const idx = d.market.offers.findIndex((o) => o.id === p.offerId);
    const offer = d.market.offers[idx];
    const name = itemDef(offer.defId).name;
    addXp(d, 'business', 3);
    if (chance(d, haggleChance(d, offer))) {
      const old = offer.price;
      offer.price = nicePrice(offer.price * randRange(d, 0.82, 0.92));
      if (offer.price >= old) offer.price = Math.max(1, old - 5);
      offer.negotiated = true;
      incStat(d, 'haggleWins');
      return `${offer.seller} geht runter: ${name} jetzt für ${fmtMoney(offer.price)}.`;
    }
    if (chance(d, 0.35)) {
      d.market.offers.splice(idx, 1);
      return `${offer.seller} ist genervt und verkauft ${name} an jemand anderen.`;
    }
    offer.negotiated = true;
    return `${offer.seller} bleibt beim Preis.`;
  },
});

export function listingPrice(s: Parameters<typeof listingBonus>[0], uid: string, preset: ListingPresetId): number {
  const it = getItem(s, uid);
  if (!it) return 0;
  const def = ITEMS.get(it.defId);
  if (!def) return 0;
  const p = LISTING_PRESETS.find((x) => x.id === preset)!;
  return nicePrice(resaleValue(def, it.condition, it.broken) * it.qty * (p.factor + listingBonus(s)));
}

export const createListing = defineAction<{ uid: string; preset: ListingPresetId }>({
  id: 'market.createListing',
  check: (s, p) => {
    if (!LISTING_PRESETS.some((x) => x.id === p.preset)) return 'Unbekannte Preisstrategie.';
    return sellableReason(s, p.uid) ?? channelReason(s, 'market');
  },
  run: (d, p) => {
    const it = getItem(d, p.uid)!;
    const def = itemDef(it.defId);
    const preset = LISTING_PRESETS.find((x) => x.id === p.preset)!;
    const price = listingPrice(d, p.uid, p.preset);
    const a = startActivity(d, {
      kind: 'market-listing',
      channel: 'market',
      label: `Inserat: ${def.name}`,
      durationMs: minutes(randInt(d, preset.minMin, preset.maxMin)),
      payload: { uid: it.uid, price },
    });
    it.locked = `listing:${a.id}`;
    return `${def.name} für ${fmtMoney(price)} inseriert.`;
  },
});
