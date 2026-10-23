import type { Condition } from '../core/types';

/** A simulated crew that grows, parties and competes in the same city. */
export interface RivalCrewDef {
  id: string;
  name: string;
  /** Person who speaks for the crew (messages, meetings). */
  leaderId: string;
  cityId: string;
  /** Genre id (content/music.ts). */
  style: string;
  description: string;
  /** 0–100: how hard they fight for spots and crowds. */
  aggression: number;
  /** 0–100: how open they are to working together. */
  cooperation: number;
  /** 0–100: how fast they want to grow. */
  ambition: number;
  /** 0–100: how often things go wrong. */
  sloppiness: number;
  start: { rep: number; money: number; reach: number; quality: number; members: number };
  /** Spots they know from the start. */
  spots: string[];
  /** The crew only shows up once these hold (none = from the start). */
  appears?: Condition[];
  /** Accent colour in the UI. */
  color: string;
  /** The name is a plural ("die Bunkerkinder feiern") – otherwise singular ("Hafenlärm feiert"). */
  plural?: boolean;
}

/** Picks the verb form that fits the crew name. */
export function crewVerb(def: Pick<RivalCrewDef, 'plural'> | undefined, plural: string, singular: string): string {
  return def?.plural ? plural : singular;
}

export const RIVAL_CREWS: readonly RivalCrewDef[] = [
  {
    id: 'rival.bunkerkinder',
    name: 'Bunkerkinder',
    leaderId: 'p.vera',
    cityId: 'city.steinhafen',
    style: 'genre.minimaltek',
    description: 'Die Platzhirsche im Industriegebiet Nord. Gute Anlage, viele Leute, wenig Geduld mit Neuen.',
    aggression: 55,
    cooperation: 30,
    ambition: 60,
    sloppiness: 25,
    start: { rep: 900, money: 4000, reach: 420, quality: 72, members: 7 },
    spots: ['spot.bunker-nord', 'spot.lackfabrik', 'spot.industrial-north'],
    color: '#5ea8ff',
    plural: true,
  },
  {
    id: 'rival.acidkollektiv',
    name: 'Acid Kollektiv Ostend',
    leaderId: 'p.jonte',
    cityId: 'city.steinhafen',
    style: 'genre.acidtek',
    description: 'Drei Leute, eine 303 und viel Herz. Feiern in Garagen und Kantinen, teilen gern.',
    aggression: 15,
    cooperation: 80,
    ambition: 45,
    sloppiness: 45,
    start: { rep: 90, money: 400, reach: 90, quality: 45, members: 3 },
    spots: ['spot.garagenhof', 'spot.kantine'],
    color: '#c6ff3d',
  },
  {
    id: 'rival.hafenlaerm',
    name: 'Hafenlärm',
    leaderId: 'p.brecher',
    cityId: 'city.steinhafen',
    style: 'genre.hardtek',
    description: 'Laut, schnell, chaotisch. Hafenlärm nimmt sich, was frei aussieht – auch deine Spots.',
    aggression: 80,
    cooperation: 20,
    ambition: 70,
    sloppiness: 60,
    start: { rep: 260, money: 1200, reach: 260, quality: 50, members: 5 },
    spots: ['spot.containerhof', 'spot.gleisdreieck'],
    appears: [{ t: 'any', of: [{ t: 'rep', gte: 100 }, { t: 'day', gte: 12 }] }],
    color: '#ff6b4a',
  },
  {
    id: 'rival.waldfrequenz',
    name: 'Waldfrequenz',
    leaderId: 'p.mila',
    cityId: 'city.steinhafen',
    style: 'genre.tribe',
    description: 'Draußen, unter Bäumen, bis die Sonne aufgeht. Erfahren mit Generatoren und Ordnungsamt.',
    aggression: 20,
    cooperation: 70,
    ambition: 50,
    sloppiness: 30,
    start: { rep: 520, money: 2500, reach: 380, quality: 66, members: 6 },
    spots: ['spot.lichtung', 'spot.baggersee'],
    appears: [{ t: 'rep', gte: 300 }],
    color: '#4ade80',
  },
  {
    id: 'rival.nordlicht',
    name: 'Nordlicht Events',
    leaderId: 'p.conrad',
    cityId: 'city.steinhafen',
    style: 'genre.melodictek',
    description: 'Legal, groß, mit Sponsoren. Machen aus Underground ein Produkt – und zahlen gut dafür.',
    aggression: 45,
    cooperation: 40,
    ambition: 85,
    sloppiness: 10,
    start: { rep: 3000, money: 20000, reach: 1200, quality: 86, members: 12 },
    spots: ['spot.spedition-west', 'spot.kai7'],
    appears: [{ t: 'rep', gte: 800 }],
    color: '#c084fc',
  },
];
