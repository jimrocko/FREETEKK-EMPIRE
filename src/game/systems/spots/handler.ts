import type { ActivityHandler } from '../activities/handler';
import { spotDef } from '../../content/registry';
import { fmtNumber } from '../../core/format';
import { notify } from '../../core/notify';
import { addXp, incStat } from '../progression/logic';
import { effectiveStats } from './logic';

export const spotCheckHandler: ActivityHandler = {
  cancelLabel: 'Check abbrechen',
  complete(d, a) {
    const def = spotDef(String(a.payload.spotId));
    const st = d.spots.spots[def.id];
    if (!st) return;
    st.intel = 100;
    st.lastCheckedAt = d.clock.now;
    incStat(d, 'spotChecks');
    addXp(d, 'technik', 4);
    addXp(d, 'organisation', 3);
    const stats = effectiveStats(d, def.id);
    const notes = [
      `${fmtNumber(stats.capacity)} Leute`,
      stats.powerKw > 0 ? `${stats.powerKw} kW Strom` : 'kein Strom',
      `Zustand ${Math.round(st.condition)} %`,
    ];
    if (st.status === 'closed') notes.push('derzeit abgesperrt');
    notify(d, { tone: 'success', title: `Spot gecheckt: ${def.name}`, text: notes.join(' · '), link: `/karte/spot/${def.id}` });
  },
};
