import type { GameState } from '../../state';
import type { ActivityChannel, Reason } from '../../core/types';
import type { Activity, ActivityPayload } from './state';

export const BASE_CAPACITY: Record<ActivityChannel, number> = {
  job: 1,
  explore: 1,
  social: 1,
  studio: 1,
  workshop: 1,
  errand: 1,
  event: 1,
  market: 3,
};

export const CHANNEL_LABELS: Record<ActivityChannel, string> = {
  job: 'Job',
  explore: 'Erkundung',
  social: 'Treffen',
  studio: 'Studio',
  workshop: 'Werkstatt',
  errand: 'Besorgungen',
  event: 'Event-Vorbereitung',
  market: 'Inserate',
};

const CHANNEL_BUSY: Record<ActivityChannel, string> = {
  job: 'Du arbeitest gerade schon.',
  explore: 'Du bist schon unterwegs.',
  social: 'Du bist schon verabredet.',
  studio: 'Im Studio läuft schon eine Produktion.',
  workshop: 'Die Werkbank ist belegt.',
  errand: 'Alle Besorgungs-Slots sind belegt.',
  event: 'Alle Vorbereitungs-Slots sind belegt.',
  market: 'Maximale Anzahl Inserate erreicht.',
};

/** Crew roles that add a parallel slot to a channel (when motivated). */
const CREW_CHANNEL: Partial<Record<string, ActivityChannel>> = {
  technician: 'workshop',
  driver: 'errand',
  organizer: 'event',
  producer: 'studio',
  artist: 'studio',
};

export function crewCapacity(s: GameState, channel: ActivityChannel): number {
  let n = 0;
  for (const m of s.crew.members) if (m.morale >= 30 && CREW_CHANNEL[m.role] === channel) n++;
  return n;
}

export function channelCapacity(s: GameState, channel: ActivityChannel): number {
  return BASE_CAPACITY[channel] + (s.activities.capacityBonus[channel] ?? 0) + crewCapacity(s, channel);
}

export function channelUsage(s: GameState, channel: ActivityChannel): number {
  let n = 0;
  for (const a of s.activities.running) if (a.channel === channel) n++;
  return n;
}

export function channelReason(s: GameState, channel: ActivityChannel): Reason {
  return channelUsage(s, channel) >= channelCapacity(s, channel) ? CHANNEL_BUSY[channel] : null;
}

export interface StartActivityInput {
  kind: string;
  channel: ActivityChannel;
  label: string;
  durationMs: number;
  payload?: ActivityPayload;
}

export function startActivity(d: GameState, input: StartActivityInput): Activity {
  const now = d.clock.now;
  const activity: Activity = {
    id: `a${d.activities.nextId++}`,
    kind: input.kind,
    channel: input.channel,
    label: input.label,
    startedAt: now,
    endsAt: now + Math.max(1000, Math.round(input.durationMs)),
    payload: input.payload ?? {},
  };
  d.activities.running.push(activity);
  return activity;
}

export function findActivity(s: GameState, id: string): Activity | undefined {
  return s.activities.running.find((a) => a.id === id);
}

export function removeActivity(d: GameState, id: string): Activity | undefined {
  const idx = d.activities.running.findIndex((a) => a.id === id);
  if (idx < 0) return undefined;
  return d.activities.running.splice(idx, 1)[0];
}

export function activityProgress(a: Activity, now: number): number {
  const total = a.endsAt - a.startedAt;
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, (now - a.startedAt) / total));
}

export function activitiesByChannel(s: GameState, channel: ActivityChannel): Activity[] {
  return s.activities.running.filter((a) => a.channel === channel);
}
