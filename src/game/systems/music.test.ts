import { describe, expect, it } from 'vitest';
import { act, advance, newGame } from '../../test/helpers';
import { MINUTE, GAME_DAY_MS, HOUR } from '../core/time';
import { tick } from '../engine';
import { addItem, getItem } from './inventory/logic';
import { produceTrack, uploadTrack, giveTrack, deleteTrack } from './music/actions';
import { devicesFor, estimateTrack, planReason, streamRate, type ProductionPlan } from './music/logic';
import { repairPro, repairSelf } from './equipment/actions';
import { selfRepairTarget, wearItem } from './equipment/logic';
import { sellToDealer } from './inventory/actions';
import { meetPerson } from './people/logic';
import { GENRES } from '../content/music';
import { xpForLevel } from './progression/logic';

function studio(seed = 1) {
  const s = newGame(seed);
  const drums = addItem(s, 'item.tr-66', { condition: 90 });
  const acid = addItem(s, 'item.tb-33', { condition: 90 });
  const fx = addItem(s, 'item.dub-delay', { condition: 90 });
  return { s, drums: drums.uid, acid: acid.uid, fx: fx.uid };
}

function plan(drums: string, acid: string, extra: Partial<ProductionPlan> = {}): ProductionPlan {
  return {
    name: 'Rost & Nebel',
    genreId: 'genre.acidtek',
    bpm: 172,
    elements: { kick: drums, hats: drums, perc: drums, acid, bass: acid },
    arrangement: 'banger',
    effort: 'normal',
    ...extra,
  };
}

describe('music production', () => {
  it('produces a track over time and wears the devices', () => {
    const { s, drums, acid } = studio();
    const p = plan(drums, acid);
    expect(planReason(s, p)).toBeNull();
    expect(act(s, produceTrack, p).ok).toBe(true);
    expect(getItem(s, drums)?.locked).toMatch(/^studio:/);
    expect(s.music.tracks[0].status).toBe('producing');
    advance(s, 10 * MINUTE);
    const t = s.music.tracks[0];
    expect(t.status).toBe('done');
    expect(t.score).toBeGreaterThan(20);
    expect(t.score).toBeLessThanOrEqual(100);
    expect(getItem(s, drums)?.locked).toBeUndefined();
    expect(getItem(s, drums)!.condition).toBeLessThan(90);
    expect(s.progression.skills.produktion).toBeGreaterThanOrEqual(18);
    expect(t.elements.acid).toBe('item.tb-33');
  });

  it('requires the genre elements and unlocked genres', () => {
    const { s, drums, acid } = studio();
    expect(planReason(s, plan(drums, acid, { elements: { kick: drums } }))).toMatch(/Acid/);
    expect(planReason(s, plan(drums, acid, { genreId: 'genre.hardtek' }))).toMatch(/Produktion Lv\. 3/);
    s.progression.skills.produktion = xpForLevel(3);
    expect(planReason(s, plan(drums, acid, { genreId: 'genre.hardtek' }))).toBeNull();
    expect(planReason(s, plan(drums, acid, { elements: { kick: drums, acid: drums } }))).toMatch(/kann keine Acid/);
  });

  it('only one production at a time', () => {
    const { s, drums, acid } = studio();
    expect(act(s, produceTrack, plan(drums, acid)).ok).toBe(true);
    expect(act(s, produceTrack, plan(drums, acid)).ok).toBe(false);
  });

  it('better gear, skill and effort give better tracks', () => {
    const { s, drums, acid } = studio();
    const base = estimateTrack(s, plan(drums, acid, { effort: 'quick' })).score;
    const careful = estimateTrack(s, plan(drums, acid, { effort: 'careful' })).score;
    expect(careful).toBeGreaterThan(base);
    s.progression.skills.produktion = xpForLevel(8);
    expect(estimateTrack(s, plan(drums, acid, { effort: 'careful' })).score).toBeGreaterThan(careful);
    const cheap = newGame(1);
    const d2 = addItem(cheap, 'item.rd-6', { condition: 50 }).uid;
    const a2 = addItem(cheap, 'item.td-3', { condition: 50 }).uid;
    expect(estimateTrack(cheap, plan(d2, a2, { effort: 'careful' })).score).toBeLessThan(careful);
  });

  it('bpm outside the genre range costs score', () => {
    const { s, drums, acid } = studio();
    expect(estimateTrack(s, plan(drums, acid, { bpm: 140 })).score).toBeLessThan(estimateTrack(s, plan(drums, acid)).score);
  });

  it('every genre can be produced with a full studio', () => {
    const s = newGame(2);
    s.progression.skills.produktion = xpForLevel(10);
    const groove = addItem(s, 'item.mc-groove').uid;
    const acid = addItem(s, 'item.tb-33').uid;
    const fx = addItem(s, 'item.dub-delay').uid;
    for (const g of GENRES) {
      const p: ProductionPlan = {
        name: g.name,
        genreId: g.id,
        bpm: g.bpm[0] + 5,
        elements: { kick: groove, bass: groove, hats: groove, perc: groove, synth: groove, melody: groove, fx, acid },
        arrangement: 'tool',
        effort: 'quick',
      };
      expect(planReason(s, p)).toBeNull();
    }
  });

  it('uploaded tracks earn stream income that is booked daily', () => {
    const { s, drums, acid } = studio();
    act(s, produceTrack, plan(drums, acid));
    advance(s, 10 * MINUTE);
    const t = s.music.tracks[0];
    expect(streamRate(t)).toBe(0);
    expect(act(s, uploadTrack, { trackId: t.id }).ok).toBe(true);
    expect(streamRate(s.music.tracks[0])).toBeGreaterThan(0);
    const cash = s.finance.cash;
    tick(s, s.clock.now + 2 * HOUR);
    expect(s.finance.cash).toBeGreaterThan(cash - 30);
    expect(s.finance.ledger.some((e) => e.label.startsWith('Streams'))).toBe(true);
    expect(act(s, deleteTrack, { trackId: t.id }).ok).toBe(false);
  });

  it('giving a track to a DJ builds trust and can bring reputation', () => {
    const { s, drums, acid } = studio(9);
    act(s, produceTrack, plan(drums, acid));
    advance(s, 10 * MINUTE);
    const t = s.music.tracks[0];
    const trust = s.people.people['p.jule'].trust;
    expect(act(s, giveTrack, { trackId: t.id, personId: 'p.jule' }).ok).toBe(true);
    expect(s.people.people['p.jule'].trust).toBeGreaterThanOrEqual(trust);
    expect(act(s, giveTrack, { trackId: t.id, personId: 'p.jule' }).ok).toBe(false);
    expect(act(s, giveTrack, { trackId: t.id, personId: 'p.kemal' }).ok).toBe(false);
    expect(s.messages.list.some((m) => m.from === 'p.jule')).toBe(true);
  });
});

describe('equipment', () => {
  it('worn gear can break and broken gear cannot be used', () => {
    const s = newGame(5);
    const uid = addItem(s, 'item.vulka-beats', { condition: 10 }).uid;
    let broke = false;
    for (let i = 0; i < 50 && !broke; i++) broke = wearItem(s, uid, 0.1);
    expect(broke).toBe(true);
    expect(devicesFor(s, 'kick').some((d) => d.uid === uid)).toBe(false);
  });

  it('self repair restores condition depending on the technik skill', () => {
    const s = newGame();
    const it = addItem(s, 'item.vulka-beats', { condition: 30 });
    it.broken = true;
    expect(selfRepairTarget(s, it)).toBe(56);
    expect(act(s, repairSelf, { uid: it.uid }).ok).toBe(true);
    expect(act(s, sellToDealer, { uid: it.uid }).ok).toBe(false);
    advance(s, 20 * MINUTE);
    expect(getItem(s, it.uid)!.broken).toBe(false);
    expect(getItem(s, it.uid)!.condition).toBe(56);
    expect(s.progression.stats.repairs).toBe(1);
  });

  it('high-tier gear needs skill or a technician', () => {
    const s = newGame();
    s.finance.cash = 5000;
    const it = addItem(s, 'item.tr-99', { condition: 40 });
    const self = act(s, repairSelf, { uid: it.uid });
    expect(self.ok).toBe(false);
    if (!self.ok) expect(self.reason).toMatch(/Technik Lv\. 4/);
    // Miro is a technician you know from the start.
    expect(act(s, repairPro, { uid: it.uid, personId: 'p.miro' }).ok).toBe(true);
    advance(s, 30 * MINUTE);
    expect(getItem(s, it.uid)!.condition).toBe(95);
  });

  it('technicians need some trust before they repair for you', () => {
    const s = newGame();
    meetPerson(s, 'p.yusuf', 'job', { trust: 10 });
    const it = addItem(s, 'item.tb-33', { condition: 40 });
    expect(act(s, repairPro, { uid: it.uid, personId: 'p.yusuf' }).ok).toBe(false);
  });

  it('broken items sell for less', () => {
    const s = newGame();
    const a = addItem(s, 'item.tr-66', { condition: 60 });
    const b = addItem(s, 'item.tr-66', { condition: 60 });
    b.broken = true;
    const before = s.finance.cash;
    act(s, sellToDealer, { uid: a.uid });
    const fine = s.finance.cash - before;
    act(s, sellToDealer, { uid: b.uid });
    const broken = s.finance.cash - before - fine;
    expect(broken).toBeLessThan(fine);
  });

  it('streams continue offline only within the cap', () => {
    const { s, drums, acid } = studio();
    act(s, produceTrack, plan(drums, acid));
    advance(s, 10 * MINUTE);
    const t = s.music.tracks[0];
    t.score = 90;
    act(s, uploadTrack, { trackId: t.id });
    const cash = s.finance.cash;
    tick(s, s.clock.now + 100 * GAME_DAY_MS, { economyUntil: s.clock.now + 12 * HOUR, offline: true });
    const gained = s.finance.cash - cash;
    // at most 12 h of streams at the initial rate (rate only decays)
    expect(gained).toBeLessThanOrEqual(12 * streamRate({ ...t, hype: 3 }) + 1);
  });
});
