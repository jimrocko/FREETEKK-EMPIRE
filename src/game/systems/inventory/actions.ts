import { defineAction } from '../../core/actions';
import { fmtMoney } from '../../core/format';
import { PERSONS_BY_ID, itemDef } from '../../content/registry';
import { TRADE_PARTNERS } from '../../content/trade';
import { earn } from '../finance/logic';
import { incStat } from '../progression/logic';
import { adjustTrust, knowsPerson, shortName } from '../people/logic';
import { dealerPrice, getItem, partnerPrice, removeItem, sellableReason } from './logic';

/** Sell to the second-hand dealer: instant, but below fair value. */
export const sellToDealer = defineAction<{ uid: string; qty?: number }>({
  id: 'inventory.sellToDealer',
  check: (s, p) => sellableReason(s, p.uid),
  run: (d, p) => {
    const it = getItem(d, p.uid)!;
    const def = itemDef(it.defId);
    const qty = Math.min(it.qty, p.qty ?? it.qty);
    const amount = dealerPrice(def, it.condition, it.broken) * qty;
    earn(d, amount, 'market', `Ankauf: ${def.name}${qty > 1 ? ` ×${qty}` : ''}`);
    removeItem(d, p.uid, qty);
    incStat(d, 'itemsSold', qty);
    return `${def.name} für ${fmtMoney(amount)} verkauft.`;
  },
});

/** Sell to a trusted contact: fairer than the dealer. */
export const sellToContact = defineAction<{ uid: string; personId: string }>({
  id: 'inventory.sellToContact',
  check: (s, p) => {
    const r = sellableReason(s, p.uid);
    if (r) return r;
    const partner = TRADE_PARTNERS.find((x) => x.personId === p.personId);
    const person = PERSONS_BY_ID.get(p.personId);
    if (!partner || !person || !knowsPerson(s, p.personId)) return 'Unbekannter Handelspartner.';
    const def = itemDef(getItem(s, p.uid)!.defId);
    if (def.category === 'goods' || (partner.categories && !partner.categories.includes(def.category))) return `${shortName(person)} nimmt so etwas nicht.`;
    if (s.people.people[p.personId].trust < partner.trust) return `${shortName(person)} handelt erst ab Vertrauen ${partner.trust}.`;
    return null;
  },
  run: (d, p) => {
    const it = getItem(d, p.uid)!;
    const def = itemDef(it.defId);
    const person = PERSONS_BY_ID.get(p.personId)!;
    const qty = it.qty;
    const amount = partnerPrice(d, it, p.personId) * qty;
    earn(d, amount, 'market', `Verkauf an ${shortName(person)}: ${def.name}${qty > 1 ? ` ×${qty}` : ''}`);
    removeItem(d, p.uid, qty);
    adjustTrust(d, p.personId, 1);
    incStat(d, 'itemsSold', qty);
    incStat(d, 'tradesWithContacts');
    return `${shortName(person)} kauft ${def.name} für ${fmtMoney(amount)}.`;
  },
});
