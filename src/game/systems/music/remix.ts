import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { fmtMoney } from '../../core/format';
import { notify } from '../../core/notify';
import { chance, randRange } from '../../core/rng';
import type { ActivityHandler } from '../activities/handler';
import { channelReason, startActivity } from '../activities/logic';
import { earn } from '../finance/logic';
import { addRep, addXp, incStat, skillLevel, stat } from '../progression/logic';
import { countTag } from '../inventory/logic';
import { meetSomeone } from '../people/logic';
import { needsUnlock } from '../progression/tree';

export const REMIX_MINUTES = 15;

/** Expected pay for a remix commission. */
export function remixPay(s: Parameters<typeof skillLevel>[0]): number {
  return Math.round(60 + skillLevel(s, 'produktion') * 35 + stat(s, 'bestTrack') * 1.5);
}

export const takeRemix = defineAction<Record<string, never>>({
  id: 'music.remix',
  check: (s) => {
    const locked = needsUnlock(s, 'u.remix');
    if (locked) return locked;
    if (countTag(s, 'synth') + countTag(s, 'drums') === 0) return 'Ohne Synth oder Drum-Machine kein Remix.';
    return channelReason(s, 'studio');
  },
  run: (d) => {
    startActivity(d, { kind: 'remix', channel: 'studio', label: 'Remix-Auftrag', durationMs: minutes(REMIX_MINUTES) });
    return 'Du nimmst einen Remix-Auftrag an.';
  },
});

export const remixHandler: ActivityHandler = {
  cancelLabel: 'Auftrag zurückgeben',
  complete(d) {
    const pay = Math.round(remixPay(d) * randRange(d, 0.85, 1.2));
    earn(d, pay, 'music', 'Remix-Auftrag');
    addRep(d, 2);
    addXp(d, 'produktion', 25);
    incStat(d, 'remixes');
    const met = chance(d, 0.3) ? meetSomeone(d, ['dj', 'producer', 'artist']) : null;
    notify(d, {
      tone: 'success',
      title: 'Remix abgeliefert',
      text: `${fmtMoney(pay, { sign: true })} · +2 Reputation${met ? ' · neuer Kontakt' : ''}`,
      link: '/studio',
    });
  },
};
