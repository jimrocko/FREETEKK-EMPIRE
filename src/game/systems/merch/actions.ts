import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { fmtMoney, roundMoney } from '../../core/format';
import { MOTIFS, ONLINE_SHOP_COST, ONLINE_SHOP_REQUIRES } from '../../content/merch';
import { PERSONS_BY_ID, personDef } from '../../content/registry';
import { requirementReason } from '../../core/conditions';
import { randInt } from '../../core/rng';
import { channelReason, startActivity } from '../activities/logic';
import { earn, moneyReason, spend } from '../finance/logic';
import { incStat, skillLevel } from '../progression/logic';
import { freeVolume } from '../inventory/logic';
import { adjustTrust, knowsPerson, shortName } from '../people/logic';
import { MERCH_UNLOCK_REASON, addBrand, manufacturerDef, manufacturerReason, productDef, stockKey } from './logic';

const DESIGNER_ROLES = ['designer', 'merch'];

function unlocked(s: Parameters<typeof channelReason>[0]): string | null {
  return s.crew.founded ? null : MERCH_UNLOCK_REASON;
}

export const designSelf = defineAction<{ name: string; motif: string }>({
  id: 'merch.designSelf',
  check: (s, p) => {
    const u = unlocked(s);
    if (u) return u;
    if (p.name.trim().length < 2) return 'Gib dem Design einen Namen.';
    if (!MOTIFS.includes(p.motif)) return 'Wähle ein Motiv.';
    return channelReason(s, 'studio');
  },
  run: (d, p) => {
    startActivity(d, {
      kind: 'design',
      channel: 'studio',
      label: `Design: ${p.name.trim()}`,
      durationMs: minutes(6),
      payload: { name: p.name.trim(), motif: p.motif },
    });
    return 'Du zeichnest Entwürfe.';
  },
});

export const designByContact = defineAction<{ name: string; motif: string; personId: string }>({
  id: 'merch.designContact',
  check: (s, p) => {
    const u = unlocked(s);
    if (u) return u;
    if (p.name.trim().length < 2) return 'Gib dem Design einen Namen.';
    if (!MOTIFS.includes(p.motif)) return 'Wähle ein Motiv.';
    const person = PERSONS_BY_ID.get(p.personId);
    if (!person || !knowsPerson(s, p.personId) || !person.roles.some((r) => DESIGNER_ROLES.includes(r))) return 'Kein Design-Kontakt.';
    if (s.people.people[p.personId].trust < 25) return `${shortName(person)} kennt dich noch zu wenig (Vertrauen 25).`;
    return moneyReason(s, Math.round(person.price * 0.6));
  },
  run: (d, p) => {
    const person = personDef(p.personId);
    const cost = Math.round(person.price * 0.6);
    spend(d, cost, 'merch', `Design von ${shortName(person)}`);
    const quality = Math.min(100, Math.round(person.stats.kreativ * 0.85 + 10 + randInt(d, -5, 5)));
    d.merch.designs.push({ id: `d${d.merch.nextId++}`, name: p.name.trim(), motif: p.motif, quality, createdAt: d.clock.now, by: person.id });
    adjustTrust(d, person.id, 3);
    incStat(d, 'designs');
    return `${shortName(person)} liefert „${p.name.trim()}“ (Qualität ${quality}).`;
  },
});

export const orderMerch = defineAction<{ designId: string; productId: string; manufacturerId: string; qty: number }>({
  id: 'merch.order',
  check: (s, p) => {
    const u = unlocked(s);
    if (u) return u;
    if (!s.merch.designs.some((x) => x.id === p.designId)) return 'Design nicht gefunden.';
    const r = manufacturerReason(s, p.manufacturerId);
    if (r) return r;
    const offer = manufacturerDef(p.manufacturerId).products[p.productId];
    if (!offer) return 'Stellt dieser Hersteller nicht her.';
    if (!Number.isInteger(p.qty) || p.qty < offer.minQty) return `Mindestens ${offer.minQty} Stück.`;
    if (p.qty > 5000) return 'Höchstens 5.000 Stück pro Auftrag.';
    if (productDef(p.productId).volumeL * p.qty > freeVolume(s)) return 'Dafür ist kein Platz im Lager.';
    return moneyReason(s, offer.unitCost * p.qty);
  },
  run: (d, p) => {
    const m = manufacturerDef(p.manufacturerId);
    const offer = m.products[p.productId]!;
    const design = d.merch.designs.find((x) => x.id === p.designId)!;
    const total = roundMoney(offer.unitCost * p.qty);
    spend(d, total, 'merch', `${p.qty}× ${productDef(p.productId).name} „${design.name}“ (${m.name})`);
    d.merch.orders.push({
      id: `o${d.merch.nextId++}`,
      designId: design.id,
      productId: p.productId,
      manufacturerId: m.id,
      qty: p.qty,
      unitCost: offer.unitCost,
      quality: Math.round((design.quality + m.quality) / 2),
      readyAt: d.clock.now + minutes(m.minutes),
    });
    if (m.personId) adjustTrust(d, m.personId, 2);
    incStat(d, 'merchOrders');
    return `Auftrag an ${m.name}: ${p.qty}× ${productDef(p.productId).name} für ${fmtMoney(total)}.`;
  },
});

export const setMerchPrice = defineAction<{ productId: string; price: number }>({
  id: 'merch.price',
  check: (_s, p) => (p.price >= 0.5 && p.price <= 200 ? null : 'Preis zwischen 0,50 € und 200 €.'),
  run: (d, p) => {
    d.merch.prices[p.productId] = Math.round(p.price * 2) / 2;
  },
});

export const openShop = defineAction<Record<string, never>>({
  id: 'merch.openShop',
  check: (s) => {
    const u = unlocked(s);
    if (u) return u;
    if (s.merch.shopOpen) return 'Der Shop ist schon online.';
    return requirementReason(s, ONLINE_SHOP_REQUIRES) ?? moneyReason(s, ONLINE_SHOP_COST);
  },
  run: (d) => {
    spend(d, ONLINE_SHOP_COST, 'merch', 'Onlineshop eingerichtet');
    d.merch.shopOpen = true;
    incStat(d, 'shopOpened');
    return 'Dein Onlineshop ist live. Ab jetzt verkauft sich Merch auch, während du schläfst.';
  },
});

/** Sell pieces to record stores and shops: less margin, no risk. */
export const sellWholesale = defineAction<{ key: string; qty: number }>({
  id: 'merch.wholesale',
  check: (s, p) => {
    const st = s.merch.stock[p.key];
    if (!st || st.qty < p.qty || p.qty <= 0) return 'Nicht genug auf Lager.';
    if (skillLevel(s, 'business') < 2) return 'Benötigt: Business Lv. 2';
    return null;
  },
  run: (d, p) => {
    const st = d.merch.stock[p.key];
    const amount = roundMoney(st.unitCost * 1.6 * p.qty);
    st.qty -= p.qty;
    earn(d, amount, 'merch', `Großhandel: ${p.qty}× ${productDef(st.productId).name}`);
    addBrand(d, p.qty * 0.005);
    incStat(d, 'merchSold', p.qty);
    return `${p.qty} Stück an Läden verkauft – ${fmtMoney(amount)}.`;
  },
});

export { stockKey };
