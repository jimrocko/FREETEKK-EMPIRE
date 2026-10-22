import { defineAction } from '../../core/actions';
import { ACTIVITY_HANDLERS } from './handlers';
import { findActivity, removeActivity } from './logic';

export const cancelActivity = defineAction<{ id: string }>({
  id: 'activities.cancel',
  check: (s, p) => {
    const a = findActivity(s, p.id);
    if (!a) return 'Aktivität läuft nicht mehr.';
    if (!ACTIVITY_HANDLERS[a.kind]?.cancelLabel) return 'Kann nicht abgebrochen werden.';
    return null;
  },
  run: (d, p) => {
    const a = removeActivity(d, p.id)!;
    ACTIVITY_HANDLERS[a.kind]?.cancel?.(d, a);
    return `Abgebrochen: ${a.label}`;
  },
});
