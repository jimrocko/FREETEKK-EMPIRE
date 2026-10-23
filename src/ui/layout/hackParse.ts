import { GAME_DAY_MS, MINUTE } from '../../game/core/time';

/** "10000", "10.000", "10k", "2,5m", "1mio" → number (NaN if unreadable). */
export function parseAmount(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback;
  const m = raw
    .toLowerCase()
    .replace(/€/g, '')
    .match(/^(-?[\d.,]+)\s*(k|m|mio)?$/);
  if (!m) return NaN;
  const [, num, unit] = m;
  // "10.000" is a thousands separator, "2,5" a decimal comma.
  const value = Number(num.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return value * (unit === 'k' ? 1000 : unit ? 1_000_000 : 1);
}

/** "8h", "2d", "1w", "30min" in game time → real ms (1 game hour = 1 real minute). */
export function parseDuration(raw: string | undefined): number {
  const m = (raw ?? '1h').toLowerCase().match(/^(\d+(?:[.,]\d+)?)\s*(min|m|h|std|d|t|w)?$/);
  if (!m) return NaN;
  const n = Number(m[1].replace(',', '.'));
  switch (m[2]) {
    case 'min':
    case 'm':
      return (n * MINUTE) / 60;
    case 'd':
    case 't':
      return n * GAME_DAY_MS;
    case 'w':
      return n * 7 * GAME_DAY_MS;
    default:
      return n * MINUTE;
  }
}
