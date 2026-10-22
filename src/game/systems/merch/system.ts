import type { GameSystem } from '../../core/simulation';
import { notify } from '../../core/notify';
import { randInt } from '../../core/rng';
import { earn } from '../finance/logic';
import { incStat } from '../progression/logic';
import { addBrand, merchDemand, priceFor, productDef, stockKey } from './logic';

export const merchSystem: GameSystem = {
  id: 'merch',
  nextDue(s) {
    let next: number | null = null;
    for (const o of s.merch.orders) if (next === null || o.readyAt < next) next = o.readyAt;
    return next;
  },
  process(d) {
    const now = d.clock.now;
    for (const o of d.merch.orders.filter((x) => x.readyAt <= now)) {
      const key = stockKey(o.designId, o.productId);
      const st = (d.merch.stock[key] ??= { designId: o.designId, productId: o.productId, qty: 0, unitCost: o.unitCost, quality: o.quality });
      const total = st.qty + o.qty;
      st.unitCost = Math.round(((st.unitCost * st.qty + o.unitCost * o.qty) / total) * 100) / 100;
      st.quality = Math.round((st.quality * st.qty + o.quality * o.qty) / total);
      st.qty = total;
      notify(d, { tone: 'success', title: `Merch geliefert: ${o.qty}× ${productDef(o.productId).name}`, link: '/merch' });
    }
    d.merch.orders = d.merch.orders.filter((x) => x.readyAt > now);
  },
  onNewDay(d, _day, ctx) {
    // The brand fades a little without new impulses.
    d.merch.brand = Math.max(0, d.merch.brand * 0.995);
    if (!d.merch.shopOpen || d.clock.now > ctx.economyUntil) return;
    // Online shop: a slice of your followers buys every day.
    const audience = 4 + d.progression.reputation / 40 + d.merch.brand;
    let revenue = 0;
    let pieces = 0;
    for (const st of Object.values(d.merch.stock)) {
      if (st.qty <= 0) continue;
      const want = merchDemand(d, st, audience, 70) * 0.8;
      const sold = Math.min(st.qty, Math.floor(want) + (randInt(d, 0, 99) < (want % 1) * 100 ? 1 : 0));
      if (sold <= 0) continue;
      st.qty -= sold;
      revenue += sold * priceFor(d, st.productId) * 0.9;
      pieces += sold;
    }
    if (pieces > 0) {
      earn(d, revenue, 'merch', `Onlineshop: ${pieces} Stück`);
      incStat(d, 'merchSold', pieces);
      addBrand(d, pieces * 0.01);
    }
  },
};
