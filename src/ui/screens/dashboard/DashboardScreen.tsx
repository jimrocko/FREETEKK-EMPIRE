import { Activity as ActivityIcon, Bell, Briefcase, ChevronRight, Gauge, Map as MapIcon, MessageCircle, Star, Target } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { fmtMoney, fmtNumber } from '../../../game/core/format';
import { cityDef, repTierFor } from '../../../game/content/registry';
import { warnings } from '../../../game/selectors';
import { cityDistricts, districtState, openRumors } from '../../../game/systems/map/logic';
import { knownSpots } from '../../../game/systems/spots/logic';
import { openMessages } from '../../../game/systems/messages/logic';
import { personDef } from '../../../game/content/registry';
import { displayName } from '../../../game/systems/people/logic';
import { fmtCountdown } from '../../../game/core/format';
import { Avatar } from '../network/Avatar';
import { upcomingEvents } from '../../../game/systems/events/plan';
import { EventCard } from '../events/EventsScreen';
import { activeGoals } from '../../../game/systems/goals/logic';
import { jobListings, jobPay } from '../../../game/systems/jobs/logic';
import { startJob } from '../../../game/systems/jobs/actions';
import { ActivityList } from '../../components/ActivityList';
import { FeedList } from '../../components/FeedList';
import { SkillList } from '../../components/SkillList';
import { GoalCard } from '../../components/GoalCard';
import { ActionButton } from '../../components/ActionButton';
import { Banner, Button, Card, CardHead, EmptyState, ProgressBar } from '../../components/ui';
import { navigate } from '../../router';
import { ActionTiles, HqHero } from './HqHero';
import { HappeningCard, ModifierList } from '../../components/HappeningCard';

export function DashboardScreen() {
  const s = useGameState();
  const rep = repTierFor(s.progression.reputation);
  const warns = warnings(s);
  const goals = activeGoals(s).slice(0, 4);
  const quickJobs = jobListings(s)
    .filter((l) => l.available)
    .sort((a, b) => b.job.pay / b.job.durationMin - a.job.pay / a.job.durationMin)
    .slice(0, 3);
  const feed = [...s.notifications.feed].reverse().slice(0, 5);
  const districts = cityDistricts(s);
  const cityExplored = Math.round(districts.reduce((sum, d) => sum + districtState(s, d.id).explored, 0) / districts.length);
  const spotsKnown = knownSpots(s).length;
  const rumorsOpen = openRumors(s).length;
  const decisions = openMessages(s);
  const events = upcomingEvents(s);

  return (
    <div className="page" data-testid="screen-dashboard">
      <HqHero />
      {warns.map((w) => (
        <div key={w.id} onClick={w.link ? () => navigate(w.link!) : undefined} style={{ cursor: w.link ? 'pointer' : undefined }}>
          <Banner tone={w.tone}>{w.text}</Banner>
        </div>
      ))}

      <ActionTiles />

      <div className="dash">
        <div className="stack">
          {decisions.length > 0 && (
            <Card className="card--flush" accent testId="card-decisions">
              <div style={{ padding: '16px 16px 0' }}>
                <CardHead icon={<MessageCircle size={15} />} title="Wartet auf Antwort" right={<span className="tiny faint">{decisions.length}</span>} />
              </div>
              <div className="list">
                {decisions.slice(0, 3).map((m) => {
                  const def = personDef(m.from);
                  return (
                    <button key={m.id} className="list__row" onClick={() => navigate(`/netzwerk/chat/${m.from}`)}>
                      <Avatar def={def} />
                      <span className="grow" style={{ minWidth: 0 }}>
                        <strong>{displayName(def)}</strong>
                        <span className="small dim" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.text}
                        </span>
                      </span>
                      {m.expiresAt !== undefined && <span className="tiny tone-warning num">{fmtCountdown(m.expiresAt - s.clock.now)}</span>}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {s.happenings.open.map((h) => (
            <HappeningCard key={h.id} h={h} />
          ))}

          {events.length > 0 && events.slice(0, 2).map((ev) => <EventCard key={ev.id} ev={ev} />)}

          <ModifierList />

          <Card className="card--flush" testId="card-activities">
            <div style={{ padding: '16px 16px 0' }}>
              <CardHead icon={<ActivityIcon size={15} />} title="Läuft gerade" right={<span className="tiny faint">{s.activities.running.length}</span>} />
            </div>
            {s.activities.running.length > 0 ? (
              <ActivityList />
            ) : (
              <EmptyState icon={<Gauge size={28} />} title="Gerade läuft nichts" text="Starte einen Job oder inseriere etwas – Timer laufen auch weiter, wenn du das Spiel schließt." />
            )}
          </Card>

          <Card testId="card-quickjobs">
            <CardHead
              icon={<Briefcase size={15} />}
              title="Schnelles Geld"
              right={
                <Button small variant="ghost" onClick={() => navigate('/jobs')}>
                  Alle <ChevronRight size={14} />
                </Button>
              }
            />
            <div className="stack">
              {quickJobs.map(({ job }) => (
                <div key={job.id} className="row">
                  <div className="grow">
                    <div style={{ fontWeight: 650 }}>{job.name}</div>
                    <div className="tiny dim">
                      {job.durationMin} Min · {fmtMoney(jobPay(s, job))}
                    </div>
                  </div>
                  <ActionButton action={startJob} payload={{ jobId: job.id }} small showReason={false} testId={`quickjob-${job.id}`}>
                    Starten
                  </ActionButton>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHead
              icon={<Target size={15} />}
              title="Missionen"
              right={
                <Button small variant="ghost" onClick={() => navigate('/fortschritt')}>
                  Alle <ChevronRight size={14} />
                </Button>
              }
            />
            <div className="stack">
              {goals.length === 0 && <p className="dim small">Alle sichtbaren Ziele erledigt. Neue Ziele erscheinen mit deinem Fortschritt.</p>}
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g} compact />
              ))}
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card testId="card-city">
            <CardHead
              icon={<MapIcon size={15} />}
              title={cityDef(s.map.cityId).name}
              right={
                <Button small variant="ghost" onClick={() => navigate('/karte')}>
                  Karte <ChevronRight size={14} />
                </Button>
              }
            />
            <div className="grid grid--2">
              <div>
                <div className="stat__label">Erkundet</div>
                <div className="stat__value">{cityExplored} %</div>
              </div>
              <div>
                <div className="stat__label">Spots</div>
                <div className="stat__value">{spotsKnown}</div>
              </div>
            </div>
            {rumorsOpen > 0 && (
              <Button block small variant="ghost" onClick={() => navigate('/karte/geruechte')}>
                <span className="tone-discovery">{rumorsOpen} offene{rumorsOpen === 1 ? 's' : ''} Gerücht{rumorsOpen === 1 ? '' : 'e'}</span>
              </Button>
            )}
          </Card>

          <Card className="card--flush">
            <div style={{ padding: '16px 16px 0' }}>
              <CardHead
                icon={<Bell size={15} />}
                title="Neuigkeiten"
                right={
                  <Button small variant="ghost" onClick={() => navigate('/neuigkeiten')}>
                    Alle <ChevronRight size={14} />
                  </Button>
                }
              />
            </div>
            <FeedList entries={feed} now={s.clock.now} lastReadId={s.notifications.lastReadId} />
          </Card>

          <Card>
            <CardHead icon={<Star size={15} />} title={`Status: ${rep.tier.name}`} />
            <p className="small dim" style={{ marginBottom: 10 }}>
              {rep.tier.description}
            </p>
            {rep.next && (
              <>
                <ProgressBar value={rep.progress} label="Reputation" />
                <div className="tiny faint" style={{ marginTop: 6 }}>
                  Nächste Stufe: {rep.next.name} ab {fmtNumber(rep.next.min)}
                </div>
              </>
            )}
          </Card>

          <Card>
            <CardHead icon={<Gauge size={15} />} title="Fähigkeiten" />
            <SkillList />
          </Card>
        </div>
      </div>
    </div>
  );
}
