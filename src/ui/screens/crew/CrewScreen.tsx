import { useEffect, useState } from 'react';
import { Flag, UserMinus, UserPlus, Users } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { personDef } from '../../../game/content/registry';
import type { Role } from '../../../game/content/types';
import { fmtMoney } from '../../../game/core/format';
import { CREW_FOUND_REQUIRES, ROLE_BENEFITS, candidates, crewLimit, wageFor } from '../../../game/systems/crew/logic';
import { dismiss, foundCrew, recruit } from '../../../game/systems/crew/actions';
import { ROLE_LABELS, displayName, trustLabel } from '../../../game/systems/people/logic';
import { goalRequirementsFor } from './requirements';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Card, CardHead, EmptyState, PageHeader, ProgressBar, Tabs } from '../../components/ui';
import { useRoute } from '../../router';
import { Avatar } from '../network/Avatar';
import { SystemsTab } from './SystemsTab';
import { VehiclesTab } from './VehiclesTab';

type CrewTab = 'crew' | 'systems' | 'vehicles';

function CrewTabView() {
  const s = useGameState();
  const [name, setName] = useState('');
  const [roleFor, setRoleFor] = useState<Record<string, Role>>({});

  if (!s.crew.founded) {
    const reqs = goalRequirementsFor(s, CREW_FOUND_REQUIRES);
    return (
      <Card accent testId="found-crew">
        <CardHead icon={<Flag size={15} />} title="Eine Crew gründen" />
        <p className="small dim">Mit einer Crew bist du nicht mehr allein: Leute übernehmen Aufgaben, bringen Fähigkeiten mit und machen größere Events möglich. Dafür wollen sie Gage und gute Stimmung.</p>
        <div className="stack stack--s" style={{ margin: '12px 0' }}>
          {reqs.map((r) => (
            <div key={r.text} className="row small">
              <Badge tone={r.met ? 'success' : 'default'}>{r.met ? '✓' : '·'}</Badge>
              <span className={r.met ? 'dim' : undefined}>{r.text}</span>
            </div>
          ))}
        </div>
        <div className="field">
          <label htmlFor="crew-name">Name der Crew</label>
          <input id="crew-name" value={name} maxLength={28} placeholder="z. B. Rabbit Sound" onChange={(e) => setName(e.target.value)} data-testid="crew-name" />
        </div>
        <div style={{ marginTop: 12 }}>
          <ActionButton action={foundCrew} payload={{ name }} variant="primary" block testId="found">
            <Flag size={16} /> Crew gründen
          </ActionButton>
        </div>
      </Card>
    );
  }

  const wages = s.crew.members.reduce((sum, m) => sum + m.wagePerDay, 0);
  const cands = candidates(s).sort((a, b) => s.people.people[b.id].trust - s.people.people[a.id].trust);

  return (
    <div className="stack">
      <Card accent>
        <div className="row row--between">
          <div>
            <h2>{s.crew.name}</h2>
            <p className="small dim">
              {s.crew.members.length} / {crewLimit(s)} Leute · Gagen {fmtMoney(wages)}/Tag
            </p>
          </div>
          <Users size={30} className="tone-accent" />
        </div>
        <p className="tiny faint" style={{ marginTop: 8 }}>
          Mit mehr Reputation kannst du mehr Leute halten. Ohne Geld sinkt die Stimmung – unter 30 helfen sie nicht mehr, unter 15 gehen sie.
        </p>
      </Card>

      {s.crew.members.length === 0 && (
        <Card>
          <EmptyState icon={<UserPlus size={28} />} title="Noch niemand dabei" text="Kontakte, die dir vertrauen (40+), kannst du in die Crew holen." />
        </Card>
      )}
      <div className="grid grid--auto">
        {s.crew.members.map((m) => {
          const p = personDef(m.personId);
          return (
            <Card key={m.personId} testId={`member-${m.personId}`}>
              <div className="stack stack--s">
                <div className="row">
                  <Avatar def={p} />
                  <div className="grow">
                    <strong>{displayName(p)}</strong>
                    <div className="tiny faint">
                      {ROLE_LABELS[m.role]} · {fmtMoney(m.wagePerDay)}/Tag
                    </div>
                  </div>
                </div>
                <div className="row row--between tiny">
                  <span className="faint">Stimmung</span>
                  <span className={m.morale < 30 ? 'tone-danger' : 'dim'}>{Math.round(m.morale)}</span>
                </div>
                <ProgressBar value={m.morale / 100} thin label="Stimmung" />
                {ROLE_BENEFITS[m.role] && <p className="tiny dim">{ROLE_BENEFITS[m.role]}</p>}
                <ActionButton action={dismiss} payload={{ personId: m.personId }} variant="ghost" small showReason={false}>
                  <UserMinus size={14} /> Rauswerfen
                </ActionButton>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="card--flush">
        <div style={{ padding: '16px 16px 0' }}>
          <CardHead icon={<UserPlus size={15} />} title="Anwerben" />
        </div>
        {cands.length === 0 ? (
          <p className="small dim" style={{ padding: 16 }}>
            Niemand aus deinem Netzwerk kommt gerade infrage.
          </p>
        ) : (
          <div className="list">
            {cands.map((p) => {
              const role = roleFor[p.id] ?? p.roles[0];
              return (
                <div key={p.id} className="activity">
                  <div className="activity__top">
                    <Avatar def={p} />
                    <div className="grow">
                      <strong>{displayName(p)}</strong>
                      <div className="tiny faint">
                        Vertrauen: {trustLabel(s.people.people[p.id].trust)} ({Math.floor(s.people.people[p.id].trust)}) · Gage {fmtMoney(wageFor(p))}/Tag
                      </div>
                    </div>
                  </div>
                  {p.roles.length > 1 && (
                    <div className="chips">
                      {p.roles.map((r) => (
                        <button key={r} className={['chip', r === role && 'is-active'].filter(Boolean).join(' ')} onClick={() => setRoleFor({ ...roleFor, [p.id]: r })}>
                          {ROLE_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  )}
                  {ROLE_BENEFITS[role] && <p className="tiny dim">{ROLE_BENEFITS[role]}</p>}
                  <ActionButton action={recruit} payload={{ personId: p.id, role }} small block testId={`recruit-${p.id}`}>
                    Als {ROLE_LABELS[role]} holen
                  </ActionButton>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export function CrewScreen() {
  const sub = useRoute().split('/')[2];
  const [tab, setTab] = useState<CrewTab>(sub === 'systeme' ? 'systems' : sub === 'fahrzeuge' ? 'vehicles' : 'crew');
  useEffect(() => {
    if (sub === 'systeme') setTab('systems');
    if (sub === 'fahrzeuge') setTab('vehicles');
  }, [sub]);
  const s = useGameState();
  return (
    <div className="page" data-testid="screen-crew">
      <PageHeader title={s.crew.founded ? s.crew.name : 'Crew'} subtitle="Leute, Anlagen und Fahrzeuge – alles, was eine Party möglich macht." />
      <Tabs<CrewTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'crew', label: 'Crew', count: s.crew.members.length },
          { id: 'systems', label: 'Soundsysteme', count: s.sound.systems.length },
          { id: 'vehicles', label: 'Fahrzeuge' },
        ]}
      />
      {tab === 'crew' && <CrewTabView />}
      {tab === 'systems' && <SystemsTab />}
      {tab === 'vehicles' && <VehiclesTab />}
    </div>
  );
}
