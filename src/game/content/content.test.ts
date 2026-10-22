import { describe, expect, it } from 'vitest';
import { validateContent } from './validate';
import { ALL_ITEMS } from './items';
import { JOBS } from './jobs';
import { GOALS } from './goals';

describe('content', () => {
  it('has no duplicate ids or dangling references', () => {
    expect(validateContent()).toEqual([]);
  });

  it('meets the minimum amount for phase 1', () => {
    expect(ALL_ITEMS.length).toBeGreaterThanOrEqual(20);
    expect(JOBS.length).toBeGreaterThanOrEqual(10);
    expect(GOALS.length).toBeGreaterThanOrEqual(15);
  });

  it('better jobs pay more per hour than the starter job', () => {
    const flyer = JOBS.find((j) => j.id === 'job.flyer')!;
    const base = flyer.pay / flyer.durationMin;
    for (const job of JOBS) if (job.requires) expect(job.pay / job.durationMin).toBeGreaterThan(base);
  });
});
