import type { RepTier } from './types';

/** Scene status tiers. Long-tail on purpose – there is always a next tier. */
export const REP_TIERS: readonly RepTier[] = [
  { id: 'unbekannt', name: 'Unbekannt', min: 0, description: 'Niemand kennt deinen Namen.' },
  { id: 'newcomer', name: 'Newcomer', min: 40, description: 'Ein paar Leute haben dich schon mal gesehen.' },
  { id: 'local', name: 'Local', min: 150, description: 'In deiner Ecke der Stadt kennt man dich.' },
  { id: 'bekannt', name: 'Bekannt', min: 500, description: 'Dein Name fällt, wenn es um Partys geht.' },
  { id: 'etabliert', name: 'Etablierte Crew', min: 1500, description: 'Man rechnet mit euch.' },
  { id: 'gross', name: 'Große Crew', min: 4000, description: 'Eure Partys sind Stadtgespräch.' },
  { id: 'netzwerk', name: 'Netzwerk', min: 10000, description: 'Ihr verbindet Crews, DJs und Spots.' },
  { id: 'ueberregional', name: 'Überregional', min: 25000, description: 'Auch andere Städte kennen euch.' },
  { id: 'organisation', name: 'Große Organisation', min: 60000, description: 'Festivals, Label, mehrere Systeme.' },
  { id: 'legende', name: 'Legende', min: 150000, description: 'Geschichten über euch werden weitererzählt.' },
  { id: 'mythos', name: 'Mythos', min: 400000, description: 'Die Szene ist ohne euch nicht denkbar.' },
];
