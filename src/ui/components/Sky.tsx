import { gameTimeAt } from '../../game/core/time';
import { useApp } from '../../app/store';

export type SkyPhase = 'night' | 'dawn' | 'day' | 'dusk';

export function phaseForHour(hour: number): SkyPhase {
  if (hour >= 22 || hour < 5) return 'night';
  if (hour < 9) return 'dawn';
  if (hour < 18) return 'day';
  return 'dusk';
}

/** The room behind the UI: light changes with the game hour, lasers at night. */
export function Sky({ phase }: { phase?: SkyPhase }) {
  const game = useApp((a) => a.game);
  const p = phase ?? (game ? phaseForHour(gameTimeAt(game.clock, game.clock.now).hour) : 'night');
  return (
    <div className="sky" data-phase={p} aria-hidden="true">
      <div className="sky__stars" />
      <div className="sky__laser" style={{ left: '12%' }} />
      <div className="sky__laser" />
      <div className="sky__laser" />
    </div>
  );
}
