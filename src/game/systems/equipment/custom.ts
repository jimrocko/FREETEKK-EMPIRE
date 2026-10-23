import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { notify } from '../../core/notify';
import type { ActivityHandler } from '../activities/handler';
import { channelReason, startActivity } from '../activities/logic';
import { earn, moneyReason, spend } from '../finance/logic';
import { addItem, spaceReason } from '../inventory/logic';
import { addXp, incStat } from '../progression/logic';
import { needsUnlock } from '../progression/tree';

export const CUSTOM_STACK_COST = 1800;
export const CUSTOM_STACK_MINUTES = 45;

export const buildCustomStack = defineAction<Record<string, never>>({
  id: 'equipment.customStack',
  check: (s) => needsUnlock(s, 'u.custombuild') ?? channelReason(s, 'workshop') ?? spaceReason(s, 'item.custom-stack') ?? moneyReason(s, CUSTOM_STACK_COST),
  run: (d) => {
    spend(d, CUSTOM_STACK_COST, 'equipment', 'Material: Custom-Stack');
    startActivity(d, { kind: 'custom-build', channel: 'workshop', label: 'Custom-Stack bauen', durationMs: minutes(CUSTOM_STACK_MINUTES) });
    return 'Holz, Treiber, Leim – die Werkstatt riecht nach Arbeit.';
  },
});

export const customBuildHandler: ActivityHandler = {
  cancelLabel: 'Abbrechen (Material zurückgeben)',
  complete(d) {
    addItem(d, 'item.custom-stack', { condition: 100, paid: CUSTOM_STACK_COST });
    addXp(d, 'technik', 60);
    incStat(d, 'customBuilds');
    notify(d, { tone: 'success', title: 'Custom-Stack fertig', text: 'Ein Unikat für dein Soundsystem.', link: '/crew/systeme' });
  },
  cancel(d) {
    earn(d, Math.round(CUSTOM_STACK_COST * 0.8), 'equipment', 'Material zurückgegeben');
  },
};
