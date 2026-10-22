import { Eye, MapPin } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { districtDef, spotDef } from '../../../game/content/registry';
import { fmtMoney } from '../../../game/core/format';
import { checkSpot } from '../../../game/systems/spots/actions';
import {
  FEATURE_LABELS,
  LEGALITY_LABELS,
  SPOT_TYPE_LABELS,
  STAT_ORDER,
  daysSinceCheck,
  spotCheckMinutes,
  statView,
} from '../../../game/systems/spots/logic';
import { VIA_LABELS } from '../../../game/systems/map/logic';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Modal, ProgressBar, type BadgeTone } from '../../components/ui';

const LEGALITY_TONE: Record<string, BadgeTone> = { legal: 'success', grey: 'warning', illegal: 'danger' };

function band(v: number): string {
  if (v >= 70) return 'hoch';
  if (v >= 35) return 'mittel';
  return 'niedrig';
}

export function SpotDetail({ spotId, onClose }: { spotId: string; onClose: () => void }) {
  const s = useGameState();
  const def = spotDef(spotId);
  const st = s.spots.spots[spotId];
  if (!st?.known) return null;
  const since = daysSinceCheck(s, spotId);
  const exact = st.intel >= 100;

  return (
    <Modal title={def.name} onClose={onClose} testId="spot-detail">
      <div className="row row--wrap">
        <Badge>{SPOT_TYPE_LABELS[def.type]}</Badge>
        <Badge tone={LEGALITY_TONE[def.legality]}>{LEGALITY_LABELS[def.legality]}</Badge>
        {st.status === 'closed' && <Badge tone="danger">Abgesperrt</Badge>}
        <Badge>
          <MapPin size={11} /> {districtDef(def.districtId).name}
        </Badge>
      </div>
      <p className="dim">{def.description}</p>

      <div className="stack stack--s">
        <div className="row row--between small">
          <span className="row">
            <Eye size={14} className="tone-accent" /> Infos über den Spot
          </span>
          <span className="num dim">{Math.round(st.intel)} %</span>
        </div>
        <ProgressBar value={st.intel / 100} thin label="Infos" />
        <div className="tiny faint">
          {Number.isFinite(since) ? `Zuletzt gecheckt: ${since === 0 ? 'heute' : `vor ${since} ${since === 1 ? 'Tag' : 'Tagen'}`}` : 'Noch nie vor Ort gecheckt – die Werte sind Schätzungen.'}
          {st.via ? ` · ${VIA_LABELS[st.via] ?? st.via}` : ''}
        </div>
      </div>

      <div className="statgrid">
        {STAT_ORDER.map((key) => {
          const v = statView(s, spotId, key);
          return (
            <div key={key} className="statgrid__cell">
              <span className="statgrid__label">{v.label}</span>
              <span className={['statgrid__value', !v.exact && 'is-fuzzy'].filter(Boolean).join(' ')}>{v.text}</span>
              {v.bar !== null && <ProgressBar value={v.bar} thin label={v.label} />}
            </div>
          );
        })}
        <div className="statgrid__cell">
          <span className="statgrid__label">Zustand</span>
          <span className={['statgrid__value', !exact && 'is-fuzzy'].filter(Boolean).join(' ')}>{exact ? `${Math.round(st.condition)} %` : `${band(st.condition)}?`}</span>
        </div>
        <div className="statgrid__cell">
          <span className="statgrid__label">Bekanntheit</span>
          <span className="statgrid__value">{band(st.fame)}</span>
        </div>
      </div>

      <div className="stack stack--s">
        <div className="small">
          <strong>Kosten:</strong> {def.rent > 0 ? `${fmtMoney(def.rent)} Miete pro Event` : 'keine Miete'}
        </div>
        <div className="row row--wrap">
          {st.intel >= 30 ? (
            def.features.length > 0 ? (
              def.features.map((f) => <Badge key={f}>{FEATURE_LABELS[f] ?? f}</Badge>)
            ) : (
              <span className="small dim">Keine Infrastruktur.</span>
            )
          ) : (
            <span className="small dim">Ausstattung unbekannt.</span>
          )}
        </div>
        <p className="tiny faint">Bekannte Spots ohne Genehmigung ziehen Aufmerksamkeit an. Ein Spot, über den zu viele reden, wird irgendwann abgesperrt.</p>
      </div>

      <ActionButton action={checkSpot} payload={{ spotId }} variant="primary" block testId="check-spot">
        Spot checken ({spotCheckMinutes(s, spotId)} Min)
      </ActionButton>
    </Modal>
  );
}
