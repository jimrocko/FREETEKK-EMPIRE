import type { GameState } from '../../state';
import type { Reason } from '../../core/types';
import { PROJECTS, type ProjectDef } from '../../content/projects';
import { bestSystem, requirementReason } from '../../core/conditions';
import { notify } from '../../core/notify';
import { randRange } from '../../core/rng';
import { MINUTE } from '../../core/time';
import { fmtMoney, fmtNumber } from '../../core/format';
import { earn, moneyReason, spend } from '../finance/logic';
import { addRep, addXp, incStat, setFlag, stat } from '../progression/logic';
import { needsUnlock } from '../progression/tree';
import { revealSpot } from '../map/logic';
import { modifierValue } from '../happenings/logic';
import { addNews } from '../rivals/logic';
import { standSales, addBrand } from '../merch/logic';
import type { ProjectState } from './state';

export const PROJECTS_BY_ID: ReadonlyMap<string, ProjectDef> = new Map(PROJECTS.map((p) => [p.id, p]));

export function projectDef(id: string): ProjectDef {
  const p = PROJECTS_BY_ID.get(id);
  if (!p) throw new Error(`Unknown project: ${id}`);
  return p;
}

export function projectState(s: GameState, id: string): ProjectState {
  return s.projects.list[id] ?? { stage: 0, completed: 0 };
}

export function isProjectDone(s: GameState, id: string): boolean {
  return projectState(s, id).completed > 0;
}

/** Repeated projects (festival editions) get more expensive. */
export function stageCost(s: GameState, def: ProjectDef, stage: number): number {
  return Math.round(def.stages[stage].cost * (1 + 0.15 * projectState(s, def.id).completed));
}

export function stageReason(s: GameState, id: string): Reason {
  const def = PROJECTS_BY_ID.get(id);
  if (!def) return 'Unbekanntes Projekt.';
  const locked = needsUnlock(s, def.unlock);
  if (locked) return locked;
  const st = projectState(s, id);
  if (st.running) return 'Diese Etappe läuft noch.';
  if (!def.repeatable && st.completed > 0) return 'Abgeschlossen.';
  const stage = def.stages[st.stage];
  return requirementReason(s, stage.requires) ?? moneyReason(s, stageCost(s, def, st.stage));
}

export function startStage(d: GameState, id: string): void {
  const def = projectDef(id);
  const st = (d.projects.list[id] ??= { stage: 0, completed: 0 });
  const stage = def.stages[st.stage];
  const cost = stageCost(d, def, st.stage);
  if (cost > 0) spend(d, cost, 'property', `${def.name}: ${stage.name}`);
  st.running = { stage: st.stage, startedAt: d.clock.now, endsAt: d.clock.now + stage.minutes * MINUTE };
}

export interface FestivalResult {
  visitors: number;
  mood: number;
  revenue: number;
  costs: number;
  rep: number;
}

/** The festival weekend: crowd, mood, money, reputation. */
export function runFestival(d: GameState, edition: number): FestivalResult {
  const reach = bestSystem(d, 'reach');
  const ownSound = reach >= 1500;
  const crowd = (2000 + d.progression.reputation * 1.1 + d.merch.brand * 40) * (1 + 0.15 * (edition - 1)) * (1 + modifierValue(d, 'demand'));
  const visitors = Math.round(Math.min(20000, crowd * randRange(d, 0.85, 1.15)));
  const mood = Math.round(Math.max(20, Math.min(100, 62 + randRange(d, -12, 22) + (ownSound ? 6 : -4))));
  const tickets = visitors * 45;
  const bar = visitors * 14;
  const stand = standSales(d, visitors, mood, 1, () => randRange(d, 0, 1));
  for (const [key, n] of Object.entries(stand.sold)) d.merch.stock[key].qty -= n;
  const staff = visitors * 6;
  const pa = ownSound ? 0 : 8000;
  earn(d, tickets, 'event', `Festival ${edition}: Tickets`);
  earn(d, bar, 'event', `Festival ${edition}: Bar`);
  if (stand.revenue > 0) {
    earn(d, stand.revenue, 'merch', `Festival ${edition}: Merch`);
    incStat(d, 'merchSold', stand.pieces);
  }
  spend(d, staff, 'event', `Festival ${edition}: Personal`);
  if (pa > 0) spend(d, pa, 'event', `Festival ${edition}: Verleih-PA`);
  const rep = Math.round(Math.sqrt(visitors) * 6 * (0.5 + mood / 100));
  addRep(d, rep);
  addBrand(d, 8 + visitors / 1000);
  addXp(d, 'organisation', 400);
  addXp(d, 'business', 200);
  addXp(d, 'netzwerk', 200);
  incStat(d, 'festivals');
  if (visitors > stat(d, 'bestFestival')) d.progression.stats.bestFestival = visitors;
  return { visitors, mood, revenue: tickets + bar + stand.revenue, costs: staff + pa, rep };
}

function completeProject(d: GameState, def: ProjectDef, st: ProjectState): void {
  if (def.id === 'proj.location') {
    revealSpot(d, 'spot.own-location', 'project', 100, { silent: true });
    d.spots.spots['spot.own-location'].lastCheckedAt = d.clock.now;
    setFlag(d, 'ownLocation');
    notify(d, { tone: 'success', title: 'Halle am Kanal eröffnet', text: def.reward, link: '/karte/spot/spot.own-location', big: true });
  } else if (def.id === 'proj.label') {
    setFlag(d, 'label');
    notify(d, { tone: 'success', title: 'Dein Label steht', text: def.reward, link: '/studio', big: true });
  } else if (def.id === 'proj.festival') {
    const r = runFestival(d, st.completed + 1);
    st.lastResult = { ...r, at: d.clock.now };
    const name = d.crew.founded ? d.crew.name : d.player.name;
    addNews(d, `Festival von ${name}: ${fmtNumber(r.visitors)} Leute, Stimmung ${r.mood}.`, 'success');
    notify(d, {
      tone: 'success',
      title: `Festival-Wochenende: ${fmtNumber(r.visitors)} Leute`,
      text: `Stimmung ${r.mood} · ${fmtMoney(r.revenue - r.costs, { sign: true })} am Wochenende · +${fmtNumber(r.rep)} Reputation`,
      link: '/fortschritt/projekte',
      big: true,
    });
  }
  st.completed++;
  incStat(d, 'projectsDone');
  if (def.repeatable) st.stage = 0;
}

/** A stage ran out: next stage, or the project is done. */
export function finishStage(d: GameState, id: string): void {
  const def = projectDef(id);
  const st = d.projects.list[id];
  if (!st?.running) return;
  const stage = def.stages[st.running.stage];
  delete st.running;
  st.stage++;
  if (st.stage >= def.stages.length) {
    completeProject(d, def, st);
    return;
  }
  notify(d, { tone: 'info', title: `${def.name}: ${stage.name} erledigt`, text: `Als Nächstes: ${def.stages[st.stage].name}`, link: '/fortschritt/projekte' });
}
