import type { SkillId } from '../core/types';

export interface SkillInfoDef {
  id: SkillId;
  name: string;
  path: string;
  description: string;
}

export const SKILL_DEFS: Record<SkillId, SkillInfoDef> = {
  produktion: {
    id: 'produktion',
    name: 'Produktion',
    path: 'Producer',
    description: 'Tracks bauen, Geräte beherrschen, Mixdown. Öffnet Studio-Jobs, Releases und Labels.',
  },
  technik: {
    id: 'technik',
    name: 'Technik',
    path: 'Soundsystem',
    description: 'Boxen, Endstufen, Strom, Aufbau. Öffnet Technik-Jobs und große Systeme.',
  },
  organisation: {
    id: 'organisation',
    name: 'Organisation',
    path: 'Veranstalter',
    description: 'Planen, Koordinieren, Versorgen. Öffnet Events, Crew-Führung und Logistik.',
  },
  netzwerk: {
    id: 'netzwerk',
    name: 'Netzwerk',
    path: 'Netzwerk',
    description: 'Leute kennen, Vertrauen aufbauen, Türen öffnen. Öffnet Kontakte, Spots und Kooperationen.',
  },
  business: {
    id: 'business',
    name: 'Business',
    path: 'Merch/Business',
    description: 'Handeln, Kalkulieren, Marke aufbauen. Öffnet Handel, Merch und Großhandel.',
  },
};
