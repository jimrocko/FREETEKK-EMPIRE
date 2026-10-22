import { Briefcase, Compass, Disc3, Hammer, Package, PartyPopper, Tag, Users, X } from 'lucide-react';
import type { ActivityChannel } from '../../game/core/types';
import type { Activity } from '../../game/systems/activities/state';
import { activityProgress, CHANNEL_LABELS } from '../../game/systems/activities/logic';
import { ACTIVITY_HANDLERS } from '../../game/systems/activities/handlers';
import { cancelActivity } from '../../game/systems/activities/actions';
import { fmtCountdown } from '../../game/core/format';
import { useGameState } from '../../app/store';
import { dispatch } from '../../app/runtime';
import { Button, ProgressBar } from './ui';

const CHANNEL_ICONS: Record<ActivityChannel, typeof Briefcase> = {
  job: Briefcase,
  explore: Compass,
  social: Users,
  studio: Disc3,
  workshop: Hammer,
  errand: Package,
  event: PartyPopper,
  market: Tag,
};

export function ActivityRow({ a, now }: { a: Activity; now: number }) {
  const Icon = CHANNEL_ICONS[a.channel];
  const cancelLabel = ACTIVITY_HANDLERS[a.kind]?.cancelLabel;
  return (
    <div className="activity" data-testid="activity">
      <div className="activity__top">
        <div className="icon-box">
          <Icon size={18} />
        </div>
        <div className="grow">
          <div style={{ fontWeight: 650 }}>{a.label}</div>
          <div className="tiny faint upper">{CHANNEL_LABELS[a.channel]}</div>
        </div>
        <div className="activity__time">{fmtCountdown(a.endsAt - now)}</div>
        {cancelLabel && (
          <Button icon small variant="ghost" title={cancelLabel} aria-label={cancelLabel} onClick={() => dispatch(cancelActivity, { id: a.id })}>
            <X size={16} />
          </Button>
        )}
      </div>
      <ProgressBar value={activityProgress(a, now)} running thin label={a.label} />
    </div>
  );
}

export function ActivityList({ channel }: { channel?: ActivityChannel }) {
  const s = useGameState();
  const list = s.activities.running.filter((a) => !channel || a.channel === channel).sort((a, b) => a.endsAt - b.endsAt);
  return (
    <div className="list">
      {list.map((a) => (
        <ActivityRow key={a.id} a={a} now={s.clock.now} />
      ))}
    </div>
  );
}
