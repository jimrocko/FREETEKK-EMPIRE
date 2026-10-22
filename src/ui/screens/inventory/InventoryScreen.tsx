import { useMemo, useState } from 'react';
import { Archive, Lock, PackageOpen } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { fmtDuration, fmtMoney, fmtNumber } from '../../../game/core/format';
import { itemDef } from '../../../game/content/registry';
import type { ItemCategory } from '../../../game/content/types';
import { LISTING_PRESETS } from '../../../game/content/market';
import type { ItemInstance } from '../../../game/systems/inventory/state';
import { RARITY_LABELS, dealerPrice, inventoryValue, ownedItems, resaleValue, storageCapacity, usedVolume } from '../../../game/systems/inventory/logic';
import { sellToDealer } from '../../../game/systems/inventory/actions';
import { createListing, listingPrice } from '../../../game/systems/market/actions';
import { listingBonus } from '../../../game/systems/market/logic';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Card, ConditionBar, EmptyState, Modal, PageHeader, ProgressBar, Tabs, type TabDef } from '../../components/ui';
import { CATEGORY_LABELS } from '../market/MarketScreen';

const STAT_LABELS: Record<string, string> = {
  kick: 'Kick',
  bass: 'Bass',
  hats: 'Hi-Hats',
  perc: 'Percussion',
  synth: 'Synth',
  acid: 'Acid',
  fx: 'FX',
  melody: 'Melodie',
  sound: 'Klang',
  monitoring: 'Abhöre',
  cpu: 'Rechenleistung',
  powerW: 'Leistung (W)',
  capacityL: 'Ladevolumen (L)',
  maxLoadKg: 'Zuladung (kg)',
  channels: 'Kanäle',
};

function ItemDetail({ item, onClose }: { item: ItemInstance; onClose: () => void }) {
  const s = useGameState();
  const def = itemDef(item.defId);
  const bonus = listingBonus(s);
  return (
    <Modal title={def.name} onClose={onClose} testId="item-detail">
      <div className="row row--wrap">
        {def.brand && <Badge>{def.brand}</Badge>}
        <Badge>{CATEGORY_LABELS[def.category]}</Badge>
        {def.rarity && def.rarity !== 'common' && <Badge tone="discovery">{RARITY_LABELS[def.rarity]}</Badge>}
        {item.qty > 1 && <Badge tone="accent">×{item.qty}</Badge>}
        {item.locked && (
          <Badge tone="warning">
            <Lock size={11} /> Inseriert
          </Badge>
        )}
      </div>
      <p className="dim">{def.description}</p>
      <ConditionBar value={item.condition} />
      <dl className="kv">
        <dt>Neupreis</dt>
        <dd>{fmtMoney(def.price)}</dd>
        <dt>Bezahlt</dt>
        <dd>{item.paid > 0 ? fmtMoney(item.paid) : 'Startausrüstung'}</dd>
        <dt>Marktwert</dt>
        <dd>{fmtMoney(resaleValue(def, item.condition) * item.qty)}</dd>
        <dt>Qualität</dt>
        <dd>{def.quality} / 100</dd>
        <dt>Gewicht · Volumen</dt>
        <dd>
          {fmtNumber(def.weightKg, 1)} kg · {fmtNumber(def.volumeL, 1)} L
        </dd>
        {Object.entries(def.stats ?? {}).map(([k, v]) => (
          <FragmentKV key={k} k={STAT_LABELS[k] ?? k} v={fmtNumber(v)} />
        ))}
      </dl>

      {!item.locked && (
        <>
          <hr className="divider" />
          <div className="stack stack--s">
            <strong>Inserieren</strong>
            <p className="tiny faint">
              Inserate bringen mehr als der Ankauf, brauchen aber Zeit.{bonus > 0 ? ' Deine Handykamera bringt +5 % auf den Preis.' : ''}
            </p>
            <div className="grid grid--auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
              {LISTING_PRESETS.map((p) => (
                <ActionButton key={p.id} action={createListing} payload={{ uid: item.uid, preset: p.id }} block onDone={onClose} showReason={false} testId={`list-${p.id}`}>
                  <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                    <span>
                      {p.label}: {fmtMoney(listingPrice(s, item.uid, p.id))}
                    </span>
                    <span className="tiny faint">
                      {p.minMin}–{fmtDuration(p.maxMin * 60_000)}
                    </span>
                  </span>
                </ActionButton>
              ))}
            </div>
          </div>
          <ActionButton action={sellToDealer} payload={{ uid: item.uid }} variant="danger" block onDone={onClose} testId="sell-dealer">
            Sofort an Ankauf: {fmtMoney(dealerPrice(def, item.condition) * item.qty)}
          </ActionButton>
        </>
      )}
      {item.locked && <p className="small dim">Das Item ist inseriert. Du kannst das Inserat im Markt unter „Inserate“ zurückziehen.</p>}
    </Modal>
  );
}

function FragmentKV({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}

export function InventoryScreen() {
  const s = useGameState();
  const [filter, setFilter] = useState<ItemCategory | 'all'>('all');
  const [openUid, setOpenUid] = useState<string | null>(null);
  const items = ownedItems(s);
  const used = usedVolume(s);
  const cap = storageCapacity(s);

  const tabs = useMemo(() => {
    const counts = new Map<ItemCategory, number>();
    for (const it of items) {
      const c = itemDef(it.defId).category;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const list: TabDef<ItemCategory | 'all'>[] = [{ id: 'all', label: 'Alle', count: items.length }];
    for (const [c, n] of counts) list.push({ id: c, label: CATEGORY_LABELS[c], count: n });
    return list;
  }, [items]);

  const shown = items.filter((it) => filter === 'all' || itemDef(it.defId).category === filter);
  const open = openUid ? s.inventory.items[openUid] : undefined;

  return (
    <div className="page" data-testid="screen-inventory">
      <PageHeader title="Inventar" subtitle={`Wert: ${fmtMoney(inventoryValue(s))}`} />

      <Card>
        <div className="row row--between small" style={{ marginBottom: 8 }}>
          <span className="row">
            <Archive size={15} className="tone-accent" /> Kleines WG-Zimmer
          </span>
          <span className="num dim">
            {fmtNumber(used, 1)} / {fmtNumber(cap)} L
          </span>
        </div>
        <ProgressBar value={used / cap} label="Stauraum" />
        <p className="tiny faint" style={{ marginTop: 8 }}>
          Platz ist knapp. Große Geräte brauchen später einen Proberaum oder ein Lager.
        </p>
      </Card>

      {tabs.length > 2 && <Tabs value={filter} onChange={setFilter} tabs={tabs} />}

      {shown.length === 0 ? (
        <Card>
          <EmptyState icon={<PackageOpen size={28} />} title="Nichts hier" text="Kaufe im Markt neue oder gebrauchte Geräte." />
        </Card>
      ) : (
        <div className="grid grid--auto">
          {shown.map((it) => {
            const def = itemDef(it.defId);
            return (
              <button key={it.uid} className="card item-card" onClick={() => setOpenUid(it.uid)} data-testid={`item-${it.defId}`}>
                <div className="row row--between" style={{ alignItems: 'flex-start', width: '100%' }}>
                  <div className="grow">
                    {def.brand && <div className="item-card__brand">{def.brand}</div>}
                    <div className="item-card__name">
                      {def.name}
                      {it.qty > 1 ? ` ×${it.qty}` : ''}
                    </div>
                  </div>
                  {it.locked ? (
                    <Badge tone="warning">
                      <Lock size={11} /> Inseriert
                    </Badge>
                  ) : (
                    <span className="small dim num">{fmtMoney(resaleValue(def, it.condition) * it.qty)}</span>
                  )}
                </div>
                <div style={{ width: '100%' }}>
                  <ConditionBar value={it.condition} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && <ItemDetail item={open} onClose={() => setOpenUid(null)} />}
    </div>
  );
}
