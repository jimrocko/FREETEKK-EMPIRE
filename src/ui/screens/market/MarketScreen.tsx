import { useState } from 'react';
import { BadgePercent, Clock, ShoppingBag, Store, Tag, User } from 'lucide-react';
import { useGameState } from '../../../app/store';
import type { GameState } from '../../../game/state';
import { fmtDuration, fmtMoney, fmtPercent } from '../../../game/core/format';
import { itemDef } from '../../../game/content/registry';
import type { ItemCategory } from '../../../game/content/types';
import { haggleChance, offerTimeLeft, shopCatalog } from '../../../game/systems/market/logic';
import type { MarketOffer } from '../../../game/systems/market/state';
import { buyNew, buyUsed, haggle } from '../../../game/systems/market/actions';
import { RARITY_LABELS, resaleValue } from '../../../game/systems/inventory/logic';
import { activitiesByChannel, channelCapacity } from '../../../game/systems/activities/logic';
import { skillLevel } from '../../../game/systems/progression/logic';
import { ActionButton } from '../../components/ActionButton';
import { ActivityRow } from '../../components/ActivityList';
import { Badge, Button, Card, ConditionBar, EmptyState, PageHeader, Tabs } from '../../components/ui';
import { navigate } from '../../router';

type MarketTab = 'used' | 'shop' | 'listings';

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  gadget: 'Gadgets',
  music: 'Musik & Studio',
  sound: 'Soundsystem',
  light: 'Licht',
  power: 'Strom',
  vehicle: 'Fahrzeuge',
  goods: 'Waren',
  merch: 'Merch',
  media: 'Medien',
  misc: 'Sonstiges',
};

function OfferCard({ s, offer }: { s: GameState; offer: MarketOffer }) {
  const def = itemDef(offer.defId);
  const knowsValue = skillLevel(s, 'business') >= 2;
  const fair = resaleValue(def, offer.condition);
  return (
    <Card className="item-card" testId={`offer-${offer.id}`}>
      <div className="row row--between" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          {def.brand && <div className="item-card__brand">{def.brand}</div>}
          <div className="item-card__name">{def.name}</div>
        </div>
        <div className="price">{fmtMoney(offer.price)}</div>
      </div>
      <div className="row row--wrap">
        {offer.deal && <Badge tone="success">Schnäppchen</Badge>}
        {def.rarity && def.rarity !== 'common' && <Badge tone="discovery">{RARITY_LABELS[def.rarity]}</Badge>}
        <Badge>{CATEGORY_LABELS[def.category]}</Badge>
        <Badge>
          <Clock size={11} /> noch {fmtDuration(offerTimeLeft(s, offer))}
        </Badge>
      </div>
      <ConditionBar value={offer.condition} />
      <div className="small dim">
        <User size={12} style={{ verticalAlign: '-2px' }} /> {offer.seller}: „{offer.note}“
      </div>
      <div className="tiny faint">
        {knowsValue ? `Marktwert ca. ${fmtMoney(fair)} · Verhandeln: ${fmtPercent(haggleChance(s, offer))} Chance` : 'Marktwert und Verhandlungschance siehst du ab Business Lv. 2.'}
      </div>
      <div className="grid grid--2">
        <ActionButton action={buyUsed} payload={{ offerId: offer.id }} variant="primary" block testId={`buy-${offer.id}`}>
          Kaufen
        </ActionButton>
        <ActionButton action={haggle} payload={{ offerId: offer.id }} block showReason={false}>
          <BadgePercent size={16} /> Handeln
        </ActionButton>
      </div>
    </Card>
  );
}

export function MarketScreen() {
  const s = useGameState();
  const [tab, setTab] = useState<MarketTab>('used');
  const listings = activitiesByChannel(s, 'market');
  const offers = [...s.market.offers].sort((a, b) => a.expiresAt - b.expiresAt);
  const catalog = shopCatalog(s);

  return (
    <div className="page" data-testid="screen-market">
      <PageHeader title="Markt" subtitle="Gebrauchte Geräte sind der Schlüssel – neue Angebote erscheinen jeden Spieltag." />
      <Tabs<MarketTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'used', label: 'Gebraucht', count: offers.length },
          { id: 'shop', label: 'Shop', count: catalog.length },
          { id: 'listings', label: 'Inserate', count: listings.length },
        ]}
      />

      {tab === 'used' &&
        (offers.length > 0 ? (
          <div className="grid grid--auto">
            {offers.map((o) => (
              <OfferCard key={o.id} s={s} offer={o} />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState icon={<ShoppingBag size={28} />} title="Gerade keine Angebote" text="Am nächsten Spieltag stellen Leute neue Sachen ein." />
          </Card>
        ))}

      {tab === 'shop' && (
        <div className="grid grid--auto">
          {catalog.map((def) => (
            <Card key={def.id} className="item-card" testId={`shop-${def.id}`}>
              <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  {def.brand && <div className="item-card__brand">{def.brand}</div>}
                  <div className="item-card__name">{def.name}</div>
                </div>
                <div className="price">{fmtMoney(def.price)}</div>
              </div>
              <div className="row row--wrap">
                <Badge>{CATEGORY_LABELS[def.category]}</Badge>
                <Badge>{def.volumeL} L</Badge>
                <Badge>Qualität {def.quality}</Badge>
              </div>
              <p className="small dim">{def.description}</p>
              <ActionButton action={buyNew} payload={{ defId: def.id }} variant="primary" block testId={`buynew-${def.id}`}>
                <Store size={16} /> Neu kaufen
              </ActionButton>
            </Card>
          ))}
        </div>
      )}

      {tab === 'listings' && (
        <Card className="card--flush">
          {listings.length > 0 ? (
            <div className="list">
              {listings.map((a) => (
                <ActivityRow key={a.id} a={a} now={s.clock.now} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Tag size={28} />} title="Keine aktiven Inserate" text={`Du kannst bis zu ${channelCapacity(s, 'market')} Inserate gleichzeitig laufen lassen. Inserate erstellst du im Inventar.`}>
              <Button small onClick={() => navigate('/inventar')}>
                Zum Inventar
              </Button>
            </EmptyState>
          )}
        </Card>
      )}
    </div>
  );
}
