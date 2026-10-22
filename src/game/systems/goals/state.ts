export interface GoalsState {
  /** Goal id → completion time. */
  done: Record<string, number>;
}

export function createGoalsState(): GoalsState {
  return { done: {} };
}
