import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Circle, FileText, Loader } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { EVENT_TASKS } from '../../../game/content/events';
import { spotDef } from '../../../game/content/registry';
import { fmtCountdown, fmtMoney, fmtNumber } from '../../../game/core/format';
import { gameTimeAt, formatGameClock } from '../../../game/core/time';
import { cancelEvent, startEventTask } from '../../../game/systems/events/actions';
import { upcomingEvents } from '../../../game/systems/events/plan';
import type { GameEvent } from '../../../game/systems/events/state';
import { activitiesByChannel } from '../../../game/systems/activities/logic';
import { ActivityRow } from '../../components/ActivityList';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Card, EmptyState, PageHeader, ProgressBar, Tabs } from '../../components/ui';
import { navigate, useRoute } from '../../router';
import { Planner } from './Planner';
import { ReportModal } from './ReportModal';
import { SupplyTab } from './SupplyTab';

type EventsTab = 'plan' | 'upcoming' | 'reports' | 'supply';

export function EventCard({ ev }: { ev: GameEvent }) {
  const s = useGameState();
  const t = gameTimeAt(s.clock, ev.startsAt);
  const running = ev.status === 'running';
  const paid = Object.values(ev.paid).reduce((a, b) => a + b, 0);
  return (
    <Card accent={running} testId={`event-${ev.id}`}>
      <div className="stack stack--s">
        <div className="row row--between">
          <strong>{ev.name}</strong>
          {running ? <Badge tone="accent">Läuft</Badge> : <Badge tone="info">in {fmtCountdown(ev.startsAt - s.clock.now)}</Badge>}
        </div>
        <div className="tiny faint">
          {spotDef(ev.spotId).name} · {formatGameClock(t)} · {ev.durationH} Std · {ev.entry > 0 ? fmtMoney(ev.entry) : 'Spende'} · Vorkosten {fmtMoney(paid)}
        </div>
        {running && ev.endsAt && <ProgressBar value={(s.clock.now - ev.startsAt) / (ev.endsAt - ev.startsAt)} running label="Party" />}
        {!running &&
          Object.entries(ev.tasks).map(([id, status]) => {
            const def = EVENT_TASKS.find((x) => x.id === id)!;
            return (
              <div key={id} className="row" style={{ alignItems: 'flex-start' }}>
                {status === 'done' ? <CheckCircle2 size={16} className="tone-success" /> : status === 'running' ? <Loader size={16} className="tone-accent" /> : <Circle size={16} className="faint" />}
                <div className="grow">
                  <div className="small" style={{ fontWeight: 600 }}>
                    {def.label}
                  </div>
                  {status === 'open' && <div className="tiny faint">{def.description}</div>}
                </div>
                {status === 'open' && (
                  <ActionButton action={startEventTask} payload={{ eventId: ev.id, taskId: id }} small showReason={false} testId={`task-${id}`}>
                    {def.minutes} Min
                  </ActionButton>
                )}
              </div>
            );
          })}
        {!running && (
          <ActionButton action={cancelEvent} payload={{ eventId: ev.id }} variant="ghost" small showReason={false}>
            Absagen (Hälfte der Miete zurück)
          </ActionButton>
        )}
      </div>
    </Card>
  );
}

export function EventsScreen() {
  const s = useGameState();
  const parts = useRoute().split('/').filter(Boolean);
  const sub = parts[1];
  const upcoming = upcomingEvents(s);
  const [tab, setTab] = useState<EventsTab>(upcoming.length > 0 ? 'upcoming' : 'plan');
  useEffect(() => {
    if (sub === 'bericht') setTab('reports');
    if (sub === 'versorgung') setTab('supply');
  }, [sub]);
  const done = s.events.list.filter((e) => e.status === 'done' || e.status === 'cancelled').reverse();
  const tasks = activitiesByChannel(s, 'event');

  return (
    <div className="page" data-testid="screen-events">
      <PageHeader title="Events" subtitle={`${s.progression.stats.eventsHeld ?? 0} Partys veranstaltet`} />
      {tasks.length > 0 && (
        <Card className="card--flush" accent>
          <div className="list">
            {tasks.map((a) => (
              <ActivityRow key={a.id} a={a} now={s.clock.now} />
            ))}
          </div>
        </Card>
      )}
      <Tabs<EventsTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'plan', label: 'Planen' },
          { id: 'upcoming', label: 'Termine', count: upcoming.length },
          { id: 'reports', label: 'Berichte', count: done.length },
          { id: 'supply', label: 'Versorgung' },
        ]}
      />
      {tab === 'plan' && <Planner onPlanned={() => setTab('upcoming')} />}
      {tab === 'upcoming' &&
        (upcoming.length === 0 ? (
          <Card>
            <EmptyState icon={<CalendarClock size={28} />} title="Nichts geplant" text="Plane eine Party – je mehr Vorlauf, desto mehr Leute hören davon." />
          </Card>
        ) : (
          <div className="grid grid--auto">
            {upcoming.map((ev) => (
              <EventCard key={ev.id} ev={ev} />
            ))}
          </div>
        ))}
      {tab === 'reports' &&
        (done.length === 0 ? (
          <Card>
            <EmptyState icon={<FileText size={28} />} title="Noch keine Berichte" />
          </Card>
        ) : (
          <Card className="card--flush">
            <div className="list">
              {done.map((ev) => (
                <button key={ev.id} className="list__row" onClick={() => navigate(`/events/bericht/${ev.id}`)} data-testid={`report-${ev.id}`}>
                  <span className="grow">
                    <strong>{ev.name}</strong>
                    <div className="tiny faint">
                      {spotDef(ev.spotId).name}
                      {ev.report ? ` · ${fmtNumber(ev.report.visitors)} Leute · Stimmung ${ev.report.scores.mood}` : ' · abgesagt'}
                    </div>
                  </span>
                  {ev.report && <span className={`num small ${ev.report.profit >= 0 ? 'tone-success' : 'tone-danger'}`}>{fmtMoney(ev.report.profit, { sign: true })}</span>}
                </button>
              ))}
            </div>
          </Card>
        ))}
      {tab === 'supply' && <SupplyTab />}
      {sub === 'bericht' && parts[2] && <ReportModal eventId={parts[2]} onClose={() => navigate('/events')} />}
    </div>
  );
}
