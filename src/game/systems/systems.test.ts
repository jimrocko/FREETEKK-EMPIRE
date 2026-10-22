import { describe, expect, it } from 'vitest';
import { act, actImmer, advance, newGame } from '../../test/helpers';
import { MINUTE, GAME_DAY_MS, dayStartAt } from '../core/time';
import { tick, catchUp } from '../engine';
import { startJob } from './jobs/actions';
import { cancelActivity } from './activities/actions';
import { buyNew, buyUsed, createListing, haggle, listingPrice } from './market/actions';
import { sellToDealer } from './inventory/actions';
import { dealerPrice, resaleValue, ownedItems, usedVolume, storageCapacity } from './inventory/logic';
import { skillLevel, xpForLevel, levelForXp } from './progression/logic';
import { jobListings } from './jobs/logic';
import { MAX_OFFERS } from './market/logic';
import { itemDef } from '../content/registry';

describe('jobs', () => {
  it('pays money and XP when the shift ends', () => {
    const s = newGame();
    const cash = s.finance.cash;
    expect(act(s, startJob, { jobId: 'job.flyer' }).ok).toBe(true);
    advance(s, 3 * MINUTE - 1);
    expect(s.finance.cash).toBe(cash);
    advance(s, 1);
    expect(s.finance.cash).toBeGreaterThanOrEqual(cash + 25);
    expect(s.progression.skills.netzwerk).toBe(8);
    expect(s.progression.stats.jobsDone).toBe(1);
  });

  it('allows only one job at a time', () => {
    const s = newGame();
    expect(act(s, startJob, { jobId: 'job.flyer' }).ok).toBe(true);
    const second = act(s, startJob, { jobId: 'job.aufbau' });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toMatch(/arbeitest/);
  });

  it('respects requirements and explains them', () => {
    const s = newGame();
    const res = act(s, startJob, { jobId: 'job.kurier' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/Benötigt/);
    const listing = jobListings(s).find((l) => l.job.id === 'job.plattenladen');
    expect(listing?.available).toBe(false);
  });

  it('unlocks jobs through skill levels', () => {
    const s = newGame();
    s.progression.skills.netzwerk = xpForLevel(2);
    expect(act(s, startJob, { jobId: 'job.plattenladen' }).ok).toBe(true);
  });

  it('cancelling a shift gives nothing', () => {
    const s = newGame();
    const cash = s.finance.cash;
    act(s, startJob, { jobId: 'job.aufbau' });
    const id = s.activities.running[0].id;
    expect(act(s, cancelActivity, { id }).ok).toBe(true);
    advance(s, 20 * MINUTE);
    expect(s.progression.skills.technik).toBe(0);
    expect(s.finance.cash).toBeLessThanOrEqual(cash);
  });
});

describe('progression', () => {
  it('level curve is monotonic', () => {
    for (let l = 1; l < 60; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(xpForLevel(5))).toBe(5);
    expect(levelForXp(xpForLevel(5) - 1)).toBe(4);
  });

  it('level ups create a notification', () => {
    const s = newGame();
    for (let i = 0; i < 5; i++) {
      act(s, startJob, { jobId: 'job.flyer' });
      advance(s, 3 * MINUTE);
    }
    expect(skillLevel(s, 'netzwerk')).toBeGreaterThanOrEqual(2);
    expect(s.notifications.feed.some((e) => e.title.startsWith('Netzwerk Level 2'))).toBe(true);
  });
});

describe('market', () => {
  it('buys new items with money and space checks', () => {
    const s = newGame();
    const cash = s.finance.cash;
    expect(act(s, buyNew, { defId: 'item.vulka-beats' }).ok).toBe(true);
    expect(s.finance.cash).toBe(cash - itemDef('item.vulka-beats').price);
    expect(ownedItems(s).some((i) => i.defId === 'item.vulka-beats' && i.condition === 100)).toBe(true);
    const tooExpensive = act(s, buyNew, { defId: 'item.laptop-studio' });
    expect(tooExpensive.ok).toBe(false);
  });

  it('refuses items that do not fit in the room', () => {
    const s = newGame();
    s.finance.cash = 100_000;
    let bought = 0;
    for (let i = 0; i < 10; i++) if (act(s, buyNew, { defId: 'item.cargo-bike' }).ok) bought++;
    expect(bought).toBe(1);
    expect(usedVolume(s)).toBeLessThanOrEqual(storageCapacity(s));
  });

  it('starts with used offers and refreshes them daily up to a maximum', () => {
    const s = newGame();
    expect(s.market.offers.length).toBeGreaterThan(0);
    tick(s, s.clock.now + 10 * GAME_DAY_MS);
    expect(s.market.offers.length).toBeGreaterThan(0);
    expect(s.market.offers.length).toBeLessThanOrEqual(MAX_OFFERS);
    for (const o of s.market.offers) expect(o.expiresAt).toBeGreaterThan(s.clock.now);
  });

  it('buys a used offer', () => {
    const s = newGame();
    s.finance.cash = 10_000;
    const offer = s.market.offers[0];
    expect(act(s, buyUsed, { offerId: offer.id }).ok).toBe(true);
    expect(s.market.offers.find((o) => o.id === offer.id)).toBeUndefined();
    expect(ownedItems(s).some((i) => i.defId === offer.defId && i.condition === offer.condition)).toBe(true);
    expect(s.progression.stats.usedBought).toBe(1);
  });

  it('haggling is possible only once per offer', () => {
    const s = newGame();
    const offer = s.market.offers[0];
    const first = act(s, haggle, { offerId: offer.id });
    expect(first.ok).toBe(true);
    const still = s.market.offers.find((o) => o.id === offer.id);
    if (still) {
      expect(still.negotiated).toBe(true);
      expect(act(s, haggle, { offerId: offer.id }).ok).toBe(false);
    }
  });

  it('selling to the dealer pays less than a new item costs (no buy/sell loop)', () => {
    const s = newGame();
    s.finance.cash = 2000;
    act(s, buyNew, { defId: 'item.tr-66' });
    const it = ownedItems(s).find((i) => i.defId === 'item.tr-66')!;
    const def = itemDef(it.defId);
    expect(dealerPrice(def, 100)).toBeLessThan(def.price);
    expect(listingPrice(s, it.uid, 'high')).toBeLessThan(def.price);
    const before = s.finance.cash;
    expect(act(s, sellToDealer, { uid: it.uid }).ok).toBe(true);
    expect(s.finance.cash).toBeCloseTo(before + dealerPrice(def, 100), 2);
  });

  it('listings lock the item and sell after the timer', () => {
    const s = newGame();
    act(s, buyNew, { defId: 'item.vulka-bass' });
    const it = ownedItems(s).find((i) => i.defId === 'item.vulka-bass')!;
    expect(act(s, createListing, { uid: it.uid, preset: 'quick' }).ok).toBe(true);
    expect(s.inventory.items[it.uid].locked).toMatch(/^listing:/);
    expect(act(s, sellToDealer, { uid: it.uid }).ok).toBe(false);
    const price = Number(s.activities.running[0].payload.price);
    const before = s.finance.cash;
    advance(s, 6 * MINUTE);
    expect(s.inventory.items[it.uid]).toBeUndefined();
    expect(s.finance.cash).toBeCloseTo(before + price, 2);
    expect(s.progression.stats.itemsSold).toBe(1);
  });

  it('cancelling a listing unlocks the item', () => {
    const s = newGame();
    const phone = ownedItems(s).find((i) => i.defId === 'item.phone-basic')!;
    act(s, createListing, { uid: phone.uid, preset: 'high' });
    act(s, cancelActivity, { id: s.activities.running[0].id });
    expect(s.inventory.items[phone.uid].locked).toBeUndefined();
  });

  it('resale value depends on condition', () => {
    const def = itemDef('item.tr-66');
    expect(resaleValue(def, 100)).toBeGreaterThan(resaleValue(def, 50));
    expect(resaleValue(def, 0)).toBeGreaterThan(0);
  });
});

describe('finance', () => {
  it('charges running costs at each day start', () => {
    const s = newGame();
    const cash = s.finance.cash;
    const nextDay = dayStartAt(s.clock, 2);
    tick(s, nextDay);
    expect(s.finance.cash).toBeCloseTo(cash - 5, 2);
    expect(s.finance.ledger.at(-1)?.category).toBe('upkeep');
  });

  it('blocks purchases while in the red', () => {
    const s = newGame();
    s.finance.cash = -10;
    const res = act(s, buyNew, { defId: 'item.powerbank' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/Minus/);
  });
});

describe('goals', () => {
  it('completes the first job goal and grants its reward', () => {
    const s = newGame();
    act(s, startJob, { jobId: 'job.flyer' });
    advance(s, 3 * MINUTE);
    expect(s.goals.done['goal.first-job']).toBeDefined();
    expect(s.finance.ledger.some((e) => e.category === 'goal' && e.amount === 20)).toBe(true);
  });
});

describe('simulation', () => {
  it('gives the same result in one big step or many small ones', () => {
    const a = newGame(99);
    const b = newGame(99);
    for (const s of [a, b]) {
      act(s, startJob, { jobId: 'job.aufbau' });
      const phone = ownedItems(s).find((i) => i.defId === 'item.phone-basic')!;
      act(s, createListing, { uid: phone.uid, preset: 'fair' });
    }
    const target = a.clock.now + 3 * GAME_DAY_MS + 7 * MINUTE;
    tick(a, target);
    while (b.clock.now < target) tick(b, Math.min(target, b.clock.now + 7_919));
    expect(b).toEqual(a);
  });

  it('never runs backwards', () => {
    const s = newGame();
    const now = s.clock.now;
    tick(s, now - 10 * MINUTE);
    expect(s.clock.now).toBe(now);
  });

  it('works through immer drafts like in the app', () => {
    const s = newGame();
    const [next, res] = actImmer(s, startJob, { jobId: 'job.flyer' });
    expect(res.ok).toBe(true);
    expect(next.activities.running).toHaveLength(1);
    expect(s.activities.running).toHaveLength(0);
  });
});

describe('offline catch-up', () => {
  it('completes timers and reports what happened', () => {
    const s = newGame();
    act(s, startJob, { jobId: 'job.aufbau' });
    const report = catchUp(s, s.clock.now + 2 * 60 * MINUTE);
    expect(report).not.toBeNull();
    expect(report!.entries.some((e) => e.title.includes('Aufbauhelfer'))).toBe(true);
    expect(report!.daysPassed).toBeGreaterThanOrEqual(5);
    expect(s.activities.running).toHaveLength(0);
  });

  it('caps running costs for very long absences', () => {
    const s = newGame();
    const cash = s.finance.cash;
    catchUp(s, s.clock.now + 7 * 24 * 60 * MINUTE);
    // 12 h cap → 30 game days × 5 € at most (plus a possible goal reward)
    expect(cash - s.finance.cash).toBeLessThanOrEqual(31 * 5);
  });

  it('short absences produce no report', () => {
    const s = newGame();
    expect(catchUp(s, s.clock.now + 30_000)).toBeNull();
  });
});
