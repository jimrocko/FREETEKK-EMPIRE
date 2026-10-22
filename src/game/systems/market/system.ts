import type { GameSystem } from '../../core/simulation';
import { refreshOffers } from './logic';

export const marketSystem: GameSystem = {
  id: 'market',
  onNewDay(d, day, ctx) {
    refreshOffers(d, day, { silent: ctx.offline });
  },
};
