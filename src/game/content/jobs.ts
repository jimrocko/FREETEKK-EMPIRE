import type { JobDef } from './types';

/**
 * Side jobs – the first source of money. Each job trains a different skill and
 * so nudges the player toward a path. Better jobs pay more per hour and need
 * skills, items or reputation.
 */
export const JOBS: readonly JobDef[] = [
  {
    id: 'job.flyer',
    name: 'Flyer verteilen',
    description: 'Für einen Club in der Innenstadt Flyer in Kneipen, Spätis und an Laternen verteilen.',
    durationMin: 3,
    pay: 25,
    xp: { netzwerk: 8 },
  },
  {
    id: 'job.spuelen',
    name: 'Spülhilfe in der Kneipe',
    description: 'Gläser, Teller, Tresen. Laut, warm, ehrlich verdientes Geld.',
    durationMin: 5,
    pay: 45,
    xp: { organisation: 5, business: 3 },
    bonus: { chance: 0.25, min: 5, max: 15, text: 'Trinkgeld vom Team' },
  },
  {
    id: 'job.aufbau',
    name: 'Aufbauhelfer Veranstaltungstechnik',
    description: 'Cases schleppen, Kabel legen, Traversen schrauben. Man lernt, wie große Systeme aufgebaut werden.',
    durationMin: 8,
    pay: 75,
    xp: { technik: 12 },
  },
  {
    id: 'job.plattenladen',
    name: 'Aushilfe im Plattenladen',
    description: 'Platten sortieren, Kundschaft beraten, nebenbei neue Musik entdecken.',
    durationMin: 6,
    pay: 60,
    xp: { produktion: 10, netzwerk: 2 },
    requires: [{ t: 'skill', skill: 'netzwerk', gte: 2 }],
  },
  {
    id: 'job.kurier',
    name: 'Fahrradkurier',
    description: 'Pakete und Briefe quer durch die Stadt. Man lernt jede Abkürzung kennen.',
    durationMin: 6,
    pay: 70,
    xp: { netzwerk: 4, organisation: 3 },
    bonus: { chance: 0.2, min: 5, max: 20, text: 'Trinkgeld an der Tür' },
    requires: [{ t: 'itemTag', tag: 'mobility' }],
  },
  {
    id: 'job.lager',
    name: 'Lagerschicht im Getränkehandel',
    description: 'Paletten, Leergut, Lieferscheine. Hier lernst du, wie Großhandel funktioniert.',
    durationMin: 10,
    pay: 110,
    xp: { business: 8, organisation: 4 },
    requires: [{ t: 'skill', skill: 'organisation', gte: 2 }],
  },
  {
    id: 'job.grafik',
    name: 'Freelance-Grafik',
    description: 'Logos, Flyer und Social-Media-Kacheln für kleine Läden und Bands.',
    durationMin: 12,
    pay: 170,
    xp: { business: 14 },
    requires: [
      { t: 'itemTag', tag: 'computer' },
      { t: 'skill', skill: 'business', gte: 2 },
    ],
  },
  {
    id: 'job.theke',
    name: 'Thekenschicht im Club',
    description: 'Wochenende hinter der Bar. Man sieht, wie eine Nacht organisiert wird – und wer dort verkehrt.',
    durationMin: 15,
    pay: 190,
    xp: { organisation: 10, netzwerk: 8 },
    rep: 1,
    bonus: { chance: 0.5, min: 15, max: 60, text: 'Trinkgeld-Kasse' },
    requires: [
      {
        t: 'any',
        of: [
          { t: 'skill', skill: 'organisation', gte: 3 },
          { t: 'skill', skill: 'netzwerk', gte: 3 },
          { t: 'flag', flag: 'ref.kesselhaus', label: 'Empfehlung fürs Kesselhaus' },
        ],
      },
    ],
  },
  {
    id: 'job.studio-assist',
    name: 'Studio-Assistenz',
    description: 'Kabel patchen, Sessions vorbereiten, beim Mixdown zuhören und lernen.',
    durationMin: 18,
    pay: 260,
    xp: { produktion: 22 },
    requires: [
      { t: 'skill', skill: 'produktion', gte: 4 },
      { t: 'itemTag', tag: 'computer' },
    ],
  },
  {
    id: 'job.tontechnik',
    name: 'Tontechnik-Aushilfe',
    description: 'Bei Konzerten am Pult stehen, Monitoring einrichten, Fehler suchen.',
    durationMin: 20,
    pay: 300,
    xp: { technik: 25 },
    rep: 1,
    requires: [{ t: 'skill', skill: 'technik', gte: 4 }],
  },
  {
    id: 'job.booking-assist',
    name: 'Booking-Assistenz',
    description: 'Mails an Agenturen, Reisen planen, Rider abgleichen. Hier entstehen Kontakte.',
    durationMin: 25,
    pay: 380,
    xp: { netzwerk: 20, organisation: 10 },
    rep: 2,
    requires: [
      { t: 'skill', skill: 'netzwerk', gte: 5 },
      { t: 'rep', gte: 40 },
    ],
  },
  {
    id: 'job.messebau',
    name: 'Messebau-Wochenende',
    description: 'Großer Auftrag: Stände aufbauen, Licht und Ton für eine Messe. Lang, hart, gut bezahlt.',
    durationMin: 45,
    pay: 700,
    xp: { technik: 30, organisation: 15 },
    requires: [{ t: 'skill', skill: 'technik', gte: 6 }],
  },
];
