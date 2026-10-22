import type { GameState } from '../../state';
import type { Reason } from '../../core/types';
import type { JobDef } from '../../content/types';
import { JOBS } from '../../content/jobs';
import { checkAll, requirementReason } from '../../core/conditions';
import { channelReason } from '../activities/logic';

export function jobRequirementReason(s: GameState, job: JobDef): Reason {
  return requirementReason(s, job.requires);
}

export function jobReason(s: GameState, job: JobDef): Reason {
  return jobRequirementReason(s, job) ?? channelReason(s, 'job');
}

/** Hourly pay (without bonus) – used for comparison in the UI. */
export function jobPayPerHour(job: JobDef): number {
  return (job.pay / job.durationMin) * 60;
}

export interface JobListing {
  job: JobDef;
  available: boolean;
  reason: Reason;
}

/**
 * All jobs the player may see: available ones plus locked ones that are
 * "close" (the next few by requirements) as teasers.
 */
export function jobListings(s: GameState): JobListing[] {
  const list: JobListing[] = [];
  let lockedShown = 0;
  for (const job of JOBS) {
    if (job.visibleWhen && !checkAll(s, job.visibleWhen)) continue;
    const req = jobRequirementReason(s, job);
    if (req) {
      if (lockedShown >= 3) continue;
      lockedShown++;
      list.push({ job, available: false, reason: req });
    } else {
      list.push({ job, available: true, reason: channelReason(s, 'job') });
    }
  }
  return list;
}
