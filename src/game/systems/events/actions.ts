import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { fmtMoney } from '../../core/format';
import { ITEMS, SPOTS_BY_ID, personDef } from '../../content/registry';
import { SUPPLIERS } from '../../content/events';
import { requirementReason } from '../../core/conditions';
import { channelReason, startActivity } from '../activities/logic';
import { earn, moneyReason, spend } from '../finance/logic';
import { incStat } from '../progression/logic';
import { modifierValue } from '../happenings/logic';
import type { GameState } from '../../state';
import { addItem, freeVolume } from '../inventory/logic';
import { adjustRelation, adjustTrust, shortName } from '../people/logic';
import { eventTasksFor, findEvent, planReason, taskDef, upfrontCosts } from './plan';
import type { EventPlanInput } from './state';

export const planEvent = defineAction<EventPlanInput>({
  id: 'events.plan',
  check: (s, p) => planReason(s, p),
  run: (d, p) => {
    const paid: Record<string, number> = {};
    for (const c of upfrontCosts(d, p)) {
      spend(d, c.amount, 'event', `${c.label}: ${p.name.trim()}`);
      paid[c.label] = (paid[c.label] ?? 0) + c.amount;
    }
    const id = `e${d.events.nextId++}`;
    d.events.list.push({
      ...p,
      name: p.name.trim(),
      lineup: [...p.lineup],
      promo: [...p.promo],
      prices: { ...p.prices },
      id,
      createdAt: d.clock.now,
      status: 'scheduled',
      tasks: eventTasksFor(d, p),
      paid,
    });
    incStat(d, 'eventsPlanned');
    return `${p.name.trim()} ist angesetzt – ${SPOTS_BY_ID.get(p.spotId)?.name}.`;
  },
});

export const cancelEvent = defineAction<{ eventId: string }>({
  id: 'events.cancel',
  check: (s, p) => (findEvent(s, p.eventId)?.status === 'scheduled' ? null : 'Nur geplante Events können abgesagt werden.'),
  run: (d, p) => {
    const ev = findEvent(d, p.eventId)!;
    ev.status = 'cancelled';
    ev.cancelReason = 'Von dir abgesagt.';
    // Half of rent and rentals come back; promotion is gone.
    const refundable = ['Miete Spot', 'Verleih-PA', 'Kombi mieten', 'Sprinter mieten', '7,5-Tonner mieten', 'Awareness-Team', 'Sanitäter'];
    let refund = 0;
    for (const [label, amount] of Object.entries(ev.paid)) if (refundable.includes(label) || label.startsWith('Helfer')) refund += amount * 0.5;
    if (refund > 0) earn(d, refund, 'event', `Erstattung: ${ev.name}`);
    for (const id of ev.lineup) if (id !== 'self' && id !== 'sub') adjustRelation(d, id, -3);
    for (const a of d.activities.running.filter((x) => x.kind === 'event-task' && x.payload.eventId === ev.id)) {
      d.activities.running = d.activities.running.filter((x) => x.id !== a.id);
    }
    return `${ev.name} abgesagt${refund > 0 ? ` – ${fmtMoney(refund)} zurück` : ''}.`;
  },
});

export const startEventTask = defineAction<{ eventId: string; taskId: string }>({
  id: 'events.task',
  check: (s, p) => {
    const ev = findEvent(s, p.eventId);
    if (!ev || ev.status !== 'scheduled') return 'Event ist nicht mehr in Vorbereitung.';
    const st = ev.tasks[p.taskId];
    if (st === undefined) return 'Unbekannte Aufgabe.';
    if (st === 'done') return 'Erledigt.';
    if (st === 'running') return 'Läuft schon.';
    return channelReason(s, 'event');
  },
  run: (d, p) => {
    const ev = findEvent(d, p.eventId)!;
    const def = taskDef(p.taskId);
    ev.tasks[p.taskId] = 'running';
    startActivity(d, {
      kind: 'event-task',
      channel: 'event',
      label: `${def.label}: ${ev.name}`,
      durationMs: minutes(def.minutes),
      payload: { eventId: ev.id, taskId: def.id },
    });
    return `${def.label} läuft.`;
  },
});

export function supplierReason(s: Parameters<typeof requirementReason>[0], supplierId: string): string | null {
  const sup = SUPPLIERS.find((x) => x.id === supplierId);
  if (!sup) return 'Unbekannter Lieferant.';
  if (sup.personId && !s.people.people[sup.personId]?.met) return `Du kennst ${shortName(personDef(sup.personId))} noch nicht.`;
  return requirementReason(s, sup.requires);
}

export function goodsPrice(s: GameState, supplierId: string, defId: string): number {
  const sup = SUPPLIERS.find((x) => x.id === supplierId)!;
  return Math.round((ITEMS.get(defId)?.price ?? 0) * sup.priceFactor * (1 + modifierValue(s, 'goodsPrice')) * 100) / 100;
}

export const buyGoods = defineAction<{ supplierId: string; defId: string; qty: number }>({
  id: 'events.buyGoods',
  check: (s, p) => {
    const r = supplierReason(s, p.supplierId);
    if (r) return r;
    const sup = SUPPLIERS.find((x) => x.id === p.supplierId)!;
    const def = ITEMS.get(p.defId);
    if (def?.category !== 'goods') return 'Gibt es hier nicht.';
    if (!Number.isInteger(p.qty) || p.qty < sup.minOrder) return `Mindestens ${sup.minOrder} Kisten pro Bestellung.`;
    if (p.qty > sup.maxOrder) return `Höchstens ${sup.maxOrder} Kisten pro Bestellung.`;
    if (def.volumeL * p.qty > freeVolume(s)) return `Kein Platz: ${def.volumeL * p.qty} L nötig.`;
    return moneyReason(s, goodsPrice(s, p.supplierId, p.defId) * p.qty + sup.deliveryFee);
  },
  run: (d, p) => {
    const sup = SUPPLIERS.find((x) => x.id === p.supplierId)!;
    const def = ITEMS.get(p.defId)!;
    const total = goodsPrice(d, p.supplierId, p.defId) * p.qty;
    spend(d, total, 'supply', `${p.qty}× ${def.name} (${sup.name})`);
    if (sup.deliveryFee > 0) spend(d, sup.deliveryFee, 'supply', `Lieferung ${sup.name}`);
    addItem(d, def.id, { qty: p.qty, paid: total });
    if (sup.personId) adjustTrust(d, sup.personId, 1);
    incStat(d, 'goodsBought', p.qty);
    return `${p.qty}× ${def.name} gekauft.`;
  },
});
