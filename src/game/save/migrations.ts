import { GOALS } from '../content/goals';
import { REP_TIERS } from '../content/reputation';
import { GOAL_POINTS, TIER_POINTS } from '../content/unlocks';

/**
 * Save migrations. `MIGRATIONS[n]` upgrades raw save data from version n to n + 1.
 * Missing slices/fields are filled in afterwards by `hydrate`, so a migration is
 * only needed when existing data changes meaning or shape.
 */
type RawState = any;

export const MIGRATIONS: Record<number, (data: RawState) => RawState> = {
  // v2: Szenepunkte – earlier goals and status tiers pay out retroactively.
  1: (data) => {
    const done: Record<string, number> = data?.goals?.done ?? {};
    let points = 0;
    for (const g of GOALS) if (done[g.id] !== undefined) points += GOAL_POINTS[g.size];
    const rep = Number(data?.progression?.reputation ?? 0);
    points += REP_TIERS.filter((t) => t.min > 0 && rep >= t.min).length * TIER_POINTS;
    if (data?.progression) {
      data.progression.points = points;
      data.progression.pointsTotal = points;
    }
    return data;
  },
};

export function migrate(data: RawState, fromVersion: number, toVersion: number): RawState {
  let current = data;
  for (let v = fromVersion; v < toVersion; v++) {
    const step = MIGRATIONS[v];
    if (step) current = step(current);
    if (current?.meta) current.meta.version = v + 1;
  }
  return current;
}
