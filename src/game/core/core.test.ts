import { describe, expect, it } from 'vitest';
import { createRng, nextRandom, pickWeighted, randInt } from './rng';
import { GAME_DAY_MS, GAME_HOUR_MS, createClock, dayStartAt, gameDayAt, gameTimeAt, weekdayOf } from './time';
import { fmtDuration, fmtMoney } from './format';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(123);
    const b = createRng(123);
    const seqA = Array.from({ length: 5 }, () => nextRandom(a));
    const seqB = Array.from({ length: 5 }, () => nextRandom(b));
    expect(seqA).toEqual(seqB);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('randInt stays inside the inclusive range', () => {
    const d = { rng: createRng(7) };
    for (let i = 0; i < 1000; i++) {
      const v = randInt(d, 2, 4);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(4);
    }
  });

  it('pickWeighted ignores zero weights', () => {
    const d = { rng: createRng(1) };
    for (let i = 0; i < 100; i++) expect(pickWeighted(d, ['a', 'b'], (x) => (x === 'a' ? 0 : 1))).toBe('b');
    expect(pickWeighted(d, ['a'], () => 0)).toBeUndefined();
  });
});

describe('time', () => {
  it('starts on day 1, Monday 10:00', () => {
    const clock = createClock(1_000_000);
    const info = gameTimeAt(clock, clock.now);
    expect(info.day).toBe(1);
    expect(info.weekdayName).toBe('Montag');
    expect(info.hour).toBe(10);
    expect(info.minute).toBe(0);
  });

  it('one real minute is one game hour, one game day is 24 minutes', () => {
    const clock = createClock(0);
    expect(gameTimeAt(clock, clock.now + GAME_HOUR_MS).hour).toBe(11);
    expect(gameDayAt(clock, dayStartAt(clock, 2))).toBe(2);
    expect(gameDayAt(clock, dayStartAt(clock, 2) - 1)).toBe(1);
    expect(GAME_DAY_MS).toBe(24 * 60 * 1000);
  });

  it('weekdays cycle and nights are detected', () => {
    expect(weekdayOf(1)).toBe(0);
    expect(weekdayOf(7)).toBe(6);
    expect(weekdayOf(8)).toBe(0);
    const clock = createClock(0);
    expect(gameTimeAt(clock, dayStartAt(clock, 1) + 23 * GAME_HOUR_MS).isNight).toBe(true);
    expect(gameTimeAt(clock, dayStartAt(clock, 1) + 12 * GAME_HOUR_MS).isNight).toBe(false);
  });
});

describe('format', () => {
  it('formats money in German', () => {
    expect(fmtMoney(1234)).toMatch(/1\.234\s€/);
    expect(fmtMoney(12.5)).toMatch(/12,50\s€/);
    expect(fmtMoney(3_400_000)).toBe('3,4 Mio. €');
    expect(fmtMoney(20, { sign: true })).toMatch(/^\+20\s€/);
  });

  it('formats durations', () => {
    expect(fmtDuration(45_000)).toBe('45 Sek');
    expect(fmtDuration(5 * 60_000)).toBe('5 Min');
    expect(fmtDuration(80 * 60_000)).toBe('1 Std 20 Min');
  });
});
