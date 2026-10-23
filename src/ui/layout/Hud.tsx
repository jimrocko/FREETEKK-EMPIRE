import { useEffect, useRef, useState } from 'react';
import { Moon, Sparkles, Sun, Sunrise, Sunset } from 'lucide-react';
import { useGameState } from '../../app/store';
import { fmtMoney } from '../../game/core/format';
import { gameTimeAt } from '../../game/core/time';
import { repTierFor } from '../../game/content/registry';
import { CrewEmblem } from '../components/CrewEmblem';
import { phaseForHour } from '../components/Sky';
import { navigate } from '../router';
import { sfx } from '../fx/sound';
import { secretTap } from './hackState';

interface Delta {
  id: number;
  amount: number;
}

const PHASE_ICONS = { night: Moon, dawn: Sunrise, day: Sun, dusk: Sunset };

/** Cash pill that pops and shows floating +/− amounts when money changes. */
function CashPill({ cash }: { cash: number }) {
  const prev = useRef(cash);
  const nextId = useRef(1);
  const [deltas, setDeltas] = useState<Delta[]>([]);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    const diff = Math.round((cash - prev.current) * 100) / 100;
    prev.current = cash;
    if (Math.abs(diff) < 1) return;
    const id = nextId.current++;
    setDeltas((d) => [...d.slice(-2), { id, amount: diff }]);
    setBump((b) => b + 1);
    if (diff > 0) sfx.coin();
    const t = setTimeout(() => setDeltas((d) => d.filter((x) => x.id !== id)), 1700);
    return () => clearTimeout(t);
  }, [cash]);
  return (
    <button
      key={bump}
      className={['hud-pill', 'hud-pill--cash', bump > 0 && 'is-bump', cash < 0 && 'is-negative'].filter(Boolean).join(' ')}
      onClick={() => navigate('/finanzen')}
      data-testid="cash"
    >
      {fmtMoney(cash)}
      {deltas.map((d) => (
        <span key={d.id} className={`hud-delta ${d.amount > 0 ? 'hud-delta--up' : 'hud-delta--down'}`}>
          {fmtMoney(d.amount, { sign: true })}
        </span>
      ))}
    </button>
  );
}

export function Hud() {
  const s = useGameState();
  const time = gameTimeAt(s.clock, s.clock.now);
  const rep = repTierFor(s.progression.reputation);
  const name = s.crew.founded ? s.crew.name : s.player.name;
  const PhaseIcon = PHASE_ICONS[phaseForHour(time.hour)];
  return (
    <header className="topbar">
      <button
        className="hud__id"
        onClick={() => {
          if (!secretTap(Date.now())) navigate('/');
        }}
        aria-label="Zum HQ"
        data-testid="hud-emblem"
      >
        <CrewEmblem seed={name} size={42} progress={rep.next ? rep.progress : 1} />
        <span style={{ minWidth: 0 }}>
          <div className="hud__name">{name}</div>
          <div className="hud__tier">{rep.tier.name}</div>
        </span>
      </button>
      <div className="hud__pills">
        <button className="hud-pill" title={`Tag ${time.day}`} onClick={() => navigate('/')}>
          <PhaseIcon size={14} className={time.hour >= 22 || time.hour < 5 ? 'tone-discovery' : 'tone-warning'} />
          <span className="num">
            {time.weekdayShort} {String(time.hour).padStart(2, '0')}:{String(time.minute).padStart(2, '0')}
          </span>
        </button>
        {s.progression.pointsTotal > 0 && (
          <button className="hud-pill hud-pill--points hide-xs" title="Szenepunkte" onClick={() => navigate('/fortschritt/baum')}>
            <Sparkles size={13} /> {s.progression.points}
          </button>
        )}
        <CashPill cash={s.finance.cash} />
      </div>
    </header>
  );
}
