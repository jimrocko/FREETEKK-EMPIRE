import { describe, expect, it } from 'vitest';
import { act, advance, newGame } from '../../test/helpers';
import { GAME_DAY_MS, MINUTE } from '../core/time';
import { tick } from '../engine';
import type { GameState } from '../state';
import type { ActionResult } from '../core/actions';
import { deposit, repayLoan, takeLoan, withdraw } from './finance/actions';
import { designByContact, designSelf, openShop, orderMerch, sellWholesale, setMerchPrice } from './merch/actions';
import { merchDemand, standSales, stockKey, totalPieces } from './merch/logic';
import { sellToContact, sellToDealer } from './inventory/actions';
import { addItem, dealerPrice, freeVolume, partnerPrice, usedVolume } from './inventory/logic';
import { meetPerson } from './people/logic';
import { planEvent } from './events/actions';
import { planReason, upcomingNights } from './events/plan';
import { forecast } from './events/simulate';
import type { EventPlanInput } from './events/state';
import { rentStorage } from './map/actions';
import { itemDef } from '../content/registry';
import { hydrate } from '../save/hydrate';

const why = (r: ActionResult) => (r.ok ? null : r.reason);

function nextDay(s: GameState) {
  const day = Math.floor((s.clock.now - s.clock.origin) / GAME_DAY_MS);
  tick(s, s.clock.origin + (day + 1) * GAME_DAY_MS + 1000);
}

function merchReady(seed = 7): GameState {
  const s = newGame(seed);
  s.finance.cash = 5000;
  s.crew.founded = true;
  s.crew.name = 'Rabbit Sound';
  return s;
}

function withStock(s: GameState, qty = 50): string {
  s.merch.designs.push({ id: 'd1', name: 'Hafenhase', motif: 'Hase mit Kopfhörern', quality: 60, createdAt: s.clock.now, by: 'self' });
  const key = stockKey('d1', 'merch.shirt');
  s.merch.stock[key] = { designId: 'd1', productId: 'merch.shirt', qty, unitCost: 7, quality: 58 };
  return key;
}

describe('bank account', () => {
  it('deposits, withdraws and pays interest each day', () => {
    const s = newGame();
    expect(act(s, deposit, { amount: 1000 }).ok).toBe(false);
    s.finance.cash = 2000;
    expect(act(s, deposit, { amount: 1000 }).ok).toBe(true);
    expect(s.finance.cash).toBe(1000);
    expect(s.finance.bank).toBe(1000);
    expect(act(s, withdraw, { amount: 2000 }).ok).toBe(false);
    nextDay(s);
    expect(s.finance.bank).toBeCloseTo(1000.5, 2);
    expect(act(s, withdraw, { amount: 400 }).ok).toBe(true);
    expect(s.finance.bank).toBeCloseTo(600.5, 2);
  });

  it('the account covers fixed costs when cash runs short', () => {
    const s = newGame();
    s.finance.cash = 2;
    s.finance.bank = 500;
    nextDay(s);
    expect(s.finance.cash).toBeGreaterThanOrEqual(0);
    expect(s.finance.bank).toBeLessThan(500);
  });
});

describe('loans', () => {
  it('need reputation, pay out and are repaid daily', () => {
    const s = newGame();
    expect(why(act(s, takeLoan, { offerId: 'loan.small' }))).toMatch(/Reputation/);
    s.progression.reputation = 200;
    const earned = s.progression.stats.moneyEarned ?? 0;
    expect(act(s, takeLoan, { offerId: 'loan.small' }).ok).toBe(true);
    expect(s.finance.cash).toBe(2500);
    // A loan is not income.
    expect(s.progression.stats.moneyEarned ?? 0).toBe(earned);
    const loan = s.finance.loans[0];
    expect(loan.remaining).toBe(2300);
    nextDay(s);
    expect(s.finance.loans[0].remaining).toBeCloseTo(2300 - loan.perDay, 2);
    expect(act(s, repayLoan, { loanId: loan.id }).ok).toBe(true);
    expect(s.finance.loans).toHaveLength(0);
  });

  it('at most two loans and none while in the red', () => {
    const s = newGame();
    s.progression.reputation = 200;
    act(s, takeLoan, { offerId: 'loan.small' });
    act(s, takeLoan, { offerId: 'loan.small' });
    expect(why(act(s, takeLoan, { offerId: 'loan.small' }))).toMatch(/zwei Kredite/);
    const t = newGame();
    t.progression.reputation = 200;
    t.finance.cash = -5;
    expect(why(act(t, takeLoan, { offerId: 'loan.small' }))).toMatch(/Minus/);
  });

  it('loans are paid off over time and removed', () => {
    const s = newGame();
    s.progression.reputation = 200;
    act(s, takeLoan, { offerId: 'loan.small' });
    s.finance.cash = 100000;
    for (let i = 0; i < 41; i++) nextDay(s);
    expect(s.finance.loans).toHaveLength(0);
  });
});

describe('merch', () => {
  it('is locked until a crew exists', () => {
    const s = newGame();
    expect(why(act(s, designSelf, { name: 'Logo', motif: 'Acid-Smiley' }))).toMatch(/Crew/);
  });

  it('self design takes time in the studio and has a quality', () => {
    const s = merchReady();
    expect(why(act(s, designSelf, { name: 'x', motif: 'Acid-Smiley' }))).toMatch(/Namen/);
    expect(act(s, designSelf, { name: 'Hafenhase', motif: 'Acid-Smiley' }).ok).toBe(true);
    expect(s.merch.designs).toHaveLength(0);
    advance(s, 7 * MINUTE);
    expect(s.merch.designs).toHaveLength(1);
    expect(s.merch.designs[0].quality).toBeGreaterThanOrEqual(10);
    expect(s.goals.done['goal.first-design']).toBeDefined();
  });

  it('designers among contacts deliver better designs for a fee', () => {
    const s = merchReady();
    expect(why(act(s, designByContact, { name: 'Neon', motif: 'Acid-Smiley', personId: 'p.lena' }))).toMatch(/Design-Kontakt/);
    meetPerson(s, 'p.lena', 'test', { trust: 30, silent: true });
    const cash = s.finance.cash;
    expect(act(s, designByContact, { name: 'Neon', motif: 'Acid-Smiley', personId: 'p.lena' }).ok).toBe(true);
    expect(s.finance.cash).toBeLessThan(cash);
    expect(s.merch.designs[0].by).toBe('p.lena');
  });

  it('orders are paid now, delivered later and take storage space', () => {
    const s = merchReady();
    s.merch.designs.push({ id: 'd1', name: 'Hafenhase', motif: 'Acid-Smiley', quality: 60, createdAt: s.clock.now, by: 'self' });
    s.progression.stats.designs = 1;
    advance(s, 1000);
    expect(why(act(s, orderMerch, { designId: 'd1', productId: 'merch.shirt', manufacturerId: 'man.online', qty: 5 }))).toMatch(/Mindestens/);
    expect(why(act(s, orderMerch, { designId: 'd1', productId: 'merch.shirt', manufacturerId: 'man.fynn', qty: 20 }))).toMatch(/Fynn/);
    expect(why(act(s, orderMerch, { designId: 'd1', productId: 'merch.patch', manufacturerId: 'man.online', qty: 50 }))).toMatch(/nicht her/);
    const used = usedVolume(s);
    const cash = s.finance.cash;
    expect(act(s, orderMerch, { designId: 'd1', productId: 'merch.shirt', manufacturerId: 'man.online', qty: 30 }).ok).toBe(true);
    expect(s.finance.cash).toBeCloseTo(cash - 210, 2);
    expect(totalPieces(s)).toBe(0);
    advance(s, 31 * MINUTE);
    expect(totalPieces(s)).toBe(30);
    expect(usedVolume(s)).toBeCloseTo(used + 18, 3);
    expect(s.goals.done['goal.first-batch']).toBeDefined();
    // Too much for a small room.
    expect(why(act(s, orderMerch, { designId: 'd1', productId: 'merch.hoodie', manufacturerId: 'man.online', qty: 1000 }))).toMatch(/Platz|5\.000|Geld/);
    expect(freeVolume(s)).toBeGreaterThan(0);
  });

  it('a higher price sells fewer pieces', () => {
    const s = merchReady();
    const key = withStock(s);
    const st = s.merch.stock[key];
    const normal = merchDemand(s, st, 200, 70);
    act(s, setMerchPrice, { productId: 'merch.shirt', price: 60 });
    expect(merchDemand(s, st, 200, 70)).toBeLessThan(normal / 2);
  });

  it('wholesale needs business skill and books money', () => {
    const s = merchReady();
    const key = withStock(s, 20);
    expect(why(act(s, sellWholesale, { key, qty: 5 }))).toMatch(/Business/);
    s.progression.skills.business = 500;
    const cash = s.finance.cash;
    expect(act(s, sellWholesale, { key, qty: 5 }).ok).toBe(true);
    expect(s.finance.cash).toBeCloseTo(cash + 5 * 7 * 1.6, 2);
    expect(s.merch.stock[key].qty).toBe(15);
    expect(act(s, sellWholesale, { key, qty: 50 }).ok).toBe(false);
  });

  it('the online shop needs sales first and then sells every day', () => {
    const s = merchReady();
    const key = withStock(s, 200);
    expect(act(s, openShop, {}).ok).toBe(false);
    s.progression.skills.business = 500;
    s.progression.stats.merchSold = 30;
    s.progression.reputation = 400;
    s.merch.brand = 20;
    expect(act(s, openShop, {}).ok).toBe(true);
    const cash = s.finance.cash;
    for (let i = 0; i < 3; i++) nextDay(s);
    expect(s.merch.stock[key].qty).toBeLessThan(200);
    expect(s.finance.totals.merch?.in ?? 0).toBeGreaterThan(0);
    expect(s.finance.cash).toBeGreaterThan(cash - 100);
  });
});

describe('merch stand at events', () => {
  function plan(s: GameState, extra: Partial<EventPlanInput> = {}): EventPlanInput {
    return {
      name: 'Kellerrave',
      spotId: 'spot.keller-block9',
      startsAt: upcomingNights(s)[0].startsAt,
      durationH: 6,
      entry: 5,
      lineup: ['p.jule'],
      sound: { kind: 'rental', optionId: 'pa.small' },
      transport: 'rent',
      promo: ['promo.word'],
      prices: {},
      freeWater: false,
      helpers: 0,
      awareness: false,
      medics: false,
      ...extra,
    };
  }

  it('needs stock, shows up in the forecast and sells during the night', () => {
    const s = merchReady(3);
    const st = s.spots.spots['spot.keller-block9'];
    st.known = true;
    st.intel = 100;
    st.lastCheckedAt = s.clock.now;
    expect(planReason(s, plan(s, { merch: true }))).toMatch(/Merch-Stand/);
    const key = withStock(s, 40);
    expect(planReason(s, plan(s, { merch: true }))).toBeNull();
    expect(forecast(s, plan(s, { merch: true }))!.merchRevenue).toBeGreaterThan(0);
    expect(standSales(s, 0, 70, 1).pieces).toBe(0);
    expect(act(s, planEvent, plan(s, { merch: true })).ok).toBe(true);
    const ev = s.events.list[0];
    tick(s, ev.startsAt + 1);
    tick(s, ev.startsAt + ev.durationH * MINUTE + 1);
    expect(ev.status).toBe('done');
    const sold = 40 - s.merch.stock[key].qty;
    if (sold > 0) {
      expect(ev.report!.revenue['Merch']).toBeGreaterThan(0);
      expect(ev.report!.costs['Merch-Wareneinsatz']).toBeCloseTo(sold * 7, 0);
    }
    expect(s.merch.brand).toBeGreaterThan(0);
  });
});

describe('trade with contacts', () => {
  it('Lukas pays more than the dealer once he trusts you', () => {
    const s = newGame();
    const it = addItem(s, 'item.tr-66', { condition: 80 });
    expect(why(act(s, sellToContact, { uid: it.uid, personId: 'p.lukas' }))).toMatch(/Handelspartner/);
    meetPerson(s, 'p.lukas', 'test', { trust: 10, silent: true });
    expect(why(act(s, sellToContact, { uid: it.uid, personId: 'p.lukas' }))).toMatch(/Vertrauen 25/);
    s.people.people['p.lukas'].trust = 30;
    expect(partnerPrice(s, it, 'p.lukas')).toBeGreaterThan(dealerPrice(itemDef(it.defId), it.condition));
    const cash = s.finance.cash;
    expect(act(s, sellToContact, { uid: it.uid, personId: 'p.lukas' }).ok).toBe(true);
    expect(s.finance.cash).toBeGreaterThan(cash);
    expect(s.goals.done['goal.trade']).toBeDefined();
  });

  it('specialists only take their kind of gear', () => {
    const s = newGame();
    meetPerson(s, 'p.marek', 'test', { trust: 50, silent: true });
    const synth = addItem(s, 'item.tr-66', { condition: 80 });
    expect(why(act(s, sellToContact, { uid: synth.uid, personId: 'p.marek' }))).toMatch(/nimmt so etwas nicht/);
    const it = addItem(s, 'item.cables', { condition: 80 });
    expect(act(s, sellToContact, { uid: it.uid, personId: 'p.marek' }).ok).toBe(true);
    expect(act(s, sellToDealer, { uid: synth.uid }).ok).toBe(true);
  });
});

describe('storage', () => {
  it('the warehouse needs reputation', () => {
    const s = newGame();
    s.finance.cash = 10000;
    s.map.pois['poi.lagerhalle'] = { at: s.clock.now, via: 'test' };
    expect(why(act(s, rentStorage, { poiId: 'poi.lagerhalle' }))).toMatch(/Reputation/);
    s.progression.reputation = 600;
    const before = freeVolume(s);
    expect(act(s, rentStorage, { poiId: 'poi.lagerhalle' }).ok).toBe(true);
    expect(freeVolume(s)).toBe(before + 20000);
  });
});

describe('saves from before Phase 7', () => {
  it('load with an empty merch slice, bank and loans', () => {
    const raw = JSON.parse(JSON.stringify(newGame())) as Record<string, any>;
    delete raw.merch;
    delete raw.finance.bank;
    delete raw.finance.loans;
    delete raw.finance.nextLoanId;
    const s = hydrate(raw);
    expect(s.merch.designs).toEqual([]);
    expect(s.merch.brand).toBe(0);
    expect(s.finance.bank).toBe(0);
    expect(s.finance.loans).toEqual([]);
    nextDay(s);
    expect(s.finance.bank).toBe(0);
  });
});
