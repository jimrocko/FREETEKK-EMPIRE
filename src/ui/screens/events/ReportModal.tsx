import { AlertTriangle, PartyPopper, Sparkles, Users } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { PERSONS_BY_ID, spotDef } from '../../../game/content/registry';
import { SKILL_DEFS } from '../../../game/content/skills';
import type { SkillId } from '../../../game/core/types';
import { fmtMoney, fmtNumber } from '../../../game/core/format';
import { findEvent } from '../../../game/systems/events/plan';
import { displayName, shortName } from '../../../game/systems/people/logic';
import { Badge, Modal, ProgressBar, Stat } from '../../components/ui';
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
          <div className="grid grid--2">
            <Stat label="Besucher" icon={<Users size={13} />} value={fmtNumber(r.visitors)} sub={r.demand > r.visitors ? `${fmtNumber(r.demand)} wollten kommen` : undefined} />
            <Stat label="Gewinn" value={fmtMoney(r.profit, { sign: true })} tone={r.profit >= 0 ? 'success' : 'danger'} sub={`${r.hoursPlayed} Std gefeiert`} />
          </div>
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
              Gespielt: {r.played.map((id) => (id === 'self' ? 'du' : shortName(PERSONS_BY_ID.get(id)!))).join(', ')}
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
