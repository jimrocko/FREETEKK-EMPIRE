export interface Message {
  id: string;
  /** Person id (thread). */
  from: string;
  at: number;
  text: string;
  /** Written by the player (answer). */
  mine?: boolean;
  templateId?: string;
  /** Unanswered decision until resolved. */
  open?: boolean;
  expiresAt?: number;
  /** Choice id or 'expired'. */
  resolved?: string;
  /** Arrived while the game was open (expiry penalties only apply then). */
  online?: boolean;
  read: boolean;
}

export interface QueuedMessage {
  templateId: string;
  from: string;
  deliverAt: number;
}

export interface MessagesState {
  list: Message[];
  nextId: number;
  nextRollAt: number;
  queue: QueuedMessage[];
  /** Template id → last time sent. */
  sent: Record<string, number>;
}

export function createMessagesState(now: number): MessagesState {
  return { list: [], nextId: 1, nextRollAt: now + 3 * 60_000, queue: [], sent: {} };
}
