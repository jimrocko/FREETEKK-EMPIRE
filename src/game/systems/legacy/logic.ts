import type { GameState } from '../../state';
import type { Reason, SkillId } from '../../core/types';
import { SKILLS } from '../../core/types';
import { PERKS, RETIRE_REP, SCENARIOS, type ScenarioDef } from '../../content/legacy';
import { gameDayAt } from '../../core/time';
import { addItem } from '../inventory/logic';
import { meetPerson } from '../people/logic';
import { stat } from '../progression/logic';
import { createMapState } from '../map/state';
import { initCity } from '../map/cities';

export function perkLevel(s: GameState, id: string): number {
  return s.legacy.perks[id] ?? 0;
}

/** Legacy points you get for passing on this run. */
export function legacyGain(s: GameState): number {
  const goals = Object.keys(s.goals.done).length;
  const unlocks = Object.keys(s.progression.unlocks).length;
  return 1 + Math.floor(s.progression.reputation / 2500) + 2 * stat(s, 'festivals') + Math.floor(goals / 15) + Math.floor(unlocks / 5);
}

export function retireReason(s: GameState): Reason {
  if (s.progression.reputation >= RETIRE_REP || stat(s, 'festivals') >= 1) return null;
  return `Erst ab ${RETIRE_REP.toLocaleString('de-DE')} Reputation oder nach deinem ersten Festival.`;
}

/** Scenarios available for the next run (after this one is passed on). */
export function nextScenarios(s: GameState): ScenarioDef[] {
  return SCENARIOS.filter((sc) => sc.minRuns <= s.legacy.runs + 1);
}

/** Applies the scenario and the bought perks to a fresh state. */
export function applyStart(state: GameState, scenario: ScenarioDef): void {
  const now = state.clock.now;
  state.legacy.scenario = scenario.id;
  const perkMoney = 750 * perkLevel(state, 'leg.money');
  state.finance.cash = scenario.cash + perkMoney;
  if (scenario.cityId) {
    const fresh = createMapState(now, scenario.cityId);
    state.map = { ...fresh, districts: { ...state.map.districts, ...fresh.districts }, pois: { ...state.map.pois, ...fresh.pois } };
    state.player.cityId = scenario.cityId;
    state.player.homeCity = scenario.cityId;
    initCity(state, scenario.cityId);
  }
  for (const it of scenario.items) addItem(state, it.id, { qty: it.qty, condition: it.condition });
  for (const [skill, xp] of Object.entries(scenario.xp ?? {}) as [SkillId, number][]) state.progression.skills[skill] += xp;
  for (const [id, trust] of Object.entries(scenario.contacts ?? {})) meetPerson(state, id, 'start', { trust, silent: true });
  for (const id of scenario.unlocks ?? []) state.progression.unlocks[id] = now;
  // Perks
  const points = 3 * perkLevel(state, 'leg.points');
  state.progression.points += points;
  state.progression.pointsTotal += points;
  for (const skill of SKILLS) state.progression.skills[skill] += 60 * perkLevel(state, 'leg.skills');
  state.progression.reputation += 100 * perkLevel(state, 'leg.rep');
  if (perkLevel(state, 'leg.friends') > 0) for (const id of ['p.miro', 'p.jule', 'p.kemal']) meetPerson(state, id, 'start', { trust: 35, silent: true });
}

export function runDays(s: GameState): number {
  return gameDayAt(s.clock, s.clock.now);
}

export function perkReason(s: GameState, id: string): Reason {
  const perk = PERKS.find((p) => p.id === id);
  if (!perk) return 'Unbekannt.';
  if (perkLevel(s, id) >= perk.maxLevel) return 'Höchste Stufe erreicht.';
  if (s.legacy.points < perk.cost) return `Zu wenig Vermächtnis-Punkte (${s.legacy.points} / ${perk.cost}).`;
  return null;
}
