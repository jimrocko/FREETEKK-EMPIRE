import { Car, Clock } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { RENTAL_OPTIONS } from '../../../game/content/vehicles';
import { ITEMS } from '../../../game/content/registry';
import { fmtCountdown, fmtMoney, fmtNumber } from '../../../game/core/format';
import { rentVehicle } from '../../../game/systems/transport/actions';
import { transportCapacity, vehicles } from '../../../game/systems/transport/logic';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Card, CardHead, ConditionBar, EmptyState } from '../../components/ui';

export function VehiclesTab() {
  const s = useGameState();
  const list = vehicles(s);
  const cap = transportCapacity(s);
  const knowsDealer = s.map.pois['poi.autohaus'] !== undefined;
  return (
    <div className="stack">
      <Card accent>
        <CardHead icon={<Car size={15} />} title="Transportkapazität" />
        <div className="grid grid--2">
          <div>
            <div className="stat__label">Volumen</div>
            <div className="stat__value">{fmtNumber(cap.volumeL)} L</div>
          </div>
          <div>
            <div className="stat__label">Zuladung</div>
            <div className="stat__value">{fmtNumber(cap.weightKg)} kg</div>
          </div>
        </div>
        <p className="tiny faint" style={{ marginTop: 8 }}>
          Equipment und Waren müssen zu Events gefahren werden. Du fährst selbst einen Wagen – für mehr brauchst du Fahrer in der Crew.
        </p>
      </Card>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<Car size={28} />} title="Kein Fahrzeug" text={knowsDealer ? 'Das Autohaus Kowalski verkauft Kombis, Transporter und LKW.' : 'Fahrzeuge gibt es gebraucht im Markt – oder bei einem Autohändler, den du noch finden musst.'} />
        </Card>
      ) : (
        <div className="grid grid--auto">
          {list.map((v) => (
            <Card key={v.key} testId={`vehicle-${v.def.id}`}>
              <div className="stack stack--s">
                <div className="row row--between">
                  <strong>{v.def.name}</strong>
                  {v.rented ? (
                    <Badge tone="info">
                      <Clock size={11} /> Miete noch {fmtCountdown((v.until ?? 0) - s.clock.now)}
                    </Badge>
                  ) : (
                    <Badge tone="success">Eigenes</Badge>
                  )}
                </div>
                <div className="row row--wrap">
                  <Badge>{fmtNumber(v.def.stats?.capacityL ?? 0)} L</Badge>
                  <Badge>{fmtNumber(v.def.stats?.maxLoadKg ?? 0)} kg</Badge>
                  {!v.rented && <Badge>{fmtMoney(v.def.upkeepPerDay ?? 0)}/Tag</Badge>}
                </div>
                {!v.rented && <ConditionBar value={v.condition} />}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHead title="Mietwagen (ein Spieltag)" />
        <div className="stack stack--s">
          {RENTAL_OPTIONS.map((o) => {
            const def = ITEMS.get(o.defId)!;
            return (
              <ActionButton key={o.id} action={rentVehicle} payload={{ optionId: o.id }} block testId={`rent-${o.id}`}>
                {o.label}: {fmtMoney(o.perDay)} · {fmtNumber(def.stats?.capacityL ?? 0)} L
              </ActionButton>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
