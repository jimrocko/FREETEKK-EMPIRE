import type { GameSystem } from '../../core/simulation';
import type { CostLine } from '../finance/logic';
import { personDef } from '../../content/registry';
import { notify } from '../../core/notify';
import { adjustRelation, shortName } from '../people/logic';

export const crewSystem: GameSystem = {
  id: 'crew',
  dailyCosts(s) {
    const total = s.crew.members.reduce((sum, m) => sum + m.wagePerDay, 0);
    const lines: CostLine[] = [];
    if (total > 0) lines.push({ id: 'crew.wages', label: 'Crew-Gagen', perDay: total, category: 'crew' });
    return lines;
  },
  onNewDay(d, _day, ctx) {
    if (d.clock.now > ctx.economyUntil) return;
    const broke = d.finance.cash < 0;
    for (const m of [...d.crew.members]) {
      const trust = d.people.people[m.personId]?.trust ?? 0;
      if (broke) m.morale -= 8;
      else {
        const target = 40 + trust / 2;
        m.morale += m.morale < target ? 1 : m.morale > target ? -0.5 : 0;
      }
      m.morale = Math.max(0, Math.min(100, m.morale));
      if (m.morale < 15) {
        d.crew.members = d.crew.members.filter((x) => x.personId !== m.personId);
        adjustRelation(d, m.personId, -10);
        const p = personDef(m.personId);
        notify(d, { tone: 'danger', title: `${shortName(p)} hat die Crew verlassen`, text: 'Keine Gage, keine Stimmung, keine Lust mehr.', link: '/crew' });
      }
    }
  },
};
