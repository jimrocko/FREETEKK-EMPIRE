import type { GameSystem } from '../../core/simulation';
import type { SpotStats } from '../../content/types';
import { SPOTS } from '../../content/spots';
import { notify } from '../../core/notify';
import { chance, pick, randInt, randRange } from '../../core/rng';

interface SpotEventDef {
  id: string;
  text: string;
  mods: Partial<SpotStats>;
  condition?: number;
  outdoorOnly?: boolean;
}

/** Things that happen to places while nobody is looking. */
const SPOT_EVENTS: SpotEventDef[] = [
  { id: 'fence', text: 'Jemand hat einen neuen Bauzaun aufgestellt. Die Zufahrt ist schwieriger geworden.', mods: { access: -12 } },
  { id: 'cleanup', text: 'Anwohner haben aufgeräumt. Der Spot ist in besserem Zustand.', mods: {}, condition: 15 },
  { id: 'patrol', text: 'Ein Sicherheitsdienst fährt hier neuerdings Streife.', mods: { security: -10 } },
  { id: 'storm', text: 'Ein Sturm hat Schäden hinterlassen.', mods: {}, condition: -18, outdoorOnly: true },
  { id: 'cable', text: 'Ein alter Stromanschluss wurde wieder freigelegt.', mods: { powerKw: 4 } },
];

export const spotsSystem: GameSystem = {
  id: 'spots',
  onNewDay(d, day) {
    for (const def of SPOTS) {
      const st = d.spots.spots[def.id];
      if (!st) continue;
      // Fame fades slowly, condition drifts (outdoor spots suffer from weather).
      st.fame = Math.max(0, st.fame * 0.97);
      const drift = def.stats.weather > 50 ? randRange(d, -0.6, 0.3) : randRange(d, -0.3, 0.3);
      st.condition = Math.max(10, Math.min(100, st.condition + drift));

      if (st.status === 'closed') {
        if (st.closedUntilDay !== undefined && day >= st.closedUntilDay) {
          st.status = 'open';
          delete st.closedUntilDay;
          if (st.known) notify(d, { tone: 'info', title: `${def.name} ist wieder zugänglich`, text: 'Die Absperrung ist weg.', link: `/karte/spot/${def.id}` });
        }
        continue;
      }

      // Well-known unofficial spots get closed from time to time.
      if (def.legality !== 'legal' && st.fame > 40 && chance(d, (st.fame - 40) / 700)) {
        st.status = 'closed';
        st.closedUntilDay = day + randInt(d, 2, 6);
        st.intel = Math.min(st.intel, 70);
        if (st.known) {
          notify(d, { tone: 'warning', title: `${def.name} wurde abgesperrt`, text: 'Zu viel Aufmerksamkeit. Für ein paar Tage ist hier nichts zu machen.', link: `/karte/spot/${def.id}` });
        }
        continue;
      }

      if (chance(d, 0.004)) {
        const pool = SPOT_EVENTS.filter((e) => !e.outdoorOnly || def.stats.weather > 50);
        const ev = pick(d, pool);
        for (const [k, v] of Object.entries(ev.mods) as [keyof SpotStats, number][]) st.mods[k] = (st.mods[k] ?? 0) + v;
        if (ev.condition) st.condition = Math.max(10, Math.min(100, st.condition + ev.condition));
        st.intel = Math.min(st.intel, 60);
        if (st.known) notify(d, { tone: 'info', title: `Neuigkeit: ${def.name}`, text: `${ev.text} Ein neuer Check lohnt sich.`, link: `/karte/spot/${def.id}` });
      }
    }
  },
};
