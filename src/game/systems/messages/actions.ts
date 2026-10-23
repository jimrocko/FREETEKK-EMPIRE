import { defineAction } from '../../core/actions';
import { answerMessage, choiceReason, findMessage } from './logic';

export const answer = defineAction<{ messageId: string; choiceId: string }>({
  id: 'messages.answer',
  check: (s, p) => {
    const msg = findMessage(s, p.messageId);
    if (!msg) return 'Nachricht nicht gefunden.';
    return choiceReason(s, msg, p.choiceId);
  },
  run: (d, p) => {
    answerMessage(d, p.messageId, p.choiceId);
  },
});

/** Debug helper: makes the next spontaneous message due now. */
export const debugNextMessage = defineAction<Record<string, never>>({
  id: 'messages.debugNext',
  check: () => null,
  run: (d) => {
    d.messages.nextRollAt = d.clock.now;
  },
});

export const markThreadRead = defineAction<{ personId: string }>({
  id: 'messages.markRead',
  check: () => null,
  run: (d, p) => {
    for (const m of d.messages.list) if (m.from === p.personId && !m.read) m.read = true;
  },
});
