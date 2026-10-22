import type { ActivityHandler } from '../activities/handler';
import { MIX_EFFORTS } from '../../content/music';
import { notify } from '../../core/notify';
import { randRange } from '../../core/rng';
import { addXp, incStat, stat } from '../progression/logic';
import { wearItem } from '../equipment/logic';
import { findTrack, genreDef, rollTrack, scoreLabel, type ProductionPlan } from './logic';
import { itemDef } from '../../content/registry';

function unlock(d: Parameters<ActivityHandler['complete']>[0], activityId: string) {
  for (const it of Object.values(d.inventory.items)) if (it.locked === `studio:${activityId}`) delete it.locked;
}

export const produceHandler: ActivityHandler = {
  cancelLabel: 'Session abbrechen',
  complete(d, a) {
    unlock(d, a.id);
    const t = findTrack(d, String(a.payload.trackId));
    if (!t) return;
    const plan = JSON.parse(String(a.payload.plan)) as ProductionPlan;
    // Devices could have been lost in the meantime – only keep existing ones.
    const elements: ProductionPlan['elements'] = {};
    for (const [el, uid] of Object.entries(plan.elements)) if (uid && d.inventory.items[uid]) elements[el as keyof typeof elements] = uid;
    const result = rollTrack(d, { ...plan, elements });
    t.stats = result.stats;
    t.score = result.score;
    t.status = 'done';
    for (const [el, uid] of Object.entries(elements)) t.elements[el as keyof typeof t.elements] = d.inventory.items[uid!].defId;
    const effort = MIX_EFFORTS.find((e) => e.id === t.effort)!;
    for (const uid of new Set(Object.values(elements))) if (uid) wearItem(d, uid, randRange(d, 1, 3) * effort.wear);
    addXp(d, 'produktion', effort.xp);
    incStat(d, 'tracksMade');
    if (t.score > stat(d, 'bestTrack')) d.progression.stats.bestTrack = t.score;
    incStat(d, `genre:${t.genreId}`);
    const devices = [...new Set(Object.values(t.elements))].map((id) => itemDef(id!).name).join(', ');
    notify(d, {
      tone: 'success',
      title: `Track fertig: ${t.name}`,
      text: `${genreDef(t.genreId).name}, ${t.bpm} BPM · Wertung ${t.score} (${scoreLabel(t.score)}) · ${devices}`,
      link: '/studio/tracks',
    });
  },
  cancel(d, a) {
    unlock(d, a.id);
    d.music.tracks = d.music.tracks.filter((t) => t.id !== String(a.payload.trackId));
  },
};
