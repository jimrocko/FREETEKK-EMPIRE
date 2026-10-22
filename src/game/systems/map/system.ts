import type { GameSystem } from '../../core/simulation';
import type { CostLine } from '../finance/logic';
import { rentedStorage } from './logic';

export const mapSystem: GameSystem = {
  id: 'map',
  dailyCosts(s) {
    const lines: CostLine[] = [];
    for (const p of rentedStorage(s)) lines.push({ id: `rent:${p.id}`, label: `Miete: ${p.name}`, perDay: p.storage!.perDay, category: 'property' });
    return lines;
  },
};
