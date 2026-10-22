import type { GameSystem } from '../../core/simulation';
import { finishEvent, startEvent } from './run';

export const eventsSystem: GameSystem = {
  id: 'events',
  nextDue(s) {
    let next: number | null = null;
    for (const e of s.events.list) {
      const t = e.status === 'scheduled' ? e.startsAt : e.status === 'running' ? (e.endsAt ?? e.startsAt) : null;
      if (t !== null && (next === null || t < next)) next = t;
    }
    return next;
  },
  process(d) {
    const now = d.clock.now;
    for (const e of d.events.list) {
      if (e.status === 'scheduled' && e.startsAt <= now) {
        // Tasks still running when the night starts are dropped.
        d.activities.running = d.activities.running.filter((a) => !(a.kind === 'event-task' && a.payload.eventId === e.id));
        for (const [k, v] of Object.entries(e.tasks)) if (v === 'running') e.tasks[k] = 'open';
        startEvent(d, e);
      }
      if (e.status === 'running' && (e.endsAt ?? 0) <= now) finishEvent(d, e);
    }
  },
};
