import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Circle, FileText, Loader } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { EVENT_TASKS, eventFormat } from '../../../game/content/events';
import { PERSONS_BY_ID, spotDef } from '../../../game/content/registry';
import { shortName } from '../../../game/systems/people/logic';
import { forecast } from '../../../game/systems/events/simulate';
import { Equalizer } from '../../components/Equalizer';
import { fmtCountdown, fmtMoney, fmtNumber } from '../../../game/core/format';
import { gameTimeAt, formatGameClock } from '../../../game/core/time';
import { cancelEvent, startEventTask } from '../../../game/systems/events/actions';
import { upcomingEvents } from '../../../game/systems/events/plan';
import type { GameEvent } from '../../../game/systems/events/state';
import { activitiesByChannel } from '../../../game/systems/activities/logic';
import { ActivityRow } from '../../components/ActivityList';
import { ActionButton } from '../../components/ActionButton';
import { Card, EmptyState, PageHeader, ProgressBar, Tabs } from '../../components/ui';
import { navigate, useRoute } from '../../router';
import { Planner } from './Planner';
import { ReportModal } from './ReportModal';
import { SupplyTab } from './SupplyTab';

type EventsTab = 'plan' | 'upcoming' | 'reports' | 'supply';

function lineupNames(ev: GameEvent): string {
  return ev.lineup
    .map((id) => (id === 'self' ? 'Du' : id === 'live' ? 'Dein Live-Set' : id === 'sub' ? 'Ersatz-DJ' : (PERSONS_BY_ID.get(id) ? shortName(PERSONS_BY_ID.get(id)!) : id)))
    .join(' · ');
}

/** An upcoming or running party, styled as a flyer. */
export function EventCard({ ev }: { ev: GameEvent }) {
  const s = useGameState();
  const t = gameTimeAt(s.clock, ev.startsAt);
  const running = ev.status === 'running';
  const paid = Object.values(ev.paid).reduce((a, b) => a + b, 0);
  const progress = running && ev.endsAt ? Math.max(0, Math.min(1, (s.clock.now - ev.startsAt) / (ev.endsAt - ev.startsAt))) : 0;
  const crowd = running ? Math.round((forecast(s, ev)?.visitors ?? 0) * Math.min(1, 0.35 + progress * 1.3)) : 0;
  const format = eventFormat(ev.format);
  return (
    <section className={['flyer', running && 'flyer--live'].filter(Boolean).join(' ')} data-testid={`event-${ev.id}`}>
      <span className="flyer__stamp">{running ? 'LIVE' : 'ANGESAGT'}</span>
      <div className="flyer__date">
        {t.weekdayName} · {formatGameClock(t).slice(3)} · {running ? 'jetzt' : `in ${fmtCountdown(ev.startsAt - s.clock.now)}`}
      </div>
      <div className="flyer__name">{ev.name}</div>
      <div className="flyer__line">
        @ {spotDef(ev.spotId).name} · {format.id !== 'party' ? `${format.label} · ` : ''}
        {ev.durationH} Std · {ev.entry > 0 ? fmtMoney(ev.entry) : 'Spende'}
      </div>
      <div className="flyer__line" style={{ color: 'var(--text)' }}>
        {lineupNames(ev)}
      </div>
      {running ? (
        <>
          <Equalizer className="live-eq" bars={34} speed={1.5} />
          <ProgressBar value={progress} running label="Party" />
          <div className="row row--between tiny" style={{ marginTop: 6 }}>
            <span className="row">
              <span className="pulse-dot" /> ca. {fmtNumber(crowd)} Leute auf dem Floor
            </span>
            {ev.endsAt && <span className="num faint">noch {fmtCountdown(Math.max(0, ev.endsAt - s.clock.now))}</span>}
          </div>
        </>
      ) : (
        <div className="stack stack--s" style={{ marginTop: 10 }}>
          <div className="tiny faint">Vorkosten bezahlt: {fmtMoney(paid)}</div>
          {Object.entries(ev.tasks).map(([id, status]) => {
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
          <ActionButton action={cancelEvent} payload={{ eventId: ev.id }} variant="ghost" small showReason={false}>
            Absagen (Hälfte der Miete zurück)
          </ActionButton>
        </div>
      )}
    </section>
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
