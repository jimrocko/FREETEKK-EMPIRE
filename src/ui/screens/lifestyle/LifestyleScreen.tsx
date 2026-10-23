import { useState } from 'react';
import { Clock, Home, Package, Repeat, Sparkles, Wallet } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { FLAIR_TIERS, LIFESTYLE, LIFESTYLE_CATEGORIES } from '../../../game/content/lifestyle';
import { HOMES } from '../../../game/content/homes';
import { homeDef } from '../../../game/content/registry';
import type { LifestyleCategory, LifestyleDef } from '../../../game/content/types';
import { describeEffects } from '../../../game/core/effects';
import { fmtCountdown, fmtMoney, fmtNumber } from '../../../game/core/format';
import { MINUTE } from '../../../game/core/time';
import { buyFun, moveIn, sellFun, useFun } from '../../../game/systems/lifestyle/actions';
import {
  RARITY_LABELS,
  collectionCount,
  flair,
  flairTier,
  isExperience,
  lifestyleUpkeep,
  rarityOf,
  resaleValue,
  timesDone,
} from '../../../game/systems/lifestyle/logic';
import { activitiesByChannel } from '../../../game/systems/activities/logic';
import { ActionButton } from '../../components/ActionButton';
import { LifeIcon } from '../../components/LifeIcon';
import { Badge, Card, CardHead, EmptyState, PageHeader, ProgressBar, Tabs } from '../../components/ui';
import { navigate, useRoute } from '../../router';

type LifeTab = 'shop' | 'sammlung' | 'wohnen';
const TAB_PATHS: Record<string, LifeTab> = { sammlung: 'sammlung', wohnen: 'wohnen' };

export function LifestyleScreen() {
  const s = useGameState();
  const sub = useRoute().split('/')[2];
  const tab: LifeTab = TAB_PATHS[sub ?? ''] ?? 'shop';
  const owned = Object.keys(s.lifestyle.owned).length;
  return (
    <div className="page" data-testid="screen-lifestyle">
      <PageHeader title="Lifestyle" subtitle="Wofür du die ganzen Nächte durcharbeitest: Zeug, das du nicht brauchst – aber willst." />
      <StyleCard />
      <Tabs<LifeTab>
        value={tab}
        onChange={(t) => navigate(t === 'shop' ? '/lifestyle' : `/lifestyle/${t}`)}
        tabs={[
          { id: 'shop', label: 'Shop' },
          { id: 'sammlung', label: 'Meine Sachen', count: owned || undefined },
          { id: 'wohnen', label: 'Wohnen' },
        ]}
      />
      {tab === 'shop' && <ShopTab />}
      {tab === 'sammlung' && <CollectionTab />}
      {tab === 'wohnen' && <HomesTab />}
    </div>
  );
}

function StyleCard() {
  const s = useGameState();
  const points = flair(s);
  const tier = flairTier(s);
  const home = homeDef(s.player.homeId);
  const daily = lifestyleUpkeep(s) + (home.rent ?? 0);
  const trip = activitiesByChannel(s, 'leisure')[0];
  return (
    <section className="style-card" data-testid="style-card">
      <div className="style-card__top">
        <div className="style-card__badge">
          <Sparkles size={26} />
        </div>
        <div className="grow">
          <div className="style-card__kicker">Style-Rang {tier.index + 1} / {FLAIR_TIERS.length}</div>
          <div className="style-card__rank">{tier.name}</div>
          <div className="style-card__points">
            {fmtNumber(points)} Style{tier.next ? ` / ${fmtNumber(tier.next.min)}` : ''}
          </div>
        </div>
      </div>
      <ProgressBar value={tier.progress} label="Fortschritt zum nächsten Style-Rang" />
      <div className="style-card__stats">
        <div>
          <strong>+{Math.round(tier.bonus * 100)} %</strong>
          <span>Gäste bei Partys</span>
        </div>
        <div>
          <strong>
            {collectionCount(s)} / {LIFESTYLE.length}
          </strong>
          <span>Sammlung</span>
        </div>
        <div>
          <strong>{fmtMoney(daily)}</strong>
          <span>Kosten pro Tag</span>
        </div>
      </div>
      {trip && (
        <div className="style-card__trip">
          <Clock size={14} /> Unterwegs: {trip.label} · zurück in {fmtCountdown(trip.endsAt - s.clock.now)}
        </div>
      )}
    </section>
  );
}

function ShopTab() {
  const [cat, setCat] = useState<LifestyleCategory | 'all'>('all');
  const list = LIFESTYLE.filter((l) => cat === 'all' || l.category === cat);
  return (
    <div className="stack">
      <div className="chips" role="tablist" aria-label="Kategorien">
        {[{ id: 'all' as const, name: 'Alles' }, ...LIFESTYLE_CATEGORIES].map((c) => (
          <button key={c.id} className={['chip', cat === c.id && 'is-active'].filter(Boolean).join(' ')} onClick={() => setCat(c.id)} data-testid={`lifestyle-cat-${c.id}`}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="loot-grid">
        {list.map((def) => (
          <LootCard key={def.id} def={def} />
        ))}
      </div>
    </div>
  );
}

function LootCard({ def }: { def: LifestyleDef }) {
  const s = useGameState();
  const rarity = rarityOf(def.price);
  const exp = isExperience(def);
  const owned = !exp && !!s.lifestyle.owned[def.id];
  const done = timesDone(s, def.id);
  const effects = describeEffects(def.effects);
  return (
    <article className={`loot loot--${rarity}${owned ? ' is-owned' : ''}`} data-testid={`loot-${def.id}`}>
      <div className="loot__head">
        <span className="loot__icon">
          <LifeIcon name={def.icon} size={22} />
        </span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="loot__rarity">{RARITY_LABELS[rarity]}</div>
          <div className="loot__name">{def.name}</div>
        </div>
        {owned && <Badge tone="success">Deins</Badge>}
        {exp && done > 0 && <Badge tone="discovery">{done}× erlebt</Badge>}
      </div>
      <p className="small dim">{def.description}</p>
      <div className="loot__tags">
        <span className="reward-chip">+{fmtNumber(def.flair)} Style</span>
        {def.upkeep ? <span className="reward-chip reward-chip--cost">{fmtMoney(def.upkeep)}/Tag</span> : null}
        {def.experience && (
          <span className="reward-chip">
            {fmtCountdown(def.experience.hours * MINUTE)} unterwegs{def.experience.cooldownDays ? '' : ' · einmalig'}
          </span>
        )}
        {def.use && <span className="reward-chip">Kann: {def.use.label}</span>}
        {effects && <span className="reward-chip">{effects}</span>}
      </div>
      {!owned && (
        <div className="loot__buy">
          <span className="loot__price">{fmtMoney(def.price)}</span>
          <ActionButton action={buyFun} payload={{ id: def.id }} variant="primary" small testId={`buy-${def.id}`}>
            {exp ? 'Erleben' : 'Kaufen'}
          </ActionButton>
        </div>
      )}
    </article>
  );
}

function CollectionTab() {
  const s = useGameState();
  const owned = LIFESTYLE.filter((l) => s.lifestyle.owned[l.id]);
  const memories = LIFESTYLE.filter((l) => isExperience(l) && timesDone(s, l.id) > 0);
  if (owned.length === 0 && memories.length === 0) {
    return (
      <EmptyState icon={<Package size={28} />} title="Noch nichts gegönnt" text="Alles, was du dir im Shop kaufst oder erlebst, landet hier.">
        <button className="btn btn--primary" onClick={() => navigate('/lifestyle')}>
          Zum Shop
        </button>
      </EmptyState>
    );
  }
  return (
    <div className="stack">
      {owned.length > 0 && (
        <div className="loot-grid">
          {owned.map((def) => (
            <OwnedCard key={def.id} def={def} />
          ))}
        </div>
      )}
      {memories.length > 0 && (
        <Card>
          <CardHead icon={<Repeat size={15} />} title="Erinnerungen" />
          <div className="row row--wrap" style={{ gap: 6 }}>
            {memories.map((def) => (
              <span key={def.id} className={`memory memory--${rarityOf(def.price)}`}>
                <LifeIcon name={def.icon} size={14} /> {def.name} · {timesDone(s, def.id)}×
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function OwnedCard({ def }: { def: LifestyleDef }) {
  const rarity = rarityOf(def.price);
  return (
    <article className={`loot loot--${rarity} is-owned`} data-testid={`owned-${def.id}`}>
      <div className="loot__head">
        <span className="loot__icon">
          <LifeIcon name={def.icon} size={22} />
        </span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="loot__rarity">{RARITY_LABELS[rarity]}</div>
          <div className="loot__name">{def.name}</div>
        </div>
        <span className="reward-chip">+{fmtNumber(def.flair)} Style</span>
      </div>
      {def.use && (
        <>
          {def.use.effects && <div className="tiny faint">{describeEffects(def.use.effects)}</div>}
          <ActionButton action={useFun} payload={{ id: def.id }} variant="primary" block testId={`use-${def.id}`}>
            {def.use.label}
          </ActionButton>
        </>
      )}
      <ActionButton action={sellFun} payload={{ id: def.id }} variant="ghost" small showReason={false} testId={`sell-${def.id}`}>
        Verkaufen für {fmtMoney(resaleValue(def))}
      </ActionButton>
    </article>
  );
}

function HomesTab() {
  const s = useGameState();
  return (
    <div className="stack">
      <p className="small dim">Mehr Platz für Equipment, mehr Style – und mehr Miete. Der Umzug kostet einmalig Kaution, Transporter und Pizza für die Helfer.</p>
      <div className="loot-grid">
        {HOMES.map((h) => {
          const here = s.player.homeId === h.id;
          const rarity = rarityOf(h.price ?? 0);
          return (
            <article key={h.id} className={`loot loot--${rarity}${here ? ' is-owned' : ''}`} data-testid={`home-${h.id}`}>
              <div className="loot__head">
                <span className="loot__icon">
                  <LifeIcon name={h.icon} size={22} />
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="loot__rarity">{here ? 'Dein Zuhause' : RARITY_LABELS[rarity]}</div>
                  <div className="loot__name">{h.name}</div>
                </div>
                {here && (
                  <Badge tone="success">
                    <Home size={11} /> Hier wohnst du
                  </Badge>
                )}
              </div>
              <p className="small dim">{h.description}</p>
              <div className="loot__tags">
                <span className="reward-chip">{fmtNumber(h.capacityL)} L Platz</span>
                <span className="reward-chip reward-chip--cost">
                  <Wallet size={11} /> {h.rent ? `${fmtMoney(h.rent)}/Tag` : 'keine Miete'}
                </span>
                {h.flair ? <span className="reward-chip">+{fmtNumber(h.flair)} Style</span> : null}
              </div>
              {!here && (
                <div className="loot__buy">
                  <span className="loot__price">{h.price ? fmtMoney(h.price) : 'gratis'}</span>
                  <ActionButton action={moveIn} payload={{ homeId: h.id }} variant="primary" small testId={`move-${h.id}`}>
                    Einziehen
                  </ActionButton>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
