import type { LedgerCategory } from '../../core/types';

export interface LedgerEntry {
  at: number;
  amount: number;
  category: LedgerCategory;
  label: string;
}

export interface DayRecord {
  day: number;
  income: number;
  expense: number;
}

export interface PassiveBucket {
  label: string;
  category: LedgerCategory;
  amount: number;
}

export interface FinanceState {
  cash: number;
  /** Recent bookings, newest last (ring buffer). */
  ledger: LedgerEntry[];
  /** Lifetime totals per category. */
  totals: Partial<Record<LedgerCategory, { in: number; out: number }>>;
  /** Per game day income/expense (ring buffer). */
  days: DayRecord[];
  /** Passive income accumulated since the last day start (booked once per day). */
  passive: Record<string, PassiveBucket>;
}

export const START_CASH = 500;

export function createFinanceState(cash = START_CASH): FinanceState {
  return { cash, ledger: [], totals: {}, days: [], passive: {} };
}
