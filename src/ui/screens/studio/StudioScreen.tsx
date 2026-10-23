import { useEffect, useMemo, useState } from 'react';
import { Dice5, Disc3, Lock, Music2, Radio, Send, Trash2, Upload, Wrench } from 'lucide-react';
import { useGameState } from '../../../app/store';
import {
  ARRANGEMENTS,
  ELEMENTS,
  ELEMENT_LABELS,
  GENRES,
  MIX_EFFORTS,
  TRACK_STATS,
  TRACK_STAT_LABELS,
  type Arrangement,
  type ElementId,
  type MixEffort,
} from '../../../game/content/music';
import { ITEMS, itemDef } from '../../../game/content/registry';
import { PEOPLE } from '../../../game/content/people';
import { fmtMoney } from '../../../game/core/format';
import { requirementReason } from '../../../game/core/conditions';
import { produceTrack, uploadTrack, giveTrack, deleteTrack, UPLOAD_FEE } from '../../../game/systems/music/actions';
import {
  BPM_MAX,
  BPM_MIN,
  bestMonitoring,
  devicesFor,
  estimateTrack,
  genreDef,
  genreUnlocked,
  hasRecorder,
  planReason,
  scoreLabel,
  streamRate,
  type ProductionPlan,
} from '../../../game/systems/music/logic';
import type { Track } from '../../../game/systems/music/state';
import { activitiesByChannel } from '../../../game/systems/activities/logic';
import { shortName } from '../../../game/systems/people/logic';
import { ActionButton } from '../../components/ActionButton';
import { ActivityRow } from '../../components/ActivityList';
import { RepairPanel } from '../../components/RepairPanel';
import { Badge, Button, Card, CardHead, ConditionBar, EmptyState, PageHeader, ProgressBar, Tabs } from '../../components/ui';
import { useRoute } from '../../router';
import { isUnlocked } from '../../../game/systems/progression/logic';
import { REMIX_MINUTES, remixPay, takeRemix } from '../../../game/systems/music/remix';

type StudioTab = 'produce' | 'tracks' | 'gear';

const NAME_A = ['Rost', 'Nebel', 'Beton', 'Gleis', 'Bunker', 'Kessel', 'Morgengrau', 'Hafen', 'Funken', 'Kiefer', 'Säure', 'Stahl', 'Nachtbus', 'Echo'];
const NAME_B = ['Protokoll', 'Ritual', 'Maschine', 'Signal', 'Fieber', 'Schleife', 'Spur', 'Puls', 'Kreis', 'Rauschen', 'Tunnel', 'Dämmerung'];

function randomName(): string {
  return `${NAME_A[Math.floor(Math.random() * NAME_A.length)]} ${NAME_B[Math.floor(Math.random() * NAME_B.length)]}`;
}

function StatBars({ stats }: { stats: Track['stats'] }) {
  return (
    <div className="grid grid--2" style={{ gap: '6px 14px' }}>
      {TRACK_STATS.map((k) => (
        <div key={k}>
          <div className="row row--between tiny">
            <span className="faint">{TRACK_STAT_LABELS[k]}</span>
            <span className="num">{stats[k]}</span>
          </div>
          <ProgressBar value={stats[k] / 100} thin label={TRACK_STAT_LABELS[k]} />
        </div>
      ))}
    </div>
  );
}

function ProduceForm() {
  const s = useGameState();
  const firstGenre = GENRES.find((g) => genreUnlocked(s, g)) ?? GENRES[0];
  const [genreId, setGenreId] = useState(firstGenre.id);
  const genre = genreDef(genreId);
  const [bpm, setBpm] = useState(Math.round((genre.bpm[0] + genre.bpm[1]) / 2));
  const [arrangement, setArrangement] = useState<Arrangement>('tool');
  const [effort, setEffort] = useState<MixEffort>('normal');
  const [name, setName] = useState(randomName);
  const [elements, setElements] = useState<Partial<Record<ElementId, string>>>({});

  // Pre-select the best device for every element the player can play.
  useEffect(() => {
    const auto: Partial<Record<ElementId, string>> = {};
    for (const el of ELEMENTS) {
      const best = devicesFor(s, el)[0];
      if (best) auto[el] = best.uid;
    }
    setElements(auto);
  }, []); // only on first render

  const plan: ProductionPlan = { name, genreId, bpm, elements, arrangement, effort };
  // Drop selections that are no longer available.
  const validElements = Object.fromEntries(
    Object.entries(elements).filter(([el, uid]) => uid && devicesFor(s, el as ElementId).some((d) => d.uid === uid)),
  ) as Partial<Record<ElementId, string>>;
  const cleanPlan = { ...plan, elements: validElements };
  const reason = planReason(s, cleanPlan);
  const estimate = useMemo(() => estimateTrack(s, cleanPlan), [s, genreId, bpm, arrangement, effort, name, JSON.stringify(validElements)]);
  const running = activitiesByChannel(s, 'studio');

  if (running.length > 0) {
    return (
      <Card className="card--flush" accent>
        <div style={{ padding: '16px 16px 0' }}>
          <CardHead icon={<Disc3 size={15} />} title="Im Studio" />
        </div>
        <div className="list">
          {running.map((a) => (
            <ActivityRow key={a.id} a={a} now={s.clock.now} />
          ))}
        </div>
        <p className="tiny faint" style={{ padding: '0 16px 16px' }}>
          Während die Session läuft, kannst du alles andere weitermachen.
        </p>
      </Card>
    );
  }

  return (
    <div className="dash">
      <div className="stack">
        <Card>
          <CardHead icon={<Music2 size={15} />} title="Genre" />
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {GENRES.map((g) => {
              const unlocked = genreUnlocked(s, g);
              return (
                <button
                  key={g.id}
                  className={['chip', g.id === genreId && 'is-active'].filter(Boolean).join(' ')}
                  disabled={!unlocked}
                  title={unlocked ? g.description : (requirementReason(s, g.requires) ?? '')}
                  onClick={() => {
                    setGenreId(g.id);
                    setBpm(Math.round((g.bpm[0] + g.bpm[1]) / 2));
                  }}
                  data-testid={`genre-${g.id}`}
                >
                  {!unlocked && <Lock size={11} />} {g.name}
                </button>
              );
            })}
          </div>
          <p className="small dim" style={{ marginTop: 10 }}>
            {genre.description} Ideal: {genre.bpm[0]}–{genre.bpm[1]} BPM.
          </p>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="bpm">
              Tempo: <strong className="num">{bpm} BPM</strong>
              {(bpm < genre.bpm[0] || bpm > genre.bpm[1]) && <span className="tone-warning"> · außerhalb des Genres</span>}
            </label>
            <input id="bpm" type="range" min={BPM_MIN} max={BPM_MAX} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} style={{ padding: 0, minHeight: 30 }} />
          </div>
        </Card>

        <Card>
          <CardHead icon={<Radio size={15} />} title="Elemente aus deinen Geräten" />
          <div className="stack stack--s">
            {ELEMENTS.map((el) => {
              const options = devicesFor(s, el);
              const required = genre.required.includes(el);
              return (
                <div key={el} className="row" style={{ alignItems: 'center' }}>
                  <span style={{ width: 92, flexShrink: 0 }} className="small">
                    {ELEMENT_LABELS[el]}
                    {required && <span className="tone-accent"> *</span>}
                  </span>
                  <select
                    value={validElements[el] ?? ''}
                    onChange={(e) => setElements({ ...elements, [el]: e.target.value || undefined })}
                    disabled={options.length === 0}
                    style={{ minHeight: 40, padding: '6px 10px' }}
                    data-testid={`element-${el}`}
                  >
                    <option value="">{options.length === 0 ? (required ? 'Kein Gerät – im Markt suchen' : 'kein Gerät') : '— leer —'}</option>
                    {options.map((o) => (
                      <option key={o.uid} value={o.uid}>
                        {o.def.name} ({o.value})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          <p className="tiny faint" style={{ marginTop: 10 }}>
            * Pflicht für {genre.name}. Mehr verschiedene Geräte = originellere Tracks. Abhöre: {Math.round(bestMonitoring(s))} · {hasRecorder(s) ? 'Aufnahme am Laptop' : 'Direktaufnahme (ohne Laptop etwas schlechter)'}
          </p>
        </Card>
      </div>

      <div className="stack">
        <Card>
          <CardHead title="Arrangement & Mix" />
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {ARRANGEMENTS.map((a) => (
              <button key={a.id} className={['chip', a.id === arrangement && 'is-active'].filter(Boolean).join(' ')} title={a.description} onClick={() => setArrangement(a.id)}>
                {a.label}
              </button>
            ))}
          </div>
          <p className="tiny faint" style={{ marginTop: 6 }}>
            {ARRANGEMENTS.find((a) => a.id === arrangement)!.description}
          </p>
          <div className="chips" style={{ flexWrap: 'wrap', marginTop: 12 }}>
            {MIX_EFFORTS.map((e) => {
              const r = requirementReason(s, e.requires);
              return (
                <button key={e.id} className={['chip', e.id === effort && 'is-active'].filter(Boolean).join(' ')} disabled={!!r} title={r ?? undefined} onClick={() => setEffort(e.id)}>
                  {r && <Lock size={11} />} {e.label} · {e.minutes} Min
                </button>
              );
            })}
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="track-name">Name</label>
            <div className="row">
              <input id="track-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} data-testid="track-name" />
              <Button icon onClick={() => setName(randomName())} aria-label="Zufälliger Name">
                <Dice5 size={18} />
              </Button>
            </div>
          </div>
        </Card>

        <Card accent>
          <div className="row row--between">
            <div>
              <div className="stat__label">Erwartete Wertung</div>
              <div className="stat__value">{estimate ? `≈ ${estimate.score}` : '–'}</div>
              <div className="tiny faint">{estimate ? `${scoreLabel(estimate.score)} · Inspiration ±` : ''}</div>
            </div>
            <Disc3 size={36} className="tone-accent" />
          </div>
          {estimate && (
            <div style={{ marginTop: 12 }}>
              <StatBars stats={estimate.stats} />
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <ActionButton action={produceTrack} payload={cleanPlan} variant="primary" block testId="produce">
              <Disc3 size={16} /> Produzieren ({MIX_EFFORTS.find((e) => e.id === effort)!.minutes} Min)
            </ActionButton>
          </div>
          {!reason && <p className="tiny faint" style={{ marginTop: 8 }}>Die Geräte nutzen sich dabei etwas ab.</p>}
        </Card>
      </div>
    </div>
  );
}

function TrackCard({ t }: { t: Track }) {
  const s = useGameState();
  const [giving, setGiving] = useState(false);
  const djs = PEOPLE.filter((p) => s.people.people[p.id]?.met && p.roles.some((r) => r === 'dj' || r === 'producer' || r === 'artist'));
  if (t.status === 'producing') {
    return (
      <Card>
        <strong>{t.name}</strong>
        <p className="small dim">Wird gerade produziert …</p>
      </Card>
    );
  }
  const rate = streamRate(t);
  return (
    <Card testId={`track-${t.id}`}>
      <div className="stack">
        <div className="row row--between" style={{ alignItems: 'flex-start' }}>
          <div>
            <strong>{t.name}</strong>
            <div className="tiny faint">
              {genreDef(t.genreId).name} · {t.bpm} BPM · {[...new Set(Object.values(t.elements))].map((id) => ITEMS.get(id!)?.name).join(', ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="price">{t.score}</div>
            <div className="tiny faint">{scoreLabel(t.score)}</div>
          </div>
        </div>
        <StatBars stats={t.stats} />
        <div className="row row--wrap">
          {t.uploadedAt !== undefined ? <Badge tone="success">Online · {fmtMoney(rate)}/Std</Badge> : <Badge>Nicht veröffentlicht</Badge>}
          {t.playedBy.length > 0 && <Badge tone="discovery">Gespielt von {t.playedBy.map((id) => shortName(PEOPLE.find((p) => p.id === id)!)).join(', ')}</Badge>}
          {t.givenTo.length > 0 && <Badge>Bei {t.givenTo.length} DJ</Badge>}
        </div>
        <div className="grid grid--2">
          {t.uploadedAt === undefined ? (
            <ActionButton action={uploadTrack} payload={{ trackId: t.id }} block showReason={false} testId={`upload-${t.id}`}>
              <Upload size={15} /> Online ({fmtMoney(UPLOAD_FEE)})
            </ActionButton>
          ) : (
            <div className="tiny faint">Streams laufen – auch offline (bis 12 Std).</div>
          )}
          <Button block onClick={() => setGiving(!giving)} disabled={djs.length === 0} title={djs.length === 0 ? 'Du kennst noch keine DJs.' : undefined}>
            <Send size={15} /> An DJ geben
          </Button>
        </div>
        {giving && (
          <div className="stack stack--s">
            {djs.map((p) => (
              <ActionButton key={p.id} action={giveTrack} payload={{ trackId: t.id, personId: p.id }} small block testId={`give-${p.id}`}>
                {shortName(p)}
              </ActionButton>
            ))}
          </div>
        )}
        {t.uploadedAt === undefined && (
          <ActionButton action={deleteTrack} payload={{ trackId: t.id }} variant="ghost" small showReason={false}>
            <Trash2 size={14} /> Löschen
          </ActionButton>
        )}
      </div>
    </Card>
  );
}

function GearList() {
  const s = useGameState();
  const items = Object.values(s.inventory.items).filter((it) => {
    const st = ITEMS.get(it.defId)?.stats ?? {};
    return ELEMENTS.some((el) => (st[el] ?? 0) > 0) || (st.monitoring ?? 0) > 0;
  });
  const repairs = activitiesByChannel(s, 'workshop');
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Wrench size={28} />} title="Keine Studio-Geräte" text="Drumcomputer, Synths und Sampler findest du im Markt." />
      </Card>
    );
  }
  return (
    <div className="stack">
      {repairs.length > 0 && (
        <Card className="card--flush" accent>
          <div className="list">
            {repairs.map((a) => (
              <ActivityRow key={a.id} a={a} now={s.clock.now} />
            ))}
          </div>
        </Card>
      )}
      <div className="grid grid--auto">
        {items.map((it) => {
          const def = itemDef(it.defId);
          return (
            <Card key={it.uid} testId={`gear-${it.defId}`}>
              <div className="stack stack--s">
                <div className="row row--between">
                  <strong>{def.name}</strong>
                  {it.broken ? <Badge tone="danger">Defekt</Badge> : it.locked ? <Badge tone="warning">Gebunden</Badge> : null}
                </div>
                <div className="row row--wrap">
                  {ELEMENTS.filter((el) => (def.stats?.[el] ?? 0) > 0).map((el) => (
                    <Badge key={el}>
                      {ELEMENT_LABELS[el]} {def.stats![el]}
                    </Badge>
                  ))}
                  {def.stats?.monitoring ? <Badge>Abhöre {def.stats.monitoring}</Badge> : null}
                </div>
                <ConditionBar value={it.condition} />
                <RepairPanel uid={it.uid} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function StudioScreen() {
  const s = useGameState();
  const sub = useRoute().split('/')[2];
  const [tab, setTab] = useState<StudioTab>(sub === 'tracks' ? 'tracks' : sub === 'geraete' ? 'gear' : 'produce');
  useEffect(() => {
    if (sub === 'tracks') setTab('tracks');
  }, [sub]);
  const tracks = [...s.music.tracks].reverse();
  const totalRate = s.music.tracks.reduce((sum, t) => sum + streamRate(t), 0);

  return (
    <div className="page" data-testid="screen-studio">
      <PageHeader
        title="Studio"
        subtitle={`${s.music.tracks.filter((t) => t.status === 'done').length} Tracks${totalRate > 0 ? ` · Streams ${fmtMoney(totalRate)}/Std` : ''}`}
      />
      <Tabs<StudioTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'produce', label: 'Produzieren' },
          { id: 'tracks', label: 'Tracks', count: tracks.length },
          { id: 'gear', label: 'Geräte' },
        ]}
      />
      {tab === 'produce' && isUnlocked(s, 'u.remix') && (
        <Card testId="remix">
          <CardHead icon={<Disc3 size={15} />} title="Remix-Aufträge" />
          <p className="small dim">
            Jemand will einen Remix. Dauert {REMIX_MINUTES} Minuten im Studio und bringt etwa {fmtMoney(remixPay(s))} plus Ruf.
          </p>
          <div style={{ marginTop: 8 }}>
            <ActionButton action={takeRemix} payload={{}} testId="take-remix">
              Auftrag annehmen
            </ActionButton>
          </div>
        </Card>
      )}
      {tab === 'produce' && <ProduceForm />}
      {tab === 'tracks' &&
        (tracks.length === 0 ? (
          <Card>
            <EmptyState icon={<Music2 size={28} />} title="Noch keine Tracks" text="Produziere deinen ersten Track – mit dem, was du hast." />
          </Card>
        ) : (
          <div className="grid grid--auto">
            {tracks.map((t) => (
              <TrackCard key={t.id} t={t} />
            ))}
          </div>
        ))}
      {tab === 'gear' && <GearList />}
    </div>
  );
}
