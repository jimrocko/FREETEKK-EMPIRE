import type { GameState } from '../../state';
import type { Condition } from '../../core/types';
import type { GoalDef, GoalSize } from '../../content/types';
import { GOALS } from '../../content/goals';
import { checkAll, checkCondition, conditionProgress, describeCondition, type ConditionProgress } from '../../core/conditions';
import { applyEffects, describeEffects } from '../../core/effects';
import { notify } from '../../core/notify';

export const GOAL_SIZE_LABELS: Record<GoalSize, string> = {
  small: 'Klein',
  medium: 'Mittel',
  large: 'Groß',
  long: 'Langfristig',
};

export function isGoalDone(s: GameState, id: string): boolean {
  return s.goals.done[id] !== undefined;
}

export function isGoalVisible(s: GameState, g: GoalDef): boolean {
  return checkAll(s, g.requires);
}

export function activeGoals(s: GameState): GoalDef[] {
  return GOALS.filter((g) => !isGoalDone(s, g.id) && isGoalVisible(s, g));
}

export function completedGoals(s: GameState): GoalDef[] {
  return GOALS.filter((g) => isGoalDone(s, g.id)).sort((a, b) => s.goals.done[b.id] - s.goals.done[a.id]);
}

export interface GoalRequirementView {
  text: string;
  met: boolean;
  progress: ConditionProgress | null;
}

function flatten(list: readonly Condition[]): Condition[] {
  // Show "all" groups as separate lines; keep "any" as one line.
  const out: Condition[] = [];
  for (const c of list) {
    if (c.t === 'all') out.push(...flatten(c.of));
    else out.push(c);
  }
  return out;
}

export function goalRequirements(s: GameState, g: GoalDef): GoalRequirementView[] {
  return flatten(g.complete).map((c) => ({
    text: describeCondition(c),
    met: checkCondition(s, c),
    progress: conditionProgress(s, c),
  }));
}

/** 0–1, averaged over countable requirements. */
export function goalProgress(s: GameState, g: GoalDef): number {
  const reqs = goalRequirements(s, g);
  if (reqs.length === 0) return 0;
  let sum = 0;
  for (const r of reqs) {
    if (r.met) sum += 1;
    else if (r.progress && r.progress.target > 0) sum += Math.min(1, r.progress.current / r.progress.target);
  }
  return sum / reqs.length;
}

/** Completes every goal whose conditions hold. Rewards may complete further goals. */
export function checkGoals(d: GameState): void {
  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    for (const g of GOALS) {
      if (isGoalDone(d, g.id) || !isGoalVisible(d, g)) continue;
      if (!checkAll(d, g.complete)) continue;
      d.goals.done[g.id] = d.clock.now;
      applyEffects(d, g.rewards);
      const reward = describeEffects(g.rewards);
      notify(d, {
        tone: 'success',
        title: `Ziel erreicht: ${g.title}`,
        text: reward ? `Belohnung: ${reward}` : undefined,
        link: '/fortschritt',
      });
      changed = true;
    }
    if (!changed) break;
  }
}
