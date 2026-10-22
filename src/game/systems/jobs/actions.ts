import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { jobDef, JOBS_BY_ID } from '../../content/registry';
import { startActivity } from '../activities/logic';
import { jobReason } from './logic';

export const startJob = defineAction<{ jobId: string }>({
  id: 'jobs.start',
  check: (s, p) => {
    const job = JOBS_BY_ID.get(p.jobId);
    if (!job) return 'Unbekannter Job.';
    return jobReason(s, job);
  },
  run: (d, p) => {
    const job = jobDef(p.jobId);
    startActivity(d, {
      kind: 'job',
      channel: 'job',
      label: job.name,
      durationMs: minutes(job.durationMin),
      payload: { jobId: job.id },
    });
    return `Schicht gestartet: ${job.name}`;
  },
});
