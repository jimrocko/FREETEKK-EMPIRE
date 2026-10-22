/** Flavour data for the used market. */

export const SELLER_NAMES: readonly string[] = [
  'Kalle_83', 'basslover', 'M. Krüger', 'technoTante', 'Studio-Auflösung', 'rave_dad', 'Jens aus dem Hafen',
  'nachtschicht', 'Lina K.', 'umzug_muss_raus', 'Hobbykeller', 'Schrauber99', 'acid_anne', 'privat', 'DJ Rost',
  'Ex-Liveact', 'Flohmarkt-Fritz', 'Kellerfund', 'Sound_Sammler', 'Kiezgeschäft',
];

export const SELLER_NOTES: readonly string[] = [
  'Muss raus wegen Umzug.',
  'Funktioniert einwandfrei, kleine Kratzer.',
  'Keine Garantie, keine Rücknahme.',
  'Nur Abholung, kein Versand.',
  'Lag jahrelang im Keller, sollte gehen.',
  'Preis ist fast verhandelbar.',
  'Brauche dringend Geld.',
  'Aus Nichtraucher-Studio.',
  'Gebrauchsspuren, technisch top.',
  'Erbstück, schweren Herzens.',
  'Festpreis! Bitte keine Tauschangebote.',
  'Hab mir was Größeres gekauft.',
];

/** Listing presets for selling via classifieds. */
export const LISTING_PRESETS = [
  { id: 'quick', label: 'Schnell', factor: 0.95, minMin: 3, maxMin: 6 },
  { id: 'fair', label: 'Fair', factor: 1.05, minMin: 8, maxMin: 15 },
  { id: 'high', label: 'Hoch', factor: 1.15, minMin: 20, maxMin: 40 },
] as const;

export type ListingPresetId = (typeof LISTING_PRESETS)[number]['id'];
