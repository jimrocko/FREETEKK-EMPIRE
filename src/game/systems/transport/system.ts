import type { GameSystem } from '../../core/simulation';
import { ITEMS } from '../../content/registry';
import { notify } from '../../core/notify';

export const transportSystem: GameSystem = {
  id: 'transport',
  nextDue(s) {
    let next: number | null = null;
    for (const r of s.transport.rentals) if (next === null || r.until < next) next = r.until;
    return next;
  },
  process(d) {
    const now = d.clock.now;
    const expired = d.transport.rentals.filter((r) => r.until <= now);
    if (expired.length === 0) return;
    d.transport.rentals = d.transport.rentals.filter((r) => r.until > now);
    for (const r of expired) notify(d, { tone: 'info', title: 'Mietwagen zurückgegeben', text: ITEMS.get(r.defId)?.name, link: '/crew/fahrzeuge' });
  },
};
