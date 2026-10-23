import { defineAction } from '../../core/actions';
import { HAPPENINGS } from '../../content/happenings';
import { answerHappening, fireHappening, happeningChoiceReason, pickTarget, rollHappening } from './logic';

export const answerEvent = defineAction<{ id: string; choiceId: string }>({
  id: 'happenings.answer',
  check: (s, p) => happeningChoiceReason(s, p.id, p.choiceId),
  run: (d, p) => answerHappening(d, p.id, p.choiceId) ?? 'Erledigt.',
});

/** Developer panel: trigger a random event right now. */
export const debugHappening = defineAction<{ id?: string }>({
  id: 'happenings.debug',
  check: () => null,
  run: (d, p) => {
    const h = p.id ? HAPPENINGS.find((x) => x.id === p.id) : undefined;
    if (!h) return rollHappening(d) ? 'Ereignis ausgelöst.' : 'Kein Ereignis passt gerade.';
    const ctx = pickTarget(d, h.target);
    if (!ctx) return 'Dafür fehlt gerade das Ziel.';
    fireHappening(d, h, ctx);
    return `Ereignis: ${h.title}`;
  },
});
