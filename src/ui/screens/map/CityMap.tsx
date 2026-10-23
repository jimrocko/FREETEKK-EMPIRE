import { useGameState } from '../../../app/store';
import { cityDef } from '../../../game/content/registry';
import type { DistrictKind } from '../../../game/content/cities';
import type { PoiKind } from '../../../game/content/types';
import { SPOTS } from '../../../game/content/spots';
import { POIS } from '../../../game/content/pois';
import { cityDistricts, districtLockReason, districtState, isPoiKnown, openRumors } from '../../../game/systems/map/logic';
import { spotDef, poiDef } from '../../../game/content/registry';

const KIND_FILL: Record<DistrictKind, string> = {
  center: '#4a2f66',
  industrial: '#4a3a2e',
  residential: '#2c3a5c',
  harbor: '#163f57',
  university: '#2c4a3c',
  forest: '#1c4626',
  commercial: '#4a4024',
};

/** Glowing outline colour per district kind. */
const KIND_NEON: Record<DistrictKind, string> = {
  center: '#ff2bd6',
  industrial: '#ffb444',
  residential: '#8a5cff',
  harbor: '#22e3ff',
  university: '#3dffa6',
  forest: '#c6ff3d',
  commercial: '#ffd84a',
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
            <rect width="6" height="6" fill="#0a0812" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#1d1630" strokeWidth="2.5" />
          </pattern>
          <filter id="neon" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="water-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

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
                fillOpacity={locked ? 0.1 : 0.14 + (st.explored / 100) * 0.5}
                stroke={isSel ? 'var(--accent)' : locked ? '#2a2340' : KIND_NEON[d.kind]}
                strokeOpacity={isSel ? 1 : locked ? 1 : 0.35 + (st.explored / 100) * 0.5}
                strokeWidth={isSel ? 1.8 : 0.9}
                strokeLinejoin="round"
                filter={isSel || st.explored >= 50 ? 'url(#neon)' : undefined}
              />
            </g>
          );
        })}

        {city.water.map((path, i) => (
          <g key={i} pointerEvents="none">
            <path d={path} fill="none" stroke="#22e3ff" strokeWidth={10} strokeLinecap="round" opacity={0.25} filter="url(#water-glow)" />
            <path d={path} fill="none" stroke="#0f3550" strokeWidth={7} strokeLinecap="round" opacity={0.95} />
            <path d={path} fill="none" stroke="#22e3ff" strokeWidth={0.8} strokeLinecap="round" opacity={0.55} strokeDasharray="3 5" />
          </g>
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
            <g key={sp.id}>
              <circle className="beacon" cx={sp.pos[0]} cy={sp.pos[1]} r={6} fill="none" stroke={color} strokeWidth={1} pointerEvents="none" />
            <rect
              className="citymap__marker"
              x={sp.pos[0] - 4}
              y={sp.pos[1] - 4}
              width={8}
              height={8}
              rx={1.2}
              fill={color}
              stroke="#07060b"
              strokeWidth={1.2}
              filter="url(#neon)"
              transform={`rotate(45 ${sp.pos[0]} ${sp.pos[1]})`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSpot(sp.id);
              }}
              data-testid={`marker-${sp.id}`}
            >
              <title>{sp.name}</title>
            </rect>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
