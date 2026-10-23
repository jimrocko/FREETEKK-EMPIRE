import type { GameSystem } from '../../core/simulation';
import { RIVAL_CREWS } from '../../content/rivals';
import { checkAppearances, crewAct, crewNewDay, eventEndsAt, nextActionGap, resolveRivalEvent } from './logic';

/** The scene keeps moving – online and while you are away. */
export const rivalsSystem: GameSystem = {
  id: 'rivals',
  nextDue(s) {
    let next: number | null = null;
    for (const def of RIVAL_CREWS) {
      const st = s.rivals.crews[def.id];
      if (st?.active && (next === null || st.nextActionAt < next)) next = st.nextActionAt;
    }
    for (const ev of s.rivals.events) {
      if (ev.status !== 'scheduled') continue;
      const end = eventEndsAt(ev);
      if (next === null || end < next) next = end;
    }
    return next;
  },
  process(d, ctx) {
    const now = d.clock.now;
    for (const ev of d.rivals.events) if (ev.status === 'scheduled' && eventEndsAt(ev) <= now) resolveRivalEvent(d, ev);
    for (const def of RIVAL_CREWS) {
      const st = d.rivals.crews[def.id];
      if (!st?.active || st.nextActionAt > now) continue;
      crewAct(d, def, !ctx.offline);
      st.nextActionAt = now + nextActionGap(d, def);
    }
    // Coop deals run out.
    if (d.rivals.coop && d.rivals.coop.until <= now) delete d.rivals.coop;
  },
  onNewDay(d, day) {
    crewNewDay(d, day);
  },
  afterUpdate(d) {
    checkAppearances(d);
  },
};
