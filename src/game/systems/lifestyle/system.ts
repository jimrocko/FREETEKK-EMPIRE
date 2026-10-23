import type { GameSystem } from '../../core/simulation';
import type { CostLine } from '../finance/logic';
import { homeDef } from '../../content/registry';
import { lifestyleUpkeep } from './logic';

export const lifestyleSystem: GameSystem = {
  id: 'lifestyle',
  dailyCosts(s) {
    const lines: CostLine[] = [];
    const home = homeDef(s.player.homeId);
    if (home.rent) lines.push({ id: 'home.rent', label: `Miete: ${home.name}`, perDay: home.rent, category: 'property' });
    const upkeep = lifestyleUpkeep(s);
    if (upkeep > 0) lines.push({ id: 'lifestyle.upkeep', label: 'Lifestyle-Unterhalt (Futter, Versicherung, Liegeplatz …)', perDay: upkeep, category: 'lifestyle' });
    return lines;
  },
};
