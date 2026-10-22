import type { Condition, SkillId } from '../core/types';

export const ELEMENTS = ['kick', 'bass', 'hats', 'perc', 'synth', 'acid', 'fx', 'melody'] as const;
export type ElementId = (typeof ELEMENTS)[number];

export const ELEMENT_LABELS: Record<ElementId, string> = {
  kick: 'Kick',
  bass: 'Bass',
  hats: 'Hi-Hat',
  perc: 'Percussion',
  synth: 'Synth',
  acid: 'Acid',
  fx: 'FX',
  melody: 'Melodie',
};

export const TRACK_STATS = ['energie', 'druck', 'groove', 'haerte', 'melodie', 'atmosphaere', 'originalitaet', 'qualitaet'] as const;
export type TrackStat = (typeof TRACK_STATS)[number];

export const TRACK_STAT_LABELS: Record<TrackStat, string> = {
  energie: 'Energie',
  druck: 'Druck',
  groove: 'Groove',
  haerte: 'Härte',
  melodie: 'Melodie',
  atmosphaere: 'Atmosphäre',
  originalitaet: 'Originalität',
  qualitaet: 'Produktionsqualität',
};

export interface GenreDef {
  id: string;
  name: string;
  description: string;
  bpm: [number, number];
  /** Elements a track of this genre must have. */
  required: ElementId[];
  /** How much each stat counts for the score (sums to ~1). */
  weights: Partial<Record<TrackStat, number>>;
  requires?: Condition[];
}

export const GENRES: readonly GenreDef[] = [
  {
    id: 'genre.tribe',
    name: 'Tribe',
    description: 'Rollende Percussion, hypnotische Loops. Der Herzschlag jeder Free Party.',
    bpm: [160, 175],
    required: ['kick', 'perc'],
    weights: { groove: 0.3, energie: 0.2, atmosphaere: 0.2, druck: 0.15, qualitaet: 0.15 },
  },
  {
    id: 'genre.acidtek',
    name: 'Acidtek',
    description: 'Quietschende 303-Linien über stampfender Kick.',
    bpm: [165, 180],
    required: ['kick', 'acid'],
    weights: { energie: 0.25, haerte: 0.2, originalitaet: 0.2, druck: 0.15, qualitaet: 0.2 },
  },
  {
    id: 'genre.minimaltek',
    name: 'Minimal-Tek',
    description: 'Reduziert, trocken, präzise. Jeder Sound zählt.',
    bpm: [150, 165],
    required: ['kick', 'hats'],
    weights: { groove: 0.35, qualitaet: 0.3, atmosphaere: 0.2, originalitaet: 0.15 },
  },
  {
    id: 'genre.hardtek',
    name: 'Hardtek',
    description: 'Verzerrte Kick, harte Breaks, kein Erbarmen.',
    bpm: [175, 190],
    required: ['kick', 'bass'],
    weights: { haerte: 0.3, druck: 0.3, energie: 0.25, qualitaet: 0.15 },
    requires: [{ t: 'skill', skill: 'produktion', gte: 3 }],
  },
  {
    id: 'genre.raggatek',
    name: 'Raggatek',
    description: 'Dub-Bässe, Vocal-Samples, Hall – Reggae trifft Tekno.',
    bpm: [170, 185],
    required: ['kick', 'bass', 'fx'],
    weights: { groove: 0.25, atmosphaere: 0.25, druck: 0.2, originalitaet: 0.15, qualitaet: 0.15 },
    requires: [{ t: 'skill', skill: 'produktion', gte: 4 }],
  },
  {
    id: 'genre.mentaltek',
    name: 'Mentaltek',
    description: 'Schnell, düster, verschachtelt. Für die Stunde vor Sonnenaufgang.',
    bpm: [180, 200],
    required: ['kick', 'synth', 'fx'],
    weights: { atmosphaere: 0.25, energie: 0.2, originalitaet: 0.25, haerte: 0.1, qualitaet: 0.2 },
    requires: [{ t: 'skill', skill: 'produktion', gte: 6 }],
  },
  {
    id: 'genre.melodictek',
    name: 'Melodic Tek',
    description: 'Flächen, Akkorde, große Bögen. Tracks, die man mitsummt.',
    bpm: [160, 175],
    required: ['kick', 'melody', 'synth'],
    weights: { melodie: 0.35, atmosphaere: 0.25, qualitaet: 0.2, energie: 0.2 },
    requires: [{ t: 'skill', skill: 'produktion', gte: 5 }],
  },
];

export type Arrangement = 'tool' | 'banger' | 'hypnotisch' | 'story';

export const ARRANGEMENTS: readonly { id: Arrangement; label: string; description: string; mods: Partial<Record<TrackStat, number>> }[] = [
  { id: 'tool', label: 'DJ-Tool', description: 'Funktional, gut mixbar.', mods: { groove: 12, originalitaet: -8 } },
  { id: 'banger', label: 'Banger', description: 'Drops, Breaks, Hände hoch.', mods: { energie: 14, druck: 8, atmosphaere: -6 } },
  { id: 'hypnotisch', label: 'Hypnotisch', description: 'Lange Spannungsbögen.', mods: { atmosphaere: 14, groove: 6, energie: -6 } },
  { id: 'story', label: 'Geschichte', description: 'Intro, Thema, Höhepunkt.', mods: { melodie: 12, originalitaet: 8, groove: -6 } },
];

export type MixEffort = 'quick' | 'normal' | 'careful' | 'perfect';

export const MIX_EFFORTS: readonly { id: MixEffort; label: string; minutes: number; factor: number; xp: number; wear: number; requires?: Condition[] }[] = [
  { id: 'quick', label: 'Schnell', minutes: 4, factor: 0.72, xp: 8, wear: 0.5 },
  { id: 'normal', label: 'Normal', minutes: 10, factor: 0.9, xp: 18, wear: 1 },
  { id: 'careful', label: 'Sorgfältig', minutes: 25, factor: 1.04, xp: 40, wear: 1.5 },
  { id: 'perfect', label: 'Perfektionist', minutes: 60, factor: 1.15, xp: 85, wear: 2.5, requires: [{ t: 'skill', skill: 'produktion', gte: 4 }] },
];

/** Which skill gets the production XP. */
export const PRODUCTION_SKILL: SkillId = 'produktion';
