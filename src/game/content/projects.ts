import type { Condition } from '../core/types';

export interface ProjectStageDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** Real minutes – big projects take hours, while you do other things. */
  minutes: number;
  requires?: Condition[];
}

/** Multi-stage long-term projects (endgame). */
export interface ProjectDef {
  id: string;
  name: string;
  description: string;
  unlock: string;
  stages: ProjectStageDef[];
  /** What you get at the end. */
  reward: string;
  /** Can be run again (a new edition); costs grow each time. */
  repeatable?: boolean;
}

export const PROJECTS: readonly ProjectDef[] = [
  {
    id: 'proj.location',
    name: 'Eigene Location',
    description: 'Eine alte Halle am Kanal wird deine Location. Keine Vermieter, keine Razzien, keine Ausreden mehr.',
    unlock: 'u.location',
    reward: 'Neuer Spot „Halle am Kanal“: legal, 700 Leute, keine Miete – dafür 150 € Unterhalt pro Tag.',
    stages: [
      { id: 'find', name: 'Objekt finden', description: 'Makler abtelefonieren, Hallen besichtigen, Grundrisse vergleichen.', cost: 300, minutes: 30 },
      { id: 'lease', name: 'Mietvertrag & Kaution', description: 'Ein Vertrag über zehn Jahre. Die Kaution tut weh.', cost: 5000, minutes: 60, requires: [{ t: 'rep', gte: 1500 }] },
      {
        id: 'build',
        name: 'Umbau',
        description: 'Starkstrom, Schallschutz, Toiletten, Notausgänge, eine Bar.',
        cost: 12000,
        minutes: 180,
        requires: [{ t: 'skill', skill: 'technik', gte: 5 }],
      },
      { id: 'open', name: 'Eröffnung vorbereiten', description: 'Abnahme durch das Bauamt, Schilder, Getränkelieferung.', cost: 2000, minutes: 60 },
    ],
  },
  {
    id: 'proj.label',
    name: 'Eigenes Label',
    description: 'Deine Musik und die deiner Leute – auf Platte, im Netz, mit deinem Logo.',
    unlock: 'u.label',
    reward: 'EPs veröffentlichen: Ruf, Verkäufe und mehr Streams für deine Tracks; laufende Katalog-Einnahmen.',
    stages: [
      { id: 'brand', name: 'Name & Logo', description: 'Ein Name, der nach etwas klingt, und ein Logo, das auf eine Hülle passt.', cost: 500, minutes: 20 },
      {
        id: 'distribution',
        name: 'Vertrieb & Presswerk',
        description: 'Verträge mit einem Vertrieb und einem Presswerk.',
        cost: 3000,
        minutes: 60,
        requires: [{ t: 'stat', stat: 'tracksMade', gte: 5, label: 'eigene Tracks' }],
      },
      {
        id: 'first',
        name: 'Erste Veröffentlichung',
        description: 'Mastering, Artwork, Promo.',
        cost: 2000,
        minutes: 90,
        requires: [{ t: 'stat', stat: 'tracksUploaded', gte: 3, label: 'Tracks online' }],
      },
    ],
  },
  {
    id: 'proj.festival',
    name: 'Festival',
    description: 'Drei Tage, mehrere Bühnen, tausende Leute: dein eigenes Festival im Stadtwald.',
    unlock: 'u.festival',
    repeatable: true,
    reward: 'Ein Festival-Wochenende: riesiger Ruf, viel Geld – und nächstes Jahr eine größere Ausgabe.',
    stages: [
      { id: 'concept', name: 'Konzept & Name', description: 'Bühnen, Zeitplan, Name, Logo.', cost: 1000, minutes: 30 },
      {
        id: 'permits',
        name: 'Genehmigungen',
        description: 'Ordnungsamt, Feuerwehr, Naturschutz, Versicherung.',
        cost: 5000,
        minutes: 120,
        requires: [{ t: 'skill', skill: 'organisation', gte: 8 }],
      },
      { id: 'site', name: 'Gelände & Infrastruktur', description: 'Zäune, Bühnen, Strom, Wasser, Toiletten, Zelte.', cost: 25000, minutes: 240 },
      { id: 'lineup', name: 'Line-up & Werbung', description: 'Headliner buchen, Plakate in drei Städten.', cost: 15000, minutes: 120, requires: [{ t: 'rep', gte: 4000 }] },
      { id: 'weekend', name: 'Festival-Wochenende', description: 'Tore auf. Jetzt zeigt sich, ob alles hält.', cost: 0, minutes: 48 },
    ],
  },
];
