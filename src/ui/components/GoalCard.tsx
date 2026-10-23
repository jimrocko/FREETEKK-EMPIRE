import { CheckCircle2, Circle, Crown, Medal, Target, Trophy } from 'lucide-react';
import { GOAL_POINTS } from '../../game/content/unlocks';
import type { GoalDef } from '../../game/content/types';
import { GOAL_SIZE_LABELS, goalProgress, goalRequirements } from '../../game/systems/goals/logic';
import { describeEffects } from '../../game/core/effects';
import { fmtNumber } from '../../game/core/format';
import { useGameState } from '../../app/store';
import { Badge, ProgressBar, type BadgeTone } from './ui';

const SIZE_TONE: Record<GoalDef['size'], BadgeTone> = { small: 'default', medium: 'info', large: 'discovery', long: 'accent' };
const SIZE_ICON = { small: Target, medium: Medal, large: Trophy, long: Crown };

export function GoalCard({ goal, compact }: { goal: GoalDef; compact?: boolean }) {
  const s = useGameState();
  const done = s.goals.done[goal.id] !== undefined;
  const reqs = goalRequirements(s, goal);
  const Icon = SIZE_ICON[goal.size];
  return (
    <div className="stack stack--s" data-testid={`goal-${goal.id}`}>
      <div className="row row--between">
        <span className="row" style={{ minWidth: 0 }}>
          <span className={`mission-icon mission-icon--${goal.size}`}>
            <Icon size={15} />
          </span>
          <strong className="mission-title">{goal.title}</strong>
        </span>
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
      <div className="row row--wrap" style={{ gap: 4 }}>
        {[...describeEffects(goal.rewards).split(' · ').filter(Boolean), `+${GOAL_POINTS[goal.size]} SP`].map((r) => (
          <span key={r} className="reward-chip">
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}
