export interface RunRecord {
  name: string;
  crew?: string;
  reputation: number;
  days: number;
  festivals: number;
  scenario: string;
  endedAt: number;
  gained: number;
}

/** Survives a new start ("Vermächtnis"). */
export interface LegacyState {
  runs: number;
  points: number;
  perks: Record<string, number>;
  history: RunRecord[];
  /** Scenario of the current run. */
  scenario: string;
}

export function createLegacyState(): LegacyState {
  return { runs: 0, points: 0, perks: {}, history: [], scenario: 'sc.classic' };
}
