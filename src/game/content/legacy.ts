import type { SkillId } from '../core/types';

/** How a new run starts. */
export interface ScenarioDef {
  id: string;
  name: string;
  description: string;
  cash: number;
  items: { id: string; qty?: number; condition?: number }[];
  xp?: Partial<Record<SkillId, number>>;
  /** Contacts you know from the start (trust). */
  contacts?: Record<string, number>;
  cityId?: string;
  unlocks?: string[];
  /** Runs completed before this scenario can be picked. */
  minRuns: number;
}

export const SCENARIOS: readonly ScenarioDef[] = [
  {
    id: 'sc.classic',
    name: 'Neustart',
    description: '500 €, ein altes Handy, ein kleines Zimmer in Steinhafen. Wie beim ersten Mal.',
    cash: 500,
    items: [],
    minRuns: 0,
  },
  {
    id: 'sc.producer',
    name: 'Bedroom-Producer',
    description: 'Wenig Geld, aber eine Drum-Machine, eine Bassline und Erfahrung im Studio.',
    cash: 300,
    items: [
      { id: 'item.vulka-beats', condition: 70 },
      { id: 'item.td-3', condition: 75 },
    ],
    xp: { produktion: 120 },
    minRuns: 1,
  },
  {
    id: 'sc.soundsystem',
    name: 'Soundsystem-Erbe',
    description: 'Die alte Anlage deiner Vorgänger: zwei Tops, ein Sub, Kabel, ein Mixer. Geld ist knapp.',
    cash: 200,
    items: [
      { id: 'item.pa-active-12', qty: 1, condition: 65 },
      { id: 'item.pa-active-12', qty: 1, condition: 65 },
      { id: 'item.sub-active-15', condition: 60 },
      { id: 'item.cables', condition: 80 },
      { id: 'item.dj-mixer-2ch', condition: 70 },
    ],
    xp: { technik: 120 },
    minRuns: 1,
  },
  {
    id: 'sc.organizer',
    name: 'Netzwerker:in',
    description: 'Du kennst Leute. Viele Leute. Das ist am Anfang mehr wert als Geld.',
    cash: 400,
    items: [],
    xp: { organisation: 80, netzwerk: 80 },
    contacts: { 'p.miro': 30, 'p.nika': 30, 'p.jule': 30, 'p.kim': 25 },
    minRuns: 1,
  },
  {
    id: 'sc.business',
    name: 'Mit Startkapital',
    description: 'Ein Erbe, ein Plan, ein Businessplan. 2.500 € und ein Kopf für Zahlen.',
    cash: 2500,
    items: [],
    xp: { business: 120 },
    minRuns: 1,
  },
  {
    id: 'sc.bergheim',
    name: 'Neuanfang in Bergheim',
    description: 'Raus aus der Hafenstadt, rein in die Hügel. Kleinere Szene, weniger Polizei, viel Wald.',
    cash: 600,
    items: [],
    xp: { netzwerk: 40 },
    cityId: 'city.bergheim',
    unlocks: ['u.city-bergheim'],
    minRuns: 2,
  },
];

/** Permanent perks bought with legacy points – they apply to every new run. */
export interface PerkDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
}

export const PERKS: readonly PerkDef[] = [
  { id: 'leg.money', name: 'Startkapital', description: '+750 € beim Start pro Stufe.', cost: 1, maxLevel: 4 },
  { id: 'leg.points', name: 'Szene-Gedächtnis', description: '+3 Szenepunkte beim Start pro Stufe.', cost: 1, maxLevel: 3 },
  { id: 'leg.skills', name: 'Erfahrung', description: '+60 XP in jeder Fähigkeit pro Stufe.', cost: 2, maxLevel: 3 },
  { id: 'leg.rep', name: 'Name in der Szene', description: '+100 Reputation beim Start pro Stufe.', cost: 2, maxLevel: 3 },
  { id: 'leg.friends', name: 'Alte Freunde', description: 'Miro, Jule und Kemal kennen dich schon (Vertrauen 35).', cost: 2, maxLevel: 1 },
];

/** Reputation needed before you can pass on your crew (or one festival). */
export const RETIRE_REP = 10000;
