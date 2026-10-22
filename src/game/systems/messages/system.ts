import type { GameSystem } from '../../core/simulation';
import { randRange } from '../../core/rng';
import { deliverTemplate, expireMessages, rollMessage } from './logic';

const MIN_GAP = 5 * 60_000;
const MAX_GAP = 12 * 60_000;

export const messagesSystem: GameSystem = {
  id: 'messages',
  nextDue(s) {
    let next = s.messages.nextRollAt;
    for (const q of s.messages.queue) if (q.deliverAt < next) next = q.deliverAt;
    for (const m of s.messages.list) if (m.open && m.expiresAt !== undefined && m.expiresAt < next) next = m.expiresAt;
    return next;
  },
  process(d, ctx) {
    const now = d.clock.now;
    const due = d.messages.queue.filter((q) => q.deliverAt <= now).sort((a, b) => a.deliverAt - b.deliverAt);
    if (due.length > 0) {
      d.messages.queue = d.messages.queue.filter((q) => q.deliverAt > now);
      for (const q of due) deliverTemplate(d, q.templateId, q.from, { online: !ctx.offline });
    }
    expireMessages(d);
    if (d.messages.nextRollAt <= now) {
      // People only write spontaneously while you are around.
      if (!ctx.offline) rollMessage(d);
      d.messages.nextRollAt = now + randRange(d, MIN_GAP, MAX_GAP);
    }
  },
};
