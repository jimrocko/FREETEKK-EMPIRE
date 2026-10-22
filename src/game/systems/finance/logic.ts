import type { GameState } from '../../state';
import type { LedgerCategory, Reason } from '../../core/types';
import { fmtMoney, roundMoney } from '../../core/format';
import { HOUR, gameDayAt } from '../../core/time';
import { notify } from '../../core/notify';
import { incStat } from '../progression/logic';
import type { DayRecord } from './state';

export const LEDGER_LIMIT = 300;
export const DAY_HISTORY_LIMIT = 60;

export const CATEGORY_LABELS: Record<LedgerCategory, string> = {
  job: 'Jobs',
  market: 'Handel',
  equipment: 'Equipment',
  upkeep: 'Laufende Kosten',
  goal: 'Ziele',
  event: 'Events',
  merch: 'Merch',
  crew: 'Crew',
  vehicle: 'Fahrzeuge',
  supply: 'Versorgung',
  property: 'Immobilien',
  music: 'Musik',
  network: 'Netzwerk',
  other: 'Sonstiges',
};

/** A passive income/expense stream, per real hour. */
export interface RateLine {
  id: string;
  label: string;
  perHour: number;
  category: LedgerCategory;
}

/** A fixed running cost, charged once per game day. */
export interface CostLine {
  id: string;
  label: string;
  perDay: number;
  category: LedgerCategory;
}

function currentDayRecord(d: GameState): DayRecord {
  const day = gameDayAt(d.clock, d.clock.now);
  const days = d.finance.days;
  let rec = days[days.length - 1];
  if (!rec || rec.day !== day) {
    rec = { day, income: 0, expense: 0 };
    days.push(rec);
    if (days.length > DAY_HISTORY_LIMIT) days.splice(0, days.length - DAY_HISTORY_LIMIT);
  }
  return rec;
}

function book(d: GameState, amount: number, category: LedgerCategory, label: string): void {
  const f = d.finance;
  f.ledger.push({ at: d.clock.now, amount, category, label });
  if (f.ledger.length > LEDGER_LIMIT) f.ledger.splice(0, f.ledger.length - LEDGER_LIMIT);
  const tot = (f.totals[category] ??= { in: 0, out: 0 });
  const rec = currentDayRecord(d);
  if (amount >= 0) {
    tot.in = roundMoney(tot.in + amount);
    rec.income = roundMoney(rec.income + amount);
  } else {
    tot.out = roundMoney(tot.out - amount);
    rec.expense = roundMoney(rec.expense - amount);
  }
}

/** Adds money (amount > 0). */
export function earn(d: GameState, amount: number, category: LedgerCategory, label: string): void {
  const value = roundMoney(amount);
  if (value <= 0) return;
  d.finance.cash += value;
  book(d, value, category, label);
  incStat(d, 'moneyEarned', value);
}

/** Removes money (amount > 0). Callers check affordability first. */
export function spend(d: GameState, amount: number, category: LedgerCategory, label: string): void {
  const value = roundMoney(amount);
  if (value <= 0) return;
  const wasPositive = d.finance.cash >= 0;
  d.finance.cash -= value;
  book(d, -value, category, label);
  incStat(d, 'moneySpent', value);
  if (wasPositive && d.finance.cash < 0) {
    notify(d, {
      tone: 'danger',
      title: 'Konto im Minus',
      text: 'Solange du im Minus bist, kannst du nichts kaufen. Verdiene Geld oder verkaufe etwas.',
      link: '/finanzen',
    });
  }
}

export function moneyReason(s: GameState, amount: number): Reason {
  if (s.finance.cash < 0) return 'Dein Konto ist im Minus.';
  if (s.finance.cash < amount) return `Zu wenig Geld – es fehlen ${fmtMoney(amount - s.finance.cash)}.`;
  return null;
}

/** Integrates passive streams over a time span. */
export function applyRates(d: GameState, lines: readonly RateLine[], dtMs: number): void {
  if (dtMs <= 0) return;
  for (const line of lines) {
    if (line.perHour === 0) continue;
    const amount = (line.perHour * dtMs) / HOUR;
    d.finance.cash += amount;
    const bucket = (d.finance.passive[line.id] ??= { label: line.label, category: line.category, amount: 0 });
    bucket.amount += amount;
  }
}

/** Books accumulated passive amounts into the ledger. */
export function flushPassive(d: GameState): void {
  for (const [id, bucket] of Object.entries(d.finance.passive)) {
    const value = roundMoney(bucket.amount);
    if (value !== 0) {
      book(d, value, bucket.category, `${bucket.label} (passiv)`);
      if (value > 0) incStat(d, 'moneyEarned', value);
    }
    delete d.finance.passive[id];
  }
}

export function chargeDailyCosts(d: GameState, lines: readonly CostLine[]): number {
  let total = 0;
  for (const line of lines) {
    if (line.perDay <= 0) continue;
    spend(d, line.perDay, line.category, line.label);
    total += line.perDay;
  }
  return total;
}

/** Debug helper (only reachable from the developer panel). */
export function debugGrant(d: GameState, amount: number): void {
  earn(d, amount, 'other', 'Entwickler-Geld');
}

/** Sum of ledger income within the last real hour. */
export function incomeLastHour(s: GameState): number {
  const since = s.clock.now - HOUR;
  let sum = 0;
  for (let i = s.finance.ledger.length - 1; i >= 0; i--) {
    const e = s.finance.ledger[i];
    if (e.at < since) break;
    if (e.amount > 0) sum += e.amount;
  }
  return roundMoney(sum);
}
