import type { GameSystem } from '../../core/simulation';

/** Keeps systems consistent: components that no longer exist are removed. */
export const soundSystem: GameSystem = {
  id: 'sound',
  afterUpdate(d) {
    for (const sys of d.sound.systems) {
      if (sys.components.some((uid) => !d.inventory.items[uid])) {
        sys.components = sys.components.filter((uid) => d.inventory.items[uid]);
      }
    }
  },
};
