import type { ActivityHandler } from '../activities/handler';
import { notify } from '../../core/notify';
import { addXp } from '../progression/logic';
import { findEvent, taskDef } from './plan';

export const eventTaskHandler: ActivityHandler = {
  cancelLabel: 'Aufgabe abbrechen',
  complete(d, a) {
    const ev = findEvent(d, String(a.payload.eventId));
    const taskId = String(a.payload.taskId);
    if (!ev || ev.status !== 'scheduled') return;
    ev.tasks[taskId] = 'done';
    if (taskId === 'task.check') {
      const st = d.spots.spots[ev.spotId];
      if (st) {
        st.intel = 100;
        st.lastCheckedAt = d.clock.now;
      }
    }
    addXp(d, 'organisation', 5);
    notify(d, { tone: 'success', title: `${taskDef(taskId).label} erledigt`, text: ev.name, link: '/events' });
  },
  cancel(d, a) {
    const ev = findEvent(d, String(a.payload.eventId));
    const taskId = String(a.payload.taskId);
    if (ev && ev.tasks[taskId] === 'running') ev.tasks[taskId] = 'open';
  },
};
