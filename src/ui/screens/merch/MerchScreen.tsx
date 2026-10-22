import { useState } from 'react';
import { Factory, Globe, Palette, Shirt, Store, Tag, TrendingUp } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { MANUFACTURERS, MERCH_PRODUCTS, MOTIFS, ONLINE_SHOP_COST, ONLINE_SHOP_REQUIRES } from '../../../game/content/merch';
import { describeCondition } from '../../../game/core/conditions';
import { fmtCountdown, fmtMoney, fmtNumber } from '../../../game/core/format';
import { designByContact, designSelf, openShop, orderMerch, sellWholesale, setMerchPrice } from '../../../game/systems/merch/actions';
import { manufacturerReason, priceFor, productDef, stockList, stockKey, totalPieces } from '../../../game/systems/merch/logic';
import { metPeople, shortName } from '../../../game/systems/people/logic';
import { personDef } from '../../../game/content/registry';
import { freeVolume } from '../../../game/systems/inventory/logic';
import { stat } from '../../../game/systems/progression/logic';
import { ActionButton } from '../../components/ActionButton';
import { ActivityRow } from '../../components/ActivityList';
import { Badge, Card, CardHead, EmptyState, PageHeader, Stat, Tabs } from '../../components/ui';
import { dispatch } from '../../../app/runtime';

type MerchTab = 'stock' | 'designs' | 'production';

function StockTab() {
  const s = useGameState();
  const stock = stockList(s);
  const designName = (id: string) => s.merch.designs.find((d) => d.id === id)?.name ?? '?';
  return (
    <div className="stack">
      <Card>
        <CardHead icon={<Shirt size={15} />} title="Lager" right={<span className="small num">{fmtNumber(totalPieces(s))} Stück</span>} />
        {stock.length === 0 ? (
          <EmptyState icon={<Shirt size={28} />} title="Noch kein Merch" text="Entwirf ein Design und lass es produzieren. Verkauft wird auf deinen Events (Merch-Stand), an Läden und später online." />
        ) : (
          <div className="list">
            {stock.map((st) => {
              const key = stockKey(st.designId, st.productId);
              const p = productDef(st.productId);
              const lot = Math.min(st.qty, Math.max(1, Math.round(st.qty / 4)));
              return (
                <div key={key} className="list__row" data-testid={`stock-${key}`}>
                  <div className="grow">
                    <div className="small" style={{ fontWeight: 600 }}>
                      {p.name} „{designName(st.designId)}“
                    </div>
                    <div className="tiny faint">
                      ×{st.qty} · Qualität {st.quality} · Stückkosten {fmtMoney(st.unitCost)}
                    </div>
                  </div>
                  <ActionButton action={sellWholesale} payload={{ key, qty: lot }} small showReason={false} testId={`wholesale-${key}`}>
                    {lot} an Läden ({fmtMoney(st.unitCost * 1.6 * lot)})
                  </ActionButton>
                </div>
              );
            })}
          </div>
        )}
        <p className="tiny faint" style={{ marginTop: 10 }}>
          Großhandel: Läden zahlen 160 % der Stückkosten – wenig Marge, aber sofort Geld. Ab Business Lv. 2.
        </p>
      </Card>

      <Card>
        <CardHead icon={<Tag size={15} />} title="Verkaufspreise" />
        <div className="stack stack--s">
          {MERCH_PRODUCTS.map((p) => (
            <PriceRow key={p.id} productId={p.id} />
          ))}
        </div>
        <p className="tiny faint" style={{ marginTop: 10 }}>
          Teurer heißt nicht mehr Geld: Liegt der Preis über dem, was Leute für Qualität und Marke zahlen würden, kauft kaum jemand.
        </p>
      </Card>

      <Card testId="online-shop">
        <CardHead icon={<Globe size={15} />} title="Onlineshop" right={s.merch.shopOpen ? <Badge tone="success">Online</Badge> : undefined} />
        {s.merch.shopOpen ? (
          <p className="small dim">Jeden Spieltag kauft ein Teil deiner Leute online – abhängig von Reputation, Markenwert und Preisen. Ware muss auf Lager sein.</p>
        ) : (
          <>
            <p className="small dim">Ein eigener Shop verkauft jeden Tag weiter – auch wenn du nicht da bist.</p>
            <p className="tiny faint">Braucht: {ONLINE_SHOP_REQUIRES.map((c) => describeCondition(c)).join(', ')} (bisher {fmtNumber(stat(s, 'merchSold'))} verkauft)</p>
            <div style={{ marginTop: 10 }}>
              <ActionButton action={openShop} payload={{}} testId="open-shop">
                Shop eröffnen ({fmtMoney(ONLINE_SHOP_COST)})
              </ActionButton>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function PriceRow({ productId }: { productId: string }) {
  const s = useGameState();
  const p = productDef(productId);
  const price = priceFor(s, productId);
  const set = (v: number) => dispatch(setMerchPrice, { productId, price: v });
  return (
    <div className="row row--between small">
      <span>
        {p.name} <span className="tiny faint">(üblich {fmtMoney(p.basePrice)})</span>
      </span>
      <input
        type="number"
        min={0.5}
        max={200}
        step={0.5}
        value={price}
        onChange={(e) => set(Math.max(0.5, Math.min(200, Number(e.target.value) || 0.5)))}
        style={{ width: 90, minHeight: 38 }}
        aria-label={`Preis ${p.name}`}
        data-testid={`price-${productId}`}
      />
    </div>
  );
}

function DesignsTab() {
  const s = useGameState();
  const [name, setName] = useState('');
  const [motif, setMotif] = useState(MOTIFS[0]);
  const designers = metPeople(s).filter((p) => p.roles.includes('designer') || p.roles.includes('merch'));
  const running = s.activities.running.filter((a) => a.kind === 'design');
  return (
    <div className="stack">
      <Card accent testId="new-design">
        <CardHead icon={<Palette size={15} />} title="Neues Design" />
        <div className="field">
          <label htmlFor="design-name">Name</label>
          <input id="design-name" value={name} maxLength={28} placeholder="z. B. Hafenhase" onChange={(e) => setName(e.target.value)} data-testid="design-name" />
        </div>
        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor="design-motif">Motiv</label>
          <select id="design-motif" value={motif} onChange={(e) => setMotif(e.target.value)} data-testid="design-motif">
            {MOTIFS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="stack stack--s" style={{ marginTop: 12 }}>
          <ActionButton action={designSelf} payload={{ name, motif }} block testId="design-self">
            Selbst zeichnen (6 Min · Studio)
          </ActionButton>
          {designers.map((p) => (
            <ActionButton key={p.id} action={designByContact} payload={{ name, motif, personId: p.id }} block testId={`design-${p.id}`}>
              Von {shortName(p)} gestalten lassen ({fmtMoney(Math.round(p.price * 0.6))})
            </ActionButton>
          ))}
        </div>
        <p className="tiny faint" style={{ marginTop: 8 }}>
          Selbst gezeichnet hängt die Qualität von Business ab (ein Logo und eine Designerin in der Crew helfen). Profis sind sofort fertig und besser.
        </p>
      </Card>
      {running.map((a) => (
        <ActivityRow key={a.id} a={a} now={s.clock.now} />
      ))}
      <Card>
        <CardHead title="Deine Designs" right={<span className="small num">{s.merch.designs.length}</span>} />
        {s.merch.designs.length === 0 ? (
          <p className="small dim">Noch keine Designs.</p>
        ) : (
          <div className="list">
            {[...s.merch.designs].reverse().map((d) => (
              <div key={d.id} className="list__row">
                <div className="grow">
                  <div className="small" style={{ fontWeight: 600 }}>
                    {d.name}
                  </div>
                  <div className="tiny faint">
                    {d.motif} · {d.by === 'self' ? 'selbst' : `von ${shortName(personDef(d.by))}`}
                  </div>
                </div>
                <Badge tone={d.quality >= 70 ? 'success' : 'default'}>Q {d.quality}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ProductionTab() {
  const s = useGameState();
  const [designId, setDesignId] = useState(s.merch.designs[s.merch.designs.length - 1]?.id ?? '');
  const [manId, setManId] = useState(MANUFACTURERS[0].id);
  const man = MANUFACTURERS.find((m) => m.id === manId)!;
  const products = Object.keys(man.products);
  const [productId, setProductId] = useState(products[0]);
  const pid = products.includes(productId) ? productId : products[0];
  const offer = man.products[pid]!;
  const [qty, setQty] = useState(offer.minQty);
  const q = Math.max(qty, offer.minQty);
  const design = s.merch.designs.find((d) => d.id === designId);

  if (s.merch.designs.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Factory size={28} />} title="Erst ein Design" text="Ohne Motiv druckt niemand etwas. Leg im Tab „Designs“ los." />
      </Card>
    );
  }

  return (
    <div className="stack">
      <Card accent testId="order-form">
        <CardHead icon={<Factory size={15} />} title="Produktion beauftragen" />
        <div className="field">
          <label htmlFor="order-design">Design</label>
          <select id="order-design" value={designId} onChange={(e) => setDesignId(e.target.value)} data-testid="order-design">
            {s.merch.designs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} (Q {d.quality})
              </option>
            ))}
          </select>
        </div>
        <div className="chips" style={{ flexWrap: 'wrap', marginTop: 10 }}>
          {MANUFACTURERS.map((m) => {
            const r = manufacturerReason(s, m.id);
            return (
              <button key={m.id} className={['chip', m.id === manId && 'is-active'].filter(Boolean).join(' ')} disabled={!!r} title={r ?? undefined} onClick={() => setManId(m.id)} data-testid={`man-${m.id}`}>
                {m.name}
              </button>
            );
          })}
        </div>
        <p className="tiny faint" style={{ marginTop: 6 }}>
          {man.description} Qualität {man.quality} · Lieferung in {fmtCountdown(man.minutes * 60_000)}
          {manufacturerReason(s, man.id) ? ` · ${manufacturerReason(s, man.id)}` : ''}
        </p>
        <div className="chips" style={{ flexWrap: 'wrap', marginTop: 10 }}>
          {products.map((id) => (
            <button key={id} className={['chip', id === pid && 'is-active'].filter(Boolean).join(' ')} onClick={() => { setProductId(id); setQty(man.products[id]!.minQty); }} data-testid={`prod-${id}`}>
              {productDef(id).name} · {fmtMoney(man.products[id]!.unitCost)}
            </button>
          ))}
        </div>
        <div className="row row--between small" style={{ marginTop: 10 }}>
          <span>Menge (mind. {offer.minQty})</span>
          <input
            type="number"
            min={offer.minQty}
            step={10}
            value={q}
            onChange={(e) => setQty(Math.max(0, Math.round(Number(e.target.value) || 0)))}
            style={{ width: 100, minHeight: 38 }}
            aria-label="Menge"
            data-testid="order-qty"
          />
        </div>
        <dl className="kv" style={{ marginTop: 10 }}>
          <dt>Kosten</dt>
          <dd>{fmtMoney(offer.unitCost * q)}</dd>
          <dt>Platz</dt>
          <dd>
            {fmtNumber(productDef(pid).volumeL * q, 1)} L (frei: {fmtNumber(Math.max(0, freeVolume(s)), 0)} L)
          </dd>
          <dt>Erwartete Qualität</dt>
          <dd>{design ? Math.round((design.quality + man.quality) / 2) : '–'}</dd>
          <dt>Möglicher Umsatz</dt>
          <dd>{fmtMoney(priceFor(s, pid) * q)}</dd>
        </dl>
        <div style={{ marginTop: 12 }}>
          <ActionButton action={orderMerch} payload={{ designId, productId: pid, manufacturerId: manId, qty: q }} variant="primary" block testId="order-merch">
            Auftrag erteilen
          </ActionButton>
        </div>
      </Card>

      <Card>
        <CardHead title="Laufende Aufträge" right={<span className="small num">{s.merch.orders.length}</span>} />
        {s.merch.orders.length === 0 ? (
          <p className="small dim">Keine offenen Aufträge.</p>
        ) : (
          <div className="list">
            {s.merch.orders.map((o) => (
              <div key={o.id} className="list__row" data-testid="merch-order">
                <div className="grow">
                  <div className="small" style={{ fontWeight: 600 }}>
                    {o.qty}× {productDef(o.productId).name} „{s.merch.designs.find((d) => d.id === o.designId)?.name}“
                  </div>
                  <div className="tiny faint">{MANUFACTURERS.find((m) => m.id === o.manufacturerId)?.name}</div>
                </div>
                <span className="small num">{fmtCountdown(Math.max(0, o.readyAt - s.clock.now))}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function MerchScreen() {
  const s = useGameState();
  const [tab, setTab] = useState<MerchTab>('stock');
  return (
    <div className="page" data-testid="screen-merch">
      <PageHeader title="Merch" subtitle="Designs, Produktion, Lager und Verkauf – deine Marke zum Anziehen." />
      <div className="grid grid--stats">
        <Stat label="Markenwert" icon={<TrendingUp size={13} />} value={fmtNumber(s.merch.brand, 1)} sub="steigt mit Events und Verkäufen" tone="accent" />
        <Stat label="Auf Lager" icon={<Shirt size={13} />} value={fmtNumber(totalPieces(s))} sub={`${s.merch.orders.length} in Produktion`} />
        <Stat label="Verkauft" icon={<Store size={13} />} value={fmtNumber(stat(s, 'merchSold'))} sub={s.merch.shopOpen ? 'Onlineshop aktiv' : 'kein Onlineshop'} />
        <Stat label="Umsatz" icon={<Tag size={13} />} value={fmtMoney(s.finance.totals.merch?.in ?? 0)} sub={`Ausgaben ${fmtMoney(s.finance.totals.merch?.out ?? 0)}`} />
      </div>
      <Tabs<MerchTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'stock', label: 'Lager & Verkauf', count: stockList(s).length },
          { id: 'designs', label: 'Designs', count: s.merch.designs.length },
          { id: 'production', label: 'Produktion', count: s.merch.orders.length },
        ]}
      />
      {tab === 'stock' && <StockTab />}
      {tab === 'designs' && <DesignsTab />}
      {tab === 'production' && <ProductionTab />}
    </div>
  );
}
