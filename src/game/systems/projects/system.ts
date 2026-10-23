import type { GameSystem } from '../../core/simulation';
import { PROJECTS } from '../../content/projects';
import { hasFlag } from '../progression/logic';
import { finishStage } from './logic';

export const LOCATION_UPKEEP = 150;

export const projectsSystem: GameSystem = {
  id: 'projects',
  nextDue(s) {
    let next: number | null = null;
    for (const st of Object.values(s.projects.list)) if (st.running && (next === null || st.running.endsAt < next)) next = st.running.endsAt;
    return next;
  },
  process(d) {
    for (const def of PROJECTS) {
      const st = d.projects.list[def.id];
      if (st?.running && st.running.endsAt <= d.clock.now) finishStage(d, def.id);
    }
  },
  dailyCosts(s) {
    return hasFlag(s, 'ownLocation') ? [{ id: 'location', label: 'Halle am Kanal (Unterhalt)', perDay: LOCATION_UPKEEP, category: 'property' }] : [];
  },
  rates(s) {
    const releases = s.progression.stats.releases ?? 0;
    return hasFlag(s, 'label') && releases > 0 ? [{ id: 'label', label: 'Label-Katalog', perHour: releases * 6, category: 'music' }] : [];
  },
};
