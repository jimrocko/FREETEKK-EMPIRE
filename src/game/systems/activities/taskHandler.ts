import type { ActivityHandler } from './handler';
import type { Effect } from '../../core/types';
import { applyEffects, describeEffects } from '../../core/effects';
import { notify } from '../../core/notify';

/** Generic timed task created by effects (e.g. a gig accepted via message). */
export const taskHandler: ActivityHandler = {
  cancelLabel: 'Abbrechen',
  complete(d, a) {
    const effects = JSON.parse(String(a.payload.effects ?? '[]')) as Effect[];
    applyEffects(d, effects);
    const text = describeEffects(effects);
    notify(d, { tone: 'success', title: `Erledigt: ${a.label}`, text: text || undefined });
  },
};
