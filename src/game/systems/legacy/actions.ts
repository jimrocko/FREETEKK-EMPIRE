import { defineAction } from '../../core/actions';
import { PERKS, SCENARIOS } from '../../content/legacy';
import { nextRandom } from '../../core/rng';
import { createInitialState } from '../../state';
import { legacyGain, nextScenarios, perkReason, retireReason, runDays } from './logic';

export const buyPerk = defineAction<{ perkId: string }>({
  id: 'legacy.perk',
  check: (s, p) => perkReason(s, p.perkId),
  run: (d, p) => {
    const perk = PERKS.find((x) => x.id === p.perkId)!;
    d.legacy.points -= perk.cost;
    d.legacy.perks[perk.id] = (d.legacy.perks[perk.id] ?? 0) + 1;
    return `${perk.name} – wirkt ab dem nächsten Start.`;
  },
});

/** Pass on your crew and start a new run with legacy points and perks. */
export const retire = defineAction<{ scenarioId: string; name: string }>({
  id: 'legacy.retire',
  check: (s, p) => {
    const r = retireReason(s);
    if (r) return r;
    if (!nextScenarios(s).some((sc) => sc.id === p.scenarioId)) return 'Dieses Szenario ist noch nicht verfügbar.';
    const n = p.name.trim();
    return n.length < 2 || n.length > 24 ? 'Name mit 2–24 Zeichen.' : null;
  },
  run: (d, p) => {
    const gained = legacyGain(d);
    const legacy = {
      runs: d.legacy.runs + 1,
      points: d.legacy.points + gained,
      perks: { ...d.legacy.perks },
      history: [
        ...d.legacy.history,
        {
          name: d.player.name,
          ...(d.crew.founded ? { crew: d.crew.name } : {}),
          reputation: Math.round(d.progression.reputation),
          days: runDays(d),
          festivals: d.progression.stats.festivals ?? 0,
          scenario: d.legacy.scenario,
          endedAt: d.clock.now,
          gained,
        },
      ],
      scenario: p.scenarioId,
    };
    const seed = Math.floor(nextRandom(d.rng) * 2 ** 31);
    const next = createInitialState({ now: d.clock.now, seed, playerName: p.name, scenario: SCENARIOS.find((s) => s.id === p.scenarioId)!, legacy });
    for (const key of Object.keys(next) as (keyof typeof next)[]) (d as unknown as Record<string, unknown>)[key] = next[key];
    return `Ein neues Kapitel beginnt. +${gained} Vermächtnis-Punkte.`;
  },
});
