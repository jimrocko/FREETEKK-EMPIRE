import { useCallback } from 'react';
import { useGameState } from '../app/store';
import { dispatch } from '../app/runtime';
import type { ActionDef, ActionResult } from '../game/core/actions';
import type { Reason } from '../game/core/types';

/** Checks an action against the current state (for disabling buttons with a reason). */
export function useActionReason<P>(action: ActionDef<P>, payload: P): Reason {
  const s = useGameState();
  return action.check(s, payload);
}

export function useDispatch(): <P>(action: ActionDef<P>, payload: P, opts?: { silent?: boolean }) => ActionResult {
  return useCallback((action, payload, opts) => dispatch(action, payload, opts), []);
}
