import type { GameState } from '../../../game/state';
import type { Condition } from '../../../game/core/types';
import { checkCondition, describeCondition } from '../../../game/core/conditions';

/** Lists conditions with their fulfilment state (for requirement checklists). */
export function goalRequirementsFor(s: GameState, list: readonly Condition[]): { text: string; met: boolean }[] {
  return list.map((c) => ({ text: describeCondition(c), met: checkCondition(s, c) }));
}
