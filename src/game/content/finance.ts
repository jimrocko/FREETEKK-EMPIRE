import type { Condition } from '../core/types';

/** Interest on the bank account per game day. */
export const BANK_INTEREST_PER_DAY = 0.0005;

export interface LoanOffer {
  id: string;
  label: string;
  amount: number;
  /** Total to pay back (incl. interest). */
  total: number;
  days: number;
  requires?: Condition[];
}

export const LOAN_OFFERS: readonly LoanOffer[] = [
  { id: 'loan.small', label: 'Kleinkredit', amount: 2000, total: 2300, days: 40, requires: [{ t: 'rep', gte: 150 }] },
  {
    id: 'loan.medium',
    label: 'Investitionskredit',
    amount: 10000,
    total: 11500,
    days: 60,
    requires: [
      { t: 'rep', gte: 500 },
      { t: 'skill', skill: 'business', gte: 4 },
    ],
  },
  {
    id: 'loan.large',
    label: 'Geschäftskredit',
    amount: 50000,
    total: 57500,
    days: 80,
    requires: [
      { t: 'rep', gte: 1500 },
      { t: 'skill', skill: 'business', gte: 7 },
    ],
  },
];
