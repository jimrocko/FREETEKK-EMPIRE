import { useEffect } from 'react';
import { ChevronLeft, Flame, Handshake, MapPin, PartyPopper, Radio, Speaker, Users } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { dispatch } from '../../../app/runtime';
import { GENRES } from '../../../game/content/music';
import { RIVALS_BY_ID, personDef, spotDef } from '../../../game/content/registry';
import type { RivalCrewDef } from '../../../game/content/rivals';
import { fmtNumber } from '../../../game/core/format';
import { gameTimeAt } from '../../../game/core/time';
import { askSpotTip, markSceneRead, proposeCoop, visitRivalParty, VISIT_COST } from '../../../game/systems/rivals/actions';
import { activeCrews, eventEndsAt, isRunning, rivalRelationLabel, spotLabel, upcomingRivalEvents } from '../../../game/systems/rivals/logic';
import type { RivalCrewState, RivalEvent } from '../../../game/systems/rivals/state';
import { displayName, knowsPerson } from '../../../game/systems/people/logic';
import { ActionButton } from '../../components/ActionButton';
import { ModifierList } from '../../components/HappeningCard';
import { timeAgo } from '../../components/FeedList';
import { Badge, Banner, Button, Card, CardHead, EmptyState, PageHeader, ProgressBar } from '../../components/ui';
import { navigate, useRoute } from '../../router';

function genreName(id: string): string {
  return GENRES.find((g) => g.id === id)?.name ?? id;
}

function relationTone(rel: number): 'success' | 'warning' | 'danger' | 'default' {
  if (rel <= -50) return 'danger';
  if (rel <= -15) return 'warning';
  if (rel >= 15) return 'success';
  return 'default';
}

function CrewDot({ def }: { def: RivalCrewDef }) {
  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: def.color, flex: '0 0 auto' }} />;
}

function nightLabel(s: ReturnType<typeof useGameState>, ev: RivalEvent): string {
  if (isRunning(s, ev)) return 'Läuft gerade';
  const info = gameTimeAt(s.clock, ev.startsAt);
  const today = gameTimeAt(s.clock, s.clock.now).day;
  return info.day === today ? 'Heute 22:00' : info.day === today + 1 ? 'Morgen 22:00' : `${info.weekdayName} 22:00`;
}

function PartyRow({ ev }: { ev: RivalEvent }) {
  const s = useGameState();
  const def = RIVALS_BY_ID.get(ev.crewId)!;
  return (
    <div className="list__row" data-testid={`rival-event-${ev.id}`}>
      <CrewDot def={def} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="small" style={{ fontWeight: 600 }}>
          {def.name} {ev.guest && <Badge tone="accent">dein Gastset</Badge>}
        </div>
        <div className="tiny faint">
          {nightLabel(s, ev)} · {spotLabel(s, ev.spotId) === 'einem geheimen Ort' ? 'geheimer Ort' : spotLabel(s, ev.spotId)}
        </div>
      </div>
      <ActionButton action={visitRivalParty} payload={{ eventId: ev.id }} small showReason={false} testId={`visit-${ev.id}`}>
        Hingehen ({VISIT_COST} €)
      </ActionButton>
    </div>
  );
}

function CrewCard({ def, st }: { def: RivalCrewDef; st: RivalCrewState }) {
  return (
    <button className="card item-card" onClick={() => navigate(`/szene/crew/${def.id}`)} data-testid={`crew-${def.id}`} style={{ textAlign: 'left' }}>
      <div className="row row--between">
        <span className="row">
          <CrewDot def={def} />
          <strong>{def.name}</strong>
        </span>
        <Badge tone={relationTone(st.relation)}>{rivalRelationLabel(st.relation)}</Badge>
      </div>
      <div className="tiny faint" style={{ marginTop: 4 }}>
        {genreName(def.style)} · {fmtNumber(st.rep)} Reputation
      </div>
      <div className="row row--wrap small dim" style={{ marginTop: 8, gap: 12 }}>
        <span className="row">
          <Users size={13} /> {st.members}
        </span>
        <span className="row">
          <Speaker size={13} /> {fmtNumber(st.reach)}
        </span>
        <span className="row">
          <MapPin size={13} /> {st.knownSpots.length}
        </span>
        <span className="row">
          <PartyPopper size={13} /> {st.eventsHeld}
        </span>
      </div>
    </button>
  );
}

function SceneOverview() {
  const s = useGameState();
  const crews = activeCrews(s);
  const parties = upcomingRivalEvents(s);
  const news = [...s.rivals.news].reverse().slice(0, 30);
  const coop = s.rivals.coop && s.rivals.coop.until > s.clock.now ? s.rivals.coop : undefined;
  return (
    <div className="dash">
      <div className="stack">
        {coop && (
          <Banner tone="info">
            Kooperation mit {RIVALS_BY_ID.get(coop.crewId)?.name}: Deine nächste Party bis {gameTimeAt(s.clock, coop.until).weekdayName} wird gemeinsam beworben ({Math.round(coop.share * 100)} % Anteil für sie).
          </Banner>
        )}
        <Card className="card--flush" testId="rival-parties">
          <div style={{ padding: '16px 16px 0' }}>
            <CardHead icon={<PartyPopper size={15} />} title="Partys der anderen" right={<span className="tiny faint">{parties.length}</span>} />
          </div>
          {parties.length === 0 ? (
            <EmptyState title="Gerade nichts angekündigt" text="Die anderen Crews planen ständig – schau später wieder rein." />
          ) : (
            <div className="list">
              {parties.map((ev) => (
                <PartyRow key={ev.id} ev={ev} />
              ))}
            </div>
          )}
        </Card>
        <div className="grid grid--auto">
          {crews.map(({ def, st }) => (
            <CrewCard key={def.id} def={def} st={st} />
          ))}
        </div>
        <ModifierList />
      </div>
      <div className="stack">
        <Card className="card--flush" testId="scene-news">
          <div style={{ padding: '16px 16px 0' }}>
            <CardHead icon={<Radio size={15} />} title="Szene-Ticker" />
          </div>
          {news.length === 0 ? (
            <EmptyState title="Noch ruhig" />
          ) : (
            <div className="list">
              {news.map((n) => (
                <div key={n.id} className="list__row">
                  {n.crewId ? <CrewDot def={RIVALS_BY_ID.get(n.crewId)!} /> : <Flame size={12} className="tone-accent" />}
                  <div className="grow">
                    <div className={['small', n.tone !== 'info' && `tone-${n.tone}`].filter(Boolean).join(' ')}>{n.text}</div>
                    <div className="tiny faint">{timeAgo(s.clock.now, n.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function CrewDetail({ id }: { id: string }) {
  const s = useGameState();
  const def = RIVALS_BY_ID.get(id);
  const st = s.rivals.crews[id];
  if (!def || !st || (!st.active && st.appearedAt === undefined)) {
    return (
      <Card>
        <EmptyState title="Diese Crew kennst du nicht" />
      </Card>
    );
  }
  const leader = personDef(def.leaderId);
  const knownSpots = st.knownSpots.filter((sp) => s.spots.spots[sp]?.known);
  const history = s.rivals.events.filter((e) => e.crewId === id && e.status !== 'scheduled').reverse().slice(0, 8);
  const next = s.rivals.events.filter((e) => e.crewId === id && e.status === 'scheduled');
  return (
    <div className="dash">
      <div className="stack">
        <Card accent testId="crew-detail">
          <div className="row row--between">
            <span className="row">
              <CrewDot def={def} />
              <h2>{def.name}</h2>
            </span>
            <Badge tone={relationTone(st.relation)}>{rivalRelationLabel(st.relation)}</Badge>
          </div>
          <p className="small dim" style={{ marginTop: 6 }}>
            {def.description}
          </p>
          {st.dissolved && <Banner tone="warning">Die Crew hat sich aufgelöst. Vielleicht kommen sie zurück.</Banner>}
          <dl className="kv" style={{ marginTop: 10 }}>
            <dt>Stil</dt>
            <dd>{genreName(def.style)}</dd>
            <dt>Reputation</dt>
            <dd>{fmtNumber(st.rep)}</dd>
            <dt>Leute</dt>
            <dd>{st.members}</dd>
            <dt>Anlage</dt>
            <dd>für {fmtNumber(st.reach)} Leute · Qualität {st.quality}</dd>
            <dt>Partys</dt>
            <dd>
              {st.eventsHeld} · Rekord {fmtNumber(st.bestVisitors)} Gäste
            </dd>
            <dt>Kopf der Crew</dt>
            <dd>{knowsPerson(s, leader.id) ? displayName(leader) : 'unbekannt'}</dd>
          </dl>
          <div className="stack stack--s" style={{ marginTop: 6 }}>
            <div className="row row--between tiny faint">
              <span>Verhältnis zu dir</span>
              <span className="num">{Math.round(st.relation)}</span>
            </div>
            <ProgressBar value={(st.relation + 100) / 200} thin label="Verhältnis" />
          </div>
        </Card>
        <Card testId="crew-actions">
          <CardHead icon={<Handshake size={15} />} title="Kontakt" />
          <div className="stack stack--s">
            <ActionButton action={proposeCoop} payload={{ crewId: id }} block testId="propose-coop">
              Gemeinsame Party vorschlagen
            </ActionButton>
            <ActionButton action={askSpotTip} payload={{ crewId: id }} block testId="ask-tip">
              Nach einem Spot fragen
            </ActionButton>
            {knowsPerson(s, leader.id) && (
              <Button block onClick={() => navigate(`/netzwerk/person/${leader.id}`)}>
                Profil von {displayName(leader)}
              </Button>
            )}
          </div>
          <p className="tiny faint" style={{ marginTop: 8 }}>
            Gemeinsame Partys bringen ihre Leute zu dir, kosten aber einen Anteil. Wer in derselben Nacht oder an „ihren“ Spots feiert, macht sich keine Freunde.
          </p>
        </Card>
      </div>
      <div className="stack">
        {next.length > 0 && (
          <Card className="card--flush">
            <div style={{ padding: '16px 16px 0' }}>
              <CardHead icon={<PartyPopper size={15} />} title="Angekündigt" />
            </div>
            <div className="list">
              {next.map((ev) => (
                <PartyRow key={ev.id} ev={ev} />
              ))}
            </div>
          </Card>
        )}
        <Card>
          <CardHead icon={<MapPin size={15} />} title="Ihre Spots" right={<span className="tiny faint">{st.knownSpots.length}</span>} />
          <div className="row row--wrap">
            {knownSpots.map((sp) => (
              <button key={sp} className="chip" onClick={() => navigate(`/karte/spot/${sp}`)}>
                {spotDef(sp).name}
              </button>
            ))}
            {st.knownSpots.length > knownSpots.length && <span className="small dim">+ {st.knownSpots.length - knownSpots.length} Orte, die du nicht kennst</span>}
          </div>
        </Card>
        <Card className="card--flush">
          <div style={{ padding: '16px 16px 0' }}>
            <CardHead title="Letzte Partys" />
          </div>
          {history.length === 0 ? (
            <EmptyState title="Noch keine Party gesehen" />
          ) : (
            <div className="list">
              {history.map((ev) => (
                <div key={ev.id} className="list__row">
                  <div className="grow">
                    <div className="small" style={{ fontWeight: 600 }}>
                      {spotLabel(s, ev.spotId) === 'einem geheimen Ort' ? 'Geheimer Ort' : spotLabel(s, ev.spotId)}
                    </div>
                    <div className="tiny faint">
                      {ev.status === 'cancelled' ? `Ausgefallen – ${ev.note}` : `${fmtNumber(ev.visitors ?? 0)} Gäste · Stimmung ${ev.mood}${ev.note ? ` · ${ev.note}` : ''}`} · {timeAgo(s.clock.now, eventEndsAt(ev))}
                    </div>
                  </div>
                  {ev.raided && <Badge tone="danger">Razzia</Badge>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function SceneScreen() {
  const s = useGameState();
  const parts = useRoute().split('/');
  const crewId = parts[2] === 'crew' ? parts[3] : undefined;
  const unseen = s.rivals.news.some((n) => n.id > s.rivals.seenNews);
  useEffect(() => {
    if (!unseen) return;
    const t = setTimeout(() => dispatch(markSceneRead, {}, { silent: true }), 1500);
    return () => clearTimeout(t);
  }, [unseen]);
  return (
    <div className="page" data-testid="screen-scene">
      {crewId ? (
        <>
          <div>
            <Button small onClick={() => navigate('/szene')}>
              <ChevronLeft size={14} /> Szene
            </Button>
          </div>
          <CrewDetail id={crewId} />
        </>
      ) : (
        <>
          <PageHeader title="Szene" subtitle="Andere Crews, ihre Partys und was in der Stadt los ist. Die Welt dreht sich weiter – auch ohne dich." />
          <SceneOverview />
        </>
      )}
    </div>
  );
}
