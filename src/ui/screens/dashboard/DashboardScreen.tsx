import { Activity as ActivityIcon, Bell, Briefcase, ChevronRight, Coins, Gauge, Package, Star, Target, TrendingUp } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { fmtMoney, fmtNumber } from '../../../game/core/format';
import { formatGameClock, gameTimeAt } from '../../../game/core/time';
import { repTierFor } from '../../../game/content/registry';
import { economySummary, warnings } from '../../../game/selectors';
import { inventoryValue } from '../../../game/systems/inventory/logic';
import { activeGoals } from '../../../game/systems/goals/logic';
import { jobListings } from '../../../game/systems/jobs/logic';
import { startJob } from '../../../game/systems/jobs/actions';
import { ActivityList } from '../../components/ActivityList';
import { FeedList } from '../../components/FeedList';
import { SkillList } from '../../components/SkillList';
import { GoalCard } from '../../components/GoalCard';
import { ActionButton } from '../../components/ActionButton';
import { Banner, Button, Card, CardHead, EmptyState, PageHeader, ProgressBar, Stat } from '../../components/ui';
import { navigate } from '../../router';

export function DashboardScreen() {
  const s = useGameState();
  const time = gameTimeAt(s.clock, s.clock.now);
  const eco = economySummary(s);
  const rep = repTierFor(s.progression.reputation);
  const warns = warnings(s);
  const goals = activeGoals(s).slice(0, 4);
  const quickJobs = jobListings(s)
    .filter((l) => l.available)
    .sort((a, b) => b.job.pay / b.job.durationMin - a.job.pay / a.job.durationMin)
    .slice(0, 3);
  const feed = [...s.notifications.feed].reverse().slice(0, 5);
  const itemCount = Object.keys(s.inventory.items).length;

  return (
    <div className="page" data-testid="screen-dashboard">
      <PageHeader title={`Hey ${s.player.name}`} subtitle={`Tag ${time.day} · ${time.weekdayName} ${formatGameClock(time).slice(3)} · Steinhafen`} />

      {warns.map((w) => (
        <div key={w.id} onClick={w.link ? () => navigate(w.link!) : undefined} style={{ cursor: w.link ? 'pointer' : undefined }}>
          <Banner tone={w.tone}>{w.text}</Banner>
        </div>
      ))}

      <div className="grid grid--stats">
        <Stat
          label="Bargeld"
          icon={<Coins size={13} />}
          value={fmtMoney(s.finance.cash)}
          tone={s.finance.cash < 0 ? 'danger' : 'accent'}
          sub={`Inventar: ${fmtMoney(inventoryValue(s))}`}
        />
        <Stat
          label="Einnahmen/Std"
          icon={<TrendingUp size={13} />}
          value={fmtMoney(eco.lastHourIncome + eco.passivePerHour)}
          sub={`letzte Std · Fixkosten −${fmtMoney(eco.fixedPerHour)}`}
        />
        <Stat label="Reputation" icon={<Star size={13} />} value={rep.tier.name} sub={rep.next ? `${fmtNumber(s.progression.reputation)} / ${fmtNumber(rep.next.min)}` : fmtNumber(s.progression.reputation)} />
        <Stat label="Besitz" icon={<Package size={13} />} value={`${itemCount} Items`} sub={`${s.activities.running.length} Aktivität${s.activities.running.length === 1 ? '' : 'en'} laufen`} />
      </div>

      <div className="dash">
        <div className="stack">
          <Card className="card--flush" testId="card-activities">
            <div style={{ padding: '16px 16px 0' }}>
              <CardHead icon={<ActivityIcon size={15} />} title="Laufende Aktivitäten" right={<span className="tiny faint">{s.activities.running.length}</span>} />
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
              title="Schnell-Jobs"
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
                      {job.durationMin} Min · {fmtMoney(job.pay)}
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
              title="Nächste Ziele"
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
