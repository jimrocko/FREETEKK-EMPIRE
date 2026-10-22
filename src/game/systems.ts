import type { GameSystem } from './core/simulation';
import { activitiesSystem } from './systems/activities/system';
import { financeSystem } from './systems/finance/system';
import { inventorySystem } from './systems/inventory/system';
import { marketSystem } from './systems/market/system';
import { goalsSystem } from './systems/goals/system';
import { mapSystem } from './systems/map/system';
import { spotsSystem } from './systems/spots/system';

/**
 * All simulation systems in processing order.
 * Order matters for day starts: finance books costs before the market refreshes.
 */
export const SYSTEMS: readonly GameSystem[] = [
  activitiesSystem,
  financeSystem,
  inventorySystem,
  mapSystem,
  spotsSystem,
  marketSystem,
  goalsSystem,
];
