import type { GameSystem } from '../../core/simulation';
import type { CostLine } from '../finance/logic';
import { ITEMS } from '../../content/registry';

export const inventorySystem: GameSystem = {
  id: 'inventory',
  dailyCosts(s) {
    let total = 0;
    for (const it of Object.values(s.inventory.items)) total += (ITEMS.get(it.defId)?.upkeepPerDay ?? 0) * it.qty;
    const lines: CostLine[] = [];
    if (total > 0) lines.push({ id: 'cost.items', label: 'Wartung & Versicherung', perDay: total, category: 'upkeep' });
    return lines;
  },
};
