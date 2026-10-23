import { describe, expect, it } from 'vitest';
import { act, advance, newGame } from '../../test/helpers';
import { SKILLS } from '../core/types';
import { MINUTE } from '../core/time';
import { SPOTS } from '../content/spots';
import { UNLOCKS } from '../content/unlocks';
import {
  cheatClearDebts,
  cheatCooldowns,
  cheatCrew,
  cheatFinish,
  cheatMeetAll,
  cheatMoney,
  cheatPoints,
  cheatRep,
  cheatRepair,
  cheatRevealMap,
  cheatSkills,
  cheatUnlockAll,
} from './admin/actions';
import { skillLevel, stat } from './progression/logic';
import { startJob } from './jobs/actions';
import { addItem } from './inventory/logic';
import { buyFun, useFun } from './lifestyle/actions';

function game() {
  const s = newGame(9);
  s.happenings.nextRollAt = s.clock.now + 1e12;
  return s;
}

describe('hack menu cheats', () => {
  it('money arrives but does not count as earned', () => {
    const s = game();
    const earned = stat(s, 'moneyEarned');
    expect(act(s, cheatMoney, { amount: 100000 }).ok).toBe(true);
    expect(s.finance.cash).toBe(100500);
    expect(stat(s, 'moneyEarned')).toBe(earned);
    expect(s.finance.ledger.at(-1)!.label).toBe('Admin-Hack');
    expect(stat(s, 'cheatsUsed')).toBe(1);
  });

  it('reputation, scene points and skills', () => {
    const s = game();
    act(s, cheatRep, { amount: 1000 });
    expect(s.progression.reputation).toBeGreaterThanOrEqual(1000);
    const points = s.progression.points;
    act(s, cheatPoints, { amount: 10 });
    expect(s.progression.points).toBe(points + 10);
    const before = SKILLS.map((k) => skillLevel(s, k));
    act(s, cheatSkills, { levels: 3 });
    SKILLS.forEach((k, i) => expect(skillLevel(s, k)).toBeGreaterThanOrEqual(before[i] + 3));
  });

  it('reveals the whole city and everyone', () => {
    const s = game();
    act(s, cheatRevealMap, {});
    for (const d of Object.values(s.map.districts)) expect(d.explored).toBe(100);
    for (const sp of SPOTS) if (sp.cityId === s.map.cityId && !sp.hidden) expect(s.spots.spots[sp.id].known).toBe(true);
    act(s, cheatMeetAll, {});
    expect(Object.values(s.people.people).every((p) => p.met && p.trust >= 50)).toBe(true);
  });

  it('repairs gear, cheers up the crew, opens the tree, clears debts', () => {
    const s = game();
    addItem(s, 'item.top-diy', { condition: 12 });
    act(s, cheatRepair, {});
    expect(Object.values(s.inventory.items).every((it) => it.condition === 100 && !it.broken)).toBe(true);
    expect(act(s, cheatCrew, {}).ok).toBe(true);
    act(s, cheatUnlockAll, {});
    for (const u of UNLOCKS) expect(s.progression.unlocks[u.id]).toBeDefined();
    s.finance.cash = -300;
    act(s, cheatClearDebts, {});
    expect(s.finance.cash).toBe(0);
    expect(s.finance.loans).toEqual([]);
  });

  it('turbo finishes running activities on the next tick', () => {
    const s = game();
    expect(act(s, startJob, { jobId: 'job.flyer' }).ok).toBe(true);
    act(s, cheatFinish, {});
    advance(s, 1000);
    expect(s.activities.running).toHaveLength(0);
    expect(stat(s, 'jobsDone')).toBe(1);
  });

  it('resets lifestyle cooldowns', () => {
    const s = game();
    s.finance.cash = 5000;
    act(s, buyFun, { id: 'fun.dog' });
    act(s, useFun, { id: 'fun.dog' });
    expect(act(s, useFun, { id: 'fun.dog' }).ok).toBe(false);
    act(s, cheatCooldowns, {});
    expect(act(s, useFun, { id: 'fun.dog' }).ok).toBe(true);
    advance(s, MINUTE);
  });
});
