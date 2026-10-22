import type { ActivityHandler } from '../activities/handler';
import { itemDef } from '../../content/registry';
import { fmtMoney } from '../../core/format';
import { notify } from '../../core/notify';
import { earn } from '../finance/logic';
import { incStat } from '../progression/logic';
import { getItem, removeItem } from '../inventory/logic';

export const listingHandler: ActivityHandler = {
  cancelLabel: 'Inserat zurückziehen',
  complete(d, a) {
    const uid = String(a.payload.uid);
    const price = Number(a.payload.price);
    const it = getItem(d, uid);
    if (!it) return;
    const def = itemDef(it.defId);
    const qty = it.qty;
    earn(d, price, 'market', `Inserat verkauft: ${def.name}`);
    removeItem(d, uid);
    incStat(d, 'itemsSold', qty);
    notify(d, {
      tone: 'success',
      title: `Verkauft: ${def.name}`,
      text: `Jemand hat dein Inserat für ${fmtMoney(price)} gekauft.`,
      link: '/inventar',
    });
  },
  cancel(d, a) {
    const it = getItem(d, String(a.payload.uid));
    if (it && it.locked === `listing:${a.id}`) delete it.locked;
  },
};
