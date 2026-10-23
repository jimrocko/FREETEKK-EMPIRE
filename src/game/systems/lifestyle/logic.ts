import type { GameState } from '../../state';
import type { Reason } from '../../core/types';
import type { HomeDef, LifestyleDef, Rarity } from '../../content/types';
import { FLAIR_TIERS, LIFESTYLE, LIFESTYLE_RESALE } from '../../content/lifestyle';
import { homeDef } from '../../content/registry';
import { requirementReason } from '../../core/conditions';
import { applyEffects } from '../../core/effects';
import { fmtCountdown, fmtMoney, fmtNumber } from '../../core/format';
import { notify } from '../../core/notify';
import { pick } from '../../core/rng';
import { GAME_DAY_MS, MINUTE } from '../../core/time';
import { earn, moneyReason, spend } from '../finance/logic';
import { incStat } from '../progression/logic';
import { channelReason, startActivity } from '../activities/logic';
import { rentedCapacity } from '../map/logic';
import { usedVolume } from '../inventory/logic';

export const LIFESTYLE_BY_ID: ReadonlyMap<string, LifestyleDef> = new Map(LIFESTYLE.map((l) => [l.id, l]));

export function lifestyleDef(id: string): LifestyleDef {
  const def = LIFESTYLE_BY_ID.get(id);
  if (!def) throw new Error(`Unknown lifestyle thing: ${id}`);
  return def;
}

export const RARITY_LABELS: Record<Rarity, string> = { common: 'Gewöhnlich', uncommon: 'Selten', rare: 'Episch', legendary: 'Legendär' };

/** Rarity follows the price – the loot colours of the shop. */
export function rarityOf(price: number): Rarity {
  if (price >= 30000) return 'legendary';
  if (price >= 3000) return 'rare';
  if (price >= 300) return 'uncommon';
  return 'common';
}

export function isExperience(def: LifestyleDef): boolean {
  return def.experience !== undefined;
}

export function timesDone(s: GameState, id: string): number {
  return s.lifestyle.history[id] ?? 0;
}

/** Style points: your home, the things you own and every experience you ever made. */
export function flair(s: GameState): number {
  let sum = homeDef(s.player.homeId).flair ?? 0;
  for (const def of LIFESTYLE) {
    if (isExperience(def) ? timesDone(s, def.id) > 0 : s.lifestyle.owned[def.id]) sum += def.flair;
  }
  return sum;
}

export interface FlairTierInfo {
  index: number;
  name: string;
  bonus: number;
  next: (typeof FLAIR_TIERS)[number] | null;
  /** 0–1 toward the next rank. */
  progress: number;
}

export function flairTierFor(points: number): FlairTierInfo {
  let index = 0;
  for (let i = 0; i < FLAIR_TIERS.length; i++) if (points >= FLAIR_TIERS[i].min) index = i;
  const tier = FLAIR_TIERS[index];
  const next = FLAIR_TIERS[index + 1] ?? null;
  const progress = next ? (points - tier.min) / (next.min - tier.min) : 1;
  return { index, name: tier.name, bonus: tier.bonus, next, progress };
}

export function flairTier(s: GameState): FlairTierInfo {
  return flairTierFor(flair(s));
}

/** Extra share of people who want to come to your parties. */
export function flairBonus(s: GameState): number {
  return flairTier(s).bonus;
}

/** Things owned plus experiences made at least once. */
export function collectionCount(s: GameState): number {
  let n = 0;
  for (const def of LIFESTYLE) if (isExperience(def) ? timesDone(s, def.id) > 0 : s.lifestyle.owned[def.id]) n++;
  return n;
}

export function lifestyleUpkeep(s: GameState): number {
  let sum = 0;
  for (const id of Object.keys(s.lifestyle.owned)) sum += LIFESTYLE_BY_ID.get(id)?.upkeep ?? 0;
  return Math.round(sum * 100) / 100;
}

export function resaleValue(def: LifestyleDef): number {
  return Math.round(def.price * LIFESTYLE_RESALE);
}

/** Rank-ups are celebrated once; selling and rebuying does not repeat them. */
function checkFlairTier(d: GameState): void {
  const info = flairTier(d);
  if (info.index <= d.lifestyle.bestTier) return;
  d.lifestyle.bestTier = info.index;
  notify(d, {
    tone: 'discovery',
    title: `Neuer Style-Rang: ${info.name}`,
    text: `Die Leute reden über dich. +${Math.round(info.bonus * 100)} % Gäste bei deinen Partys.`,
    link: '/lifestyle',
    big: true,
  });
}

// ── Buying ───────────────────────────────────────────────

function experienceCooldownLeft(s: GameState, def: LifestyleDef): number {
  const last = s.lifestyle.lastExperience[def.id];
  if (last === undefined || !def.experience?.cooldownDays) return 0;
  return Math.max(0, last + def.experience.cooldownDays * GAME_DAY_MS - s.clock.now);
}

export function buyReason(s: GameState, id: string): Reason {
  const def = LIFESTYLE_BY_ID.get(id);
  if (!def) return 'Unbekannt.';
  if (def.experience) {
    if (s.activities.running.some((a) => a.kind === 'experience' && a.payload.defId === id)) return 'Läuft gerade.';
    if (!def.experience.cooldownDays && timesDone(s, id) > 0) return 'Einmal im Leben reicht.';
    const wait = experienceCooldownLeft(s, def);
    if (wait > 0) return `Wieder möglich in ${fmtCountdown(wait)}.`;
    const busy = channelReason(s, 'leisure');
    if (busy) return busy;
  } else if (s.lifestyle.owned[id]) {
    return 'Hast du schon.';
  }
  return requirementReason(s, def.requires) ?? moneyReason(s, def.price);
}

/** Buys a thing or starts an experience. Returns a confirmation text. */
export function buyLifestyle(d: GameState, id: string): string {
  const def = lifestyleDef(id);
  spend(d, def.price, 'lifestyle', def.name);
  incStat(d, 'lifestyleBought');
  if (def.experience) {
    d.lifestyle.lastExperience[id] = d.clock.now;
    startActivity(d, { kind: 'experience', channel: 'leisure', label: def.name, durationMs: def.experience.hours * MINUTE, payload: { defId: id } });
    return `${def.name}: Los geht’s! Zurück in ${fmtCountdown(def.experience.hours * MINUTE)}.`;
  }
  const first = timesDone(d, id) === 0;
  d.lifestyle.owned[id] = { at: d.clock.now };
  d.lifestyle.history[id] = timesDone(d, id) + 1;
  if (def.category === 'tiere') incStat(d, 'petsAdopted');
  if (first) applyEffects(d, def.effects);
  if (rarityOf(def.price) === 'legendary') {
    notify(d, { tone: 'discovery', title: def.name, text: `Legendär. ${def.description}`, link: '/lifestyle', big: true });
  }
  checkFlairTier(d);
  return `${def.name} gehört jetzt dir. +${fmtNumber(def.flair)} Style.`;
}

/** Called when an experience ends. */
export function finishExperience(d: GameState, id: string): void {
  const def = LIFESTYLE_BY_ID.get(id);
  if (!def) return;
  const first = timesDone(d, id) === 0;
  d.lifestyle.history[id] = timesDone(d, id) + 1;
  applyEffects(d, def.effects);
  incStat(d, 'experiences');
  notify(d, {
    tone: 'success',
    title: `Zurück: ${def.name}`,
    text: first ? `Eine Erinnerung fürs Leben. +${fmtNumber(def.flair)} Style.` : 'Schön war’s.',
    link: '/lifestyle',
    big: first && rarityOf(def.price) === 'legendary',
  });
  checkFlairTier(d);
}

// ── Selling ──────────────────────────────────────────────

export function sellReason(s: GameState, id: string): Reason {
  const def = LIFESTYLE_BY_ID.get(id);
  if (!def || def.experience) return 'Erlebnisse kann man nicht verkaufen.';
  if (!s.lifestyle.owned[id]) return 'Gehört dir nicht.';
  return null;
}

export function sellLifestyle(d: GameState, id: string): string {
  const def = lifestyleDef(id);
  const value = resaleValue(def);
  delete d.lifestyle.owned[id];
  earn(d, value, 'lifestyle', `Verkauft: ${def.name}`);
  return `${def.name} verkauft für ${fmtMoney(value)}.`;
}

// ── Using ────────────────────────────────────────────────

export function useCooldownLeft(s: GameState, id: string): number {
  const def = LIFESTYLE_BY_ID.get(id);
  const used = s.lifestyle.owned[id]?.usedAt;
  if (!def?.use || used === undefined) return 0;
  return Math.max(0, used + def.use.cooldownH * MINUTE - s.clock.now);
}

export function useReason(s: GameState, id: string): Reason {
  const def = LIFESTYLE_BY_ID.get(id);
  if (!def?.use) return 'Damit kann man nichts machen.';
  if (!s.lifestyle.owned[id]) return 'Gehört dir nicht.';
  const wait = useCooldownLeft(s, id);
  if (wait > 0) return `Wieder möglich in ${fmtCountdown(wait)}.`;
  return null;
}

export function useLifestyle(d: GameState, id: string): string {
  const def = lifestyleDef(id);
  const use = def.use!;
  d.lifestyle.owned[id].usedAt = d.clock.now;
  incStat(d, 'lifestyleUses');
  const line = pick(d, use.lines);
  applyEffects(d, use.effects);
  return line;
}

// ── Homes ────────────────────────────────────────────────

export function moveReason(s: GameState, home: HomeDef): Reason {
  if (s.player.homeId === home.id) return 'Hier wohnst du.';
  const req = requirementReason(s, home.requires);
  if (req) return req;
  const room = home.capacityL + rentedCapacity(s);
  const used = usedVolume(s);
  if (used > room) return `Zu wenig Platz für dein Zeug: ${fmtNumber(used)} L, dort nur ${fmtNumber(room)} L.`;
  return moneyReason(s, home.price ?? 0);
}

export function moveHome(d: GameState, home: HomeDef): string {
  if (home.price) spend(d, home.price, 'lifestyle', `Umzug: ${home.name}`);
  d.player.homeId = home.id;
  incStat(d, 'homeMoves');
  checkFlairTier(d);
  return `Umgezogen: ${home.name}. ${fmtNumber(home.capacityL)} L Platz${home.rent ? `, ${fmtMoney(home.rent)} Miete pro Tag` : ''}.`;
}
