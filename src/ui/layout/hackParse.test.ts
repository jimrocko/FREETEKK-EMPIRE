import { describe, expect, it } from 'vitest';
import { GAME_DAY_MS, MINUTE } from '../../game/core/time';
import { parseAmount, parseDuration } from './hackParse';

describe('hack menu parsing', () => {
  it('reads amounts the way people type them', () => {
    expect(parseAmount(undefined, 10000)).toBe(10000);
    expect(parseAmount('2500', 0)).toBe(2500);
    expect(parseAmount('10.000', 0)).toBe(10000);
    expect(parseAmount('1.000.000', 0)).toBe(1_000_000);
    expect(parseAmount('50k', 0)).toBe(50000);
    expect(parseAmount('2,5m', 0)).toBe(2_500_000);
    expect(parseAmount('1mio', 0)).toBe(1_000_000);
    expect(parseAmount('500€', 0)).toBe(500);
    expect(parseAmount('viel', 0)).toBeNaN();
  });

  it('reads durations in game time', () => {
    expect(parseDuration(undefined)).toBe(MINUTE);
    expect(parseDuration('8h')).toBe(8 * MINUTE);
    expect(parseDuration('2d')).toBe(2 * GAME_DAY_MS);
    expect(parseDuration('1w')).toBe(7 * GAME_DAY_MS);
    expect(parseDuration('30min')).toBe(MINUTE / 2);
    expect(parseDuration('bald')).toBeNaN();
  });
});
