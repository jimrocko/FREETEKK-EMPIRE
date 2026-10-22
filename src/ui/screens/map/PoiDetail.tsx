import { Archive, MapPin, Store } from 'lucide-react';
import { useGameState } from '../../../app/store';
import type { PoiKind } from '../../../game/content/types';
import type { SkillId } from '../../../game/core/types';
import { districtDef, poiDef, shopDef } from '../../../game/content/registry';
import { SKILL_DEFS } from '../../../game/content/skills';
import { fmtMoney, fmtNumber } from '../../../game/core/format';
import { cancelStorage, rentStorage, visitPoi } from '../../../game/systems/map/actions';
import { VIA_LABELS, mobilityFactor } from '../../../game/systems/map/logic';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Button, Modal } from '../../components/ui';
import { navigate } from '../../router';

export const POI_KIND_LABELS: Record<PoiKind, string> = {
  shop: 'Laden',
  hangout: 'Treffpunkt',
  club: 'Club',
  storage: 'Lagerplatz',
};

export function PoiDetail({ poiId, onClose }: { poiId: string; onClose: () => void }) {
  const s = useGameState();
  const def = poiDef(poiId);
  const known = s.map.pois[poiId];
  if (!known) return null;
  const rented = !!s.map.rentals[poiId];

  return (
    <Modal title={def.name} onClose={onClose} testId="poi-detail">
      <div className="row row--wrap">
        <Badge tone="info">{POI_KIND_LABELS[def.kind]}</Badge>
        <Badge>
          <MapPin size={11} /> {districtDef(def.districtId).name}
        </Badge>
        {rented && <Badge tone="success">Gemietet</Badge>}
      </div>
      <p className="dim">{def.description}</p>
      <div className="tiny faint">{VIA_LABELS[known.via] ?? known.via}</div>

      {def.shopId && (
        <div className="stack stack--s">
          <p className="small">{shopDef(def.shopId).description}</p>
          <Button
            variant="primary"
            block
            onClick={() => {
              onClose();
              navigate('/markt/shop');
            }}
          >
            <Store size={16} /> Zum Sortiment
          </Button>
        </div>
      )}

      {def.visit && (
        <div className="stack stack--s">
          <dl className="kv">
            <dt>Dauer</dt>
            <dd>{fmtNumber(Math.max(1, def.visit.durationMin * mobilityFactor(s)), 1)} Min</dd>
            <dt>Kosten</dt>
            <dd>{def.visit.cost > 0 ? fmtMoney(def.visit.cost) : 'nichts'}</dd>
            <dt>Erfahrung</dt>
            <dd>
              {(Object.entries(def.visit.xp) as [SkillId, number][]).map(([k, v]) => `+${v} ${SKILL_DEFS[k].name}`).join(', ')}
              {def.visit.rep ? `, +${def.visit.rep} Rep.` : ''}
            </dd>
          </dl>
          <p className="tiny faint">Hier hört man Dinge. Mit etwas Glück schnappst du ein Gerücht auf.</p>
          <ActionButton action={visitPoi} payload={{ poiId }} variant="primary" block testId="visit-poi">
            {def.visit.label}
          </ActionButton>
        </div>
      )}

      {def.storage && (
        <div className="stack stack--s">
          <dl className="kv">
            <dt>Platz</dt>
            <dd>
              <Archive size={12} /> {fmtNumber(def.storage.capacityL)} L
            </dd>
            <dt>Miete</dt>
            <dd>{fmtMoney(def.storage.perDay)} pro Tag</dd>
            <dt>Kaution</dt>
            <dd>{fmtMoney(def.storage.deposit)} (bekommst du zurück)</dd>
          </dl>
          {rented ? (
            <ActionButton action={cancelStorage} payload={{ poiId }} variant="danger" block testId="cancel-storage">
              Kündigen
            </ActionButton>
          ) : (
            <ActionButton action={rentStorage} payload={{ poiId }} variant="primary" block testId="rent-storage">
              Mieten ({fmtMoney(def.storage.deposit + def.storage.perDay)} sofort)
            </ActionButton>
          )}
        </div>
      )}
    </Modal>
  );
}
