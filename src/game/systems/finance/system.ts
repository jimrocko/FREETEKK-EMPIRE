import type { GameSystem } from '../../core/simulation';
import { checkAll } from '../../core/conditions';
import { RECURRING_COSTS } from '../../content/recurring';
import { BANK_INTEREST_PER_DAY } from '../../content/finance';
import { notify } from '../../core/notify';
import { chargeDailyCosts, creditBank, flushPassive, type CostLine } from './logic';

export const financeSystem: GameSystem = {
  id: 'finance',
  dailyCosts(s) {
    const lines: CostLine[] = [];
    for (const def of RECURRING_COSTS) {
      if (def.requires && !checkAll(s, def.requires)) continue;
      lines.push({ id: def.id, label: def.label, perDay: def.perDay, category: def.category });
    }
    for (const loan of s.finance.loans) {
      lines.push({ id: `loan:${loan.id}`, label: `Kreditrate: ${loan.label}`, perDay: Math.min(loan.perDay, loan.remaining), category: 'other' });
    }
    return lines;
  },
  onNewDay(d, _day, ctx) {
    flushPassive(d);
    if (d.clock.now > ctx.economyUntil) return;
    const lines: CostLine[] = [];
    for (const sys of ctx.systems) if (sys.dailyCosts) lines.push(...sys.dailyCosts(d));
    // Fixed costs are debited from the account first when cash runs short.
    const due = lines.reduce((sum, l) => sum + Math.max(0, l.perDay), 0);
    if (d.finance.cash < due && d.finance.bank > 0) {
      const move = Math.min(d.finance.bank, due - Math.max(0, d.finance.cash));
      d.finance.bank = Math.round((d.finance.bank - move) * 100) / 100;
      d.finance.cash = Math.round((d.finance.cash + move) * 100) / 100;
    }
    chargeDailyCosts(d, lines);
    // Loans: the rate was charged above – reduce what is left.
    for (const loan of [...d.finance.loans]) {
      loan.remaining = Math.max(0, Math.round((loan.remaining - Math.min(loan.perDay, loan.remaining)) * 100) / 100);
      if (loan.remaining <= 0) {
        d.finance.loans = d.finance.loans.filter((l) => l.id !== loan.id);
        notify(d, { tone: 'success', title: 'Kredit abbezahlt', text: loan.label, link: '/finanzen' });
      }
    }
    if (d.finance.bank > 0) creditBank(d, d.finance.bank * BANK_INTEREST_PER_DAY, 'Zinsen');
  },
};
