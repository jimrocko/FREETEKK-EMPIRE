export interface ProjectState {
  /** Index of the next stage to run. */
  stage: number;
  running?: { stage: number; endsAt: number; startedAt: number };
  /** Completed runs (festival editions). */
  completed: number;
  /** Outcome of the last festival weekend. */
  lastResult?: { visitors: number; mood: number; revenue: number; costs: number; rep: number; at: number };
}

export interface ProjectsState {
  list: Record<string, ProjectState>;
}

export function createProjectsState(): ProjectsState {
  return { list: {} };
}
