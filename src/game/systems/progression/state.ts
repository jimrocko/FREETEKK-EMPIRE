import type { SkillId } from '../../core/types';

export interface ProgressionState {
  /** XP per skill. */
  skills: Record<SkillId, number>;
  reputation: number;
  /** Unlock id → time unlocked. */
  unlocks: Record<string, number>;
  /** Szenepunkte to spend in the unlock tree. */
  points: number;
  /** All Szenepunkte ever earned. */
  pointsTotal: number;
  /** Generic story/state flags. */
  flags: Record<string, number>;
  /** Lifetime counters used by goals and conditions. */
  stats: Record<string, number>;
}

export function createProgressionState(): ProgressionState {
  return {
    skills: { produktion: 0, technik: 0, organisation: 0, netzwerk: 0, business: 0 },
    reputation: 0,
    unlocks: {},
    points: 0,
    pointsTotal: 0,
    flags: {},
    stats: {},
  };
}
