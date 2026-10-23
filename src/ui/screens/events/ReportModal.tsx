import { AlertTriangle, PartyPopper, Sparkles, Star } from 'lucide-react';
import { CountUp } from '../../components/CountUp';
import type { EventReport } from '../../../game/systems/events/state';
import { useGameState } from '../../../app/store';
import { PERSONS_BY_ID, spotDef } from '../../../game/content/registry';
import { SKILL_DEFS } from '../../../game/content/skills';
import type { SkillId } from '../../../game/core/types';
import { fmtMoney, fmtNumber } from '../../../game/core/format';
import { findEvent } from '../../../game/systems/events/plan';
import { displayName, shortName } from '../../../game/systems/people/logic';
import { Badge, Modal, ProgressBar } from '../../components/ui';
import { navigate } from '../../router';

const SCORE_LABELS: Record<string, string> = {
  mood: 'Stimmung',
  sound: 'Sound',
  lineup: 'Line-up',
  location: 'Location',
  organisation: 'Organisation',
  supply: 'Versorgung',
  safety: 'Sicherheit',
};

const GRADES = [
  { min: 85, label: 'Legendär', stars: 5 },
  { min: 70, label: 'Stark', stars: 4 },
  { min: 55, label: 'Solide', stars: 3 },
  { min: 40, label: 'Zäh', stars: 2 },
  { min: -Infinity, label: 'Desaster', stars: 1 },
];

/** Grade of a night by its mood; stars and label always agree. */
export function nightGrade(mood: number): { label: string; stars: number } {
  return GRADES.find((g) => mood >= g.min)!;
}

function ResultBanner({ r }: { r: EventReport }) {
  const g = nightGrade(r.scores.mood);
  return (
    <div className="result" data-testid="night-result">
      <div className="result__stars" aria-label={`${g.stars} von 5 Sternen`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={26} className={i < g.stars ? 'is-on' : undefined} style={{ animationDelay: `${0.15 + i * 0.12}s` }} />
        ))}
      </div>
      <div className="result__grade">{g.label}</div>
      <div className="result__nums">
        <div>
          <div className="result__num">
            <CountUp value={r.visitors} format={(n) => fmtNumber(n)} />
          </div>
          <div className="result__label">Besucher</div>
        </div>
        <div>
          <div className={['result__num', r.profit < 0 && 'tone-danger'].filter(Boolean).join(' ')}>
            <CountUp value={r.profit} format={(n) => fmtMoney(n, { sign: true })} />
          </div>
          <div className="result__label">Gewinn</div>
        </div>
        <div>
          <div className="result__num tone-discovery">
            +<CountUp value={r.rep} format={(n) => fmtNumber(n)} />
          </div>
          <div className="result__label">Reputation</div>
        </div>
      </div>
      <div className="tiny faint" style={{ marginTop: 10 }}>
        {r.demand > r.visitors ? `${fmtNumber(r.demand)} wollten kommen · ` : ''}
        {r.hoursPlayed} Std gefeiert
      </div>
    </div>
  );
}

export function ReportModal({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const s = useGameState();
  const ev = findEvent(s, eventId);
  if (!ev) return null;
  const r = ev.report;
  return (
    <Modal title={ev.name} onClose={onClose} testId="event-report">
      <div className="row row--wrap">
        <Badge>{spotDef(ev.spotId).name}</Badge>
        {r && <Badge>Wetter: {r.weather}</Badge>}
        {ev.status === 'cancelled' && <Badge tone="danger">Abgesagt</Badge>}
      </div>
      {ev.status === 'cancelled' && <p className="dim">{ev.cancelReason}</p>}
      {r && (
        <>
          <ResultBanner r={r} />
          <div className="stack stack--s">
            {Object.entries(r.scores).map(([k, v]) => (
              <div key={k}>
                <div className="row row--between small">
                  <span className={k === 'mood' ? 'tone-accent' : 'dim'} style={{ fontWeight: k === 'mood' ? 800 : 500 }}>
                    {SCORE_LABELS[k]}
                  </span>
                  <span className="num">{v}</span>
                </div>
                <ProgressBar value={v / 100} thin label={SCORE_LABELS[k]} />
              </div>
            ))}
          </div>
          {r.highlights.map((h) => (
            <div key={h} className="row small tone-success">
              <Sparkles size={15} /> {h}
            </div>
          ))}
          {r.incidents.map((i) => (
            <div key={i} className="row small tone-warning" style={{ alignItems: 'flex-start' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} /> {i}
            </div>
          ))}
          <div className="grid grid--2" style={{ alignItems: 'start' }}>
            <div>
              <strong className="small">Einnahmen</strong>
              <dl className="kv" style={{ marginTop: 6 }}>
                {Object.entries(r.revenue).map(([k, v]) => (
                  <Line key={k} k={k} v={fmtMoney(v)} />
                ))}
              </dl>
            </div>
            <div>
              <strong className="small">Kosten</strong>
              <dl className="kv" style={{ marginTop: 6 }}>
                {Object.entries(r.costs).map(([k, v]) => (
                  <Line key={k} k={k} v={fmtMoney(v)} />
                ))}
              </dl>
            </div>
          </div>
          <div className="stack stack--s">
            <strong className="small">Belohnung</strong>
            <div className="row row--wrap">
              <Badge tone="discovery">+{r.rep} Reputation</Badge>
              {(Object.entries(r.xp) as [SkillId, number][]).map(([k, v]) => (
                <Badge key={k} tone="info">
                  +{v} {SKILL_DEFS[k].name}
                </Badge>
              ))}
            </div>
          </div>
          {r.played.length > 0 && (
            <p className="small dim">
              Gespielt: {r.played.map((id) => (id === 'self' ? 'du' : id === 'live' ? 'dein Live-Set' : id === 'sub' ? 'Ersatz-DJ' : shortName(PERSONS_BY_ID.get(id)!))).join(', ')}
            </p>
          )}
          {r.newPeople.length > 0 && (
            <div className="stack stack--s">
              <strong className="small row">
                <PartyPopper size={15} className="tone-accent" /> Neue Leute kennengelernt
              </strong>
              <div className="row row--wrap">
                {r.newPeople.map((id) => (
                  <button
                    key={id}
                    className="chip"
                    onClick={() => {
                      onClose();
                      navigate(`/netzwerk/person/${id}`);
                    }}
                  >
                    {displayName(PERSONS_BY_ID.get(id)!)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="tiny">{k}</dt>
      <dd className="tiny">{v}</dd>
    </>
  );
}
