import type { Condition } from '../core/types';

export interface SupplierDef {
  id: string;
  name: string;
  description: string;
  /** Price factor on the goods' base price. */
  priceFactor: number;
  minOrder: number;
  maxOrder: number;
  deliveryFee: number;
  /** Contact who runs it (trust grows with orders). */
  personId?: string;
  requires?: Condition[];
}

export const SUPPLIERS: readonly SupplierDef[] = [
  {
    id: 'sup.discounter',
    name: 'Discounter am Ring',
    description: 'Immer offen, normale Preise. Du schleppst selbst.',
    priceFactor: 1,
    minOrder: 1,
    maxOrder: 15,
    deliveryFee: 0,
  },
  {
    id: 'sup.kemal',
    name: 'Kemals Späti',
    description: 'Kemal bestellt für dich mit – etwas günstiger, wenn er dir vertraut.',
    priceFactor: 0.92,
    minOrder: 1,
    maxOrder: 25,
    deliveryFee: 0,
    personId: 'p.kemal',
    requires: [{ t: 'trust', person: 'p.kemal', gte: 35 }],
  },
  {
    id: 'sup.rita',
    name: 'Getränkegroßhandel Rita',
    description: 'Großhandelspreise ab zehn Kisten, Lieferung per Lkw.',
    priceFactor: 0.72,
    minOrder: 10,
    maxOrder: 200,
    deliveryFee: 15,
    personId: 'p.rita',
    requires: [{ t: 'trust', person: 'p.rita', gte: 20 }],
  },
  {
    id: 'sup.cashcarry',
    name: 'Großmarkt Nord',
    description: 'Paletten, Gabelstapler, Gewerbeausweis. Billiger geht es nicht – Lieferung inklusive.',
    priceFactor: 0.6,
    minOrder: 20,
    maxOrder: 400,
    deliveryFee: 25,
    requires: [{ t: 'unlocked', id: 'u.cashcarry', label: 'Großmarkt-Ausweis' }],
  },
];

/** How much of each good a visitor consumes per game hour (servings). */
export const CONSUMPTION: Record<string, number> = {
  water: 0.12,
  mate: 0.06,
  beer: 0.1,
  soft: 0.05,
  snacks: 0.03,
};

export interface PromoChannel {
  id: string;
  label: string;
  description: string;
  cost: number;
  /** Base reach in people before modifiers. */
  reach: number;
  /** Adds to police risk (0–1). */
  heat: number;
  /** Fame added to the spot. */
  fame: number;
  /** Preparation task needed. */
  task?: string;
  requires?: Condition[];
}

export const PROMO_CHANNELS: readonly PromoChannel[] = [
  { id: 'promo.word', label: 'Mundpropaganda', description: 'Deine Kontakte sagen es weiter. Kostenlos, je größer dein Netzwerk, desto besser.', cost: 0, reach: 0, heat: 0, fame: 2 },
  { id: 'promo.flyer', label: 'Flyer & Plakate', description: 'Klassisch. Braucht jemanden, der verteilt.', cost: 40, reach: 140, heat: 0.04, fame: 5, task: 'task.flyer' },
  { id: 'promo.social', label: 'Social Media', description: 'Erreicht viele – auch die, die du nicht dabeihaben willst.', cost: 30, reach: 260, heat: 0.14, fame: 12 },
  {
    id: 'promo.infoline',
    label: 'Infoline',
    description: 'Die Location kommt erst kurz vorher per SMS. Diskret, wie früher.',
    cost: 0,
    reach: 120,
    heat: 0.01,
    fame: 3,
    requires: [{ t: 'rep', gte: 150 }],
  },
  {
    id: 'promo.press',
    label: 'Stadtmagazin',
    description: 'Raya schreibt einen Tipp. Viel Reichweite – und sehr öffentlich.',
    cost: 0,
    reach: 420,
    heat: 0.18,
    fame: 18,
    requires: [{ t: 'trust', person: 'p.raya', gte: 30 }],
  },
];

export interface PaRental {
  id: string;
  label: string;
  cost: number;
  reach: number;
  quality: number;
  reliability: number;
  powerKw: number;
  description: string;
  requires?: Condition[];
}

/** Rented sound, delivered and set up by the rental company. */
export const PA_RENTALS: readonly PaRental[] = [
  { id: 'pa.small', label: 'Kleine Verleih-PA', cost: 160, reach: 160, quality: 52, reliability: 88, powerKw: 1.5, description: 'Zwei Tops, ein Sub, Mixer. Geliefert und aufgebaut.' },
  {
    id: 'pa.medium',
    label: 'Mittlere Verleih-PA',
    cost: 480,
    reach: 550,
    quality: 64,
    reliability: 88,
    powerKw: 4,
    description: 'Vier Tops, vier Subs, Controller. Für Hallen.',
    requires: [{ t: 'skill', skill: 'organisation', gte: 3 }],
  },
  {
    id: 'pa.large',
    label: 'Große Verleih-PA',
    cost: 1450,
    reach: 1600,
    quality: 76,
    reliability: 90,
    powerKw: 12,
    description: 'Line-Array und Subwall mit Techniker. Teuer, aber professionell.',
    requires: [
      { t: 'skill', skill: 'organisation', gte: 5 },
      { t: 'rep', gte: 150 },
    ],
  },
];

export interface EventTaskDef {
  id: string;
  label: string;
  description: string;
  minutes: number;
}

export const EVENT_TASKS: readonly EventTaskDef[] = [
  { id: 'task.check', label: 'Spot checken', description: 'Vorher hinfahren: Zugang, Strom, Zustand. Ohne Check drohen Überraschungen.', minutes: 4 },
  { id: 'task.flyer', label: 'Flyer verteilen', description: 'Ohne verteilte Flyer bringt die Flyer-Werbung nur die Hälfte.', minutes: 6 },
  { id: 'task.lineup', label: 'Line-up bestätigen', description: 'Alle DJs anrufen und Zeiten abstimmen. Senkt das Risiko, dass jemand nicht kommt.', minutes: 2 },
];

export const HELPER_COST = 45;
export const AWARENESS_COST = 70;
export const MEDICS_COST = 90;
/** Real minutes before start an event must at least be planned. */
export const MIN_LEAD_MIN = 3;

export type EventFormatId = 'party' | 'openair' | 'teknival';

/** Event formats – bigger ones are unlocked in the progression tree. */
export interface EventFormatDef {
  id: EventFormatId;
  label: string;
  description: string;
  unlock?: string;
  /** Allowed lengths in game hours. */
  durations: number[];
  /** Needs an outdoor spot (weather exposure ≥ this). */
  minWeather?: number;
  minCapacity?: number;
  /** Multipliers. */
  demand: number;
  /** People come and go: how often the capacity turns over. */
  turnover: number;
  rep: number;
  police: number;
  /** Mood bonus. */
  mood: number;
  /** Fixed costs for toilets, water, waste … */
  orgCost: number;
}

export const EVENT_FORMATS: readonly EventFormatDef[] = [
  {
    id: 'party',
    label: 'Party',
    description: 'Eine Nacht, ein Spot, eine Anlage.',
    durations: [4, 6, 8, 10, 12],
    demand: 1,
    turnover: 1,
    rep: 1,
    police: 1,
    mood: 0,
    orgCost: 0,
  },
  {
    id: 'openair',
    label: 'Open-Air',
    description: 'Draußen bis zum Sonnenaufgang. Mehr Leute, mehr Ruf – und das Wetter spielt mit.',
    unlock: 'u.openair',
    durations: [6, 8, 10, 12, 16],
    minWeather: 60,
    demand: 1.2,
    turnover: 1.1,
    rep: 1.25,
    police: 1.15,
    mood: 4,
    orgCost: 80,
  },
  {
    id: 'teknival',
    label: 'Teknival',
    description: 'Ein ganzes Wochenende. Leute kommen und gehen, die Anlage läuft durch, die Polizei schaut genau hin.',
    unlock: 'u.teknival',
    durations: [24, 36, 48],
    minWeather: 60,
    minCapacity: 600,
    demand: 1.6,
    turnover: 1.8,
    rep: 2,
    police: 1.6,
    mood: 6,
    orgCost: 600,
  },
];

export function eventFormat(id: EventFormatId | undefined): EventFormatDef {
  return EVENT_FORMATS.find((f) => f.id === (id ?? 'party')) ?? EVENT_FORMATS[0];
}
