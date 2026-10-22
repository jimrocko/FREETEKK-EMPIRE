import type { GameSystem } from '../../core/simulation';
import { checkGoals } from './logic';

export const goalsSystem: GameSystem = {
  id: 'goals',
  afterUpdate(d) {
    checkGoals(d);
  },
};
