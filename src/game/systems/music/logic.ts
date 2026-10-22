import type { GameState } from '../../state';
import type { Reason } from '../../core/types';
import type { ItemDef } from '../../content/types';
import {
  ARRANGEMENTS,
  ELEMENTS,
  GENRES,
  MIX_EFFORTS,
  TRACK_STATS,
  type Arrangement,
  type ElementId,
  type GenreDef,
  type MixEffort,
  type TrackStat,
} from '../../content/music';
import { ITEMS, itemDef } from '../../content/registry';
import { ELEMENT_LABELS } from '../../content/music';
import { checkAll, requirementReason } from '../../core/conditions';
import { randRange } from '../../core/rng';
import { channelReason } from '../activities/logic';
import { skillLevel } from '../progression/logic';
import { getItem, countTag } from '../inventory/logic';
import { usable } from '../equipment/logic';
import type { Track } from './state';

export interface ProductionPlan {
  name: string;
  genreId: string;
  bpm: number;
  /** Element → item uid. */
  elements: Partial<Record<ElementId, string>>;
  arrangement: Arrangement;
  effort: MixEffort;
}

export const BPM_MIN = 130;
export const BPM_MAX = 220;

export function genreDef(id: string): GenreDef {
  const g = GENRES.find((x) => x.id === id);
  if (!g) throw new Error(`Unknown genre: ${id}`);
  return g;
}

export function genreUnlocked(s: GameState, g: GenreDef): boolean {
  return checkAll(s, g.requires);
}

/** Owned, usable items that provide an element. */
export function devicesFor(s: GameState, el: ElementId): { uid: string; def: ItemDef; value: number }[] {
  const out: { uid: string; def: ItemDef; value: number }[] = [];
  for (const it of Object.values(s.inventory.items)) {
    const def = ITEMS.get(it.defId);
    const v = def?.stats?.[el] ?? 0;
    if (def && v > 0 && usable(it)) out.push({ uid: it.uid, def, value: v });
  }
  return out.sort((a, b) => b.value - a.value);
}

export function bestMonitoring(s: GameState): number {
  let best = 15;
  for (const it of Object.values(s.inventory.items)) {
    const m = ITEMS.get(it.defId)?.stats?.monitoring;
    if (m && usable(it)) best = Math.max(best, m * (0.7 + 0.3 * (it.condition / 100)));
  }
  return best;
}

export function hasRecorder(s: GameState): boolean {
  return countTag(s, 'computer') > 0;
}

export function skillFactor(s: GameState): number {
  return Math.min(1.25, 0.6 + 0.05 * (skillLevel(s, 'produktion') - 1));
}

export function bpmFit(g: GenreDef, bpm: number): number {
  const [lo, hi] = g.bpm;
  if (bpm >= lo && bpm <= hi) return 1;
  const dist = bpm < lo ? lo - bpm : bpm - hi;
  return Math.max(0.6, 1 - dist / 40);
}

export function planReason(s: GameState, plan: ProductionPlan): Reason {
  const g = GENRES.find((x) => x.id === plan.genreId);
  if (!g) return 'Unbekanntes Genre.';
  if (!genreUnlocked(s, g)) return requirementReason(s, g.requires);
  if (!(plan.bpm >= BPM_MIN && plan.bpm <= BPM_MAX)) return `BPM zwischen ${BPM_MIN} und ${BPM_MAX}.`;
  if (!ARRANGEMENTS.some((a) => a.id === plan.arrangement)) return 'Unbekanntes Arrangement.';
  const effort = MIX_EFFORTS.find((e) => e.id === plan.effort);
  if (!effort) return 'Unbekannter Mix-Aufwand.';
  const effortReason = requirementReason(s, effort.requires);
  if (effortReason) return effortReason;
  for (const el of g.required) if (!plan.elements[el]) return `${g.name} braucht ${ELEMENT_LABELS[el]}.`;
  for (const [el, uid] of Object.entries(plan.elements) as [ElementId, string][]) {
    if (!uid) continue;
    const it = getItem(s, uid);
    if (!usable(it)) return `${ELEMENT_LABELS[el]}: Gerät nicht verfügbar.`;
    if (!(itemDef(it.defId).stats?.[el] ?? 0)) return `${itemDef(it.defId).name} kann keine ${ELEMENT_LABELS[el]}.`;
  }
  if (plan.name.trim().length < 1 || plan.name.length > 40) return 'Gib dem Track einen Namen (max. 40 Zeichen).';
  return channelReason(s, 'studio');
}

type Noise = (spread: number) => number;

/** Core formula. `noise` adds inspiration; pass a zero function for estimates. */
function computeStats(s: GameState, plan: ProductionPlan, noise: Noise): { stats: Record<TrackStat, number>; score: number } {
  const g = genreDef(plan.genreId);
  const q: Record<ElementId, number> = { kick: 0, bass: 0, hats: 0, perc: 0, synth: 0, acid: 0, fx: 0, melody: 0 };
  const used = new Map<string, ItemDef>();
  let sound = 0;
  let originalityBonus = 0;
  for (const el of ELEMENTS) {
    const uid = plan.elements[el];
    const it = uid ? getItem(s, uid) : undefined;
    if (!it) continue;
    const def = itemDef(it.defId);
    q[el] = (def.stats?.[el] ?? 0) * (0.65 + 0.35 * (it.condition / 100));
    if (!used.has(it.uid)) {
      used.set(it.uid, def);
      sound += def.stats?.sound ?? 40;
      if (def.tags?.includes('classic')) originalityBonus += 8;
      originalityBonus += def.stats?.originality ?? 0;
    }
  }
  const devices = Math.max(1, used.size);
  sound /= devices;
  const effort = MIX_EFFORTS.find((e) => e.id === plan.effort)!;
  const monF = 0.7 + 0.3 * (bestMonitoring(s) / 100);
  const recF = hasRecorder(s) ? 1 : 0.85;
  const room = s.map.rentals['poi.proberaum'] ? 4 : 0;
  const skill = skillFactor(s);
  const bpm = plan.bpm;

  const raw: Record<TrackStat, number> = {
    energie: 0.3 * q.kick + 0.2 * q.bass + 0.2 * q.perc + 0.15 * q.hats + 0.15 * q.acid + (bpm - 150) * 0.5,
    druck: 0.5 * q.kick + 0.4 * q.bass + 0.1 * q.fx,
    groove: 0.35 * q.hats + 0.35 * q.perc + 0.3 * q.bass,
    haerte: 0.45 * q.kick + 0.35 * q.acid + 0.2 * q.bass + (bpm - 165) * 0.8,
    melodie: 0.6 * q.melody + 0.4 * q.synth,
    atmosphaere: 0.4 * q.fx + 0.3 * q.synth + 0.3 * q.melody,
    originalitaet: 18 + 6 * Math.min(devices, 5) + Math.min(30, originalityBonus),
    qualitaet: sound * monF * recF * effort.factor + room,
  };
  const arr = ARRANGEMENTS.find((a) => a.id === plan.arrangement)!;
  const stats = {} as Record<TrackStat, number>;
  // A careful mix tightens punch, groove and space – not just "quality".
  const mixF = 0.85 + 0.15 * (effort.factor / 0.9);
  const mixed: TrackStat[] = ['druck', 'groove', 'atmosphaere', 'melodie'];
  for (const k of TRACK_STATS) {
    const base = mixed.includes(k) ? raw[k] * mixF : raw[k];
    const scaled = k === 'originalitaet' ? base * (0.8 + 0.2 * skill) : base * skill;
    const v = scaled + (arr.mods[k] ?? 0) + noise(k === 'originalitaet' ? 12 : 6);
    stats[k] = Math.max(0, Math.min(100, Math.round(v)));
  }
  let score = 0;
  let wsum = 0;
  for (const [k, w] of Object.entries(g.weights) as [TrackStat, number][]) {
    score += stats[k] * w;
    wsum += w;
  }
  score = (score / Math.max(0.01, wsum)) * bpmFit(g, bpm) * (0.72 + 0.28 * (stats.qualitaet / 100));
  return { stats, score: Math.max(0, Math.min(100, Math.round(score))) };
}

export function estimateTrack(s: GameState, plan: ProductionPlan): { stats: Record<TrackStat, number>; score: number } {
  return computeStats(s, plan, () => 0);
}

export function rollTrack(d: GameState, plan: ProductionPlan): { stats: Record<TrackStat, number>; score: number } {
  return computeStats(d, plan, (spread) => randRange(d, -spread, spread));
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Hymne';
  if (score >= 70) return 'Bombe';
  if (score >= 55) return 'Solide';
  if (score >= 40) return 'Okay';
  if (score >= 25) return 'Skizze';
  return 'Krach';
}

/** Stream income per real hour of an uploaded track. */
export function streamRate(t: Track): number {
  if (t.uploadedAt === undefined) return 0;
  return 8 * Math.pow(t.score / 100, 2.2) * t.hype;
}

export function findTrack(s: GameState, id: string): Track | undefined {
  return s.music.tracks.find((t) => t.id === id);
}

export function doneTracks(s: GameState): Track[] {
  return s.music.tracks.filter((t) => t.status === 'done');
}
