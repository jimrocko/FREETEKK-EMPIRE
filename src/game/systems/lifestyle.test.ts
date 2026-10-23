import { describe, expect, it } from 'vitest';
import { act, advance, newGame } from '../../test/helpers';
import { GAME_DAY_MS, MINUTE } from '../core/time';
import type { GameState } from '../state';
import type { ActionResult } from '../core/actions';
import { validateContent } from '../content/validate';
import { LIFESTYLE } from '../content/lifestyle';
import { GOALS } from '../content/goals';
import { buyFun, moveIn, sellFun, useFun } from './lifestyle/actions';
import { collectionCount, flair, flairBonus, flairTier, lifestyleUpkeep, rarityOf, resaleValue } from './lifestyle/logic';
import { forecast } from './events/simulate';
import { upcomingNights } from './events/plan';
import type { EventPlanInput } from './events/state';
import { addItem, storageCapacity } from './inventory/logic';
import { modifierValue } from './happenings/logic';
import { checkCondition } from '../core/conditions';

const why = (r: ActionResult) => (r.ok ? null : r.reason);

function game(cash = 10000): GameState {
  const s = newGame(5);
  s.finance.cash = cash;
  s.happenings.nextRollAt = s.clock.now + 1e12;
  return s;
}

describe('lifestyle purchases', () => {
  it('content is valid and every rarity exists', () => {
    expect(validateContent()).toEqual([]);
    const rarities = new Set(LIFESTYLE.map((l) => rarityOf(l.price)));
    expect([...rarities].sort()).toEqual(['common', 'legendary', 'rare', 'uncommon']);
  });

  it('buying costs money, adds style and can only happen once', () => {
    const s = game(100);
    expect(flair(s)).toBe(0);
    expect(act(s, buyFun, { id: 'fun.buckethat' }).ok).toBe(true);
    expect(s.finance.cash).toBe(75);
    expect(flair(s)).toBe(2);
    expect(collectionCount(s)).toBe(1);
    expect(why(act(s, buyFun, { id: 'fun.buckethat' }))).toBe('Hast du schon.');
    expect(why(act(s, buyFun, { id: 'fun.chain' }))).toMatch(/Zu wenig Geld/);
    expect(why(act(s, buyFun, { id: 'fun.neonsign' }))).toMatch(/Crew/);
    expect(s.finance.ledger.at(-1)!.category).toBe('lifestyle');
  });

  it('style ranks are celebrated once and raise party demand', () => {
    const s = game(100000);
    for (const id of Object.keys(s.spots.spots)) {
      if (id !== 'spot.keller-block9') continue;
      s.spots.spots[id].known = true;
      s.spots.spots[id].intel = 100;
    }
    const plan: EventPlanInput = {
      name: 'Testparty',
      spotId: 'spot.keller-block9',
      startsAt: upcomingNights(s)[1].startsAt,
      durationH: 8,
      entry: 5,
      lineup: ['self'],
      sound: { kind: 'rental', optionId: 'pa.small' },
      transport: 'own',
      promo: ['promo.word'],
      prices: {},
      freeWater: false,
      helpers: 0,
      awareness: false,
      medics: false,
    };
    const before = forecast(s, plan)!.demand;
    act(s, buyFun, { id: 'fun.chain' });
    act(s, buyFun, { id: 'fun.watch' });
    expect(flairTier(s).name).toBe('Stylish');
    expect(flairBonus(s)).toBeCloseTo(0.04);
    // Two ranks climbed (Lässig, Stylish): two celebrations.
    expect(s.notifications.feed.filter((n) => n.big && n.title.startsWith('Neuer Style-Rang'))).toHaveLength(2);
    expect(forecast(s, plan)!.demand).toBeGreaterThan(before);

    // Selling and buying again does not celebrate twice.
    act(s, sellFun, { id: 'fun.watch' });
    act(s, buyFun, { id: 'fun.watch' });
    expect(s.notifications.feed.filter((n) => n.title.startsWith('Neuer Style-Rang'))).toHaveLength(2);
  });

  it('selling gives back part of the price; first-time effects do not repeat', () => {
    const s = game(1_000_000);
    // Goal rewards would blur the reputation numbers.
    for (const g of GOALS) s.goals.done[g.id] = s.clock.now;
    const rep = s.progression.reputation;
    act(s, buyFun, { id: 'fun.statue' });
    expect(s.progression.reputation).toBe(rep + 500);
    const after = s.progression.reputation;
    const cash = s.finance.cash;
    expect(act(s, sellFun, { id: 'fun.statue' }).ok).toBe(true);
    expect(s.finance.cash).toBe(cash + resaleValue(LIFESTYLE.find((l) => l.id === 'fun.statue')!));
    act(s, buyFun, { id: 'fun.statue' });
    expect(s.progression.reputation).toBe(after);
    expect(why(act(s, sellFun, { id: 'fun.cinema' }))).toMatch(/Erlebnisse/);
  });

  it('things can be used with a cooldown', () => {
    const s = game();
    expect(why(act(s, useFun, { id: 'fun.dog' }))).toBe('Gehört dir nicht.');
    act(s, buyFun, { id: 'fun.dog' });
    const explored = Object.values(s.map.districts).reduce((sum, d) => sum + d.explored, 0);
    const r = act(s, useFun, { id: 'fun.dog' });
    expect(r.ok && r.message).toBeTruthy();
    expect(Object.values(s.map.districts).reduce((sum, d) => sum + d.explored, 0)).toBe(explored + 2);
    expect(why(act(s, useFun, { id: 'fun.dog' }))).toMatch(/Wieder möglich/);
    advance(s, 8 * MINUTE);
    expect(act(s, useFun, { id: 'fun.dog' }).ok).toBe(true);
    expect(why(act(s, useFun, { id: 'fun.lavalamp' }))).toBe('Damit kann man nichts machen.');
  });

  it('experiences take time, give their effects and come with a cooldown', () => {
    const s = game();
    expect(act(s, buyFun, { id: 'fun.beach' }).ok).toBe(true);
    expect(s.activities.running.some((a) => a.channel === 'leisure')).toBe(true);
    expect(why(act(s, buyFun, { id: 'fun.cinema' }))).toMatch(/unterwegs/);
    expect(flair(s)).toBe(0);
    advance(s, 72 * MINUTE + 1000);
    expect(flair(s)).toBe(18);
    expect(modifierValue(s, 'jobPay')).toBeCloseTo(0.15);
    expect(why(act(s, buyFun, { id: 'fun.beach' }))).toMatch(/Wieder möglich/);
    advance(s, 10 * GAME_DAY_MS);
    expect(act(s, buyFun, { id: 'fun.beach' }).ok).toBe(true);
  });

  it('once-in-a-lifetime experiences cannot be repeated', () => {
    const s = game(3_000_000);
    act(s, buyFun, { id: 'fun.space' });
    advance(s, 12 * MINUTE + 1000);
    expect(why(act(s, buyFun, { id: 'fun.space' }))).toBe('Einmal im Leben reicht.');
  });

  it('upkeep and rent are daily costs', () => {
    const s = game(100000);
    act(s, buyFun, { id: 'fun.dog' });
    act(s, buyFun, { id: 'fun.cat' });
    expect(lifestyleUpkeep(s)).toBe(9);
    act(s, moveIn, { homeId: 'home.loft' });
    const cash = s.finance.cash;
    advance(s, GAME_DAY_MS);
    const booked = s.finance.ledger.filter((e) => e.label === 'Miete: Loft in der Fabriketage' || e.label.startsWith('Lifestyle-Unterhalt'));
    expect(booked.map((e) => e.amount).sort((a, b) => a - b)).toEqual([-90, -9]);
    expect(s.finance.cash).toBeLessThan(cash);
  });

  it('moving changes storage and needs room for your stuff', () => {
    const s = game(100000);
    const small = storageCapacity(s);
    expect(act(s, moveIn, { homeId: 'home.altbau' }).ok).toBe(true);
    expect(storageCapacity(s)).toBeGreaterThan(small);
    expect(s.player.homeId).toBe('home.altbau');
    expect(why(act(s, moveIn, { homeId: 'home.altbau' }))).toBe('Hier wohnst du.');
    for (let i = 0; i < 8; i++) addItem(s, 'item.top-diy', {});
    expect(why(act(s, moveIn, { homeId: 'home.zimmer' }))).toMatch(/Zu wenig Platz/);
    expect(checkCondition(s, { t: 'flair', gte: 15 })).toBe(true);
  });
});
