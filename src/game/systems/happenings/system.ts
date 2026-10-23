import type { GameSystem } from '../../core/simulation';
import { randRange } from '../../core/rng';
import { expireHappenings, rollHappening } from './logic';

const MIN_GAP = 14 * 60_000;
const MAX_GAP = 32 * 60_000;

export const happeningsSystem: GameSystem = {
  id: 'happenings',
  nextDue(s) {
    let next = s.happenings.nextRollAt;
    for (const o of s.happenings.open) if (o.expiresAt !== undefined && o.expiresAt < next) next = o.expiresAt;
    return next;
  },
  process(d, ctx) {
    expireHappenings(d);
    const now = d.clock.now;
    if (d.happenings.nextRollAt <= now) {
      // Things only happen to you while you are around to react.
      if (!ctx.offline) rollHappening(d);
      d.happenings.nextRollAt = now + randRange(d, MIN_GAP, MAX_GAP);
    }
    d.happenings.modifiers = d.happenings.modifiers.filter((m) => m.until > now);
  },
};
