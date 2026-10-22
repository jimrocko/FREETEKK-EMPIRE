import { describe, expect, it } from 'vitest';
import { act, newGame } from '../../test/helpers';
import { GAME_DAY_MS } from '../core/time';
import { tick } from '../engine';
import { addItem, storageCapacity, usedVolume } from './inventory/logic';
import { addPart, createSystem, deleteSystem, removePart } from './sound/actions';
import { systemStats } from './sound/logic';
import { sellToDealer } from './inventory/actions';
import { dismiss, foundCrew, recruit } from './crew/actions';
import { recruitReason } from './crew/logic';
import { channelCapacity } from './activities/logic';
import { meetPerson } from './people/logic';
import { rentVehicle } from './transport/actions';
import { transportCapacity } from './transport/logic';
import { mobilityFactor } from './map/logic';
import { checkCondition } from '../core/conditions';

function systemWith(defs: string[], seed = 1) {
  const s = newGame(seed);
  s.finance.cash = 100_000;
  act(s, createSystem, { name: 'Rabbit System' });
  const sys = s.sound.systems[0];
  for (const d of defs) act(s, addPart, { systemId: sys.id, uid: addItem(s, d).uid });
  return { s, sys: s.sound.systems[0] };
}

describe('sound systems', () => {
  it('a small active PA covers a basement party', () => {
    const { s, sys } = systemWith(['item.pa-active-12', 'item.pa-active-12', 'item.sub-active-15', 'item.cables', 'item.dj-mixer-2ch']);
    const st = systemStats(s, sys);
    expect(st.speakers).toBe(3);
    expect(st.reach).toBeGreaterThan(100);
    expect(st.reach).toBeLessThan(400);
    expect(st.warnings).toEqual([]);
    expect(st.powerW).toBe(2000);
    expect(checkCondition(s, { t: 'systemReach', gte: 50 })).toBe(true);
  });

  it('passive speakers need amps and cables', () => {
    const { s, sys } = systemWith(['item.top-diy', 'item.top-diy', 'item.sub-diy-18', 'item.sub-diy-18', 'item.dj-mixer-2ch']);
    const without = systemStats(s, sys);
    expect(without.warnings.some((w) => w.includes('Endstufen'))).toBe(true);
    expect(without.warnings.some((w) => w.includes('Kabel'))).toBe(true);
    act(s, addPart, { systemId: sys.id, uid: addItem(s, 'item.amp-mid').uid });
    act(s, addPart, { systemId: sys.id, uid: addItem(s, 'item.amp-mid').uid });
    act(s, addPart, { systemId: sys.id, uid: addItem(s, 'item.cables').uid });
    const withAmps = systemStats(s, s.sound.systems[0]);
    expect(withAmps.warnings).toEqual([]);
    expect(withAmps.reach).toBeGreaterThan(without.reach);
    expect(withAmps.quality).toBeGreaterThan(without.quality);
  });

  it('a controller and balanced subs improve quality', () => {
    const { s, sys } = systemWith(['item.pa-active-15', 'item.pa-active-15', 'item.cables', 'item.dj-mixer-2ch']);
    const noSub = systemStats(s, sys);
    expect(noSub.warnings.some((w) => w.includes('Subs'))).toBe(true);
    act(s, addPart, { systemId: sys.id, uid: addItem(s, 'item.sub-active-15').uid });
    act(s, addPart, { systemId: sys.id, uid: addItem(s, 'item.sub-active-15').uid });
    const balanced = systemStats(s, s.sound.systems[0]);
    act(s, addPart, { systemId: sys.id, uid: addItem(s, 'item.dsp').uid });
    const controlled = systemStats(s, s.sound.systems[0]);
    expect(balanced.quality).toBeGreaterThan(noSub.quality);
    expect(controlled.quality).toBeGreaterThan(balanced.quality);
  });

  it('a wall of sound reaches thousands', () => {
    const parts = [
      ...Array(4).fill('item.sub-horn'),
      ...Array(4).fill('item.top-horn'),
      'item.amp-big',
      'item.amp-big',
      'item.cables',
      'item.cables',
      'item.dsp',
      'item.clubmixer-4',
      'item.gen-big',
    ];
    const { s, sys } = systemWith(parts);
    const st = systemStats(s, sys);
    expect(st.reach).toBeGreaterThan(1500);
    expect(st.quality).toBeGreaterThan(70);
    expect(st.generatorKw).toBe(25);
    expect(st.warnings).toEqual([]);
  });

  it('broken parts do not count', () => {
    const { s, sys } = systemWith(['item.pa-active-12', 'item.pa-active-12', 'item.sub-active-15', 'item.cables', 'item.dj-mixer-2ch']);
    const ok = systemStats(s, sys);
    s.inventory.items[sys.components[2]].broken = true;
    const broken = systemStats(s, sys);
    expect(broken.reach).toBeLessThan(ok.reach);
    expect(broken.reliability).toBeLessThan(ok.reliability);
  });

  it('parts in a system cannot be sold; removing or deleting frees them', () => {
    const { s, sys } = systemWith(['item.pa-active-12']);
    const uid = sys.components[0];
    expect(act(s, sellToDealer, { uid }).ok).toBe(false);
    expect(act(s, addPart, { systemId: sys.id, uid }).ok).toBe(false);
    act(s, removePart, { systemId: sys.id, uid });
    expect(act(s, sellToDealer, { uid }).ok).toBe(true);
    act(s, deleteSystem, { systemId: sys.id });
    expect(s.sound.systems).toHaveLength(0);
  });
});

describe('vehicles', () => {
  it('vehicles do not use storage, add transport and speed', () => {
    const s = newGame();
    const before = usedVolume(s);
    addItem(s, 'item.van-sprinter');
    expect(usedVolume(s)).toBe(before);
    expect(transportCapacity(s).volumeL).toBe(9060);
    expect(mobilityFactor(s)).toBeLessThan(1);
    expect(storageCapacity(s)).toBe(400);
  });

  it('rentals last one game day and charge upfront', () => {
    const s = newGame();
    expect(act(s, rentVehicle, { optionId: 'rent.sprinter' }).ok).toBe(true);
    expect(s.finance.cash).toBe(390);
    expect(transportCapacity(s).count).toBe(1);
    tick(s, s.clock.now + GAME_DAY_MS + 1000);
    expect(transportCapacity(s).count).toBe(0);
    expect(act(s, rentVehicle, { optionId: 'rent.truck' }).ok).toBe(false);
  });

  it('vehicles cost upkeep every day', () => {
    const s = newGame();
    addItem(s, 'item.car-kombi');
    const cash = s.finance.cash;
    tick(s, s.clock.now + GAME_DAY_MS);
    expect(cash - s.finance.cash).toBeCloseTo(5 + 4, 1);
  });
});

describe('crew', () => {
  function readyGame() {
    const s = newGame();
    s.progression.reputation = 50;
    for (const p of ['p.nika', 'p.ole', 'p.basti']) meetPerson(s, p, 'intro');
    return s;
  }

  it('founding needs reputation and contacts', () => {
    const s = newGame();
    const r = act(s, foundCrew, { name: 'Rabbit Sound' });
    expect(r.ok).toBe(false);
    const ready = readyGame();
    expect(act(ready, foundCrew, { name: 'Rabbit Sound' }).ok).toBe(true);
    expect(ready.crew.name).toBe('Rabbit Sound');
  });

  it('recruiting needs trust, the right role and a crew slot', () => {
    const s = readyGame();
    act(s, foundCrew, { name: 'Rabbit Sound' });
    s.people.people['p.miro'].trust = 30;
    expect(recruitReason(s, 'p.miro', 'technician')).toMatch(/vertraut/);
    s.people.people['p.miro'].trust = 60;
    expect(recruitReason(s, 'p.miro', 'dj')).toMatch(/macht nicht/);
    expect(recruitReason(s, 'p.kemal', 'shopkeeper')).toMatch(/keine Crew/);
    expect(act(s, recruit, { personId: 'p.miro', role: 'technician' }).ok).toBe(true);
    expect(channelCapacity(s, 'workshop')).toBe(2);
    expect(act(s, recruit, { personId: 'p.miro', role: 'organizer' }).ok).toBe(false);
  });

  it('crew wages are paid daily and unpaid crews lose morale', () => {
    const s = readyGame();
    act(s, foundCrew, { name: 'Rabbit Sound' });
    s.people.people['p.ole'].trust = 60;
    act(s, recruit, { personId: 'p.ole', role: 'driver' });
    const cash = s.finance.cash;
    tick(s, s.clock.now + GAME_DAY_MS);
    expect(s.finance.ledger.some((e) => e.label === 'Crew-Gagen')).toBe(true);
    expect(s.finance.cash).toBeLessThan(cash);
    s.finance.cash = -1000;
    for (let i = 0; i < 10; i++) tick(s, s.clock.now + GAME_DAY_MS);
    expect(s.crew.members).toHaveLength(0);
    expect(s.notifications.feed.some((e) => e.title.includes('verlassen'))).toBe(true);
  });

  it('dismissing hurts the relationship', () => {
    const s = readyGame();
    act(s, foundCrew, { name: 'Rabbit Sound' });
    s.people.people['p.ole'].trust = 60;
    act(s, recruit, { personId: 'p.ole', role: 'driver' });
    const rel = s.people.people['p.ole'].relation;
    expect(act(s, dismiss, { personId: 'p.ole' }).ok).toBe(true);
    expect(s.people.people['p.ole'].relation).toBeLessThan(rel);
  });
});
