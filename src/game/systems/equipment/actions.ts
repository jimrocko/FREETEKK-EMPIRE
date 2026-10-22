import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { fmtMoney } from '../../core/format';
import { itemDef, personDef, PERSONS_BY_ID } from '../../content/registry';
import { startActivity } from '../activities/logic';
import { moneyReason, spend } from '../finance/logic';
import { getItem } from '../inventory/logic';
import { shortName } from '../people/logic';
import { proRepairCost, proRepairMinutes, repairBaseReason, repairContacts, repairParts, selfRepairMinutes, selfRepairReason, selfRepairTarget } from './logic';

export const repairSelf = defineAction<{ uid: string }>({
  id: 'equipment.repairSelf',
  check: (s, p) => selfRepairReason(s, p.uid),
  run: (d, p) => {
    const it = getItem(d, p.uid)!;
    const def = itemDef(it.defId);
    const cost = repairParts(it);
    spend(d, cost, 'equipment', `Ersatzteile: ${def.name}`);
    const a = startActivity(d, {
      kind: 'repair',
      channel: 'workshop',
      label: `Reparatur: ${def.name}`,
      durationMs: minutes(selfRepairMinutes(it)),
      payload: { uid: it.uid, target: selfRepairTarget(d, it), mode: 'self' },
    });
    it.locked = `repair:${a.id}`;
    return `Du schraubst an ${def.name} (${fmtMoney(cost)} Teile).`;
  },
});

export const repairPro = defineAction<{ uid: string; personId: string }>({
  id: 'equipment.repairPro',
  check: (s, p) => {
    const base = repairBaseReason(s, p.uid);
    if (base) return base;
    if (!PERSONS_BY_ID.has(p.personId) || !repairContacts(s).some((x) => x.id === p.personId)) return 'Kein Techniker-Kontakt mit genug Vertrauen (20).';
    const it = getItem(s, p.uid)!;
    return moneyReason(s, proRepairCost(it, personDef(p.personId), s));
  },
  run: (d, p) => {
    const it = getItem(d, p.uid)!;
    const def = itemDef(it.defId);
    const person = personDef(p.personId);
    const cost = proRepairCost(it, person, d);
    spend(d, cost, 'equipment', `Reparatur bei ${shortName(person)}: ${def.name}`);
    const a = startActivity(d, {
      kind: 'repair',
      channel: 'workshop',
      label: `Bei ${shortName(person)}: ${def.name}`,
      durationMs: minutes(proRepairMinutes(it)),
      payload: { uid: it.uid, target: 95, mode: 'pro', personId: person.id },
    });
    it.locked = `repair:${a.id}`;
    return `${shortName(person)} kümmert sich um ${def.name}.`;
  },
});
