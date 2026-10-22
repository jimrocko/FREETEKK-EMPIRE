import { Wrench } from 'lucide-react';
import { useGameState } from '../../app/store';
import { fmtMoney } from '../../game/core/format';
import { repairPro, repairSelf } from '../../game/systems/equipment/actions';
import {
  needsRepair,
  proRepairCost,
  proRepairMinutes,
  repairContacts,
  repairParts,
  selfRepairMinutes,
  selfRepairTarget,
} from '../../game/systems/equipment/logic';
import { shortName } from '../../game/systems/people/logic';
import { ActionButton } from './ActionButton';

/** Repair options for one item: yourself or with a technician contact. */
export function RepairPanel({ uid, onDone }: { uid: string; onDone?: () => void }) {
  const s = useGameState();
  const it = s.inventory.items[uid];
  if (!it || !needsRepair(it) || it.locked) return null;
  const contacts = repairContacts(s);
  return (
    <div className="stack stack--s" data-testid="repair-panel">
      <strong className="row">
        <Wrench size={15} className="tone-accent" /> Reparatur
      </strong>
      <ActionButton action={repairSelf} payload={{ uid }} block onDone={onDone} testId="repair-self">
        Selbst: {fmtMoney(repairParts(it))} Teile · {selfRepairMinutes(it)} Min → {selfRepairTarget(s, it)} %
      </ActionButton>
      {contacts.map((p) => (
        <ActionButton key={p.id} action={repairPro} payload={{ uid, personId: p.id }} block showReason={false} onDone={onDone} testId={`repair-${p.id}`}>
          Bei {shortName(p)}: {fmtMoney(proRepairCost(it, p))} · {proRepairMinutes(it)} Min → 95 %
        </ActionButton>
      ))}
      {contacts.length === 0 && <p className="tiny faint">Techniker-Kontakte mit etwas Vertrauen (20) reparieren für dich – schneller und besser.</p>}
    </div>
  );
}
