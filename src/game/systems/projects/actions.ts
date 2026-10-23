import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { fmtMoney } from '../../core/format';
import { notify } from '../../core/notify';
import type { ActivityHandler } from '../activities/handler';
import { channelReason, startActivity } from '../activities/logic';
import { earn, moneyReason, spend } from '../finance/logic';
import { addRep, hasFlag, incStat } from '../progression/logic';
import { doneTracks } from '../music/logic';
import { projectDef, stageReason, startStage } from './logic';

export const startProjectStage = defineAction<{ projectId: string }>({
  id: 'projects.stage',
  check: (s, p) => stageReason(s, p.projectId),
  run: (d, p) => {
    const def = projectDef(p.projectId);
    const stage = def.stages[d.projects.list[p.projectId]?.stage ?? 0];
    startStage(d, p.projectId);
    return `${def.name}: ${stage.name} läuft.`;
  },
});

export const RELEASE_COST = 800;
export const RELEASE_MINUTES = 20;

/** Your three best unreleased tracks. */
export function releaseCandidates(s: Parameters<typeof doneTracks>[0]) {
  return doneTracks(s)
    .filter((t) => t.releasedAt === undefined)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export const releaseEP = defineAction<Record<string, never>>({
  id: 'projects.release',
  check: (s) => {
    if (!hasFlag(s, 'label')) return 'Erst ein Label gründen (Projekt).';
    if (s.activities.running.some((a) => a.kind === 'release')) return 'Eine EP ist schon in Arbeit.';
    if (releaseCandidates(s).length < 3) return 'Für eine EP brauchst du drei unveröffentlichte Tracks.';
    return channelReason(s, 'studio') ?? moneyReason(s, RELEASE_COST);
  },
  run: (d) => {
    const tracks = releaseCandidates(d);
    spend(d, RELEASE_COST, 'music', 'EP: Mastering & Pressung');
    startActivity(d, { kind: 'release', channel: 'studio', label: 'EP veröffentlichen', durationMs: minutes(RELEASE_MINUTES), payload: { tracks: tracks.map((t) => t.id).join(',') } });
    return `EP mit ${tracks.map((t) => t.name).join(', ')} geht in die Pressung.`;
  },
});

export const releaseHandler: ActivityHandler = {
  complete(d, a) {
    const ids = String(a.payload.tracks).split(',');
    const tracks = d.music.tracks.filter((t) => ids.includes(t.id));
    if (tracks.length === 0) return;
    const avg = tracks.reduce((sum, t) => sum + t.score, 0) / tracks.length;
    for (const t of tracks) {
      t.releasedAt = d.clock.now;
      t.hype += 0.6;
    }
    const sales = Math.round(avg * 12);
    earn(d, sales, 'music', 'EP-Verkäufe');
    const rep = Math.round(avg / 4);
    addRep(d, rep);
    incStat(d, 'releases');
    notify(d, { tone: 'success', title: 'EP veröffentlicht', text: `${fmtMoney(sales, { sign: true })} · +${rep} Reputation · mehr Streams`, link: '/studio/tracks' });
  },
};
