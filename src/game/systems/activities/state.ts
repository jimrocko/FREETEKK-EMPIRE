import type { ActivityChannel } from '../../core/types';

export type ActivityPayload = Record<string, string | number | boolean>;

export interface Activity {
  id: string;
  /** Handler key, e.g. "job", "market-listing". */
  kind: string;
  channel: ActivityChannel;
  label: string;
  startedAt: number;
  endsAt: number;
  payload: ActivityPayload;
}

export interface ActivitiesState {
  running: Activity[];
  nextId: number;
  /** Extra parallel slots per channel (crew, upgrades). */
  capacityBonus: Partial<Record<ActivityChannel, number>>;
}

export function createActivitiesState(): ActivitiesState {
  return { running: [], nextId: 1, capacityBonus: {} };
}
