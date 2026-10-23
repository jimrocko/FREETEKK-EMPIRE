import type { GameState } from '../../state';
import type { SkillId } from '../../core/types';
import { notify } from '../../core/notify';
import { SKILL_DEFS } from '../../content/skills';
import { repTierFor } from '../../content/registry';
import { TIER_POINTS } from '../../content/unlocks';

/** Cumulative XP needed to reach a level (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(40 * Math.pow(level - 1, 1.75));
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export interface SkillProgress {
  level: number;
  xp: number;
  /** XP into the current level. */
  into: number;
  /** XP from current to next level. */
  span: number;
  progress: number;
}

export function skillProgress(s: GameState, skill: SkillId): SkillProgress {
  const xp = s.progression.skills[skill] ?? 0;
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const span = xpForLevel(level + 1) - base;
  const into = xp - base;
  return { level, xp, into, span, progress: span > 0 ? into / span : 1 };
}

export function skillLevel(s: GameState, skill: SkillId): number {
  return levelForXp(s.progression.skills[skill] ?? 0);
}

export function addXp(d: GameState, skill: SkillId, amount: number): void {
  if (amount <= 0) return;
  const before = skillLevel(d, skill);
  d.progression.skills[skill] = (d.progression.skills[skill] ?? 0) + amount;
  const after = skillLevel(d, skill);
  if (after > before) {
    notify(d, {
      tone: 'success',
      title: `${SKILL_DEFS[skill].name} Level ${after}`,
      text: 'Neue Möglichkeiten könnten sich geöffnet haben.',
      link: '/fortschritt',
      big: true,
    });
  }
}

export function addRep(d: GameState, amount: number): void {
  if (amount === 0) return;
  const before = repTierFor(d.progression.reputation).index;
  d.progression.reputation = Math.max(0, d.progression.reputation + amount);
  const info = repTierFor(d.progression.reputation);
  if (info.index > before) {
    const points = (info.index - before) * TIER_POINTS;
    addPoints(d, points);
    notify(d, {
      tone: 'discovery',
      title: `Neuer Status: ${info.tier.name}`,
      text: `${info.tier.description} +${points} Szenepunkte.`,
      link: '/fortschritt',
      big: true,
    });
  }
}

/** Szenepunkte for the unlock tree. */
export function addPoints(d: GameState, amount: number): void {
  if (amount <= 0) return;
  d.progression.points += amount;
  d.progression.pointsTotal += amount;
}

export function stat(s: GameState, key: string): number {
  return s.progression.stats[key] ?? 0;
}

export function incStat(d: GameState, key: string, by = 1): void {
  d.progression.stats[key] = (d.progression.stats[key] ?? 0) + by;
}

export function hasFlag(s: GameState, flag: string): boolean {
  return (s.progression.flags[flag] ?? 0) !== 0;
}

export function setFlag(d: GameState, flag: string, value = 1): void {
  d.progression.flags[flag] = value;
}

export function isUnlocked(s: GameState, id: string): boolean {
  return s.progression.unlocks[id] !== undefined;
}

export function unlock(d: GameState, id: string): boolean {
  if (isUnlocked(d, id)) return false;
  d.progression.unlocks[id] = d.clock.now;
  return true;
}
