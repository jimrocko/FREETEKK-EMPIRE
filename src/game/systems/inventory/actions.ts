import { defineAction } from '../../core/actions';
import { fmtMoney } from '../../core/format';
import { itemDef } from '../../content/registry';
import { earn } from '../finance/logic';
import { incStat } from '../progression/logic';
import { dealerPrice, getItem, removeItem, sellableReason } from './logic';

/** Sell to the second-hand dealer: instant, but below fair value. */
export const sellToDealer = defineAction<{ uid: string; qty?: number }>({
  id: 'inventory.sellToDealer',
  check: (s, p) => sellableReason(s, p.uid),
  run: (d, p) => {
    const it = getItem(d, p.uid)!;
    const def = itemDef(it.defId);
    const qty = Math.min(it.qty, p.qty ?? it.qty);
    const amount = dealerPrice(def, it.condition) * qty;
    earn(d, amount, 'market', `Ankauf: ${def.name}${qty > 1 ? ` ×${qty}` : ''}`);
    removeItem(d, p.uid, qty);
    incStat(d, 'itemsSold', qty);
    return `${def.name} für ${fmtMoney(amount)} verkauft.`;
  },
});
