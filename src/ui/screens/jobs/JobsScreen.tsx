import { Briefcase, Clock, Lock, Star } from 'lucide-react';
import { useGameState } from '../../../app/store';
import type { SkillId } from '../../../game/core/types';
import { fmtMoney } from '../../../game/core/format';
import { SKILL_DEFS } from '../../../game/content/skills';
import { jobListings, jobPay, jobPayPerHour } from '../../../game/systems/jobs/logic';
import { startJob } from '../../../game/systems/jobs/actions';
import { activitiesByChannel } from '../../../game/systems/activities/logic';
import { ActivityRow } from '../../components/ActivityList';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Card, CardHead, PageHeader, Reason } from '../../components/ui';

export function JobsScreen() {
  const s = useGameState();
  const running = activitiesByChannel(s, 'job');
  const listings = jobListings(s);

  return (
    <div className="page" data-testid="screen-jobs">
      <PageHeader title="Nebenjobs" subtitle="Am Anfang verdienst du dein Geld selbst. Jeder Job trainiert eine andere Fähigkeit – und damit einen anderen Weg." />

      {running.length > 0 && (
        <Card className="card--flush" accent>
          <div style={{ padding: '16px 16px 0' }}>
            <CardHead icon={<Briefcase size={15} />} title="Aktuelle Schicht" />
          </div>
          <div className="list">
            {running.map((a) => (
              <ActivityRow key={a.id} a={a} now={s.clock.now} />
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid--auto">
        {listings.map(({ job, available, reason }) => (
          <Card key={job.id} className={available ? undefined : 'card--locked'} testId={`job-${job.id}`}>
            <div className="stack stack--s">
              <div className="row row--between">
                <strong>{job.name}</strong>
                {!available && <Lock size={15} className="faint" />}
              </div>
              <p className="small dim">{job.description}</p>
              <div className="row row--wrap">
                <Badge>
                  <Clock size={11} /> {job.durationMin} Min
                </Badge>
                <Badge tone="accent">{fmtMoney(jobPay(s, job))}</Badge>
                <Badge>{fmtMoney(jobPayPerHour(job))}/Std</Badge>
                {(Object.entries(job.xp) as [SkillId, number][]).map(([skill, xp]) => (
                  <Badge key={skill} tone="info">
                    +{xp} {SKILL_DEFS[skill].name}
                  </Badge>
                ))}
                {job.rep && (
                  <Badge tone="discovery">
                    <Star size={11} /> +{job.rep}
                  </Badge>
                )}
              </div>
              {job.bonus && <div className="tiny faint">Chance auf {job.bonus.text.toLowerCase()}</div>}
              {available ? (
                <ActionButton action={startJob} payload={{ jobId: job.id }} variant="primary" block testId={`start-${job.id}`}>
                  Schicht starten
                </ActionButton>
              ) : (
                <Reason text={reason} />
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
