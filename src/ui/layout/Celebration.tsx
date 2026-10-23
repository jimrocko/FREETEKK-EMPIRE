import { useEffect, useRef, useState } from 'react';
import { Award, Crown, Sparkles, Star, Trophy, Zap } from 'lucide-react';
import { appStore } from '../../app/store';
import type { FeedEntry } from '../../game/core/notify';
import { navigate } from '../router';
import { sfx } from '../fx/sound';

const CONFETTI_COLORS = ['#c6ff3d', '#ff2bd6', '#22e3ff', '#8a5cff', '#ffb444'];

function kindOf(e: FeedEntry): { kicker: string; Icon: typeof Star } {
  if (e.title.startsWith('Neuer Status')) return { kicker: 'Neuer Status', Icon: Crown };
  if (e.title.includes('Level')) return { kicker: 'Level up', Icon: Zap };
  if (e.title.startsWith('Ziel erreicht')) return { kicker: 'Ziel erreicht', Icon: Trophy };
  if (e.title.startsWith('Freigeschaltet')) return { kicker: 'Freigeschaltet', Icon: Sparkles };
  return { kicker: 'Großer Moment', Icon: Award };
}

/** Full-screen moment for big events (only while playing, not after offline catch-up). */
export function Celebration() {
  const lastSeen = useRef<number>(appStore.getState().game?.notifications.nextId ?? 1);
  const [queue, setQueue] = useState<FeedEntry[]>([]);
  useEffect(() => {
    return appStore.subscribe((state) => {
      const game = state.game;
      if (!game) return;
      const next = game.notifications.nextId;
      if (next > lastSeen.current && !state.report) {
        const big = game.notifications.feed.filter((e) => e.id >= lastSeen.current && e.big);
        if (big.length > 0) setQueue((q) => [...q, ...big].slice(-3));
      }
      lastSeen.current = next;
    });
  }, []);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    sfx.fanfare();
    // It never blocks for long: the moment fades by itself.
    const t = setTimeout(() => setQueue((q) => (q[0]?.id === current.id ? q.slice(1) : q)), 3800);
    return () => clearTimeout(t);
  }, [current]);
  if (!current) return null;
  const { kicker, Icon } = kindOf(current);
  const title = current.title.replace(/^(Neuer Status|Ziel erreicht|Freigeschaltet): /, '');
  const close = () => setQueue((q) => q.slice(1));
  return (
    <div className="celebrate" onClick={close} role="dialog" aria-label={current.title} data-testid="celebration">
      <div className="celebrate__burst" />
      {Array.from({ length: 26 }, (_, i) => (
        <span
          key={`${current.id}-${i}`}
          className="confetti"
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${((i * 13) % 10) / 20}s`,
            animationDuration: `${2 + ((i * 7) % 10) / 8}s`,
          }}
        />
      ))}
      <div className="celebrate__card">
        <div className="celebrate__icon">
          <Icon size={38} />
        </div>
        <div className="celebrate__kicker" style={{ marginTop: 18 }}>
          {kicker}
        </div>
        <div className="celebrate__title">{title}</div>
        {current.text && <p className="small dim">{current.text}</p>}
        <div className="row" style={{ justifyContent: 'center', marginTop: 18, gap: 8 }}>
          <button className="btn btn--primary" onClick={close} data-testid="celebration-ok">
            Weiter
          </button>
          {current.link && (
            <button
              className="btn"
              onClick={(e) => {
                e.stopPropagation();
                close();
                navigate(current.link!);
              }}
            >
              Ansehen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
