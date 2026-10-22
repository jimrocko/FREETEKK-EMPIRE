import { describe, expect, it } from 'vitest';
import { act, advance, newGame } from '../../test/helpers';
import { MINUTE, GAME_DAY_MS } from '../core/time';
import { tick } from '../engine';
import type { GameState } from '../state';
import { planEvent, cancelEvent, startEventTask, buyGoods } from './events/actions';
import { planReason, upcomingNights, upfrontCosts } from './events/plan';
import { forecast } from './events/simulate';
import type { EventPlanInput } from './events/state';
import { addItem } from './inventory/logic';
import { addPart, createSystem, deleteSystem } from './sound/actions';
import { meetPerson } from './people/logic';

function setup(seed = 3): GameState {
  const s = newGame(seed);
  s.finance.cash = 3000;
  const st = s.spots.spots['spot.keller-block9'];
  st.known = true;
  st.intel = 100;
  st.lastCheckedAt = s.clock.now;
  return s;
}

function plan(s: GameState, extra: Partial<EventPlanInput> = {}): EventPlanInput {
  const night = upcomingNights(s)[0];
  return {
    name: 'Kellerrave #1',
    spotId: 'spot.keller-block9',
    startsAt: night.startsAt,
    durationH: 6,
    entry: 5,
    lineup: ['p.jule'],
    sound: { kind: 'rental', optionId: 'pa.small' },
    transport: 'own',
    promo: ['promo.word'],
    prices: {},
    freeWater: false,
    helpers: 0,
    awareness: false,
    medics: false,
    ...extra,
  };
}

function runToEnd(s: GameState) {
  const ev = s.events.list[s.events.list.length - 1];
  tick(s, ev.startsAt + 1);
  expect(['running', 'cancelled']).toContain(ev.status);
  tick(s, ev.startsAt + ev.durationH * MINUTE + 1);
  return s.events.list[s.events.list.length - 1];
}

describe('event planning', () => {
  it('validates the plan and explains problems', () => {
    const s = setup();
    expect(planReason(s, plan(s))).toBeNull();
    expect(planReason(s, plan(s, { lineup: [] }))).toMatch(/Line-up/);
    expect(planReason(s, plan(s, { spotId: 'spot.kai7' }))).toMatch(/bekannten Spot/);
    expect(planReason(s, plan(s, { lineup: ['p.dj-ferro'] }))).toBe('Unbekannt.');
    expect(planReason(s, plan(s, { sound: { kind: 'rental', optionId: 'pa.large' } }))).toMatch(/Organisation/);
    expect(planReason(s, plan(s, { name: 'x' }))).toMatch(/Namen/);
    s.finance.cash = 10;
    expect(planReason(s, plan(s))).toMatch(/Vorkosten/);
  });

  it('charges upfront costs and creates preparation tasks', () => {
    const s = setup();
    s.spots.spots['spot.keller-block9'].lastCheckedAt = undefined;
    const costs = upfrontCosts(s, plan(s, { promo: ['promo.word', 'promo.flyer'] })).reduce((a, c) => a + c.amount, 0);
    const cash = s.finance.cash;
    expect(act(s, planEvent, plan(s, { promo: ['promo.word', 'promo.flyer'] })).ok).toBe(true);
    expect(s.finance.cash).toBeCloseTo(cash - costs, 2);
    const ev = s.events.list[0];
    expect(ev.tasks['task.check']).toBe('open');
    expect(ev.tasks['task.flyer']).toBe('open');
    expect(ev.tasks['task.lineup']).toBe('open');
    expect(act(s, startEventTask, { eventId: ev.id, taskId: 'task.flyer' }).ok).toBe(true);
    advance(s, 7 * MINUTE);
    expect(s.events.list[0].tasks['task.flyer']).toBe('done');
  });

  it('only one event per night', () => {
    const s = setup();
    act(s, planEvent, plan(s));
    expect(planReason(s, plan(s, { name: 'Zweite Party' }))).toMatch(/schon ein Event/);
  });

  it('cancelling refunds half of the rent and rentals', () => {
    const s = setup();
    act(s, planEvent, plan(s));
    const cash = s.finance.cash;
    const ev = s.events.list[0];
    expect(act(s, cancelEvent, { eventId: ev.id }).ok).toBe(true);
    expect(s.finance.cash).toBeCloseTo(cash + (40 + 160) / 2, 2);
    expect(s.events.list[0].status).toBe('cancelled');
  });

  it('the forecast is plausible for a first basement party', () => {
    const s = setup();
    const f = forecast(s, plan(s))!;
    expect(f.capacity).toBe(60);
    expect(f.visitors).toBeGreaterThan(5);
    expect(f.visitors).toBeLessThanOrEqual(60);
    expect(f.mood).toBeGreaterThan(20);
    expect(f.policeRisk).toBeGreaterThanOrEqual(0);
  });
});

describe('running an event', () => {
  it('a full night: visitors, money, reputation, report', () => {
    const s = setup();
    addItem(s, 'item.goods-beer', { qty: 4 });
    addItem(s, 'item.goods-water', { qty: 4 });
    const rep = s.progression.reputation;
    expect(planReason(s, plan(s, { prices: { 'item.goods-beer': 3, 'item.goods-water': 1.5 } }))).toMatch(/Tragen/);
    expect(act(s, planEvent, plan(s, { prices: { 'item.goods-beer': 3, 'item.goods-water': 1.5 }, transport: 'rent' })).ok).toBe(true);
    const ev = runToEnd(s);
    expect(ev.status).toBe('done');
    const r = ev.report!;
    expect(r.visitors).toBeGreaterThan(0);
    expect(r.visitors).toBeLessThanOrEqual(60);
    expect(r.scores.mood).toBeGreaterThanOrEqual(0);
    expect(r.rep).toBeGreaterThan(0);
    expect(s.progression.reputation).toBeGreaterThan(rep);
    expect(s.progression.stats.eventsHeld).toBe(1);
    expect(s.goals.done['goal.first-event']).toBeDefined();
    expect(Object.keys(r.revenue).length).toBeGreaterThan(0);
    // Goods were consumed.
    const beer = Object.values(s.inventory.items).filter((it) => it.defId === 'item.goods-beer').reduce((a, it) => a + it.qty, 0);
    expect(beer).toBeLessThan(4);
  });

  it('own sound systems are used and worn, and locked while playing', () => {
    const s = setup(5);
    act(s, createSystem, { name: 'Rabbit' });
    const sys = s.sound.systems[0];
    for (const id of ['item.pa-active-12', 'item.pa-active-12', 'item.sub-active-15', 'item.cables', 'item.dj-mixer-2ch']) {
      act(s, addPart, { systemId: sys.id, uid: addItem(s, id, { condition: 80 }).uid });
    }
    // Needs transport: no vehicle → own transport is refused, rental works.
    expect(planReason(s, plan(s, { sound: { kind: 'own', systemId: sys.id } }))).toMatch(/Tragen/);
    expect(act(s, planEvent, plan(s, { sound: { kind: 'own', systemId: sys.id }, transport: 'rent' })).ok).toBe(true);
    const ev = s.events.list[0];
    tick(s, ev.startsAt + 1);
    expect(s.inventory.items[sys.components[0]].locked).toMatch(/^event:/);
    expect(act(s, deleteSystem, { systemId: sys.id }).ok).toBe(false);
    tick(s, ev.startsAt + ev.durationH * MINUTE + 1);
    expect(s.inventory.items[sys.components[0]].locked).toBeUndefined();
    expect(s.inventory.items[sys.components[0]].condition).toBeLessThan(80);
    expect(s.events.list[0].report!.xp.technik).toBeGreaterThan(0);
  });

  it('a closed spot cancels the night and refunds the rent', () => {
    const s = setup();
    act(s, planEvent, plan(s));
    const ev = s.events.list[0];
    s.spots.spots['spot.keller-block9'].status = 'closed';
    s.spots.spots['spot.keller-block9'].closedUntilDay = 999;
    const cash = s.finance.cash;
    tick(s, ev.startsAt + 1);
    expect(s.events.list[0].status).toBe('cancelled');
    expect(s.finance.cash).toBeGreaterThanOrEqual(cash + 40 - 6);
  });

  it('famous illegal spots get raided sooner or later', () => {
    let raided = false;
    for (let seed = 1; seed < 40 && !raided; seed++) {
      const s = setup(seed);
      const st = s.spots.spots['spot.industrial-north'];
      st.known = true;
      st.intel = 100;
      st.lastCheckedAt = s.clock.now;
      st.fame = 100;
      act(s, planEvent, plan(s, { spotId: 'spot.industrial-north', promo: ['promo.word', 'promo.social'] }));
      const ev = runToEnd(s);
      raided = ev.report?.incidents.some((i) => i.includes('Polizei')) ?? false;
      if (raided) expect(s.spots.spots['spot.industrial-north'].status).toBe('closed');
    }
    expect(raided).toBe(true);
  });

  it('famous DJs need reputation, crew DJs play for free', () => {
    const s = setup();
    meetPerson(s, 'p.dj-ferro', 'intro', { trust: 60 });
    expect(planReason(s, plan(s, { lineup: ['p.dj-ferro'] }))).toMatch(/Reputation/);
    s.progression.reputation = 300;
    expect(planReason(s, plan(s, { lineup: ['p.dj-ferro'] }))).toBeNull();
  });

  it('events give the same result in one big step or many small ones', () => {
    const a = setup(11);
    const b = setup(11);
    for (const s of [a, b]) act(s, planEvent, plan(s));
    const end = a.events.list[0].startsAt + 7 * MINUTE;
    tick(a, end);
    while (b.clock.now < end) tick(b, Math.min(end, b.clock.now + 9_973));
    expect(b.events.list[0].report).toEqual(a.events.list[0].report);
    expect(b.finance.cash).toBeCloseTo(a.finance.cash, 6);
  });
});

describe('supply', () => {
  it('buys goods from suppliers with their conditions', () => {
    const s = setup();
    expect(act(s, buyGoods, { supplierId: 'sup.discounter', defId: 'item.goods-water', qty: 5 }).ok).toBe(true);
    expect(act(s, buyGoods, { supplierId: 'sup.discounter', defId: 'item.goods-water', qty: 50 }).ok).toBe(false);
    expect(act(s, buyGoods, { supplierId: 'sup.rita', defId: 'item.goods-water', qty: 10 }).ok).toBe(false);
    meetPerson(s, 'p.rita', 'job', { trust: 25 });
    expect(act(s, buyGoods, { supplierId: 'sup.rita', defId: 'item.goods-water', qty: 5 }).ok).toBe(false);
    s.map.rentals['poi.proberaum'] = { since: 0 };
    expect(act(s, buyGoods, { supplierId: 'sup.rita', defId: 'item.goods-mate', qty: 10 }).ok).toBe(true);
    expect(tickCheck(s)).toBe(true);
  });
});

function tickCheck(s: GameState): boolean {
  tick(s, s.clock.now + GAME_DAY_MS);
  return true;
}
