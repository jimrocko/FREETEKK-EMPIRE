import { Package, Truck } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { GOODS_ITEMS } from '../../../game/content/items/goods';
import { SUPPLIERS } from '../../../game/content/events';
import { fmtMoney, fmtNumber } from '../../../game/core/format';
import { buyGoods, goodsPrice, supplierReason } from '../../../game/systems/events/actions';
import { countItem, freeVolume } from '../../../game/systems/inventory/logic';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Card, CardHead, Reason } from '../../components/ui';

export function SupplyTab() {
  const s = useGameState();
  return (
    <div className="stack">
      <Card>
        <CardHead icon={<Package size={15} />} title="Lager" right={<span className="tiny faint">{fmtNumber(freeVolume(s))} L frei</span>} />
        <div className="row row--wrap">
          {GOODS_ITEMS.map((g) => (
            <Badge key={g.id} tone={countItem(s, g.id) > 0 ? 'accent' : 'default'}>
              {g.name.replace(/ \(.*\)/, '')}: {countItem(s, g.id)}
            </Badge>
          ))}
        </div>
        <p className="tiny faint" style={{ marginTop: 8 }}>
          Pro Gast und Stunde: etwa 0,12 Wasser, 0,1 Bier, 0,06 Mate, 0,05 Softdrinks, 0,03 Snacks. Wenn etwas ausgeht, sinkt die Stimmung.
        </p>
      </Card>
      {SUPPLIERS.map((sup) => {
        const reason = supplierReason(s, sup.id);
        const amounts = sup.minOrder >= 10 ? [10, 20, 50] : [1, 5, 10];
        return (
          <Card key={sup.id} testId={`supplier-${sup.id}`}>
            <CardHead icon={<Truck size={15} />} title={sup.name} right={sup.priceFactor < 1 ? <Badge tone="success">−{Math.round((1 - sup.priceFactor) * 100)} %</Badge> : undefined} />
            <p className="small dim">{sup.description}</p>
            {reason ? (
              <Reason text={reason} />
            ) : (
              <div className="stack stack--s" style={{ marginTop: 10 }}>
                {GOODS_ITEMS.map((g) => (
                  <div key={g.id} className="row row--wrap" style={{ justifyContent: 'space-between' }}>
                    <span className="small">
                      {g.name} · {fmtMoney(goodsPrice(sup.id, g.id))}
                    </span>
                    <div className="row">
                      {amounts.map((n) => (
                        <ActionButton key={n} action={buyGoods} payload={{ supplierId: sup.id, defId: g.id, qty: n }} small showReason={false} testId={`buy-${sup.id}-${g.id}-${n}`}>
                          +{n}
                        </ActionButton>
                      ))}
                    </div>
                  </div>
                ))}
                {sup.deliveryFee > 0 && <p className="tiny faint">Lieferung {fmtMoney(sup.deliveryFee)} pro Bestellung.</p>}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
