import type { GameState } from '../state';
import type { Tone } from './types';

export interface FeedEntry {
  id: number;
  at: number;
  tone: Tone;
  title: string;
  text?: string;
  /** Hash route the entry links to, e.g. "/markt". */
  link?: string;
  /** A big moment (level up, new status, big goal) – the UI celebrates it. */
  big?: boolean;
}

export interface NotificationsState {
  feed: FeedEntry[];
  nextId: number;
  /** Highest id the player has seen in the feed. */
  lastReadId: number;
}

export const FEED_LIMIT = 200;

export function createNotificationsState(): NotificationsState {
  return { feed: [], nextId: 1, lastReadId: 0 };
}

export interface NotifyInput {
  tone?: Tone;
  title: string;
  text?: string;
  link?: string;
  big?: boolean;
}

export function notify(d: GameState, input: NotifyInput): FeedEntry {
  const n = d.notifications;
  const entry: FeedEntry = {
    id: n.nextId++,
    at: d.clock.now,
    tone: input.tone ?? 'info',
    title: input.title,
    ...(input.text ? { text: input.text } : {}),
    ...(input.link ? { link: input.link } : {}),
    ...(input.big ? { big: true } : {}),
  };
  n.feed.push(entry);
  if (n.feed.length > FEED_LIMIT) n.feed.splice(0, n.feed.length - FEED_LIMIT);
  return entry;
}

export function unreadCount(s: GameState): number {
  let c = 0;
  for (const e of s.notifications.feed) if (e.id > s.notifications.lastReadId) c++;
  return c;
}
