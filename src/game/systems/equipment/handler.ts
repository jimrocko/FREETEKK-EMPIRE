import type { ActivityHandler } from '../activities/handler';
import { itemDef } from '../../content/registry';
import { notify } from '../../core/notify';
import { addXp, incStat } from '../progression/logic';
import { getItem } from '../inventory/logic';
import { adjustTrust } from '../people/logic';

export const repairHandler: ActivityHandler = {
  cancelLabel: 'Reparatur abbrechen',
  complete(d, a) {
    const it = getItem(d, String(a.payload.uid));
    if (!it) return;
    const def = itemDef(it.defId);
    if (it.locked === `repair:${a.id}`) delete it.locked;
    it.condition = Math.max(it.condition, Number(a.payload.target));
    it.broken = false;
    incStat(d, 'repairs');
    if (a.payload.mode === 'self') addXp(d, 'technik', 6 + def.tier * 3);
    else adjustTrust(d, String(a.payload.personId), 2);
    notify(d, { tone: 'success', title: `Repariert: ${def.name}`, text: `Zustand jetzt ${Math.round(it.condition)} %.`, link: '/inventar' });
  },
  cancel(d, a) {
    const it = getItem(d, String(a.payload.uid));
    if (it && it.locked === `repair:${a.id}`) delete it.locked;
  },
};
