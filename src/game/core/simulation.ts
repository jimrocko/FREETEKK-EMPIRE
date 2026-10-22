import type { GameState } from '../state';
import { GAME_DAY_MS, dayStartAt } from './time';
import { applyRates, type CostLine, type RateLine } from '../systems/finance/logic';

/** Context passed to system hooks while time advances. */
export interface SimContext {
  systems: readonly GameSystem[];
  /** Economy (passive income, running costs) only runs up to this time. */
  economyUntil: number;
  /** True while catching up after the game was closed. */
  offline: boolean;
}

/**
 * A system plugs into the simulation through these optional hooks.
 * All hooks must be deterministic: no Math.random, no Date.now.
 */
export interface GameSystem {
  id: string;
  /** Next real time at which `process` must run (or null). */
  nextDue?(s: GameState): number | null;
  /** Handles work due at `d.clock.now`. Must move `nextDue` forward. */
  process?(d: GameState, ctx: SimContext): void;
  /** Called once at the start of every game day. */
  onNewDay?(d: GameState, day: number, ctx: SimContext): void;
  /** Passive income (+) or costs (−) per real hour. */
  rates?(s: GameState): RateLine[];
  /** Fixed costs per game day. */
  dailyCosts?(s: GameState): CostLine[];
  /** Called after every update (tick or action), e.g. to check goals. */
  afterUpdate?(d: GameState, ctx: SimContext): void;
}

export interface AdvanceOptions {
  economyUntil?: number;
  offline?: boolean;
}

/** Day-start hooks older than this many days before the target are skipped. */
export const MAX_PROCESSED_DAYS = 400;
const MAX_STEPS = 500_000;

function collectRates(s: GameState, systems: readonly GameSystem[]): RateLine[] {
  const lines: RateLine[] = [];
  for (const sys of systems) if (sys.rates) lines.push(...sys.rates(s));
  return lines;
}

function integrate(d: GameState, from: number, to: number, ctx: SimContext): void {
  const end = Math.min(to, ctx.economyUntil);
  if (end <= from) return;
  const lines = collectRates(d, ctx.systems);
  if (lines.length > 0) applyRates(d, lines, end - from);
}

export function runAfterUpdate(d: GameState, ctx: SimContext): void {
  for (const sys of ctx.systems) sys.afterUpdate?.(d, ctx);
}

/**
 * Moves the simulation forward to `target`, event by event.
 * Online ticks and offline catch-up both use this function, so the result is
 * the same no matter how many steps are used to get there.
 */
export function advanceTo(d: GameState, target: number, systems: readonly GameSystem[], opts: AdvanceOptions = {}): void {
  const ctx: SimContext = {
    systems,
    economyUntil: opts.economyUntil ?? Number.POSITIVE_INFINITY,
    offline: opts.offline ?? false,
  };
  if (!(target > d.clock.now)) {
    runAfterUpdate(d, ctx);
    return;
  }
  const skipDaysBefore = target - MAX_PROCESSED_DAYS * GAME_DAY_MS;

  for (let step = 0; step < MAX_STEPS; step++) {
    const now = d.clock.now;
    let next = Math.min(target, dayStartAt(d.clock, d.clock.lastDay + 1));
    for (const sys of systems) {
      const due = sys.nextDue?.(d);
      if (due != null && due < next) next = Math.max(due, now);
    }

    integrate(d, now, next, ctx);
    d.clock.now = next;

    let processed = false;
    for (const sys of systems) {
      if (!sys.process) continue;
      const due = sys.nextDue?.(d);
      if (due != null && due <= next) {
        sys.process(d, ctx);
        processed = true;
      }
    }

    while (dayStartAt(d.clock, d.clock.lastDay + 1) <= d.clock.now) {
      const day = d.clock.lastDay + 1;
      d.clock.lastDay = day;
      if (dayStartAt(d.clock, day) < skipDaysBefore) continue;
      for (const sys of systems) sys.onNewDay?.(d, day, ctx);
      processed = true;
    }

    // Reactions (e.g. goals) happen at the moment of the event, which keeps
    // results independent of how the time span is split into ticks.
    if (processed) runAfterUpdate(d, ctx);
    if (next >= target) break;
  }

  if (d.clock.now < target) d.clock.now = target;
  runAfterUpdate(d, ctx);
}
