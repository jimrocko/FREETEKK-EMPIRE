import type { GameSystem } from '../../core/simulation';
import { PEOPLE } from '../../content/people';
import { checkAll } from '../../core/conditions';
import { GAME_DAY_MS } from '../../core/time';
import { meetPerson } from './logic';
import { sendDirect } from '../messages/logic';

export const peopleSystem: GameSystem = {
  id: 'people',
  onNewDay(d, _day, ctx) {
    for (const p of PEOPLE) {
      const st = d.people.people[p.id];
      if (!st) continue;
      if (st.met) {
        // Without contact, feelings fade towards neutral.
        if (st.lastContactAt !== undefined && d.clock.now - st.lastContactAt > 5 * GAME_DAY_MS && st.relation !== 0) {
          st.relation += st.relation > 0 ? -1 : 1;
        }
        continue;
      }
      // Some people get in touch on their own once you are on their radar.
      for (const m of p.meet) {
        if ('reaches' in m && checkAll(d, m.reaches)) {
          meetPerson(d, p.id, 'message', { silent: true, ...(m.trust !== undefined ? { trust: m.trust } : {}) });
          sendDirect(d, p.id, m.text, { online: !ctx.offline });
          break;
        }
      }
    }
  },
};
