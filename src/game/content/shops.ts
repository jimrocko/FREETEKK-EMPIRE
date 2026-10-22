import type { ShopDef } from './types';

export const SHOPS: readonly ShopDef[] = [
  {
    id: 'shop.online',
    name: 'Online-Versand',
    description: 'Bestellt übers Handy, kommt sofort. Normale Preise, Standardsortiment.',
    priceFactor: 1,
  },
  {
    id: 'shop.klangkiste',
    name: 'Klangkiste',
    description: 'Musikladen in der Altstadt. Mehr Auswahl, etwas günstiger.',
    priceFactor: 0.95,
    poiId: 'poi.klangkiste',
  },
  {
    id: 'shop.radhaus',
    name: 'Radhaus Uni',
    description: 'Fahrradladen im Uni-Viertel.',
    priceFactor: 0.9,
    poiId: 'poi.radhaus',
  },
  {
    id: 'shop.technikmarkt',
    name: 'Technikmarkt West',
    description: 'Elektronikmarkt im Gewerbegebiet.',
    priceFactor: 0.92,
    poiId: 'poi.technikmarkt',
  },
];
