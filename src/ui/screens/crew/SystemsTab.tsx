import { useState } from 'react';
import { Plus, Speaker, Trash2, Truck, X, Zap } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { dispatch } from '../../../app/runtime';
import { itemDef } from '../../../game/content/registry';
import { fmtMoney, fmtNumber } from '../../../game/core/format';
import { addPart, createSystem, deleteSystem, removePart } from '../../../game/systems/sound/actions';
import { availableParts, systemStats } from '../../../game/systems/sound/logic';
import type { SoundSystem } from '../../../game/systems/sound/state';
import { transportCapacity } from '../../../game/systems/transport/logic';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Banner, Button, Card, CardHead, EmptyState, ProgressBar } from '../../components/ui';
import { isUnlocked } from '../../../game/systems/progression/logic';
import { rentalFee, rentOutSystem } from '../../../game/systems/sound/rental';
import { CUSTOM_STACK_COST, CUSTOM_STACK_MINUTES, buildCustomStack } from '../../../game/systems/equipment/custom';
import { Hammer } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  top: 'Top',
  sub: 'Sub',
  amp: 'Endstufe',
  controller: 'Controller',
  cables: 'Kabel',
  case: 'Cases',
  generator: 'Generator',
  light: 'Licht',
  'dj-mixer': 'Mixer',
};

function Cell({ label, value, bar }: { label: string; value: string; bar?: number }) {
  return (
    <div className="statgrid__cell">
      <span className="statgrid__label">{label}</span>
      <span className="statgrid__value">{value}</span>
      {bar !== undefined && <ProgressBar value={bar} thin label={label} />}
    </div>
  );
}

function SystemCard({ sys }: { sys: SoundSystem }) {
  const s = useGameState();
  const st = systemStats(s, sys);
  const cap = transportCapacity(s);
  const parts = availableParts(s);
  const [adding, setAdding] = useState(false);
  const fits = st.volumeL <= cap.volumeL && st.weightKg <= cap.weightKg;
  return (
    <Card testId={`system-${sys.id}`}>
      <div className="stack">
        <div className="row row--between">
          <h2>{sys.name}</h2>
          <ActionButton action={deleteSystem} payload={{ systemId: sys.id }} variant="ghost" small showReason={false}>
            <Trash2 size={14} /> Auflösen
          </ActionButton>
        </div>
        {isUnlocked(s, 'u.rental') && (
          <ActionButton action={rentOutSystem} payload={{ systemId: sys.id }} small testId={`rent-out-${sys.id}`}>
            Für eine Nacht vermieten ({fmtMoney(rentalFee(s, sys.id))})
          </ActionButton>
        )}
        <div className="statgrid">
          <Cell label="Reichweite" value={`${fmtNumber(st.reach)} Leute`} />
          <Cell label="Leistung" value={`${fmtNumber(st.powerW)} W`} />
          <Cell label="Qualität" value={`${st.quality} / 100`} bar={st.quality / 100} />
          <Cell label="Zuverlässigkeit" value={`${st.reliability} / 100`} bar={st.reliability / 100} />
          <Cell label="Aufbauzeit" value={`${st.setupMin} Min`} />
          <Cell label="Strombedarf" value={`${fmtNumber(st.powerKw, 1)} kW${st.generatorKw > 0 ? ` · Gen. ${st.generatorKw} kW` : ''}`} />
          <Cell label="Transport" value={`${fmtNumber(st.volumeL)} L · ${fmtNumber(st.weightKg)} kg`} />
          <Cell label="Licht · Wartung" value={`${st.lightFx} · ${fmtMoney(st.upkeepPerDay)}/Tag`} />
        </div>
        {st.warnings.map((w) => (
          <Banner key={w} tone="warning">
            {w}
          </Banner>
        ))}
        <div className="row small">
          <Truck size={15} className={fits ? 'tone-success' : 'tone-warning'} />
          {cap.count === 0 ? (
            <span className="dim">Kein Fahrzeug – für Events mieten oder kaufen.</span>
          ) : fits ? (
            <span className="dim">
              Passt in deine Fahrzeuge ({fmtNumber(cap.volumeL)} L, {fmtNumber(cap.weightKg)} kg).
            </span>
          ) : (
            <span className="tone-warning">
              Passt nicht in deine Fahrzeuge ({fmtNumber(cap.volumeL)} L, {fmtNumber(cap.weightKg)} kg).
            </span>
          )}
        </div>
        <div className="card card--flush" style={{ background: 'var(--card-2)' }}>
          <div className="list">
            {sys.components.length === 0 && <p className="small dim" style={{ padding: 14 }}>Noch keine Komponenten.</p>}
            {sys.components.map((uid) => {
              const it = s.inventory.items[uid];
              if (!it) return null;
              const def = itemDef(it.defId);
              return (
                <div key={uid} className="list__row">
                  <span className="grow">
                    <strong className="small">{def.name}</strong>
                    <div className="tiny faint">
                      {TYPE_LABELS[def.type] ?? def.type} · Zustand {Math.round(it.condition)} %{it.broken ? ' · defekt' : ''}
                    </div>
                  </span>
                  <Button icon small variant="ghost" aria-label="Entfernen" onClick={() => dispatch(removePart, { systemId: sys.id, uid }, { silent: true })}>
                    <X size={16} />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
        <Button onClick={() => setAdding(!adding)} disabled={parts.length === 0} title={parts.length === 0 ? 'Keine freien Teile – Boxen, Endstufen, Kabel im Markt kaufen.' : undefined} testId={`add-parts-${sys.id}`}>
          <Plus size={16} /> Komponenten hinzufügen ({parts.length})
        </Button>
        {adding && (
          <div className="stack stack--s">
            {parts.map((it) => {
              const def = itemDef(it.defId);
              return (
                <ActionButton key={it.uid} action={addPart} payload={{ systemId: sys.id, uid: it.uid }} small block showReason={false} testId={`add-${def.id}`}>
                  {TYPE_LABELS[def.type] ?? def.type}: {def.name} ({Math.round(it.condition)} %)
                </ActionButton>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

export function SystemsTab() {
  const s = useGameState();
  const [name, setName] = useState('');
  return (
    <div className="stack">
      {s.sound.systems.length === 0 && (
        <Card>
          <EmptyState icon={<Speaker size={28} />} title="Noch kein Soundsystem" text="Stell aus Boxen, Endstufen, Kabeln und Mixer eine Anlage zusammen. Die Werte werden live berechnet." />
        </Card>
      )}
      <div className="grid grid--auto">
        {s.sound.systems.map((sys) => (
          <SystemCard key={sys.id} sys={sys} />
        ))}
      </div>
      {isUnlocked(s, 'u.custombuild') && (
        <Card testId="custom-build">
          <CardHead icon={<Hammer size={15} />} title="Werkstatt: Custom-Stack" />
          <p className="small dim">Ein selbstgebauter Bass-Stack: lauter und besser als alles aus dem Laden. {fmtMoney(CUSTOM_STACK_COST)} Material, {CUSTOM_STACK_MINUTES} Minuten Arbeit.</p>
          <div style={{ marginTop: 8 }}>
            <ActionButton action={buildCustomStack} payload={{}} testId="build-stack">
              Bauen
            </ActionButton>
          </div>
        </Card>
      )}
      <Card>
        <CardHead icon={<Zap size={15} />} title="Neues System" />
        <div className="row">
          <input value={name} maxLength={28} placeholder="z. B. Rabbit System" onChange={(e) => setName(e.target.value)} data-testid="system-name" />
          <ActionButton action={createSystem} payload={{ name }} variant="primary" showReason={false} testId="create-system" onDone={() => setName('')}>
            Anlegen
          </ActionButton>
        </div>
        <p className="tiny faint" style={{ marginTop: 8 }}>
          Faustregel: doppelt so viel Bass wie Tops, Endstufen mit Reserve, eine Kabelkiste pro sechs Boxen, ein Controller für sauberen Klang.
        </p>
        <div className="row row--wrap" style={{ marginTop: 8 }}>
          <Badge>{s.sound.systems.length} Systeme</Badge>
        </div>
      </Card>
    </div>
  );
}
