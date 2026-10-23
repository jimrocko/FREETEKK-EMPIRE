import type { ActivityHandler } from '../activities/handler';
import { personDef, rivalDef } from '../../content/registry';
import { notify } from '../../core/notify';
import { chance } from '../../core/rng';
import { addRep, addXp, incStat } from '../progression/logic';
import { meetPerson, meetSomeone, shortName } from '../people/logic';
import { revealSpot } from '../map/logic';
import { earn } from '../finance/logic';
import { VISIT_COST } from './actions';
import { adjustRivalRelation } from './logic';

export const rivalVisitHandler: ActivityHandler = {
  cancelLabel: 'Doch nicht hingehen',
  cancel(d, a) {
    earn(d, VISIT_COST, 'network', `Eintritt zurück: ${rivalDef(String(a.payload.crewId)).name}`);
  },
  complete(d, a) {
    const def = rivalDef(String(a.payload.crewId));
    const ev = d.rivals.events.find((e) => e.id === a.payload.eventId);
    const parts: string[] = [];
    addXp(d, 'netzwerk', 15);
    addRep(d, 1);
    adjustRivalRelation(d, def.id, 4);
    incStat(d, 'rivalPartiesVisited');
    if (meetPerson(d, def.leaderId, 'rival', { trust: 10, silent: true })) parts.push(`${shortName(personDef(def.leaderId))} kennengelernt`);
    if (ev && !d.spots.spots[ev.spotId]?.known && revealSpot(d, ev.spotId, 'rival', 40, { silent: true })) parts.push('neuer Spot');
    if (chance(d, 0.5)) {
      const met = meetSomeone(d);
      if (met) parts.push(`${shortName(personDef(met))} kennengelernt`);
    }
    notify(d, {
      tone: 'success',
      title: `Bei ${def.name} gefeiert`,
      text: parts.length > 0 ? parts.join(' · ') : 'Gute Musik, neue Gesichter, ein paar Ideen.',
      link: `/szene/crew/${def.id}`,
    });
  },
};
