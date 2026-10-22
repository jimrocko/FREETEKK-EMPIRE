import { useGameState } from '../../../app/store';
import { cityDef } from '../../../game/content/registry';
import type { DistrictKind } from '../../../game/content/cities';
import type { PoiKind } from '../../../game/content/types';
import { SPOTS } from '../../../game/content/spots';
import { POIS } from '../../../game/content/pois';
import { cityDistricts, districtLockReason, districtState, isPoiKnown, openRumors } from '../../../game/systems/map/logic';
import { spotDef, poiDef } from '../../../game/content/registry';

const KIND_FILL: Record<DistrictKind, string> = {
  center: '#3a2f4d',
  industrial: '#3b3632',
  residential: '#2c3446',
  harbor: '#1d3a4a',
  university: '#2f4038',
  forest: '#1f3d26',
  commercial: '#3d3826',
};

export const POI_COLORS: Record<PoiKind, string> = {
  shop: '#5ccbff',
  hangout: '#ff3fd5',
  club: '#c48cff',
  storage: '#ffb444',
};

interface Props {
  selected: string | null;
  onSelectDistrict: (id: string) => void;
  onSelectSpot: (id: string) => void;
  onSelectPoi: (id: string) => void;
}

export function CityMap({ selected, onSelectDistrict, onSelectSpot, onSelectPoi }: Props) {
  const s = useGameState();
  const city = cityDef(s.map.cityId);
  const districts = cityDistricts(s);
  const spots = SPOTS.filter((sp) => sp.cityId === city.id && s.spots.spots[sp.id]?.known);
  const pois = POIS.filter((p) => p.cityId === city.id && isPoiKnown(s, p.id));
  const rumorDistricts = new Set(
    openRumors(s).map((r) => (r.target.kind === 'spot' ? spotDef(r.target.id).districtId : poiDef(r.target.id).districtId)),
  );

  return (
    <div className="citymap" data-testid="city-map">
      <svg viewBox="0 0 360 300" role="img" aria-label={`Karte von ${city.name}`}>
        <defs>
          <pattern id="fog" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#0b0b10" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#1e1e28" strokeWidth="2.5" />
          </pattern>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#14141c" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="360" height="300" fill="url(#grid)" />

        {districts.map((d) => {
          const st = districtState(s, d.id);
          const locked = !!districtLockReason(s, d);
          const pts = d.shape.map((p) => p.join(',')).join(' ');
          const isSel = selected === d.id;
          return (
            <g key={d.id} onClick={() => onSelectDistrict(d.id)} data-testid={`district-${d.id}`}>
              <polygon className="citymap__district" points={pts} fill="url(#fog)" stroke="none" />
              <polygon
                className="citymap__district"
                points={pts}
                fill={KIND_FILL[d.kind]}
                fillOpacity={locked ? 0.12 : 0.18 + (st.explored / 100) * 0.62}
                stroke={isSel ? 'var(--accent)' : '#2b2b38'}
                strokeWidth={isSel ? 1.6 : 0.8}
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {city.water.map((path, i) => (
          <path key={i} d={path} fill="none" stroke="#123047" strokeWidth={8} strokeLinecap="round" opacity={0.9} pointerEvents="none" />
        ))}

        {districts.map((d) => {
          const st = districtState(s, d.id);
          const locked = !!districtLockReason(s, d);
          return (
            <g key={`l-${d.id}`}>
              <text className="citymap__label" x={d.label[0]} y={d.label[1]}>
                {d.name}
              </text>
              <text className="citymap__label citymap__sub" x={d.label[0]} y={d.label[1] + 8}>
                {locked ? 'gesperrt' : `${st.explored} %`}
              </text>
              {rumorDistricts.has(d.id) && (
                <text className="citymap__rumor" x={d.label[0] + 22} y={d.label[1] - 6}>
                  ?
                </text>
              )}
            </g>
          );
        })}

        {pois.map((p) => (
          <circle
            key={p.id}
            className="citymap__marker"
            cx={p.pos[0]}
            cy={p.pos[1]}
            r={4}
            fill={POI_COLORS[p.kind]}
            stroke="#09090c"
            strokeWidth={1.2}
            onClick={(e) => {
              e.stopPropagation();
              onSelectPoi(p.id);
            }}
            data-testid={`marker-${p.id}`}
          >
            <title>{p.name}</title>
          </circle>
        ))}

        {spots.map((sp) => {
          const st = s.spots.spots[sp.id];
          const color = st.status === 'closed' ? 'var(--danger)' : 'var(--accent)';
          return (
            <rect
              key={sp.id}
              className="citymap__marker"
              x={sp.pos[0] - 4}
              y={sp.pos[1] - 4}
              width={8}
              height={8}
              rx={1.2}
              fill={color}
              stroke="#09090c"
              strokeWidth={1.2}
              transform={`rotate(45 ${sp.pos[0]} ${sp.pos[1]})`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSpot(sp.id);
              }}
              data-testid={`marker-${sp.id}`}
            >
              <title>{sp.name}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
