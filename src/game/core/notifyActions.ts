import { defineAction } from './actions';

export const markFeedRead = defineAction<Record<string, never>>({
  id: 'notifications.markRead',
  check: () => null,
  run: (d) => {
    d.notifications.lastReadId = d.notifications.nextId - 1;
  },
});
