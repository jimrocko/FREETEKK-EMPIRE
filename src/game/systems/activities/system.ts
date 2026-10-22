import type { GameSystem } from '../../core/simulation';
import { ACTIVITY_HANDLERS } from './handlers';

export const activitiesSystem: GameSystem = {
  id: 'activities',
  nextDue(s) {
    let next: number | null = null;
    for (const a of s.activities.running) if (next === null || a.endsAt < next) next = a.endsAt;
    return next;
  },
  process(d) {
    const now = d.clock.now;
    // Complete in chronological order; handlers may start new activities.
    const due = d.activities.running.filter((a) => a.endsAt <= now).sort((a, b) => a.endsAt - b.endsAt || a.id.localeCompare(b.id));
    for (const a of due) {
      const idx = d.activities.running.findIndex((x) => x.id === a.id);
      if (idx < 0) continue;
      const [activity] = d.activities.running.splice(idx, 1);
      const handler = ACTIVITY_HANDLERS[activity.kind];
      handler?.complete(d, activity);
    }
  },
};
