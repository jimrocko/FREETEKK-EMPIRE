import type { GameState } from '../../state';
import type { Activity } from './state';

/** Completion logic for one activity kind. */
export interface ActivityHandler {
  complete(d: GameState, a: Activity): void;
  /** Called when the player cancels; undo locks, refund, … */
  cancel?(d: GameState, a: Activity): void;
  /** Label for the cancel button; omit to make the activity non-cancellable. */
  cancelLabel?: string;
}
