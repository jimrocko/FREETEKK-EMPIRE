import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Inbox, Users } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { personDef } from '../../../game/content/registry';
import type { Role } from '../../../game/content/types';
import { openMessages, threads } from '../../../game/systems/messages/logic';
import { ROLE_LABELS, displayName, metPeople, relationLabel, trustLabel } from '../../../game/systems/people/logic';
import { activitiesByChannel } from '../../../game/systems/activities/logic';
import { ActivityRow } from '../../components/ActivityList';
import { Badge, Card, EmptyState, PageHeader, ProgressBar, Tabs } from '../../components/ui';
import { timeAgo } from '../../components/FeedList';
import { navigate, useRoute } from '../../router';
import { Avatar } from './Avatar';
import { ChatView } from './ChatView';
import { PersonDetail } from './PersonDetail';
import { NetworkGraph } from './NetworkGraph';

type NetTab = 'inbox' | 'contacts' | 'graph';

export function NetworkScreen() {
  const s = useGameState();
  const parts = useRoute().split('/').filter(Boolean);
  const sub = parts[1];
  const subId = parts[2];
  const open = openMessages(s);
  const [tab, setTab] = useState<NetTab>(open.length > 0 ? 'inbox' : 'contacts');
  const [role, setRole] = useState<Role | 'all'>('all');
  useEffect(() => {
    if (sub === 'chat') setTab('inbox');
  }, [sub]);

  const people = metPeople(s).sort((a, b) => s.people.people[b.id].trust - s.people.people[a.id].trust);
  const roles = useMemo(() => {
    const set = new Set<Role>();
    for (const p of people) p.roles.forEach((r) => set.add(r));
    return [...set];
  }, [people]);
  const shown = people.filter((p) => role === 'all' || p.roles.includes(role));
  const list = threads(s);
  const social = activitiesByChannel(s, 'social');

  const close = () => navigate('/netzwerk');

  return (
    <div className="page" data-testid="screen-network">
      <PageHeader title="Netzwerk" subtitle={`${people.length} Kontakte · ${open.length} offene Entscheidung${open.length === 1 ? '' : 'en'}`} />

      {social.length > 0 && (
        <Card className="card--flush" accent>
          <div className="list">
            {social.map((a) => (
              <ActivityRow key={a.id} a={a} now={s.clock.now} />
            ))}
          </div>
        </Card>
      )}

      <Tabs<NetTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'inbox', label: 'Nachrichten', count: open.length },
          { id: 'contacts', label: 'Kontakte', count: people.length },
          { id: 'graph', label: 'Netz' },
        ]}
      />

      {tab === 'inbox' &&
        (list.length === 0 ? (
          <Card>
            <EmptyState icon={<Inbox size={28} />} title="Noch keine Nachrichten" text="Deine Kontakte melden sich mit Angeboten, Bitten und Tipps. Je mehr Leute du kennst, desto mehr passiert." />
          </Card>
        ) : (
          <Card className="card--flush">
            <div className="list">
              {list.map((t) => {
                const def = personDef(t.personId);
                return (
                  <button key={t.personId} className="list__row" onClick={() => navigate(`/netzwerk/chat/${t.personId}`)} data-testid={`thread-${t.personId}`}>
                    <Avatar def={def} />
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="row row--between">
                        <strong>{displayName(def)}</strong>
                        <span className="tiny faint">{timeAgo(s.clock.now, t.last.at)}</span>
                      </span>
                      <span className="small dim" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.last.mine ? 'Du: ' : ''}
                        {t.last.text}
                      </span>
                    </span>
                    {t.open > 0 ? <Badge tone="discovery">Entscheidung</Badge> : t.unread > 0 ? <Badge tone="accent">{t.unread}</Badge> : null}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}

      {tab === 'contacts' && (
        <div className="stack">
          {roles.length > 1 && (
            <div className="chips">
              <button className={['chip', role === 'all' && 'is-active'].filter(Boolean).join(' ')} onClick={() => setRole('all')}>
                Alle
              </button>
              {roles.map((r) => (
                <button key={r} className={['chip', role === r && 'is-active'].filter(Boolean).join(' ')} onClick={() => setRole(r)}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid--auto">
            {shown.map((p) => {
              const st = s.people.people[p.id];
              return (
                <button key={p.id} className="card item-card clickable" onClick={() => navigate(`/netzwerk/person/${p.id}`)} data-testid={`contact-${p.id}`}>
                  <div className="row" style={{ width: '100%' }}>
                    <Avatar def={p} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <strong>{displayName(p)}</strong>
                      <div className="tiny faint">{p.roles.map((r) => ROLE_LABELS[r]).join(', ')}</div>
                    </div>
                    <ChevronRight size={16} className="faint" />
                  </div>
                  <div style={{ width: '100%' }}>
                    <div className="row row--between tiny" style={{ marginBottom: 4 }}>
                      <span className="dim">{trustLabel(st.trust)}</span>
                      <span className="faint">{relationLabel(st.relation)}</span>
                    </div>
                    <ProgressBar value={st.trust / 100} thin label="Vertrauen" />
                  </div>
                </button>
              );
            })}
          </div>
          {people.length === 0 && (
            <Card>
              <EmptyState icon={<Users size={28} />} title="Noch keine Kontakte" />
            </Card>
          )}
        </div>
      )}

      {tab === 'graph' && (
        <div className="stack">
          <NetworkGraph onSelect={(id) => navigate(`/netzwerk/person/${id}`)} />
          <p className="tiny faint">Linien zu dir werden dicker, je mehr Vertrauen besteht. Gestrichelte Kreise sind Leute, von denen du gehört hast – lass dich vorstellen.</p>
        </div>
      )}

      {sub === 'person' && subId && <PersonDetail personId={subId} onClose={close} />}
      {sub === 'chat' && subId && <ChatView personId={subId} onClose={close} />}
    </div>
  );
}
