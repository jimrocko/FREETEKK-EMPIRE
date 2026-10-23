import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { SPOTS_BY_ID, spotDef } from '../../content/registry';
import { channelReason, startActivity } from '../activities/logic';
import { spotCheckMinutes } from './logic';

export const checkSpot = defineAction<{ spotId: string }>({
  id: 'spots.check',
  check: (s, p) => {
    const st = s.spots.spots[p.spotId];
    if (!SPOTS_BY_ID.has(p.spotId) || !st?.known) return 'Spot ist unbekannt.';
    if (SPOTS_BY_ID.get(p.spotId)!.cityId !== s.map.cityId) return 'Liegt in einer anderen Stadt.';
    if (s.activities.running.some((a) => a.kind === 'spot-check' && a.payload.spotId === p.spotId)) return 'Wird gerade gecheckt.';
    return channelReason(s, 'explore');
  },
  run: (d, p) => {
    const def = spotDef(p.spotId);
    startActivity(d, {
      kind: 'spot-check',
      channel: 'explore',
      label: `Spot checken: ${def.name}`,
      durationMs: minutes(spotCheckMinutes(d, def.id)),
      payload: { spotId: def.id },
    });
    return `Du fährst raus zu ${def.name}.`;
  },
});
