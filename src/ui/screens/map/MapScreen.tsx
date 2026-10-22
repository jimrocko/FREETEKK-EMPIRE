import { useEffect, useState } from 'react';
import { ChevronRight, Compass, Ear, Lock, MapPinned, Search } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { cityDef, districtDef, poiDef, spotDef } from '../../../game/content/registry';
import type { PoiKind } from '../../../game/content/types';
import { fmtNumber } from '../../../game/core/format';
import { exploreDistrict, followRumor } from '../../../game/systems/map/actions';
import {
  cityDistricts,
  districtLockReason,
  districtState,
  exploreDurationMin,
  exploreGain,
  hasUndiscovered,
  knownPois,
  knownPoisIn,
  knownSpotsIn,
  openRumors,
} from '../../../game/systems/map/logic';
import { RUMORS } from '../../../game/content/rumors';
import { LEGALITY_LABELS, daysSinceCheck, knownSpots, statView } from '../../../game/systems/spots/logic';
import { activitiesByChannel } from '../../../game/systems/activities/logic';
import { ActivityRow } from '../../components/ActivityList';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Card, CardHead, EmptyState, PageHeader, ProgressBar, Tabs } from '../../components/ui';
import { timeAgo } from '../../components/FeedList';
import { navigate, useRoute } from '../../router';
import { CityMap, POI_COLORS } from './CityMap';
import { SpotDetail } from './SpotDetail';
import { PoiDetail, POI_KIND_LABELS } from './PoiDetail';

type MapTab = 'map' | 'spots' | 'places' | 'rumors';

function DistrictPanel({ districtId, onSpot, onPoi }: { districtId: string; onSpot: (id: string) => void; onPoi: (id: string) => void }) {
  const s = useGameState();
  const def = districtDef(districtId);
  const st = districtState(s, districtId);
  const lock = districtLockReason(s, def);
  const spots = knownSpotsIn(s, districtId);
  const pois = knownPoisIn(s, districtId);
  const more = hasUndiscovered(s, districtId);
  return (
    <Card testId="district-panel">
      <div className="stack">
        <div className="row row--between">
          <h2>{def.name}</h2>
          {lock ? (
            <Badge tone="warning">
              <Lock size={11} /> gesperrt
            </Badge>
          ) : (
            <Badge tone="accent">{st.explored} % erkundet</Badge>
          )}
        </div>
        <p className="small dim">{def.description}</p>
        <ProgressBar value={st.explored / 100} label="Erkundet" />
        <p className="tiny faint">
          {more
            ? 'Hier gibt es noch etwas zu entdecken.'
            : 'Durch Erkunden findest du hier nichts Neues mehr – Gerüchte und Kontakte führen vielleicht weiter.'}
        </p>
        <ActionButton action={exploreDistrict} payload={{ districtId }} variant="primary" block testId="explore">
          <Compass size={16} /> Erkunden · {fmtNumber(exploreDurationMin(s, def), 1)} Min · +{exploreGain(s, def)} %
        </ActionButton>

        {(spots.length > 0 || pois.length > 0) && (
          <div className="card card--flush" style={{ background: 'var(--card-2)' }}>
            <div className="list">
              {spots.map((sp) => (
                <button key={sp.id} className="list__row" onClick={() => onSpot(sp.id)}>
                  <span className="icon-box" style={{ color: 'var(--accent)' }}>
                    <MapPinned size={18} />
                  </span>
                  <span className="grow">
                    <strong>{sp.name}</strong>
                    <div className="tiny faint">Spot · {statView(s, sp.id, 'capacity').text}</div>
                  </span>
                  <ChevronRight size={16} className="faint" />
                </button>
              ))}
              {pois.map((p) => (
                <button key={p.id} className="list__row" onClick={() => onPoi(p.id)}>
                  <span className="icon-box" style={{ color: POI_COLORS[p.kind] }}>
                    <Search size={18} />
                  </span>
                  <span className="grow">
                    <strong>{p.name}</strong>
                    <div className="tiny faint">{POI_KIND_LABELS[p.kind]}</div>
                  </span>
                  <ChevronRight size={16} className="faint" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

const PLACE_GROUPS: { title: string; kinds: PoiKind[] }[] = [
  { title: 'Läden', kinds: ['shop'] },
  { title: 'Treffpunkte & Clubs', kinds: ['hangout', 'club'] },
  { title: 'Lagerplätze', kinds: ['storage'] },
];

export function MapScreen() {
  const s = useGameState();
  const path = useRoute();
  const parts = path.split('/').filter(Boolean);
  const sub = parts[1];
  const subId = parts[2];
  const [tab, setTab] = useState<MapTab>(sub === 'geruechte' ? 'rumors' : sub === 'spots' ? 'spots' : 'map');
  const [selected, setSelected] = useState<string>('steinhafen.ostend');
  useEffect(() => {
    if (sub === 'geruechte') setTab('rumors');
    if (sub === 'spots') setTab('spots');
  }, [sub]);
  const city = cityDef(s.map.cityId);
  const spots = knownSpots(s);
  const places = knownPois(s);
  const rumors = openRumors(s);
  const resolved = RUMORS.filter((r) => s.map.rumors[r.id] && !rumors.includes(r));
  const exploring = activitiesByChannel(s, 'explore');
  const districts = cityDistricts(s);
  const overall = Math.round(districts.reduce((sum, d) => sum + districtState(s, d.id).explored, 0) / districts.length);

  const openSpot = (id: string) => navigate(`/karte/spot/${id}`);
  const openPoi = (id: string) => navigate(`/karte/ort/${id}`);
  const closeDetail = () => navigate('/karte');

  return (
    <div className="page" data-testid="screen-map">
      <PageHeader title={city.name} subtitle={`${overall} % der Stadt erkundet · ${spots.length} Spots · ${places.length} Orte`} />

      {exploring.length > 0 && (
        <Card className="card--flush" accent>
          <div className="list">
            {exploring.map((a) => (
              <ActivityRow key={a.id} a={a} now={s.clock.now} />
            ))}
          </div>
        </Card>
      )}

      <Tabs<MapTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'map', label: 'Karte' },
          { id: 'spots', label: 'Spots', count: spots.length },
          { id: 'places', label: 'Orte', count: places.length },
          { id: 'rumors', label: 'Gerüchte', count: rumors.length },
        ]}
      />

      {tab === 'map' && (
        <div className="dash">
          <div className="stack">
            <CityMap selected={selected} onSelectDistrict={setSelected} onSelectSpot={openSpot} onSelectPoi={openPoi} />
            <div className="legend">
              <span>
                <span className="legend__dot legend__dot--spot" />
                Spot
              </span>
              {(Object.keys(POI_COLORS) as PoiKind[]).map((k) => (
                <span key={k}>
                  <span className="legend__dot" style={{ background: POI_COLORS[k] }} />
                  {POI_KIND_LABELS[k]}
                </span>
              ))}
              <span>
                <strong className="tone-discovery">?</strong> Gerücht
              </span>
            </div>
          </div>
          <DistrictPanel districtId={selected} onSpot={openSpot} onPoi={openPoi} />
        </div>
      )}

      {tab === 'spots' &&
        (spots.length === 0 ? (
          <Card>
            <EmptyState icon={<MapPinned size={28} />} title="Noch keine Spots" text="Erkunde Bezirke oder geh Gerüchten nach, um Orte zum Feiern zu finden." />
          </Card>
        ) : (
          <div className="grid grid--auto">
            {spots.map((sp) => {
              const st = s.spots.spots[sp.id];
              const since = daysSinceCheck(s, sp.id);
              return (
                <button key={sp.id} className="card item-card clickable" onClick={() => openSpot(sp.id)} data-testid={`spot-${sp.id}`}>
                  <div className="row row--between" style={{ width: '100%' }}>
                    <strong>{sp.name}</strong>
                    {st.status === 'closed' ? <Badge tone="danger">Abgesperrt</Badge> : <Badge>{LEGALITY_LABELS[sp.legality]}</Badge>}
                  </div>
                  <div className="small dim">
                    {districtDef(sp.districtId).name} · {statView(s, sp.id, 'capacity').text}
                  </div>
                  <div className="tiny faint">
                    Infos {Math.round(st.intel)} % · {Number.isFinite(since) ? `gecheckt vor ${since} Tg` : 'nie gecheckt'}
                  </div>
                </button>
              );
            })}
          </div>
        ))}

      {tab === 'places' && (
        <div className="stack">
          {PLACE_GROUPS.map((g) => {
            const list = places.filter((p) => g.kinds.includes(p.kind));
            if (list.length === 0) return null;
            return (
              <Card key={g.title} className="card--flush">
                <div style={{ padding: '16px 16px 0' }}>
                  <CardHead title={g.title} />
                </div>
                <div className="list">
                  {list.map((p) => (
                    <button key={p.id} className="list__row" onClick={() => openPoi(p.id)} data-testid={`place-${p.id}`}>
                      <span className="icon-box" style={{ color: POI_COLORS[p.kind] }}>
                        <Search size={18} />
                      </span>
                      <span className="grow">
                        <strong>{p.name}</strong>
                        <div className="tiny faint">
                          {districtDef(p.districtId).name}
                          {s.map.rentals[p.id] ? ' · gemietet' : ''}
                        </div>
                      </span>
                      <ChevronRight size={16} className="faint" />
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'rumors' && (
        <div className="stack">
          {rumors.length === 0 && (
            <Card>
              <EmptyState icon={<Ear size={28} />} title="Keine offenen Gerüchte" text="Gerüchte hörst du bei Jobs, in Kneipen und Clubs oder beim Erkunden." />
            </Card>
          )}
          {rumors.map((r) => (
            <Card key={r.id} testId={`rumor-${r.id}`}>
              <div className="stack">
                <p>„{r.text}“</p>
                <div className="tiny faint">Gehört {timeAgo(s.clock.now, s.map.rumors[r.id].heardAt)}</div>
                <ActionButton action={followRumor} payload={{ rumorId: r.id }} variant="primary" block testId={`follow-${r.id}`}>
                  <Ear size={16} /> Nachgehen ({r.followMin} Min)
                </ActionButton>
              </div>
            </Card>
          ))}
          {resolved.length > 0 && (
            <Card className="card--flush">
              <div style={{ padding: '16px 16px 0' }}>
                <CardHead title="Erledigte Gerüchte" />
              </div>
              <div className="list">
                {resolved.map((r) => (
                  <button
                    key={r.id}
                    className="list__row"
                    onClick={() => (r.target.kind === 'spot' ? openSpot(r.target.id) : openPoi(r.target.id))}
                  >
                    <span className="grow small dim">„{r.text}“</span>
                    <span className="tiny tone-accent">{r.target.kind === 'spot' ? spotDef(r.target.id).name : poiDef(r.target.id).name}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {sub === 'spot' && subId && <SpotDetail spotId={subId} onClose={closeDetail} />}
      {sub === 'ort' && subId && <PoiDetail poiId={subId} onClose={closeDetail} />}
    </div>
  );
}
