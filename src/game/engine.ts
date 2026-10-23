import type { GameState } from './state';
import type { SceneNews } from './systems/rivals/state';
import type { ActionDef, ActionResult } from './core/actions';
import type { Reason } from './core/types';
import type { FeedEntry } from './core/notify';
import { HOUR, MINUTE, gameDayAt } from './core/time';
import { advanceTo, runAfterUpdate, type AdvanceOptions } from './core/simulation';
import { SYSTEMS } from './systems';

/** Absences shorter than this are simulated silently. */
export const OFFLINE_REPORT_THRESHOLD = MINUTE;
/** Passive income and running costs count for at most this long while away. */
export const BASE_OFFLINE_CAP = 12 * HOUR;

export function tick(d: GameState, now: number, opts?: AdvanceOptions): void {
  advanceTo(d, now, SYSTEMS, opts);
}

export function checkAction<P>(s: GameState, action: ActionDef<P>, payload: P): Reason {
  return action.check(s, payload);
}

/** Brings the simulation to `now`, then validates and runs the action. */
export function performAction<P>(d: GameState, action: ActionDef<P>, payload: P, now: number): ActionResult {
  advanceTo(d, now, SYSTEMS);
  const reason = action.check(d, payload);
  if (reason) return { ok: false, reason };
  const message = action.run(d, payload);
  runAfterUpdate(d, { systems: SYSTEMS, economyUntil: Number.POSITIVE_INFINITY, offline: false });
  return message ? { ok: true, message } : { ok: true };
}

export function offlineCapMs(s: GameState): number {
  return BASE_OFFLINE_CAP + (s.progression.flags.offlineCapBonusH ?? 0) * HOUR;
}

export interface CatchUpReport {
  from: number;
  to: number;
  awayMs: number;
  /** Portion of the absence in which the economy ran. */
  economyMs: number;
  cashBefore: number;
  cashAfter: number;
  daysPassed: number;
  /** Feed entries created while away. */
  entries: FeedEntry[];
  /** What the other crews did meanwhile (newest last). */
  scene: SceneNews[];
}

/**
 * Simulates the time since the game was last open. Returns a report when the
 * absence was long enough to be worth showing.
 */
export function catchUp(d: GameState, now: number): CatchUpReport | null {
  const from = d.clock.now;
  const away = now - from;
  if (away < OFFLINE_REPORT_THRESHOLD) {
    tick(d, now);
    return null;
  }
  const cap = offlineCapMs(d);
  const cashBefore = d.finance.cash;
  const firstId = d.notifications.nextId;
  const firstNews = d.rivals.nextId;
  const dayBefore = gameDayAt(d.clock, from);
  advanceTo(d, now, SYSTEMS, { economyUntil: from + cap, offline: true });
  return {
    from,
    to: now,
    awayMs: away,
    economyMs: Math.min(away, cap),
    cashBefore,
    cashAfter: d.finance.cash,
    daysPassed: gameDayAt(d.clock, now) - dayBefore,
    entries: d.notifications.feed.filter((e) => e.id >= firstId),
    scene: d.rivals.news.filter((n) => n.id >= firstNews),
  };
}
