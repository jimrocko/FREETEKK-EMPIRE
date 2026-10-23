import { Plane } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { CITIES } from '../../../game/content/cities';
import { fmtMoney } from '../../../game/core/format';
import { cityCrowdFactor, cityFame, currentCity, travel, travelCost } from '../../../game/systems/map/cities';
import { needsUnlock } from '../../../game/systems/progression/tree';
import { ActionButton } from '../../components/ActionButton';
import { Card, CardHead } from '../../components/ui';

/** Current city facts and travel to the others. */
export function CityTravel() {
  const s = useGameState();
  const city = currentCity(s);
  // Only shown once there is somewhere to go (or something to unlock).
  if (CITIES.length < 2) return null;
  return (
    <Card testId="city-travel">
      <CardHead icon={<Plane size={15} />} title="Städte" />
      <p className="tiny faint">
        {city.name}: Szene ×{city.sceneSize.toFixed(1).replace('.', ',')} · Preise ×{city.priceLevel.toFixed(2).replace('.', ',')} · Polizei ×{city.police.toFixed(1).replace('.', ',')} · man kennt dich hier zu{' '}
        {Math.round(cityFame(s, city.id))} % (Publikum ×{cityCrowdFactor(s, city.id).toFixed(2).replace('.', ',')})
      </p>
      <div className="stack stack--s" style={{ marginTop: 8 }}>
        {CITIES.filter((c) => c.id !== city.id).map((c) => {
          const locked = needsUnlock(s, c.travel.unlock);
          return (
            <div key={c.id} className="row row--between" style={{ gap: 12 }}>
              <div className="grow">
                <strong className="small">{c.name}</strong>
                <div className="tiny dim">{locked ?? c.description}</div>
              </div>
              <ActionButton action={travel} payload={{ cityId: c.id }} small showReason={false} testId={`travel-${c.id}`}>
                Hin ({fmtMoney(travelCost(s, c))}, {c.travel.minutes} Min)
              </ActionButton>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
