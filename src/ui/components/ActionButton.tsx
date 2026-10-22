import type { ReactNode } from 'react';
import type { ActionDef, ActionResult } from '../../game/core/actions';
import { useActionReason } from '../hooks';
import { dispatch } from '../../app/runtime';
import { Button, Reason } from './ui';

interface Props<P> {
  action: ActionDef<P>;
  payload: P;
  children: ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  small?: boolean;
  block?: boolean;
  /** Show the reason text below the button when disabled (default true). */
  showReason?: boolean;
  onDone?: (r: ActionResult) => void;
  testId?: string;
}

/** A button bound to a game action: disabled with an explanation when the action is not possible. */
export function ActionButton<P>({ action, payload, children, variant, small, block, showReason = true, onDone, testId }: Props<P>) {
  const reason = useActionReason(action, payload);
  return (
    <div>
      <Button
        variant={variant}
        small={small}
        block={block}
        disabled={!!reason}
        title={reason ?? undefined}
        testId={testId}
        onClick={() => {
          const r = dispatch(action, payload);
          if (r.ok) onDone?.(r);
        }}
      >
        {children}
      </Button>
      {showReason && <Reason text={reason} />}
    </div>
  );
}
