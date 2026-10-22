import type { GameState } from './state';
import type { CostLine, RateLine } from './systems/finance/logic';
import { incomeLastHour } from './systems/finance/logic';
import { HOUR, GAME_DAY_MS } from './core/time';
import { SYSTEMS } from './systems';
import { freeVolume, storageCapacity } from './systems/inventory/logic';

/** Derived values used across several screens. */

export function dailyCostLines(s: GameState): CostLine[] {
  const lines: CostLine[] = [];
  for (const sys of SYSTEMS) if (sys.dailyCosts) lines.push(...sys.dailyCosts(s));
  return lines;
}

export function rateLines(s: GameState): RateLine[] {
  const lines: RateLine[] = [];
  for (const sys of SYSTEMS) if (sys.rates) lines.push(...sys.rates(s));
  return lines;
}

export interface EconomySummary {
  lastHourIncome: number;
  passivePerHour: number;
  fixedPerDay: number;
  fixedPerHour: number;
}

export function economySummary(s: GameState): EconomySummary {
  const fixedPerDay = dailyCostLines(s).reduce((sum, l) => sum + l.perDay, 0);
  const passivePerHour = rateLines(s).reduce((sum, l) => sum + l.perHour, 0);
  return {
    lastHourIncome: incomeLastHour(s),
    passivePerHour,
    fixedPerDay,
    fixedPerHour: fixedPerDay * (HOUR / GAME_DAY_MS),
  };
}

export interface Warning {
  id: string;
  tone: 'warning' | 'danger';
  text: string;
  link?: string;
}

export function warnings(s: GameState): Warning[] {
  const out: Warning[] = [];
  if (s.finance.cash < 0) {
    out.push({ id: 'cash', tone: 'danger', text: 'Dein Konto ist im Minus – Käufe sind gesperrt.', link: '/finanzen' });
  }
  const cap = storageCapacity(s);
  if (freeVolume(s) < cap * 0.1) {
    out.push({ id: 'storage', tone: 'warning', text: 'Dein Zimmer ist fast voll. Verkaufe etwas, bevor du Neues kaufst.', link: '/inventar' });
  }
  return out;
}
