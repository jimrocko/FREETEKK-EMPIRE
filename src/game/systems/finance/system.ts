import type { GameSystem } from '../../core/simulation';
import { checkAll } from '../../core/conditions';
import { RECURRING_COSTS } from '../../content/recurring';
import { chargeDailyCosts, flushPassive, type CostLine } from './logic';

export const financeSystem: GameSystem = {
  id: 'finance',
  dailyCosts(s) {
    const lines: CostLine[] = [];
    for (const def of RECURRING_COSTS) {
      if (def.requires && !checkAll(s, def.requires)) continue;
      lines.push({ id: def.id, label: def.label, perDay: def.perDay, category: def.category });
    }
    return lines;
  },
  onNewDay(d, _day, ctx) {
    flushPassive(d);
    if (d.clock.now > ctx.economyUntil) return;
    const lines: CostLine[] = [];
    for (const sys of ctx.systems) if (sys.dailyCosts) lines.push(...sys.dailyCosts(d));
    chargeDailyCosts(d, lines);
  },
};
