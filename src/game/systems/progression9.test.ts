import { describe, expect, it } from 'vitest';
import { act, advance, newGame } from '../../test/helpers';
import { GAME_DAY_MS, MINUTE } from '../core/time';
import { tick } from '../engine';
import type { GameState } from '../state';
import type { ActionResult } from '../core/actions';
import { GOAL_POINTS } from '../content/unlocks';
import { goalDef } from '../content/registry';
import { parseSave, serializeSave } from '../save/saveManager';
import { hashString } from '../core/rng';
import { buyUnlock, unlockReason } from './progression/tree';
import { addRep } from './progression/logic';
import { buyNew } from './market/actions';
import { generateOffer } from './market/logic';
import { buyGoods, planEvent } from './events/actions';
import { planReason, upcomingNights, liveReason } from './events/plan';
import { forecast, performers } from './events/simulate';
import type { EventPlanInput } from './events/state';
import { addItem } from './inventory/logic';
import { meetPerson } from './people/logic';
import { foundCrew, recruit } from './crew/actions';
import { crewLimit, recruitReason } from './crew/logic';
import { takeRemix } from './music/remix';
import { rentOutSystem } from './sound/rental';
import { addPart, createSystem } from './sound/actions';
import { buildCustomStack } from './equipment/custom';
import { travel } from './map/cities';
import { cityCrowdFactor } from './map/cities';
import { goodsPrice } from './events/actions';
import { visitPoi } from './map/actions';
import { startProjectStage, releaseEP } from './projects/actions';
import { projectState, stageCost } from './projects/logic';
import { buyPerk, retire } from './legacy/actions';
import { legacyGain } from './legacy/logic';
import type { Track } from './music/state';

const why = (r: ActionResult) => (r.ok ? null : r.reason);

function rich(seed = 3): GameState {
  const s = newGame(seed);
  s.finance.cash = 200000;
  s.progression.points = 100;
  s.happenings.nextRollAt = s.clock.now + 1e12;
  for (const k of ['produktion', 'technik', 'organisation', 'netzwerk', 'business'] as const) s.progression.skills[k] = 20000;
  return s;
}

function unlockAll(s: GameState, ...ids: string[]) {
  for (const id of ids) s.progression.unlocks[id] = s.clock.now;
}

function fakeTrack(i: number, score = 60): Track {
  return {
    id: `tx${i}`,
    name: `Track ${i}`,
    genreId: 'genre.acidtek',
    bpm: 140,
    elements: {},
    arrangement: 'tool',
    effort: 'normal',
    stats: { energie: 50, druck: 50, groove: 50, haerte: 50, melodie: 50, atmosphaere: 50, originalitaet: 50, qualitaet: 50 },
    score,
    createdAt: 0,
    status: 'done',
    uploadedAt: 0,
    hype: 1,
    givenTo: [],
    playedBy: [],
  };
}

function plan(s: GameState, spotId: string, extra: Partial<EventPlanInput> = {}): EventPlanInput {
  return {
    name: 'Testparty',
    spotId,
    startsAt: upcomingNights(s)[1].startsAt,
    durationH: 8,
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

function knowSpot(s: GameState, id: string) {
  const st = s.spots.spots[id];
  st.known = true;
  st.intel = 100;
  st.lastCheckedAt = s.clock.now;
}

describe('scene points and the unlock tree', () => {
  it('goals and reputation tiers pay scene points', () => {
    const s = newGame();
    s.happenings.nextRollAt = s.clock.now + 1e12;
    addRep(s, 60);
    expect(s.progression.points).toBe(2);
    s.finance.cash = 2000;
    advance(s, MINUTE);
    const done = Object.keys(s.goals.done);
    const expected = 2 + done.reduce((sum, id) => sum + GOAL_POINTS[goalDef(id).size], 0);
    expect(s.progression.points).toBe(expected);
  });

  it('unlocks need points, prerequisites and conditions', () => {
    const s = newGame();
    expect(unlockReason(s, 'u.lightdesign')).toMatch(/Szenepunkte/);
    s.progression.points = 10;
    expect(act(s, buyUnlock, { id: 'u.lightdesign' }).ok).toBe(true);
    // 10 − 1 for the unlock + 1 for the goal "Neue Wege".
    expect(s.progression.points).toBe(10);
    expect(unlockReason(s, 'u.linearray')).toMatch(/Stromversorgung/);
    expect(unlockReason(s, 'u.powerplant')).toMatch(/Technik/);
    expect(why(act(s, buyUnlock, { id: 'u.lightdesign' }))).toMatch(/Schon/);
  });

  it('gated gear can only be bought (or found used) once unlocked', () => {
    const s = rich();
    s.map.pois['poi.buehnentechnik'] = { at: s.clock.now, via: 'test' };
    expect(why(act(s, buyNew, { defId: 'item.light-laser', shopId: 'shop.buehnentechnik' }))).toMatch(/Lichtdesign/);
    for (let i = 0; i < 200; i++) expect(generateOffer(s)?.defId).not.toBe('item.light-laser');
    act(s, buyUnlock, { id: 'u.lightdesign' });
    expect(act(s, buyNew, { defId: 'item.light-laser', shopId: 'shop.buehnentechnik' }).ok).toBe(true);
  });

  it('the wholesale market and the truck need their unlocks', () => {
    const s = rich();
    expect(why(act(s, buyGoods, { supplierId: 'sup.cashcarry', defId: 'item.goods-beer', qty: 20 }))).toMatch(/Großmarkt/);
    unlockAll(s, 'u.cashcarry');
    expect(why(act(s, buyGoods, { supplierId: 'sup.cashcarry', defId: 'item.goods-beer', qty: 20 })) ?? '').not.toMatch(/Großmarkt/);
  });

  it('management opens new crew roles with real effects', () => {
    const s = rich();
    s.progression.reputation = 200;
    for (const p of ['p.nika', 'p.ole', 'p.basti', 'p.miro']) meetPerson(s, p, 'intro', { trust: 60 });
    act(s, foundCrew, { name: 'Rabbit Sound' });
    expect(recruitReason(s, 'p.nika', 'manager')).toMatch(/Management/);
    const limit = crewLimit(s);
    unlockAll(s, 'u.management');
    expect(act(s, recruit, { personId: 'p.nika', role: 'manager' }).ok).toBe(true);
    expect(crewLimit(s)).toBe(limit + 2);
  });
});

describe('event formats', () => {
  it('open-airs need the unlock and an outdoor spot, and draw more people', () => {
    const s = rich();
    knowSpot(s, 'spot.baggersee');
    knowSpot(s, 'spot.keller-block9');
    const base = plan(s, 'spot.baggersee', { transport: 'rent' });
    expect(planReason(s, { ...base, format: 'openair' })).toMatch(/Open-Air/);
    unlockAll(s, 'u.openair');
    expect(planReason(s, { ...plan(s, 'spot.keller-block9'), format: 'openair' })).toMatch(/draußen/);
    expect(planReason(s, { ...base, format: 'openair' })).toBeNull();
    expect(forecast(s, { ...base, format: 'openair' })!.demand).toBeGreaterThan(forecast(s, base)!.demand);
  });

  it('teknivals run for days and need a big outdoor spot', () => {
    const s = rich();
    unlockAll(s, 'u.openair', 'u.teknival');
    knowSpot(s, 'spot.baggersee');
    knowSpot(s, 'spot.steinbruch');
    expect(planReason(s, { ...plan(s, 'spot.baggersee'), format: 'teknival', durationH: 24 })).toBeNull();
    expect(planReason(s, { ...plan(s, 'spot.lichtung'), format: 'teknival', durationH: 24 })).toMatch(/bekannten Spot|zu klein/);
    expect(planReason(s, { ...plan(s, 'spot.steinbruch'), format: 'teknival', durationH: 8 })).toMatch(/Dauer/);
    const f = forecast(s, { ...plan(s, 'spot.steinbruch', { transport: 'rent' }), format: 'teknival', durationH: 36 })!;
    expect(f.capacity).toBe(Math.round(2000 * 1.8));
  });

  it('a live set needs the unlock, three tracks and machines', () => {
    const s = rich();
    expect(liveReason(s)).toMatch(/Live-Act/);
    unlockAll(s, 'u.liveact');
    expect(liveReason(s)).toMatch(/drei/);
    s.music.tracks.push(fakeTrack(1), fakeTrack(2), fakeTrack(3));
    expect(liveReason(s)).toMatch(/Synth/);
    addItem(s, 'item.tr-66');
    expect(liveReason(s)).toBeNull();
    const [live] = performers(s, ['live']);
    const [self] = performers(s, ['self']);
    expect(live.draw).toBeGreaterThan(self.draw);
    knowSpot(s, 'spot.keller-block9');
    expect(planReason(s, plan(s, 'spot.keller-block9', { lineup: ['self', 'live'] }))).toMatch(/beides/);
  });
});

describe('new business', () => {
  it('remix commissions pay', () => {
    const s = rich();
    addItem(s, 'item.tr-66');
    expect(why(act(s, takeRemix, {}))).toMatch(/Remix/);
    unlockAll(s, 'u.remix');
    const cash = s.finance.cash;
    expect(act(s, takeRemix, {}).ok).toBe(true);
    advance(s, 16 * MINUTE);
    expect(s.finance.cash).toBeGreaterThan(cash);
    expect(s.progression.stats.remixes).toBe(1);
  });

  it('a rented system is locked, earns money and cannot play that night', () => {
    const s = rich();
    unlockAll(s, 'u.rental');
    act(s, createSystem, { name: 'Rabbit' });
    const sys = s.sound.systems[0];
    for (const id of ['item.pa-active-12', 'item.sub-active-15', 'item.cables', 'item.dj-mixer-2ch']) act(s, addPart, { systemId: sys.id, uid: addItem(s, id, { condition: 90 }).uid });
    expect(act(s, rentOutSystem, { systemId: sys.id }).ok).toBe(true);
    expect(sys.components.every((uid) => s.inventory.items[uid].locked?.startsWith('rental:'))).toBe(true);
    knowSpot(s, 'spot.keller-block9');
    const p = plan(s, 'spot.keller-block9', { sound: { kind: 'own', systemId: sys.id }, startsAt: upcomingNights(s)[0].startsAt });
    if (upcomingNights(s)[0].startsAt < s.clock.now + 12 * MINUTE) expect(planReason(s, p)).toMatch(/vermietet/);
    const cash = s.finance.cash;
    advance(s, 13 * MINUTE);
    expect(s.finance.cash).toBeGreaterThan(cash);
    expect(sys.components.some((uid) => s.inventory.items[uid].locked)).toBe(false);
  });

  it('a custom stack is built in the workshop', () => {
    const s = rich();
    s.map.rentals['poi.selfstorage'] = { since: s.clock.now };
    unlockAll(s, 'u.custombuild');
    expect(act(s, buildCustomStack, {}).ok).toBe(true);
    advance(s, 46 * MINUTE);
    expect(Object.values(s.inventory.items).some((it) => it.defId === 'item.custom-stack')).toBe(true);
  });
});

describe('cities', () => {
  it('travel needs the unlock and no open events, and changes the city', () => {
    const s = rich();
    expect(why(act(s, travel, { cityId: 'city.bergheim' }))).toMatch(/Bergheim/);
    unlockAll(s, 'u.city-bergheim');
    knowSpot(s, 'spot.keller-block9');
    act(s, planEvent, plan(s, 'spot.keller-block9'));
    expect(why(act(s, travel, { cityId: 'city.bergheim' }))).toMatch(/durchziehen/);
    s.events.list = [];
    expect(act(s, travel, { cityId: 'city.bergheim' }).ok).toBe(true);
    advance(s, 16 * MINUTE);
    expect(s.map.cityId).toBe('city.bergheim');
    expect(s.map.districts['bergheim.altstadt'].explored).toBe(10);
    expect(s.map.pois['poi.bh-kapelle']).toBeDefined();
    expect(why(act(s, visitPoi, { poiId: 'poi.kesselhaus' }))).toMatch(/andere Stadt|unbekannt/);
    expect(s.progression.stats.citiesVisited).toBe(1);
  });

  it('cities play differently: crowd, prices and fame', () => {
    const s = rich();
    expect(cityCrowdFactor(s, 'city.steinhafen')).toBe(1);
    expect(cityCrowdFactor(s, 'city.nordhafen')).toBeCloseTo(1.6 * 0.35);
    s.map.cityFame['city.nordhafen'] = 100;
    expect(cityCrowdFactor(s, 'city.nordhafen')).toBeCloseTo(1.6);
    const here = goodsPrice(s, 'sup.discounter', 'item.goods-beer');
    s.map.cityId = 'city.nordhafen';
    expect(goodsPrice(s, 'sup.discounter', 'item.goods-beer')).toBeGreaterThan(here);
  });

  it('parties in another city raise your fame there', () => {
    const s = rich();
    unlockAll(s, 'u.city-bergheim');
    s.map.cityId = 'city.bergheim';
    knowSpot(s, 'spot.bh-kellerbar');
    const p = plan(s, 'spot.bh-kellerbar', { lineup: ['p.jule'] });
    expect(act(s, planEvent, p).ok).toBe(true);
    const ev = s.events.list[0];
    tick(s, ev.startsAt + 1);
    tick(s, ev.startsAt + ev.durationH * MINUTE + 1);
    expect(ev.status).toBe('done');
    expect(s.map.cityFame['city.bergheim']).toBeGreaterThan(0);
  });
});

describe('projects', () => {
  it('the own location: stages over hours, then a legal spot with upkeep', () => {
    const s = rich();
    s.progression.reputation = 2000;
    expect(why(act(s, startProjectStage, { projectId: 'proj.location' }))).toMatch(/Eigene Location/);
    unlockAll(s, 'u.location');
    for (let i = 0; i < 4; i++) {
      expect(act(s, startProjectStage, { projectId: 'proj.location' }).ok).toBe(true);
      expect(why(act(s, startProjectStage, { projectId: 'proj.location' }))).toMatch(/läuft/);
      advance(s, 181 * MINUTE);
    }
    expect(s.spots.spots['spot.own-location'].known).toBe(true);
    expect(s.progression.flags.ownLocation).toBe(1);
    expect(why(act(s, startProjectStage, { projectId: 'proj.location' }))).toMatch(/Abgeschlossen/);
    const cash = s.finance.cash;
    tick(s, s.clock.now + GAME_DAY_MS);
    expect(cash - s.finance.cash).toBeGreaterThanOrEqual(150);
  });

  it('a festival weekend brings thousands, and the next edition costs more', () => {
    const s = rich();
    s.progression.reputation = 5000;
    unlockAll(s, 'u.festival');
    const first = stageCost(s, { id: 'proj.festival', stages: [{ cost: 1000 }] } as never, 0);
    expect(first).toBe(1000);
    for (let i = 0; i < 5; i++) {
      expect(act(s, startProjectStage, { projectId: 'proj.festival' }).ok).toBe(true);
      advance(s, 241 * MINUTE);
    }
    const st = projectState(s, 'proj.festival');
    expect(st.completed).toBe(1);
    expect(st.stage).toBe(0);
    expect(st.lastResult!.visitors).toBeGreaterThan(3000);
    expect(s.progression.stats.festivals).toBe(1);
    expect(stageCost(s, { id: 'proj.festival', stages: [{ cost: 1000 }] } as never, 0)).toBe(1150);
  });

  it('a label releases EPs from your tracks', () => {
    const s = rich();
    s.progression.flags.label = 1;
    expect(why(act(s, releaseEP, {}))).toMatch(/drei/);
    s.music.tracks.push(fakeTrack(1, 70), fakeTrack(2, 60), fakeTrack(3, 50));
    const rep = s.progression.reputation;
    expect(act(s, releaseEP, {}).ok).toBe(true);
    advance(s, 21 * MINUTE);
    expect(s.music.tracks.every((t) => t.releasedAt !== undefined)).toBe(true);
    expect(s.progression.reputation).toBeGreaterThan(rep);
    expect(s.progression.stats.releases).toBe(1);
  });
});

describe('legacy', () => {
  it('passing on the crew starts a new run with legacy points, scenario and perks', () => {
    const s = rich();
    expect(why(act(s, retire, { scenarioId: 'sc.producer', name: 'Neu' }))).toMatch(/Reputation/);
    s.progression.reputation = 12000;
    const gain = legacyGain(s);
    expect(gain).toBeGreaterThanOrEqual(5);
    expect(act(s, retire, { scenarioId: 'sc.producer', name: 'Zweite' }).ok).toBe(true);
    expect(s.player.name).toBe('Zweite');
    expect(s.legacy.runs).toBe(1);
    expect(s.legacy.points).toBe(gain);
    expect(s.legacy.history[0].reputation).toBeGreaterThanOrEqual(12000);
    expect(s.progression.reputation).toBe(0);
    expect(s.finance.cash).toBe(300);
    expect(Object.values(s.inventory.items).some((it) => it.defId === 'item.vulka-beats')).toBe(true);
    // Perks bought now apply to the next run.
    expect(act(s, buyPerk, { perkId: 'leg.money' }).ok).toBe(true);
    s.progression.reputation = 12000;
    act(s, retire, { scenarioId: 'sc.bergheim', name: 'Dritte' });
    expect(s.legacy.runs).toBe(2);
    expect(s.map.cityId).toBe('city.bergheim');
    expect(s.player.homeCity).toBe('city.bergheim');
    expect(s.finance.cash).toBe(600 + 750);
    expect(cityCrowdFactor(s, 'city.bergheim')).toBeCloseTo(0.7);
    expect(() => tick(s, s.clock.now + GAME_DAY_MS)).not.toThrow();
  });
});

describe('saves from before Phase 9', () => {
  it('get their scene points back from finished goals', () => {
    const s = newGame();
    s.goals.done['goal.first-job'] = s.clock.now;
    s.progression.reputation = 200;
    const raw = JSON.parse(serializeSave(s, s.clock.now));
    raw.v = 1;
    delete raw.data.progression.points;
    delete raw.data.progression.pointsTotal;
    delete raw.data.projects;
    delete raw.data.legacy;
    delete raw.data.player.homeCity;
    raw.data.meta.version = 1;
    const data = JSON.stringify(raw.data);
    raw.checksum = hashString(data);
    const res = parseSave(JSON.stringify(raw));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.progression.points).toBe(GOAL_POINTS[goalDef('goal.first-job').size] + 2 * 2);
    expect(res.state.player.homeCity).toBe('city.steinhafen');
    expect(res.state.legacy.runs).toBe(0);
  });
});
