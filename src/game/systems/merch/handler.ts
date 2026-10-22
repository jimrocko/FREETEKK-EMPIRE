import type { ActivityHandler } from '../activities/handler';
import { notify } from '../../core/notify';
import { randInt } from '../../core/rng';
import { addXp, hasFlag, incStat, skillLevel } from '../progression/logic';
import { activeMembers } from '../crew/logic';

export const designHandler: ActivityHandler = {
  cancelLabel: 'Entwurf verwerfen',
  complete(d, a) {
    const bonus = (hasFlag(d, 'crewLogo') ? 10 : 0) + (activeMembers(d, 'designer').length > 0 ? 12 : 0);
    const quality = Math.max(10, Math.min(95, 25 + skillLevel(d, 'business') * 6 + bonus + randInt(d, -8, 8)));
    d.merch.designs.push({ id: `d${d.merch.nextId++}`, name: String(a.payload.name), motif: String(a.payload.motif), quality, createdAt: d.clock.now, by: 'self' });
    addXp(d, 'business', 12);
    incStat(d, 'designs');
    notify(d, { tone: 'success', title: `Design fertig: ${a.payload.name}`, text: `Qualität ${quality}`, link: '/merch' });
  },
};
