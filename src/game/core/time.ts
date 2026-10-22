/**
 * Time model.
 *
 * - Real time (ms timestamps) drives every timer.
 * - Game time is derived from real time: 1 real minute = 1 game hour,
 *   so a game day lasts 24 real minutes and a game week 2.8 real hours.
 */

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;

/** Real milliseconds per game hour. */
export const GAME_HOUR_MS = MINUTE;
export const GAME_DAY_MS = 24 * GAME_HOUR_MS;
export const GAME_WEEK_MS = 7 * GAME_DAY_MS;

/** The game starts on day 1 (a Monday) at this hour. */
export const GAME_START_HOUR = 10;

export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const;
export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

export interface ClockState {
  /** Simulated real time (ms). Never moves backwards. */
  now: number;
  /** Real time of game day 1, 00:00. */
  origin: number;
  /** Last game day whose day-start hooks have been processed. */
  lastDay: number;
}

export function createClock(now: number): ClockState {
  const origin = now - GAME_START_HOUR * GAME_HOUR_MS;
  return { now, origin, lastDay: 1 };
}

/** Game day number (1-based) at the given real time. */
export function gameDayAt(clock: Pick<ClockState, 'origin'>, at: number): number {
  return Math.floor((at - clock.origin) / GAME_DAY_MS) + 1;
}

/** Real time at which the given game day starts (00:00). */
export function dayStartAt(clock: Pick<ClockState, 'origin'>, day: number): number {
  return clock.origin + (day - 1) * GAME_DAY_MS;
}

/** 0 = Monday … 6 = Sunday */
export function weekdayOf(day: number): number {
  return (((day - 1) % 7) + 7) % 7;
}

export function weekOf(day: number): number {
  return Math.floor((day - 1) / 7) + 1;
}

export interface GameTimeInfo {
  day: number;
  week: number;
  weekday: number;
  weekdayName: string;
  weekdayShort: string;
  hour: number;
  minute: number;
  /** 22:00–06:00 */
  isNight: boolean;
}

export function gameTimeAt(clock: Pick<ClockState, 'origin'>, at: number): GameTimeInfo {
  const day = gameDayAt(clock, at);
  const into = at - dayStartAt(clock, day);
  const hoursFloat = into / GAME_HOUR_MS;
  const hour = Math.floor(hoursFloat);
  const minute = Math.floor((hoursFloat - hour) * 60);
  const weekday = weekdayOf(day);
  return {
    day,
    week: weekOf(day),
    weekday,
    weekdayName: WEEKDAYS[weekday],
    weekdayShort: WEEKDAYS_SHORT[weekday],
    hour,
    minute,
    isNight: hour >= 22 || hour < 6,
  };
}

export function formatGameClock(info: GameTimeInfo): string {
  return `${info.weekdayShort} ${String(info.hour).padStart(2, '0')}:${String(info.minute).padStart(2, '0')}`;
}

/** Converts a duration in game hours to real milliseconds. */
export function gameHours(h: number): number {
  return h * GAME_HOUR_MS;
}

export function minutes(m: number): number {
  return m * MINUTE;
}
