import { useGameState } from '../../../app/store';
import { PEOPLE } from '../../../game/content/people';
import { PERSONS_BY_ID } from '../../../game/content/registry';
import { ROLE_LABELS, shortName } from '../../../game/systems/people/logic';
import { initials, personColor } from './Avatar';

const SIZE = 360;
const C = SIZE / 2;

interface NodePos {
  id: string;
  x: number;
  y: number;
  known: boolean;
  via?: string;
}

export function NetworkGraph({ onSelect }: { onSelect: (personId: string) => void }) {
  const s = useGameState();
  const met = PEOPLE.filter((p) => s.people.people[p.id]?.met).sort(
    (a, b) => (s.people.people[a.id].metAt ?? 0) - (s.people.people[b.id].metAt ?? 0) || a.id.localeCompare(b.id),
  );
  const nodes = new Map<string, NodePos>();
  const r1 = met.length > 10 ? 118 : 100;
  met.forEach((p, i) => {
    const angle = (i / Math.max(1, met.length)) * Math.PI * 2 - Math.PI / 2;
    nodes.set(p.id, { id: p.id, x: C + Math.cos(angle) * r1, y: C + Math.sin(angle) * r1, known: true });
  });

  // People you have heard of, placed outside next to whoever told you about them.
  const unknown: { id: string; via: string }[] = [];
  for (const p of met) {
    for (const r of s.people.people[p.id].revealed) {
      if (!s.people.people[r]?.met && !unknown.some((u) => u.id === r)) unknown.push({ id: r, via: p.id });
    }
  }
  const perVia = new Map<string, number>();
  for (const u of unknown) {
    const anchor = nodes.get(u.via)!;
    const k = perVia.get(u.via) ?? 0;
    perVia.set(u.via, k + 1);
    const base = Math.atan2(anchor.y - C, anchor.x - C);
    const angle = base + (k - 0.5) * 0.32;
    const r2 = r1 + 52 + (k % 2) * 10;
    nodes.set(u.id, { id: u.id, x: C + Math.cos(angle) * r2, y: C + Math.sin(angle) * r2, known: false, via: u.via });
  }

  const edges: { a: string; b: string; dashed: boolean }[] = [];
  for (const p of met) {
    for (const r of s.people.people[p.id].revealed) {
      if (!nodes.has(r)) continue;
      const key = [p.id, r].sort().join('|');
      if (!edges.some((e) => [e.a, e.b].sort().join('|') === key)) edges.push({ a: p.id, b: r, dashed: !s.people.people[r]?.met });
    }
  }

  return (
    <div className="citymap graph" data-testid="network-graph">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Dein Netzwerk">
        <circle cx={C} cy={C} r={r1} fill="none" stroke="#1a1a24" strokeDasharray="2 4" />
        {met.map((p) => {
          const n = nodes.get(p.id)!;
          const trust = s.people.people[p.id].trust;
          return <line key={`pl-${p.id}`} x1={C} y1={C} x2={n.x} y2={n.y} stroke="#b8ff3c" strokeOpacity={0.12 + (trust / 100) * 0.55} strokeWidth={0.6 + (trust / 100) * 2.4} />;
        })}
        {edges.map((e) => {
          const a = nodes.get(e.a)!;
          const b = nodes.get(e.b)!;
          return <line key={`${e.a}-${e.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.dashed ? '#6c6c7e' : '#c48cff'} strokeOpacity={0.55} strokeWidth={1} strokeDasharray={e.dashed ? '3 3' : undefined} />;
        })}
        <circle cx={C} cy={C} r={16} fill="#b8ff3c" />
        <text x={C} y={C + 3.5} className="graph__label" style={{ fill: '#0b0b10', stroke: 'none', fontSize: 9 }}>
          DU
        </text>
        {[...nodes.values()].map((n) => {
          const def = PERSONS_BY_ID.get(n.id)!;
          return (
            <g key={n.id} className="graph__node" onClick={() => onSelect(n.known ? n.id : n.via!)} data-testid={`node-${n.id}`}>
              <circle
                cx={n.x}
                cy={n.y}
                r={n.known ? 12 : 9}
                fill={n.known ? personColor(def) : '#14141b'}
                stroke={n.known ? '#09090c' : '#6c6c7e'}
                strokeWidth={1.4}
                strokeDasharray={n.known ? undefined : '2 2'}
              />
              <text x={n.x} y={n.y + 3} className="graph__label" style={{ fill: n.known ? '#0b0b10' : '#a2a2b4', stroke: 'none' }}>
                {n.known ? initials(def) : '?'}
              </text>
              <text x={n.x} y={n.y + (n.known ? 22 : 18)} className="graph__label">
                {n.known ? shortName(def) : ROLE_LABELS[def.roles[0]]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
