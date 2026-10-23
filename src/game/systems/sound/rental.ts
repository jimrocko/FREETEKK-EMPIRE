import type { GameState } from '../../state';
import type { Reason } from '../../core/types';
import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { fmtMoney } from '../../core/format';
import { notify } from '../../core/notify';
import { chance, pick, randRange } from '../../core/rng';
import type { ActivityHandler } from '../activities/handler';
import { channelReason, startActivity } from '../activities/logic';
import { earn } from '../finance/logic';
import { incStat } from '../progression/logic';
import { wearItem } from '../equipment/logic';
import { needsUnlock } from '../progression/tree';
import { findSystem, systemStats } from './logic';

/** A rental lasts one night out (real minutes = game hours). */
export const RENTAL_MINUTES = 12;

export function rentalFee(s: GameState, systemId: string): number {
  const sys = findSystem(s, systemId);
  if (!sys) return 0;
  const st = systemStats(s, sys);
  return Math.round(st.reach * 0.9 + st.quality * 2);
}

export function isRentedOut(s: GameState, systemId: string): boolean {
  return s.activities.running.some((a) => a.kind === 'system-rental' && a.payload.systemId === systemId);
}

export function rentalReason(s: GameState, systemId: string): Reason {
  const locked = needsUnlock(s, 'u.rental');
  if (locked) return locked;
  const sys = findSystem(s, systemId);
  if (!sys) return 'System nicht gefunden.';
  if (systemStats(s, sys).reach <= 0) return 'Ohne Boxen will das niemand mieten.';
  if (isRentedOut(s, systemId)) return 'Ist schon vermietet.';
  const until = s.clock.now + minutes(RENTAL_MINUTES);
  const ev = s.events.list.find((e) => (e.status === 'scheduled' || e.status === 'running') && e.sound.kind === 'own' && e.sound.systemId === systemId && e.startsAt <= until);
  if (ev) return `Wird für „${ev.name}“ gebraucht.`;
  if (sys.components.some((uid) => s.inventory.items[uid]?.locked)) return 'Teile der Anlage sind gerade in Benutzung.';
  return channelReason(s, 'market');
}

export const rentOutSystem = defineAction<{ systemId: string }>({
  id: 'sound.rent',
  check: (s, p) => rentalReason(s, p.systemId),
  run: (d, p) => {
    const sys = findSystem(d, p.systemId)!;
    const a = startActivity(d, {
      kind: 'system-rental',
      channel: 'market',
      label: `Vermietet: ${sys.name}`,
      durationMs: minutes(RENTAL_MINUTES),
      payload: { systemId: sys.id, fee: rentalFee(d, sys.id) },
    });
    for (const uid of sys.components) if (d.inventory.items[uid]) d.inventory.items[uid].locked = `rental:${a.id}`;
    return `„${sys.name}“ ist für eine Nacht vermietet.`;
  },
});

function release(d: GameState, activityId: string): string[] {
  const uids: string[] = [];
  for (const it of Object.values(d.inventory.items)) {
    if (it.locked === `rental:${activityId}`) {
      delete it.locked;
      uids.push(it.uid);
    }
  }
  return uids;
}

export const rentalHandler: ActivityHandler = {
  cancelLabel: 'Vorzeitig zurückholen',
  complete(d, a) {
    const uids = release(d, a.id);
    const fee = Number(a.payload.fee);
    earn(d, fee, 'equipment', 'Anlagenverleih');
    for (const uid of uids) wearItem(d, uid, randRange(d, 0.5, 2));
    let text = `${fmtMoney(fee, { sign: true })} Miete.`;
    if (uids.length > 0 && chance(d, 0.12)) {
      const uid = pick(d, uids);
      wearItem(d, uid, 15);
      text += ' Ein Teil kam ramponiert zurück.';
    }
    incStat(d, 'rentals');
    notify(d, { tone: 'success', title: 'Anlage zurück', text, link: '/crew/systeme' });
  },
  cancel(d, a) {
    release(d, a.id);
  },
};
