import { useState, type ReactNode } from 'react';
import { CalendarPlus, Check, MapPinned, Minus, Plus, ShieldAlert, Speaker, Truck } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { PERSONS_BY_ID, spotDef } from '../../../game/content/registry';
import { GOODS_ITEMS } from '../../../game/content/items/goods';
import { AWARENESS_COST, HELPER_COST, MEDICS_COST, PA_RENTALS, PROMO_CHANNELS } from '../../../game/content/events';
import { requirementReason } from '../../../game/core/conditions';
import { fmtCountdown, fmtMoney, fmtNumber, fmtPercent } from '../../../game/core/format';
import { planEvent } from '../../../game/systems/events/actions';
import {
  DURATIONS,
  ENTRY_OPTIONS,
  lineupCandidates,
  maxLineup,
  performerFee,
  performerReason,
  transportLoad,
  upcomingNights,
  upfrontCosts,
  vanFor,
} from '../../../game/systems/events/plan';
import { forecast } from '../../../game/systems/events/simulate';
import type { EventPlanInput, SoundChoice } from '../../../game/systems/events/state';
import { systemStats } from '../../../game/systems/sound/logic';
import { transportCapacity } from '../../../game/systems/transport/logic';
import { countItem } from '../../../game/systems/inventory/logic';
import { LEGALITY_LABELS, daysSinceCheck, knownSpots, statView } from '../../../game/systems/spots/logic';
import { displayName } from '../../../game/systems/people/logic';
import { ActionButton } from '../../components/ActionButton';
import { Banner, Button, Card, CardHead, EmptyState } from '../../components/ui';
import { navigate } from '../../router';

function Chip({ active, disabled, title, onClick, children, testId }: { active?: boolean; disabled?: boolean; title?: string; onClick: () => void; children: ReactNode; testId?: string }) {
  return (
    <button className={['chip', active && 'is-active'].filter(Boolean).join(' ')} disabled={disabled} title={title} onClick={onClick} data-testid={testId}>
      {children}
    </button>
  );
}

export function Planner({ onPlanned }: { onPlanned: () => void }) {
  const s = useGameState();
  const spots = knownSpots(s).filter((sp) => s.spots.spots[sp.id].status === 'open');
  const nights = upcomingNights(s);

  const [spotId, setSpotId] = useState(spots[0]?.id ?? '');
  const [startsAt, setStartsAt] = useState(nights.find((n) => n.weekday === 4 || n.weekday === 5)?.startsAt ?? nights[0]?.startsAt ?? 0);
  const [durationH, setDurationH] = useState(8);
  const [entry, setEntry] = useState(5);
  const [lineup, setLineup] = useState<string[]>([]);
  const [sound, setSound] = useState<SoundChoice>(() => {
    const own = s.sound.systems.find((sys) => systemStats(s, sys).reach > 0);
    return own ? { kind: 'own', systemId: own.id } : { kind: 'rental', optionId: 'pa.small' };
  });
  const [transport, setTransport] = useState<'own' | 'rent'>('own');
  const [promo, setPromo] = useState<string[]>(['promo.word']);
  const [bring, setBring] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const g of GOODS_ITEMS) if (countItem(s, g.id) > 0) out[g.id] = g.stats?.sellPrice ?? 2;
    return out;
  });
  const [freeWater, setFreeWater] = useState(false);
  const [helpers, setHelpers] = useState(0);
  const [awareness, setAwareness] = useState(false);
  const [medics, setMedics] = useState(false);
  const [name, setName] = useState(`Party #${s.events.list.length + 1}`);

  if (spots.length === 0) {
    return (
      <Card>
        <EmptyState icon={<MapPinned size={28} />} title="Noch kein Spot" text="Für eine Party brauchst du einen Ort. Erkunde die Stadt oder geh Gerüchten nach.">
          <Button small onClick={() => navigate('/karte')}>
            Zur Karte
          </Button>
        </EmptyState>
      </Card>
    );
  }

  const nightValid = nights.some((n) => n.startsAt === startsAt) ? startsAt : (nights[0]?.startsAt ?? 0);
  const prices = Object.fromEntries(Object.entries(bring).filter(([id]) => countItem(s, id) > 0));
  const plan: EventPlanInput = {
    name,
    spotId,
    startsAt: nightValid,
    durationH,
    entry,
    lineup: lineup.slice(0, maxLineup(durationH)),
    sound,
    transport,
    promo,
    prices,
    freeWater,
    helpers,
    awareness,
    medics,
  };
  const f = forecast(s, plan);
  const upfront = upfrontCosts(s, plan).reduce((sum, c) => sum + c.amount, 0);
  const fees = plan.lineup.reduce((sum, id) => sum + performerFee(s, id), 0);
  const load = transportLoad(s, plan);
  const cap = transportCapacity(s);
  const van = vanFor(s, load.volumeL, load.weightKg);
  const spot = spotDef(spotId);
  const since = daysSinceCheck(s, spotId);
  const slots = maxLineup(durationH);
  const candidates = lineupCandidates(s);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="dash">
      <div className="stack">
        <Card>
          <CardHead icon={<MapPinned size={15} />} title="Spot" />
          <select value={spotId} onChange={(e) => setSpotId(e.target.value)} data-testid="plan-spot">
            {spots.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name} · {statView(s, sp.id, 'capacity').text}
              </option>
            ))}
          </select>
          <p className="small dim" style={{ marginTop: 8 }}>
            {LEGALITY_LABELS[spot.legality]} · {spot.rent > 0 ? `${fmtMoney(spot.rent)} Miete` : 'keine Miete'} · Strom: {statView(s, spotId, 'powerKw').text} ·{' '}
            {Number.isFinite(since) ? `gecheckt vor ${since} Tg` : 'nie gecheckt'}
          </p>
          {since > 7 && <p className="tiny tone-warning">Nicht gecheckt – vor dem Event solltest du hinfahren (Aufgabe).</p>}
        </Card>

        <Card>
          <CardHead title="Nacht & Dauer" />
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {nights.map((n) => (
              <Chip key={n.startsAt} active={n.startsAt === nightValid} onClick={() => setStartsAt(n.startsAt)} testId={`night-${n.day}`}>
                {n.label}
                {(n.weekday === 4 || n.weekday === 5) && ' ★'}
              </Chip>
            ))}
          </div>
          <p className="tiny faint" style={{ marginTop: 6 }}>
            Beginn in {fmtCountdown(nightValid - s.clock.now)} · ★ Wochenende zieht mehr Leute · mehr Vorlauf = mehr Werbewirkung
          </p>
          <div className="chips" style={{ flexWrap: 'wrap', marginTop: 10 }}>
            {DURATIONS.map((h) => (
              <Chip key={h} active={h === durationH} onClick={() => setDurationH(h)}>
                {h} Std
              </Chip>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Eintritt" />
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {ENTRY_OPTIONS.map((e) => (
              <Chip key={e} active={e === entry} onClick={() => setEntry(e)} testId={`entry-${e}`}>
                {e === 0 ? 'Spende' : fmtMoney(e)}
              </Chip>
            ))}
          </div>
          <p className="tiny faint" style={{ marginTop: 6 }}>
            Spendenbasis lockt mehr Leute – das Geld hängt dann von der Stimmung ab.
          </p>
        </Card>

        <Card>
          <CardHead title={`Line-up (${plan.lineup.length} / ${slots})`} />
          <div className="stack stack--s">
            {candidates.map((id) => {
              const reason = performerReason(s, id, nightValid);
              const selected = lineup.includes(id);
              const person = id === 'self' ? null : PERSONS_BY_ID.get(id)!;
              const full = !selected && plan.lineup.length >= slots;
              return (
                <button
                  key={id}
                  className={['morelist__item', selected && 'is-active'].filter(Boolean).join(' ')}
                  style={{ minHeight: 48, padding: '8px 12px', borderColor: selected ? 'var(--accent)' : undefined }}
                  disabled={!!reason || full}
                  title={reason ?? (full ? 'Alle Slots belegt' : undefined)}
                  onClick={() => setLineup(toggle(lineup, id))}
                  data-testid={`lineup-${id}`}
                >
                  {selected ? <Check size={16} className="tone-accent" /> : <span style={{ width: 16 }} />}
                  <span className="grow">
                    <strong className="small">{person ? displayName(person) : 'Du selbst'}</strong>
                    <div className="tiny faint">
                      {reason ??
                        (person
                          ? `Bekanntheit ${person.stats.bekanntheit} · Zuverlässigkeit ${person.stats.zuverlaessigkeit} · ${performerFee(s, id) > 0 ? fmtMoney(performerFee(s, id)) : 'ohne Gage'}`
                          : 'Dein eigenes Set')}
                    </div>
                  </span>
                </button>
              );
            })}
            {candidates.length === 0 && <p className="small dim">Du kennst noch keine DJs – und hast noch keine eigenen Tracks.</p>}
          </div>
        </Card>

        <Card>
          <CardHead icon={<Speaker size={15} />} title="Sound" />
          <div className="stack stack--s">
            {s.sound.systems.map((sys) => {
              const st = systemStats(s, sys);
              const active = sound.kind === 'own' && sound.systemId === sys.id;
              return (
                <Chip key={sys.id} active={active} disabled={st.reach <= 0} title={st.reach <= 0 ? 'Keine Boxen' : undefined} onClick={() => setSound({ kind: 'own', systemId: sys.id })}>
                  {sys.name} · {fmtNumber(st.reach)} Leute · Q {st.quality}
                </Chip>
              );
            })}
            {PA_RENTALS.map((o) => {
              const r = requirementReason(s, o.requires);
              const active = sound.kind === 'rental' && sound.optionId === o.id;
              return (
                <Chip key={o.id} active={active} disabled={!!r} title={r ?? o.description} onClick={() => setSound({ kind: 'rental', optionId: o.id })} testId={`pa-${o.id}`}>
                  {o.label} · {fmtMoney(o.cost)} · {fmtNumber(o.reach)} Leute{r ? ` · ${r}` : ''}
                </Chip>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead icon={<Truck size={15} />} title="Transport" />
          <div className="chips">
            <Chip active={transport === 'own'} onClick={() => setTransport('own')} testId="transport-own">
              Selbst ({fmtNumber(cap.volumeL)} L)
            </Chip>
            <Chip active={transport === 'rent'} onClick={() => setTransport('rent')} testId="transport-rent">
              Mieten{van && load.volumeL > 0 ? `: ${van.label.replace(' mieten', '')} ${fmtMoney(van.perDay)}` : ''}
            </Chip>
          </div>
          <p className="tiny faint" style={{ marginTop: 6 }}>
            Ladung: {fmtNumber(load.volumeL)} L · {fmtNumber(load.weightKg)} kg (Anlage und Getränke). Verleih-PAs werden geliefert.
          </p>
        </Card>
      </div>

      <div className="stack">
        <Card>
          <CardHead title="Werbung" />
          <div className="stack stack--s">
            {PROMO_CHANNELS.map((ch) => {
              const r = requirementReason(s, ch.requires);
              return (
                <Chip key={ch.id} active={promo.includes(ch.id)} disabled={!!r} title={r ?? ch.description} onClick={() => setPromo(toggle(promo, ch.id))} testId={`promo-${ch.id}`}>
                  {ch.label} · {ch.cost > 0 ? fmtMoney(ch.cost) : 'kostenlos'}
                  {r ? ` · ${r}` : ''}
                </Chip>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="Bar" />
          {GOODS_ITEMS.filter((g) => countItem(s, g.id) > 0).length === 0 ? (
            <p className="small dim">Keine Getränke auf Lager. Unter „Versorgung“ einkaufen – sonst verdurstet die Party.</p>
          ) : (
            <div className="stack stack--s">
              {GOODS_ITEMS.filter((g) => countItem(s, g.id) > 0).map((g) => (
                <div key={g.id} className="row">
                  <input type="checkbox" checked={g.id in bring} onChange={() => setBring(g.id in bring ? Object.fromEntries(Object.entries(bring).filter(([k]) => k !== g.id)) : { ...bring, [g.id]: g.stats?.sellPrice ?? 2 })} style={{ width: 22, minHeight: 22 }} />
                  <span className="grow small">
                    {g.name} ×{countItem(s, g.id)}
                  </span>
                  {g.id in bring && (
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      value={bring[g.id]}
                      onChange={(e) => setBring({ ...bring, [g.id]: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })}
                      style={{ width: 84, minHeight: 38 }}
                      aria-label={`Preis ${g.name}`}
                    />
                  )}
                </div>
              ))}
              <label className="row small">
                <input type="checkbox" checked={freeWater} onChange={() => setFreeWater(!freeWater)} style={{ width: 22, minHeight: 22 }} /> Wasser umsonst (Stimmung +, kein Umsatz)
              </label>
            </div>
          )}
        </Card>

        <Card>
          <CardHead icon={<ShieldAlert size={15} />} title="Team & Sicherheit" />
          <div className="row row--between small">
            <span>Helfer ({fmtMoney(HELPER_COST)} pro Person)</span>
            <span className="row">
              <Button icon small onClick={() => setHelpers(Math.max(0, helpers - 1))} aria-label="Weniger Helfer">
                <Minus size={14} />
              </Button>
              <strong className="num">{helpers}</strong>
              <Button icon small onClick={() => setHelpers(Math.min(20, helpers + 1))} aria-label="Mehr Helfer">
                <Plus size={14} />
              </Button>
            </span>
          </div>
          <label className="row small" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={awareness} onChange={() => setAwareness(!awareness)} style={{ width: 22, minHeight: 22 }} /> Awareness-Team ({fmtMoney(AWARENESS_COST)})
          </label>
          <label className="row small" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={medics} onChange={() => setMedics(!medics)} style={{ width: 22, minHeight: 22 }} /> Sanitäter ({fmtMoney(MEDICS_COST)})
          </label>
          <p className="tiny faint" style={{ marginTop: 6 }}>
            Faustregel: eine helfende Person pro 60 Gäste – Crew zählt mit.
          </p>
        </Card>

        <Card accent testId="forecast">
          <CardHead icon={<CalendarPlus size={15} />} title="Prognose" />
          {f && (
            <div className="stack stack--s">
              <div className="grid grid--2">
                <div>
                  <div className="stat__label">Gäste</div>
                  <div className="stat__value">≈ {fmtNumber(f.visitors)}</div>
                  <div className="tiny faint">{f.demand > f.capacity ? `${fmtNumber(f.demand)} wollen kommen, ${fmtNumber(f.capacity)} passen rein` : `Platz für ${fmtNumber(f.capacity)}`}</div>
                </div>
                <div>
                  <div className="stat__label">Stimmung</div>
                  <div className="stat__value">≈ {f.mood}</div>
                  <div className="tiny faint">Sound für {fmtNumber(f.sound.reach)} Leute</div>
                </div>
              </div>
              <dl className="kv">
                <dt>Einnahmen (geschätzt)</dt>
                <dd>{fmtMoney(f.revenue)}</dd>
                <dt>Vorkosten (jetzt)</dt>
                <dd>−{fmtMoney(upfront)}</dd>
                <dt>Gagen (danach)</dt>
                <dd>−{fmtMoney(fees)}</dd>
                <dt>Ergebnis (geschätzt)</dt>
                <dd className={f.revenue - upfront - fees >= 0 ? 'tone-success' : 'tone-danger'}>{fmtMoney(f.revenue - upfront - fees, { sign: true })}</dd>
              </dl>
              {!f.powerOk && <Banner tone="warning">Strom reicht nicht: {f.sound.powerKw} kW nötig. Generator ins System oder anderen Spot wählen.</Banner>}
              {f.visitors > f.sound.reach * 1.2 && <Banner tone="warning">Zu wenig Anlage für so viele Leute.</Banner>}
              {f.supplyCoverage < 0.7 && (
                <Banner tone="warning">
                  {f.supplyCoverage === 0 ? 'Keine Getränke dabei – die Leute werden durstig und gehen früher.' : `Die Getränke reichen nur für etwa ${Math.round(f.supplyCoverage * 100)} % des Durstes.`} Unter „Versorgung“ nachkaufen.
                </Banner>
              )}
              {f.noShowRisk > 0.12 && <Banner tone="warning">Risiko, dass jemand aus dem Line-up nicht kommt: {fmtPercent(f.noShowRisk)}. Nach dem Ansetzen das Line-up bestätigen halbiert es.</Banner>}
              <div className="tiny faint">
                Polizei-Risiko {fmtPercent(f.policeRisk)} · Technik-Ausfall {fmtPercent(f.failureRisk)}
                {f.weatherRisk ? ' · draußen: Wetter entscheidet mit' : ''}
              </div>
            </div>
          )}
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="event-name">Name</label>
            <input id="event-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} data-testid="event-name" />
          </div>
          <div style={{ marginTop: 12 }}>
            <ActionButton action={planEvent} payload={plan} variant="primary" block onDone={onPlanned} testId="plan-event">
              <CalendarPlus size={16} /> Event ansetzen ({fmtMoney(upfront)})
            </ActionButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
