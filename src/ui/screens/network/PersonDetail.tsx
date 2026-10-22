import { HandHeart, MapPinned, MessageCircle, Users } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { PERSONS_BY_ID, POIS_BY_ID, SPOTS_BY_ID, personDef } from '../../../game/content/registry';
import type { PersonDef } from '../../../game/content/types';
import { fmtMoney } from '../../../game/core/format';
import { askIntro, callFavor, meetUp, writeTo, MEETUP_COST, MEETUP_MIN } from '../../../game/systems/people/actions';
import {
  PERSON_STAT_LABELS,
  ROLE_LABELS,
  TRAIT_LABELS,
  displayName,
  knowsPerson,
  relationLabel,
  trustLabel,
} from '../../../game/systems/people/logic';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Button, Modal, ProgressBar } from '../../components/ui';
import { navigate } from '../../router';
import { Avatar } from './Avatar';

export function PersonDetail({ personId, onClose }: { personId: string; onClose: () => void }) {
  const s = useGameState();
  const def = personDef(personId);
  const st = s.people.people[personId];
  if (!st?.met) return null;
  const revealed = st.revealed.map((id) => PERSONS_BY_ID.get(id)).filter((x): x is PersonDef => !!x);
  const hiddenCount = def.knows.length - revealed.length;
  const told = st.told.map((id) => SPOTS_BY_ID.get(id)?.name ?? POIS_BY_ID.get(id)?.name ?? id);

  return (
    <Modal
      title={displayName(def)}
      onClose={onClose}
      testId="person-detail"
      footer={
        <Button
          onClick={() => {
            onClose();
            navigate(`/netzwerk/chat/${personId}`);
          }}
        >
          <MessageCircle size={16} /> Nachrichten
        </Button>
      }
    >
      <div className="row" style={{ gap: 14 }}>
        <Avatar def={def} large />
        <div className="stack stack--s grow">
          <div className="row row--wrap">
            {def.roles.map((r) => (
              <Badge key={r} tone="accent">
                {ROLE_LABELS[r]}
              </Badge>
            ))}
          </div>
          <div className="row row--wrap">
            {def.traits.map((t) => (
              <Badge key={t}>{TRAIT_LABELS[t]}</Badge>
            ))}
          </div>
        </div>
      </div>
      <p className="dim">{def.bio}</p>
      <p className="small">
        <strong>Will:</strong> {def.goal}
      </p>

      <div className="stack stack--s">
        <div className="row row--between small">
          <span>Vertrauen: {trustLabel(st.trust)}</span>
          <span className="num dim">{Math.floor(st.trust)} / 100</span>
        </div>
        <ProgressBar value={st.trust / 100} thin label="Vertrauen" />
        <div className="tiny faint">
          Stimmung: {relationLabel(st.relation)}
          {st.favor > 0 && ` · schuldet dir ${st.favor} Gefallen`}
          {st.favor < 0 && ` · du schuldest ${-st.favor} Gefallen`}
          {` · ${st.meetings} Treffen`}
        </div>
      </div>

      <div className="grid grid--2">
        <ActionButton action={writeTo} payload={{ personId }} block testId="write">
          <MessageCircle size={16} /> Schreiben
        </ActionButton>
        <ActionButton action={meetUp} payload={{ personId }} variant="primary" block testId="meetup">
          <Users size={16} /> Treffen
        </ActionButton>
      </div>
      <p className="tiny faint">
        Treffen: {MEETUP_MIN} Min, ca. {fmtMoney(MEETUP_COST)} für Getränke. Bringt Vertrauen – und oft erzählen Leute dabei von anderen Leuten und Orten.
      </p>
      {st.favor > 0 && (
        <ActionButton action={callFavor} payload={{ personId }} block testId="favor">
          <HandHeart size={16} /> Gefallen einfordern
        </ActionButton>
      )}

      {st.meetings > 0 ? (
        <div className="statgrid">
          {(Object.keys(PERSON_STAT_LABELS) as (keyof PersonDef['stats'])[]).map((k) => (
            <div key={k} className="statgrid__cell">
              <span className="statgrid__label">{PERSON_STAT_LABELS[k]}</span>
              <span className="statgrid__value">{def.stats[k]}</span>
              <ProgressBar value={def.stats[k] / 100} thin label={PERSON_STAT_LABELS[k]} />
            </div>
          ))}
        </div>
      ) : (
        <p className="small dim">Triff dich mit {def.nick ?? def.name}, um mehr über Fähigkeiten und Zuverlässigkeit zu erfahren.</p>
      )}

      <div className="stack stack--s">
        <strong>Kontakte</strong>
        {revealed.length === 0 && <p className="small dim">Du weißt noch nicht, wen {def.nick ?? def.name} kennt.</p>}
        {revealed.map((c) => {
          const known = knowsPerson(s, c.id);
          return (
            <div key={c.id} className="card" style={{ background: 'var(--card-2)', padding: 12 }}>
              <div className="row">
                <Avatar def={c} />
                <div className="grow">
                  <strong>{known ? displayName(c) : c.name}</strong>
                  <div className="tiny faint">{c.roles.map((r) => ROLE_LABELS[r]).join(', ')}</div>
                </div>
                {known && (
                  <Button small variant="ghost" onClick={() => navigate(`/netzwerk/person/${c.id}`)}>
                    Profil
                  </Button>
                )}
              </div>
              {!known && (
                <div style={{ marginTop: 10 }}>
                  <ActionButton action={askIntro} payload={{ personId, targetId: c.id }} small block testId={`intro-${c.id}`}>
                    Vorstellen lassen
                  </ActionButton>
                </div>
              )}
            </div>
          );
        })}
        {hiddenCount > 0 && <p className="tiny faint">… und {hiddenCount} weitere, von denen du noch nichts weißt.</p>}
      </div>

      {told.length > 0 && (
        <div className="stack stack--s">
          <strong>Hat dir gezeigt</strong>
          <div className="row row--wrap">
            {told.map((t) => (
              <Badge key={t} tone="discovery">
                <MapPinned size={11} /> {t}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
