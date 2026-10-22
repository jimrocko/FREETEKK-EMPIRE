import { defineAction } from '../../core/actions';
import { fmtMoney, roundMoney } from '../../core/format';
import { LOAN_OFFERS } from '../../content/finance';
import { requirementReason } from '../../core/conditions';
import { moneyReason, receiveLoan, spend } from './logic';
import { incStat } from '../progression/logic';

export const deposit = defineAction<{ amount: number }>({
  id: 'finance.deposit',
  check: (s, p) => {
    if (!(p.amount > 0)) return 'Betrag eingeben.';
    return s.finance.cash < p.amount ? 'So viel Bargeld hast du nicht.' : null;
  },
  run: (d, p) => {
    d.finance.cash = roundMoney(d.finance.cash - p.amount);
    d.finance.bank = roundMoney(d.finance.bank + p.amount);
    incStat(d, 'deposits');
    return `${fmtMoney(p.amount)} aufs Konto eingezahlt.`;
  },
});

export const withdraw = defineAction<{ amount: number }>({
  id: 'finance.withdraw',
  check: (s, p) => {
    if (!(p.amount > 0)) return 'Betrag eingeben.';
    return s.finance.bank < p.amount ? 'So viel ist nicht auf dem Konto.' : null;
  },
  run: (d, p) => {
    d.finance.bank = roundMoney(d.finance.bank - p.amount);
    d.finance.cash = roundMoney(d.finance.cash + p.amount);
    return `${fmtMoney(p.amount)} abgehoben.`;
  },
});

export const takeLoan = defineAction<{ offerId: string }>({
  id: 'finance.loan',
  check: (s, p) => {
    const offer = LOAN_OFFERS.find((o) => o.id === p.offerId);
    if (!offer) return 'Unbekanntes Angebot.';
    if (s.finance.loans.length >= 2) return 'Mehr als zwei Kredite gibt dir keine Bank.';
    if (s.finance.cash < 0) return 'Mit Minus auf dem Konto gibt es keinen Kredit.';
    return requirementReason(s, offer.requires);
  },
  run: (d, p) => {
    const offer = LOAN_OFFERS.find((o) => o.id === p.offerId)!;
    d.finance.loans.push({
      id: `l${d.finance.nextLoanId++}`,
      offerId: offer.id,
      label: offer.label,
      amount: offer.amount,
      remaining: offer.total,
      perDay: roundMoney(offer.total / offer.days),
      takenAt: d.clock.now,
    });
    receiveLoan(d, offer.amount, `${offer.label} ausgezahlt`);
    incStat(d, 'loans');
    return `${offer.label}: ${fmtMoney(offer.amount)} ausgezahlt.`;
  },
});

export const repayLoan = defineAction<{ loanId: string }>({
  id: 'finance.repay',
  check: (s, p) => {
    const loan = s.finance.loans.find((l) => l.id === p.loanId);
    if (!loan) return 'Kredit nicht gefunden.';
    return moneyReason(s, loan.remaining);
  },
  run: (d, p) => {
    const loan = d.finance.loans.find((l) => l.id === p.loanId)!;
    spend(d, loan.remaining, 'other', `Sondertilgung: ${loan.label}`);
    d.finance.loans = d.finance.loans.filter((l) => l.id !== loan.id);
    return `${loan.label} komplett abbezahlt.`;
  },
});
