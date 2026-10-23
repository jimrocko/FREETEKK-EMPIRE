import { hashString } from '../../game/core/rng';

const COLORS = ['#c6ff3d', '#ff2bd6', '#22e3ff', '#8a5cff', '#ffb444', '#3dffa6'];

/** A procedural sigil for a crew or player – the same name always gets the same emblem. */
export function CrewEmblem({ seed, size = 44, progress, color }: { seed: string; size?: number; progress?: number; color?: string }) {
  const h = hashString(seed || '?');
  const main = color ?? COLORS[h % COLORS.length];
  const second = COLORS[(h >>> 3) % COLORS.length] === main ? COLORS[(h >>> 5) % COLORS.length] : COLORS[(h >>> 3) % COLORS.length];
  const shape = (h >>> 7) % 4;
  const glyph = (h >>> 10) % 6;
  const rot = ((h >>> 13) % 4) * 15;
  const ring = progress !== undefined ? Math.max(0, Math.min(1, progress)) : undefined;
  const R = 46;
  const C = 2 * Math.PI * R;

  const outline = [
    <polygon key="hex" points="50,8 86,29 86,71 50,92 14,71 14,29" />,
    <path key="shield" d="M50 8 L84 20 L80 60 Q72 82 50 92 Q28 82 20 60 L16 20 Z" />,
    <circle key="circle" cx="50" cy="50" r="40" />,
    <polygon key="diamond" points="50,8 90,50 50,92 10,50" />,
  ][shape];

  const symbol = [
    // Speaker
    <g key="speaker">
      <circle cx="50" cy="52" r="18" fill="none" stroke={second} strokeWidth="5" />
      <circle cx="50" cy="52" r="7" fill={second} />
      <circle cx="50" cy="28" r="4" fill={second} />
    </g>,
    // Rabbit ears
    <g key="rabbit" fill={second}>
      <ellipse cx="41" cy="34" rx="5" ry="14" transform="rotate(-12 41 34)" />
      <ellipse cx="59" cy="34" rx="5" ry="14" transform="rotate(12 59 34)" />
      <circle cx="50" cy="58" r="15" />
      <circle cx="44" cy="56" r="2.5" fill="#07060b" />
      <circle cx="56" cy="56" r="2.5" fill="#07060b" />
    </g>,
    // Lightning
    <polygon key="bolt" points="56,20 34,54 48,54 42,80 66,42 52,42" fill={second} />,
    // Waveform
    <polyline key="wave" points="22,50 30,50 36,32 44,68 50,26 56,72 62,36 68,58 74,50 78,50" fill="none" stroke={second} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />,
    // Triangle + bar
    <g key="tri" fill="none" stroke={second} strokeWidth="5">
      <polygon points="50,26 74,68 26,68" />
      <line x1="50" y1="40" x2="50" y2="58" />
    </g>,
    // Acid smiley
    <g key="smiley">
      <circle cx="50" cy="50" r="20" fill={second} />
      <circle cx="43" cy="45" r="3" fill="#07060b" />
      <circle cx="57" cy="45" r="3" fill="#07060b" />
      <path d="M40 55 Q50 66 60 55" fill="none" stroke="#07060b" strokeWidth="3.5" strokeLinecap="round" />
    </g>,
  ][glyph];

  return (
    <span className="emblem" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <filter id={`glow-${h}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {ring !== undefined && (
          <>
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={main}
              strokeWidth="4"
              strokeDasharray={`${C * ring} ${C}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              filter={`url(#glow-${h})`}
            />
          </>
        )}
        <g transform={`translate(50 50) scale(${ring !== undefined ? 0.78 : 1}) translate(-50 -50)`}>
          <g fill="#0e0a17" stroke={main} strokeWidth="4" filter={`url(#glow-${h})`} transform={`rotate(${rot} 50 50)`}>
            {outline}
          </g>
          {symbol}
        </g>
      </svg>
    </span>
  );
}
