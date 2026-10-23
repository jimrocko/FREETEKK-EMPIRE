import type { Condition } from '../core/types';

export type UnlockBranch = 'technik' | 'events' | 'musik' | 'netzwerk' | 'business';

/** A node of the progression tree. Each one opens up something new – never just a percentage. */
export interface UnlockDef {
  id: string;
  name: string;
  branch: UnlockBranch;
  /** Column in the tree (1 = start). */
  tier: number;
  /** Szenepunkte. */
  cost: number;
  money?: number;
  /** Other unlocks needed first. */
  requires?: string[];
  conditions?: Condition[];
  description: string;
  /** What it makes possible (shown as bullet points). */
  enables: string[];
}

export const UNLOCK_BRANCHES: Record<UnlockBranch, string> = {
  technik: 'Sound & Technik',
  events: 'Events',
  musik: 'Musik',
  netzwerk: 'Netzwerk & Städte',
  business: 'Business',
};

export const UNLOCKS: readonly UnlockDef[] = [
  // ── Sound & Technik ────────────────────────────────────
  {
    id: 'u.lightdesign',
    name: 'Lichtdesign',
    branch: 'technik',
    tier: 1,
    cost: 1,
    description: 'Du lernst, Licht wie ein Instrument zu spielen.',
    enables: ['Laser und Moving Heads im Handel', 'Mehr Wirkung für Lichtshows'],
  },
  {
    id: 'u.powerplant',
    name: 'Stromversorgung',
    branch: 'technik',
    tier: 1,
    cost: 2,
    conditions: [{ t: 'skill', skill: 'technik', gte: 3 }],
    description: 'Große Aggregate und ein leiser Generator, den die Nachbarn nicht hören.',
    enables: ['Großer Generator im Handel', 'Neuer Gerätetyp: Flüster-Generator (weniger Polizei-Risiko)'],
  },
  {
    id: 'u.linearray',
    name: 'Line-Array-Technik',
    branch: 'technik',
    tier: 2,
    cost: 3,
    requires: ['u.powerplant'],
    conditions: [{ t: 'skill', skill: 'technik', gte: 5 }],
    description: 'Ton, der bis in die letzte Reihe trägt.',
    enables: ['Line-Array-Tops und Profi-Subs im Handel'],
  },
  {
    id: 'u.custombuild',
    name: 'Eigenbau',
    branch: 'technik',
    tier: 3,
    cost: 4,
    requires: ['u.linearray'],
    conditions: [{ t: 'skill', skill: 'technik', gte: 7 }],
    description: 'Eure eigenen Boxen, gebaut in der Werkstatt. Unverkäuflich, unverwechselbar.',
    enables: ['Werkstatt: Custom-Stack bauen (legendäres Soundsystem-Teil)'],
  },
  // ── Events ─────────────────────────────────────────────
  {
    id: 'u.openair',
    name: 'Open-Air',
    branch: 'events',
    tier: 1,
    cost: 2,
    conditions: [{ t: 'skill', skill: 'organisation', gte: 3 }],
    description: 'Raus aus dem Keller, rein in Wald, Wiese und Kiesgrube.',
    enables: ['Neues Event-Format: Open-Air an Draußen-Spots'],
  },
  {
    id: 'u.trucklicense',
    name: 'Lkw-Führerschein',
    branch: 'events',
    tier: 1,
    cost: 2,
    conditions: [{ t: 'skill', skill: 'organisation', gte: 4 }],
    description: 'Endlich darfst du die großen Kisten selbst fahren.',
    enables: ['7,5- und 12-Tonner kaufen', '7,5-Tonner mieten'],
  },
  {
    id: 'u.teknival',
    name: 'Teknival',
    branch: 'events',
    tier: 2,
    cost: 5,
    requires: ['u.openair'],
    conditions: [
      { t: 'skill', skill: 'organisation', gte: 6 },
      { t: 'rep', gte: 1500 },
    ],
    description: 'Ein Wochenende, mehrere Anlagen, tausende Leute.',
    enables: ['Neues Event-Format: Teknival (24–48 Stunden)'],
  },
  {
    id: 'u.festival',
    name: 'Festivalorganisation',
    branch: 'events',
    tier: 3,
    cost: 8,
    requires: ['u.teknival'],
    conditions: [
      { t: 'skill', skill: 'organisation', gte: 8 },
      { t: 'rep', gte: 4000 },
    ],
    description: 'Genehmigungen, Gelände, Line-up – und am Ende dein eigenes Festival.',
    enables: ['Großprojekt: eigenes Festival'],
  },
  // ── Musik ──────────────────────────────────────────────
  {
    id: 'u.remix',
    name: 'Remix-Aufträge',
    branch: 'musik',
    tier: 1,
    cost: 2,
    conditions: [{ t: 'skill', skill: 'produktion', gte: 3 }],
    description: 'Andere bezahlen dich dafür, ihre Tracks neu zu denken.',
    enables: ['Studio: Remix-Aufträge gegen Geld und Ruf'],
  },
  {
    id: 'u.modular',
    name: 'Modular-Studio',
    branch: 'musik',
    tier: 2,
    cost: 3,
    conditions: [{ t: 'skill', skill: 'produktion', gte: 4 }],
    description: 'Kabelsalat als Kunstform.',
    enables: ['Modularsysteme im Handel'],
  },
  {
    id: 'u.liveact',
    name: 'Live-Act',
    branch: 'musik',
    tier: 2,
    cost: 3,
    conditions: [
      { t: 'skill', skill: 'produktion', gte: 5 },
      { t: 'stat', stat: 'tracksMade', gte: 3, label: 'eigene Tracks' },
    ],
    description: 'Keine Platten, nur deine Maschinen und deine Tracks.',
    enables: ['Neuer Line-up-Slot: dein Live-Set (zieht mehr Leute als ein DJ-Set)'],
  },
  {
    id: 'u.label',
    name: 'Eigenes Label',
    branch: 'musik',
    tier: 3,
    cost: 6,
    requires: ['u.remix'],
    conditions: [
      { t: 'skill', skill: 'produktion', gte: 6 },
      { t: 'skill', skill: 'business', gte: 4 },
    ],
    description: 'Deine Musik, dein Name auf dem Plattenteller.',
    enables: ['Großprojekt: Label gründen', 'Veröffentlichungen (EPs)'],
  },
  // ── Netzwerk & Städte ──────────────────────────────────
  {
    id: 'u.management',
    name: 'Management',
    branch: 'netzwerk',
    tier: 1,
    cost: 2,
    conditions: [{ t: 'skill', skill: 'netzwerk', gte: 4 }],
    description: 'Profis kümmern sich um Leute und Bookings.',
    enables: ['Neue Crew-Rollen: Manager (+2 Plätze) und Booker (bekannte DJs früher, günstiger)'],
  },
  {
    id: 'u.city-bergheim',
    name: 'Kontakte nach Bergheim',
    branch: 'netzwerk',
    tier: 1,
    cost: 2,
    conditions: [{ t: 'rep', gte: 300 }],
    description: 'Die kleine Unistadt in den Hügeln hat eine eigene Waldszene.',
    enables: ['Neue Stadt: Bergheim'],
  },
  {
    id: 'u.city-nordhafen',
    name: 'Tour nach Nordhafen',
    branch: 'netzwerk',
    tier: 2,
    cost: 4,
    requires: ['u.city-bergheim'],
    conditions: [{ t: 'rep', gte: 1500 }],
    description: 'Die große Hafenstadt: mehr Leute, mehr Geld, mehr Polizei.',
    enables: ['Neue Stadt: Nordhafen'],
  },
  {
    id: 'u.international',
    name: 'Internationale Bookings',
    branch: 'netzwerk',
    tier: 3,
    cost: 5,
    requires: ['u.management', 'u.city-nordhafen'],
    conditions: [{ t: 'rep', gte: 4000 }],
    description: 'Agenturen aus dem Ausland nehmen deine Anrufe an.',
    enables: ['Neue Kontakt-Kategorie: internationale DJs'],
  },
  // ── Business ───────────────────────────────────────────
  {
    id: 'u.rental',
    name: 'Anlagenverleih',
    branch: 'business',
    tier: 1,
    cost: 2,
    conditions: [{ t: 'skill', skill: 'business', gte: 3 }],
    description: 'Wenn deine Anlage nicht spielt, verdient sie trotzdem.',
    enables: ['Soundsysteme an andere vermieten'],
  },
  {
    id: 'u.merchline',
    name: 'Merch-Kollektion',
    branch: 'business',
    tier: 1,
    cost: 2,
    conditions: [{ t: 'skill', skill: 'business', gte: 4 }, { t: 'crewFounded' }],
    description: 'Mehr als Shirts: Taschen, Fahnen, alles mit eurem Logo.',
    enables: ['Neue Merch-Arten: Jutebeutel und Fahnen'],
  },
  {
    id: 'u.cashcarry',
    name: 'Großmarkt-Ausweis',
    branch: 'business',
    tier: 2,
    cost: 2,
    conditions: [{ t: 'skill', skill: 'business', gte: 5 }],
    description: 'Mit Gewerbeschein in den Großmarkt.',
    enables: ['Neuer Lieferant: Großmarkt (günstigste Getränke)'],
  },
  {
    id: 'u.vinyl',
    name: 'Vinyl-Pressung',
    branch: 'business',
    tier: 3,
    cost: 3,
    requires: ['u.label'],
    description: 'Schwarzes Gold mit deinem Logo.',
    enables: ['Neue Merch-Art: Vinyl über ein Presswerk'],
  },
  {
    id: 'u.location',
    name: 'Eigene Location',
    branch: 'business',
    tier: 3,
    cost: 6,
    conditions: [
      { t: 'skill', skill: 'business', gte: 6 },
      { t: 'rep', gte: 1500 },
    ],
    description: 'Ein Ort, der nur dir gehört. Keine Miete an andere, keine Razzien.',
    enables: ['Großprojekt: eigene Location'],
  },
];

/** Szenepunkte per completed goal size. */
export const GOAL_POINTS = { small: 1, medium: 2, large: 3, long: 4 } as const;
/** Szenepunkte per new reputation tier. */
export const TIER_POINTS = 2;
