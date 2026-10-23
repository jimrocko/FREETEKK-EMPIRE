import type { ModifierKind } from '../../core/types';

/** A random event waiting for a decision. */
export interface OpenHappening {
  id: string;
  defId: string;
  at: number;
  expiresAt?: number;
  title: string;
  text: string;
  /** Picked target: item uid, event id, person id, spot id. */
  ctx: Record<string, string>;
}

export interface HappeningLog {
  id: string;
  defId: string;
  at: number;
  title: string;
  text: string;
  /** Label of the chosen answer, 'expired' or none for notices. */
  choice?: string;
  result?: string;
}

export interface Modifier {
  id: string;
  kind: ModifierKind;
  value: number;
  until: number;
  label: string;
}

export interface HappeningsState {
  open: OpenHappening[];
  log: HappeningLog[];
  /** Def id → last time it happened. */
  last: Record<string, number>;
  nextRollAt: number;
  modifiers: Modifier[];
  nextId: number;
}

export function createHappeningsState(now: number): HappeningsState {
  return { open: [], log: [], last: {}, nextRollAt: now + 10 * 60_000, modifiers: [], nextId: 1 };
}
