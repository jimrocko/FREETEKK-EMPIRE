import type { GameSystem } from '../../core/simulation';
import type { RateLine } from '../finance/logic';
import { chance } from '../../core/rng';
import { notify } from '../../core/notify';
import { addRep } from '../progression/logic';
import { streamRate } from './logic';

export const musicSystem: GameSystem = {
  id: 'music',
  rates(s) {
    let total = 0;
    for (const t of s.music.tracks) total += streamRate(t);
    const lines: RateLine[] = [];
    if (total > 0) lines.push({ id: 'streams', label: 'Streams', perHour: total, category: 'music' });
    return lines;
  },
  onNewDay(d) {
    for (const t of d.music.tracks) {
      if (t.uploadedAt === undefined) continue;
      // Attention fades – but good tracks sometimes take off.
      t.hype = Math.max(0.2, t.hype * 0.985);
      if (t.score >= 70 && chance(d, 0.002 * ((t.score - 60) / 10))) {
        t.hype += 2;
        addRep(d, 5);
        notify(d, { tone: 'discovery', title: `„${t.name}“ geht viral`, text: 'Irgendwer hat deinen Track in eine Playlist gepackt. Die Streams explodieren.', link: '/studio/tracks' });
      }
    }
  },
};
