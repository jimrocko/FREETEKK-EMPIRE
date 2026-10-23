import { describe, expect, it } from 'vitest';
import { act, advance, newGame } from '../../test/helpers';
import { GAME_DAY_MS, MINUTE } from '../core/time';
import { tick } from '../engine';
import { exploreDistrict, followRumor, rentStorage, cancelStorage, visitPoi } from './map/actions';
import { checkSpot } from './spots/actions';
import { buyNew } from './market/actions';
import { exploreDurationMin, findableIn, hearRumor, isSpotKnown, mobilityFactor, rollRumor } from './map/logic';
import { statView } from './spots/logic';
import { storageCapacity } from './inventory/logic';
import { knownShops } from './market/logic';
import { districtDef } from '../content/registry';
import { startJob } from './jobs/actions';
import { addItem } from './inventory/logic';

function exploreFully(s: ReturnType<typeof newGame>, districtId: string, times = 12) {
  for (let i = 0; i < times; i++) {
    expect(act(s, exploreDistrict, { districtId }).ok).toBe(true);
    advance(s, 10 * MINUTE);
  }
}

describe('map', () => {
  it('starts with partial knowledge of the home district', () => {
    const s = newGame();
    expect(s.map.districts['steinhafen.ostend'].explored).toBe(20);
    expect(s.map.pois['poi.spaeti']).toBeDefined();
    expect(Object.values(s.spots.spots).some((x) => x.known)).toBe(false);
  });

  it('exploring raises the explored share and eventually finds places', () => {
    const s = newGame(7);
    exploreFully(s, 'steinhafen.ostend');
    expect(s.map.districts['steinhafen.ostend'].explored).toBeGreaterThanOrEqual(80);
    expect(isSpotKnown(s, 'spot.keller-block9')).toBe(true);
    expect(s.progression.stats.explorations).toBe(12);
    expect(s.progression.skills.netzwerk).toBeGreaterThan(0);
  });

  it('locked districts explain why', () => {
    const s = newGame();
    const res = act(s, exploreDistrict, { districtId: 'steinhafen.stadtwald' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/Fahrrad/);
    addItem(s, 'item.bike');
    expect(act(s, exploreDistrict, { districtId: 'steinhafen.stadtwald' }).ok).toBe(true);
  });

  it('a bike makes trips faster', () => {
    const s = newGame();
    const district = districtDef('steinhafen.hafen');
    const onFoot = exploreDurationMin(s, district);
    addItem(s, 'item.bike');
    expect(mobilityFactor(s)).toBeLessThan(1);
    expect(exploreDurationMin(s, district)).toBeLessThan(onFoot);
  });

  it('only one trip at a time', () => {
    const s = newGame();
    expect(act(s, exploreDistrict, { districtId: 'steinhafen.ostend' }).ok).toBe(true);
    expect(act(s, exploreDistrict, { districtId: 'steinhafen.altstadt' }).ok).toBe(false);
    // …but a job can run in parallel.
    expect(act(s, startJob, { jobId: 'job.flyer' }).ok).toBe(true);
  });

  it('discovering a shop adds it to the catalog', () => {
    const s = newGame(3);
    expect(knownShops(s).map((x) => x.id)).toEqual(['shop.online']);
    exploreFully(s, 'steinhafen.altstadt', 15);
    expect(s.map.pois['poi.klangkiste']).toBeDefined();
    expect(knownShops(s).some((x) => x.id === 'shop.klangkiste')).toBe(true);
    s.finance.cash = 2000;
    expect(act(s, buyNew, { defId: 'item.tr-66', shopId: 'shop.klangkiste' }).ok).toBe(true);
  });

  it('every findable place can be found by exploring', () => {
    const s = newGame(11);
    addItem(s, 'item.bike');
    s.finance.cash = 1_000_000;
    for (const id of Object.keys(s.map.districts)) exploreFully(s, id, 25);
    for (const id of Object.keys(s.map.districts)) expect(findableIn(s, id, 100)).toEqual([]);
  });
});

describe('rumors', () => {
  it('rumors lead to hidden spots', () => {
    const s = newGame();
    expect(hearRumor(s, 'rumor.bunker', 'test')).toBe(true);
    expect(act(s, followRumor, { rumorId: 'rumor.bunker' }).ok).toBe(true);
    advance(s, 10 * MINUTE);
    expect(isSpotKnown(s, 'spot.bunker-nord')).toBe(true);
    expect(s.map.rumors['rumor.bunker'].resolved).toBe(true);
    expect(act(s, followRumor, { rumorId: 'rumor.bunker' }).ok).toBe(false);
  });

  it('jobs and visits can produce rumors', () => {
    const s = newGame();
    let heard: string | null = null;
    for (let i = 0; i < 40 && !heard; i++) heard = rollRumor(s, { job: 'job.flyer' }, 0.5, 'job');
    expect(heard).toBe('rumor.industrial-north');
    expect(rollRumor(s, { job: 'job.flyer' }, 1, 'job')).toBeNull();
  });

  it('visiting a place costs money and gives XP', () => {
    const s = newGame();
    const cash = s.finance.cash;
    expect(act(s, visitPoi, { poiId: 'poi.spaeti' }).ok).toBe(true);
    expect(s.finance.cash).toBe(cash - 4);
    advance(s, 5 * MINUTE);
    expect(s.progression.stats.visits).toBe(1);
    expect(act(s, visitPoi, { poiId: 'poi.anker' }).ok).toBe(false);
  });
});

describe('spots', () => {
  it('values stay fuzzy until the spot was checked', () => {
    const s = newGame();
    s.spots.spots['spot.kai7'].known = true;
    s.spots.spots['spot.kai7'].intel = 35;
    expect(statView(s, 'spot.kai7', 'capacity').exact).toBe(false);
    expect(statView(s, 'spot.kai7', 'capacity').text).toMatch(/ca\./);
    expect(act(s, checkSpot, { spotId: 'spot.kai7' }).ok).toBe(true);
    advance(s, 10 * MINUTE);
    expect(s.spots.spots['spot.kai7'].intel).toBe(100);
    expect(statView(s, 'spot.kai7', 'capacity').text).toBe('800 Leute');
    expect(s.progression.stats.spotChecks).toBe(1);
  });

  it('unknown spots cannot be checked', () => {
    const s = newGame();
    expect(act(s, checkSpot, { spotId: 'spot.kai7' }).ok).toBe(false);
  });

  it('famous unofficial spots get closed and reopen later', () => {
    const s = newGame(5);
    // Other crews would party (and get raided) here too – leave them out.
    for (const c of Object.values(s.rivals.crews)) {
      c.active = false;
      c.appearedAt = s.clock.now;
    }
    const st = s.spots.spots['spot.industrial-north'];
    st.known = true;
    st.fame = 100;
    let closed = false;
    for (let i = 0; i < 60 && !closed; i++) {
      st.fame = 100;
      tick(s, s.clock.now + GAME_DAY_MS);
      closed = st.status === 'closed';
    }
    expect(closed).toBe(true);
    st.fame = 0;
    tick(s, s.clock.now + 7 * GAME_DAY_MS);
    expect(st.status).toBe('open');
  });
});

describe('storage', () => {
  it('renting adds capacity, costs rent daily and refunds the deposit', () => {
    const s = newGame();
    s.map.pois['poi.kellerabteil'] = { at: s.clock.now, via: 'test' };
    const cap = storageCapacity(s);
    const cash = s.finance.cash;
    expect(act(s, rentStorage, { poiId: 'poi.kellerabteil' }).ok).toBe(true);
    expect(storageCapacity(s)).toBe(cap + 300);
    expect(s.finance.cash).toBe(cash - 33);
    tick(s, s.clock.now + GAME_DAY_MS);
    expect(s.finance.ledger.some((e) => e.label.includes('Miete: Kellerabteil'))).toBe(true);
    expect(act(s, cancelStorage, { poiId: 'poi.kellerabteil' }).ok).toBe(true);
    expect(storageCapacity(s)).toBe(cap);
  });

  it('cannot cancel storage that is still needed', () => {
    const s = newGame();
    s.map.pois['poi.kellerabteil'] = { at: s.clock.now, via: 'test' };
    act(s, rentStorage, { poiId: 'poi.kellerabteil' });
    addItem(s, 'item.cargo-bike');
    addItem(s, 'item.bike');
    addItem(s, 'item.bike');
    const res = act(s, cancelStorage, { poiId: 'poi.kellerabteil' });
    expect(res.ok).toBe(false);
  });
});
