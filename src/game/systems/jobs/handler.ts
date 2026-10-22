import type { ActivityHandler } from '../activities/handler';
import type { SkillId } from '../../core/types';
import { jobDef } from '../../content/registry';
import { SKILL_DEFS } from '../../content/skills';
import { fmtMoney } from '../../core/format';
import { notify } from '../../core/notify';
import { chance, randInt } from '../../core/rng';
import { earn } from '../finance/logic';
import { addRep, addXp, incStat } from '../progression/logic';

export const jobHandler: ActivityHandler = {
  cancelLabel: 'Schicht abbrechen',
  complete(d, a) {
    const job = jobDef(String(a.payload.jobId));
    earn(d, job.pay, 'job', job.name);
    const parts = [fmtMoney(job.pay, { sign: true })];
    if (job.bonus && chance(d, job.bonus.chance)) {
      const extra = randInt(d, job.bonus.min, job.bonus.max);
      earn(d, extra, 'job', `${job.bonus.text} (${job.name})`);
      parts.push(`${job.bonus.text} ${fmtMoney(extra, { sign: true })}`);
    }
    for (const [skill, xp] of Object.entries(job.xp) as [SkillId, number][]) {
      addXp(d, skill, xp);
      parts.push(`+${xp} XP ${SKILL_DEFS[skill].name}`);
    }
    if (job.rep) {
      addRep(d, job.rep);
      parts.push(`+${job.rep} Reputation`);
    }
    incStat(d, 'jobsDone');
    incStat(d, `job:${job.id}`);
    notify(d, { tone: 'success', title: `Schicht beendet: ${job.name}`, text: parts.join(' · '), link: '/jobs' });
  },
};
