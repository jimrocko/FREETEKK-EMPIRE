import { Check, Lock, Sparkles } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { UNLOCKS, UNLOCK_BRANCHES, type UnlockBranch, type UnlockDef } from '../../../game/content/unlocks';
import { checkCondition, describeCondition } from '../../../game/core/conditions';
import { fmtMoney } from '../../../game/core/format';
import { isUnlocked } from '../../../game/systems/progression/logic';
import { buyUnlock, unlockName, unlockStatus } from '../../../game/systems/progression/tree';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Card, CardHead } from '../../components/ui';

const BRANCHES = Object.keys(UNLOCK_BRANCHES) as UnlockBranch[];

function UnlockNode({ u }: { u: UnlockDef }) {
  const s = useGameState();
  const status = unlockStatus(s, u.id);
  return (
    <div className="card" style={{ background: 'var(--card-2)', opacity: status === 'blocked' ? 0.8 : 1 }} data-testid={`unlock-${u.id}`}>
      <div className="row row--between">
        <strong className="small">{u.name}</strong>
        {status === 'done' ? (
          <Badge tone="success">
            <Check size={11} /> Frei
          </Badge>
        ) : (
          <Badge tone={status === 'available' ? 'accent' : 'default'}>
            {u.cost} SP{u.money ? ` · ${fmtMoney(u.money)}` : ''}
          </Badge>
        )}
      </div>
      <p className="tiny dim" style={{ marginTop: 4 }}>
        {u.description}
      </p>
      <ul className="tiny" style={{ margin: '6px 0 0', paddingLeft: 16 }}>
        {u.enables.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
      {status !== 'done' && (
        <>
          {((u.requires?.length ?? 0) > 0 || (u.conditions?.length ?? 0) > 0) && (
            <div className="stack stack--s" style={{ marginTop: 8 }}>
              {u.requires?.map((r) => (
                <div key={r} className={`tiny ${isUnlocked(s, r) ? 'dim' : 'faint'}`}>
                  {isUnlocked(s, r) ? '✓' : <Lock size={10} />} {unlockName(r)}
                </div>
              ))}
              {u.conditions?.map((c, i) => (
                <div key={i} className={`tiny ${checkCondition(s, c) ? 'dim' : 'faint'}`}>
                  {checkCondition(s, c) ? '✓' : '·'} {describeCondition(c)}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <ActionButton action={buyUnlock} payload={{ id: u.id }} small block showReason={status === 'available'} testId={`buy-${u.id}`}>
              Freischalten
            </ActionButton>
          </div>
        </>
      )}
    </div>
  );
}

export function TreeTab() {
  const s = useGameState();
  return (
    <div className="stack">
      <Card accent testId="scene-points">
        <CardHead icon={<Sparkles size={15} />} title="Szenepunkte" right={<span className="stat__value">{s.progression.points}</span>} />
        <p className="small dim">
          Du bekommst Szenepunkte für erreichte Ziele (1–4 je nach Größe) und für jede neue Reputations-Stufe (2). Jede Freischaltung öffnet etwas Neues – Geräte, Formate,
          Städte, Rollen, Geschäfte.
        </p>
        <p className="tiny faint">Insgesamt verdient: {s.progression.pointsTotal} · freigeschaltet: {Object.keys(s.progression.unlocks).length} / {UNLOCKS.length}</p>
      </Card>
      <div className="grid grid--auto">
        {BRANCHES.map((b) => (
          <Card key={b} testId={`branch-${b}`}>
            <CardHead title={UNLOCK_BRANCHES[b]} />
            <div className="stack stack--s">
              {UNLOCKS.filter((u) => u.branch === b)
                .sort((x, y) => x.tier - y.tier)
                .map((u) => (
                  <UnlockNode key={u.id} u={u} />
                ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
