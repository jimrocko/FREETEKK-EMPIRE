import { Sparkles, Timer } from 'lucide-react';
import { useGameState } from '../../app/store';
import { describeEffects } from '../../game/core/effects';
import { fmtCountdown } from '../../game/core/format';
import { answerEvent } from '../../game/systems/happenings/actions';
import { activeModifiers, bindTarget, happeningDef } from '../../game/systems/happenings/logic';
import type { OpenHappening } from '../../game/systems/happenings/state';
import { ActionButton } from './ActionButton';
import { Card, CardHead } from './ui';

/** A random event that waits for your decision. */
export function HappeningCard({ h }: { h: OpenHappening }) {
  const s = useGameState();
  const def = happeningDef(h.defId);
  return (
    <Card accent testId={`happening-${h.defId}`}>
      <CardHead
        icon={<Sparkles size={15} />}
        title={h.title}
        right={
          h.expiresAt !== undefined ? (
            <span className="tiny tone-warning num row">
              <Timer size={12} /> {fmtCountdown(Math.max(0, h.expiresAt - s.clock.now))}
            </span>
          ) : undefined
        }
      />
      <p className="small">{h.text}</p>
      <div className="stack stack--s" style={{ marginTop: 10 }}>
        {def.choices?.map((c) => {
          const hint = describeEffects(bindTarget(c.effects, h.ctx));
          return (
            <ActionButton key={c.id} action={answerEvent} payload={{ id: h.id, choiceId: c.id }} block testId={`answer-${c.id}`}>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <span>{c.label}</span>
                {hint && <span className="tiny faint">{hint}</span>}
              </span>
            </ActionButton>
          );
        })}
      </div>
      {def.onExpire && def.onExpire.length > 0 && <p className="tiny faint" style={{ marginTop: 8 }}>Wer nicht reagiert, entscheidet auch.</p>}
    </Card>
  );
}

/** Temporary city-wide effects (trade fair, crackdown, holidays …). */
export function ModifierList() {
  const s = useGameState();
  const mods = activeModifiers(s);
  if (mods.length === 0) return null;
  return (
    <Card testId="modifiers">
      <CardHead icon={<Sparkles size={15} />} title="Gerade in der Stadt" />
      <div className="stack stack--s">
        {mods.map((m) => (
          <div key={m.id} className="row row--between small">
            <span className={m.value >= 0 === (m.kind !== 'police' && m.kind !== 'goodsPrice') ? 'tone-success' : 'tone-warning'}>{m.label}</span>
            <span className="tiny faint num">{fmtCountdown(m.until - s.clock.now)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
