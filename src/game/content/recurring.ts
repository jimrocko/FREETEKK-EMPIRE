import type { RecurringCostDef } from './types';

/** Fixed running costs, charged once per game day. */
export const RECURRING_COSTS: readonly RecurringCostDef[] = [
  { id: 'cost.living', label: 'Zimmer & Handyvertrag', perDay: 5, category: 'upkeep' },
];
