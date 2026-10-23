import { defineAction } from '../../core/actions';
import { HOMES_BY_ID } from '../../content/registry';
import { buyLifestyle, buyReason, moveHome, moveReason, sellLifestyle, sellReason, useLifestyle, useReason } from './logic';

export const buyFun = defineAction<{ id: string }>({
  id: 'lifestyle.buy',
  check: (s, p) => buyReason(s, p.id),
  run: (d, p) => buyLifestyle(d, p.id),
});

export const sellFun = defineAction<{ id: string }>({
  id: 'lifestyle.sell',
  check: (s, p) => sellReason(s, p.id),
  run: (d, p) => sellLifestyle(d, p.id),
});

export const useFun = defineAction<{ id: string }>({
  id: 'lifestyle.use',
  check: (s, p) => useReason(s, p.id),
  run: (d, p) => useLifestyle(d, p.id),
});

export const moveIn = defineAction<{ homeId: string }>({
  id: 'lifestyle.move',
  check: (s, p) => {
    const home = HOMES_BY_ID.get(p.homeId);
    return home ? moveReason(s, home) : 'Unbekannte Wohnung.';
  },
  run: (d, p) => moveHome(d, HOMES_BY_ID.get(p.homeId)!),
});
