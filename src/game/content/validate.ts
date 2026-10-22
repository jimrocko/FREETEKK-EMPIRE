import type { Condition, Effect } from '../core/types';
import { SKILLS } from '../core/types';
import { ALL_ITEMS } from './items';
import { JOBS } from './jobs';
import { GOALS } from './goals';
import { HOMES } from './homes';
import { RECURRING_COSTS } from './recurring';
import { REP_TIERS } from './reputation';
import { ITEMS, GOALS_BY_ID } from './registry';

/** Checks content for duplicate ids and dangling references. Returns a list of problems. */
export function validateContent(): string[] {
  const problems: string[] = [];

  const checkUnique = (kind: string, list: readonly { id: string }[]) => {
    const seen = new Set<string>();
    for (const e of list) {
      if (seen.has(e.id)) problems.push(`${kind}: doppelte id ${e.id}`);
      seen.add(e.id);
    }
  };
  checkUnique('item', ALL_ITEMS);
  checkUnique('job', JOBS);
  checkUnique('goal', GOALS);
  checkUnique('home', HOMES);
  checkUnique('cost', RECURRING_COSTS);

  const checkCondition = (where: string, c: Condition) => {
    switch (c.t) {
      case 'item':
        if (!ITEMS.has(c.item)) problems.push(`${where}: unbekanntes Item ${c.item}`);
        break;
      case 'itemTag':
        if (!ALL_ITEMS.some((it) => it.tags?.includes(c.tag))) problems.push(`${where}: kein Item mit Tag ${c.tag}`);
        break;
      case 'skill':
        if (!SKILLS.includes(c.skill)) problems.push(`${where}: unbekannte Fähigkeit ${c.skill}`);
        break;
      case 'goal':
        if (!GOALS_BY_ID.has(c.id)) problems.push(`${where}: unbekanntes Ziel ${c.id}`);
        break;
      case 'all':
      case 'any':
        c.of.forEach((x) => checkCondition(where, x));
        break;
      case 'not':
        checkCondition(where, c.c);
        break;
      default:
        break;
    }
  };
  const checkEffect = (where: string, e: Effect) => {
    if (e.t === 'item' && !ITEMS.has(e.item)) problems.push(`${where}: unbekanntes Item ${e.item}`);
    if (e.t === 'xp' && !SKILLS.includes(e.skill)) problems.push(`${where}: unbekannte Fähigkeit ${e.skill}`);
  };

  for (const it of ALL_ITEMS) {
    if (!(it.price > 0)) problems.push(`${it.id}: Preis muss > 0 sein`);
    if (it.quality < 0 || it.quality > 100) problems.push(`${it.id}: Qualität außerhalb 0–100`);
    if (!(it.volumeL > 0)) problems.push(`${it.id}: Volumen muss > 0 sein`);
    if (!(it.weightKg > 0)) problems.push(`${it.id}: Gewicht muss > 0 sein`);
    if (!it.shop && !it.usedMarket) problems.push(`${it.id}: weder im Shop noch auf dem Gebrauchtmarkt`);
    it.shopRequires?.forEach((c) => checkCondition(it.id, c));
  }
  for (const job of JOBS) {
    if (!(job.durationMin > 0) || !(job.pay > 0)) problems.push(`${job.id}: Dauer und Lohn müssen > 0 sein`);
    job.requires?.forEach((c) => checkCondition(job.id, c));
    job.visibleWhen?.forEach((c) => checkCondition(job.id, c));
  }
  for (const g of GOALS) {
    if (g.complete.length === 0) problems.push(`${g.id}: keine Abschlussbedingung`);
    g.requires?.forEach((c) => checkCondition(g.id, c));
    g.complete.forEach((c) => checkCondition(g.id, c));
    g.rewards.forEach((e) => checkEffect(g.id, e));
  }
  for (let i = 1; i < REP_TIERS.length; i++) {
    if (REP_TIERS[i].min <= REP_TIERS[i - 1].min) problems.push(`Reputation-Stufen nicht aufsteigend bei ${REP_TIERS[i].id}`);
  }
  return problems;
}
