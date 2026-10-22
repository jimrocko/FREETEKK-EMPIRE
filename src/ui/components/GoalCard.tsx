import { CheckCircle2, Circle } from 'lucide-react';
import type { GoalDef } from '../../game/content/types';
import { GOAL_SIZE_LABELS, goalProgress, goalRequirements } from '../../game/systems/goals/logic';
import { describeEffects } from '../../game/core/effects';
import { fmtNumber } from '../../game/core/format';
import { useGameState } from '../../app/store';
import { Badge, ProgressBar, type BadgeTone } from './ui';

const SIZE_TONE: Record<GoalDef['size'], BadgeTone> = { small: 'default', medium: 'info', large: 'discovery', long: 'accent' };

export function GoalCard({ goal, compact }: { goal: GoalDef; compact?: boolean }) {
  const s = useGameState();
  const done = s.goals.done[goal.id] !== undefined;
  const reqs = goalRequirements(s, goal);
  return (
    <div className="stack stack--s" data-testid={`goal-${goal.id}`}>
      <div className="row row--between">
        <strong>{goal.title}</strong>
        <Badge tone={done ? 'success' : SIZE_TONE[goal.size]}>{done ? 'Erledigt' : GOAL_SIZE_LABELS[goal.size]}</Badge>
      </div>
      {!compact && <p className="small dim">{goal.description}</p>}
      {!done && <ProgressBar value={goalProgress(s, goal)} thin label={goal.title} />}
      {!compact &&
        reqs.map((r, i) => (
          <div key={i} className="row small">
            {r.met ? <CheckCircle2 size={14} className="tone-success" /> : <Circle size={14} className="faint" />}
            <span className={r.met ? 'dim' : undefined}>{r.text}</span>
            {r.progress && !r.met && (
              <span className="faint num" style={{ marginLeft: 'auto' }}>
                {fmtNumber(Math.min(r.progress.current, r.progress.target))} / {fmtNumber(r.progress.target)}
              </span>
            )}
          </div>
        ))}
      <div className="tiny faint">Belohnung: {describeEffects(goal.rewards) || '—'}</div>
    </div>
  );
}
