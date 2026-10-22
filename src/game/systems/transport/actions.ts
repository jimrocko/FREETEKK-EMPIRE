import { defineAction } from '../../core/actions';
import { GAME_DAY_MS } from '../../core/time';
import { fmtMoney } from '../../core/format';
import { RENTAL_OPTIONS } from '../../content/vehicles';
import { requirementReason } from '../../core/conditions';
import { moneyReason, spend } from '../finance/logic';
import { incStat } from '../progression/logic';

export const rentVehicle = defineAction<{ optionId: string }>({
  id: 'transport.rent',
  check: (s, p) => {
    const opt = RENTAL_OPTIONS.find((o) => o.id === p.optionId);
    if (!opt) return 'Unbekanntes Angebot.';
    if (s.transport.rentals.length >= 3) return 'Mehr als drei Mietwagen gleichzeitig gibt dir keiner.';
    return requirementReason(s, opt.requires) ?? moneyReason(s, opt.perDay);
  },
  run: (d, p) => {
    const opt = RENTAL_OPTIONS.find((o) => o.id === p.optionId)!;
    spend(d, opt.perDay, 'vehicle', opt.label);
    d.transport.rentals.push({ id: `r${d.transport.nextId++}`, optionId: opt.id, defId: opt.defId, until: d.clock.now + GAME_DAY_MS });
    incStat(d, 'rentals');
    return `${opt.label}: ${fmtMoney(opt.perDay)} für einen Tag.`;
  },
});
