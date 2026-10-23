import type { Condition } from '../core/types';

export type DistrictKind = 'center' | 'industrial' | 'residential' | 'harbor' | 'university' | 'forest' | 'commercial';

export interface DistrictDef {
  id: string;
  cityId: string;
  name: string;
  kind: DistrictKind;
  description: string;
  /** Polygon in map coordinates (viewBox 0 0 360 300). */
  shape: [number, number][];
  label: [number, number];
  /** Real minutes for one exploration on foot. */
  exploreMin: number;
  /** Explored % gained per exploration (before diminishing returns). */
  exploreGain: number;
  /** XP per exploration. */
  xp: { netzwerk?: number; organisation?: number; technik?: number; business?: number; produktion?: number };
  requires?: Condition[];
}

export interface CityDef {
  id: string;
  name: string;
  description: string;
  /** Size of the party scene: multiplies crowds. */
  sceneSize: number;
  /** Prices for drinks; what people pay at the door scales with it. */
  priceLevel: number;
  /** Police pressure multiplier. */
  police: number;
  /** Getting there (cities without unlock are always reachable). */
  travel: { minutes: number; cost: number; unlock?: string };
  /** Starting knowledge: district id → explored %. */
  startExplored: Record<string, number>;
  /** Decorative water paths (SVG path data). */
  water: string[];
}

export const CITIES: readonly CityDef[] = [
  {
    id: 'city.steinhafen',
    name: 'Steinhafen',
    description: 'Mittelgroße Hafenstadt mit viel Leerstand, alten Industriehallen und einer kleinen, aber lauten Szene.',
    sceneSize: 1,
    priceLevel: 1,
    police: 1,
    travel: { minutes: 20, cost: 40 },
    startExplored: { 'steinhafen.ostend': 20, 'steinhafen.altstadt': 8 },
    water: ['M 132 0 C 124 34, 92 66, 64 92 S 26 132, 0 146', 'M 0 214 C 14 210, 22 222, 16 240 S 0 262, 0 270'],
  },
  {
    id: 'city.bergheim',
    name: 'Bergheim',
    description: 'Kleine Unistadt in den Hügeln. Wenig Leute, viel Wald, eine entspannte Polizei – und eine Szene, die draußen zu Hause ist.',
    sceneSize: 0.7,
    priceLevel: 0.85,
    police: 0.7,
    travel: { minutes: 15, cost: 35, unlock: 'u.city-bergheim' },
    startExplored: { 'bergheim.altstadt': 10 },
    water: ['M 0 120 C 60 132, 120 140, 180 150 S 300 168, 360 170'],
  },
  {
    id: 'city.nordhafen',
    name: 'Nordhafen',
    description: 'Die große Hafenstadt im Norden. Riesige Hallen, ein riesiges Publikum, hohe Preise – und eine Polizei, die nicht lange fackelt.',
    sceneSize: 1.6,
    priceLevel: 1.3,
    police: 1.4,
    travel: { minutes: 25, cost: 70, unlock: 'u.city-nordhafen' },
    startExplored: { 'nordhafen.kiez': 10 },
    water: ['M 0 150 C 80 146, 160 140, 250 138 S 330 146, 360 150', 'M 240 300 C 244 260, 248 200, 252 150'],
  },
];

export const DISTRICTS: readonly DistrictDef[] = [
  {
    id: 'steinhafen.altstadt',
    cityId: 'city.steinhafen',
    name: 'Altstadt',
    kind: 'center',
    description: 'Kopfsteinpflaster, Kneipen, der Musikladen und Clubs. Hier wird geredet – und viel verraten.',
    shape: [
      [64, 92],
      [200, 82],
      [212, 150],
      [112, 170],
      [108, 122],
    ],
    label: [150, 124],
    exploreMin: 3,
    exploreGain: 18,
    xp: { netzwerk: 6 },
  },
  {
    id: 'steinhafen.ostend',
    cityId: 'city.steinhafen',
    name: 'Ostend',
    kind: 'residential',
    description: 'Plattenbauten, Garagenhöfe, Proberäume. Dein Viertel – günstig, rau, voller Keller.',
    shape: [
      [200, 82],
      [292, 96],
      [302, 172],
      [212, 150],
    ],
    label: [252, 128],
    exploreMin: 3,
    exploreGain: 20,
    xp: { netzwerk: 4, organisation: 2 },
  },
  {
    id: 'steinhafen.uni',
    cityId: 'city.steinhafen',
    name: 'Uni-Viertel',
    kind: 'university',
    description: 'Studis, WG-Partys, Fahrradläden und der AStA, der manchmal Räume vergibt.',
    shape: [
      [200, 10],
      [304, 22],
      [292, 96],
      [200, 82],
    ],
    label: [250, 52],
    exploreMin: 4,
    exploreGain: 18,
    xp: { netzwerk: 5, organisation: 2 },
  },
  {
    id: 'steinhafen.nordring',
    cityId: 'city.steinhafen',
    name: 'Industriegebiet Nord',
    kind: 'industrial',
    description: 'Gießereien, Lackfabrik, Bunker. Viel davon steht seit Jahren leer.',
    shape: [
      [40, 8],
      [200, 10],
      [200, 82],
      [64, 92],
      [54, 50],
    ],
    label: [128, 46],
    exploreMin: 5,
    exploreGain: 15,
    xp: { netzwerk: 4, technik: 4 },
  },
  {
    id: 'steinhafen.hafen',
    cityId: 'city.steinhafen',
    name: 'Hafen',
    kind: 'harbor',
    description: 'Kais, Container, Lagerhallen und Kneipen, in denen niemand Fragen stellt.',
    shape: [
      [8, 92],
      [64, 92],
      [108, 122],
      [100, 202],
      [10, 212],
    ],
    label: [56, 152],
    exploreMin: 5,
    exploreGain: 15,
    xp: { netzwerk: 5, business: 2 },
  },
  {
    id: 'steinhafen.suedstadt',
    cityId: 'city.steinhafen',
    name: 'Südstadt',
    kind: 'residential',
    description: 'Kleingärten, Skatepark, Bahnbrachen. Ruhig – bis jemand eine Anlage aufbaut.',
    shape: [
      [112, 170],
      [212, 150],
      [222, 240],
      [122, 252],
      [100, 202],
    ],
    label: [162, 206],
    exploreMin: 4,
    exploreGain: 17,
    xp: { netzwerk: 4, organisation: 3 },
  },
  {
    id: 'steinhafen.west',
    cityId: 'city.steinhafen',
    name: 'Gewerbegebiet West',
    kind: 'commercial',
    description: 'Großhandel, Speditionen, Self-Storage. Hier gibt es alles in groß – auch Hallen.',
    shape: [
      [10, 212],
      [100, 202],
      [122, 252],
      [112, 292],
      [22, 292],
    ],
    label: [64, 250],
    exploreMin: 6,
    exploreGain: 15,
    xp: { business: 4, technik: 2 },
    requires: [
      {
        t: 'any',
        of: [
          { t: 'itemTag', tag: 'mobility' },
          { t: 'districtExplored', district: 'steinhafen.suedstadt', gte: 30 },
        ],
      },
    ],
  },
  {
    id: 'steinhafen.stadtwald',
    cityId: 'city.steinhafen',
    name: 'Stadtwald',
    kind: 'forest',
    description: 'Kiefern, Lichtungen, ein Baggersee und ein alter Steinbruch. Weit draußen – und weit weg von Nachbarn.',
    shape: [
      [212, 150],
      [302, 172],
      [352, 182],
      [348, 292],
      [232, 292],
      [222, 240],
    ],
    label: [286, 232],
    exploreMin: 8,
    exploreGain: 14,
    xp: { netzwerk: 3, technik: 2, organisation: 3 },
    requires: [{ t: 'itemTag', tag: 'mobility' }],
  },
  // ── Bergheim ─────────────────────────────────────────────
  {
    id: 'bergheim.altstadt',
    cityId: 'city.bergheim',
    name: 'Altstadt Bergheim',
    kind: 'center',
    description: 'Fachwerk, Gewölbekeller und ein Café, in dem die halbe Szene frühstückt.',
    shape: [
      [90, 30],
      [220, 24],
      [230, 118],
      [96, 126],
    ],
    label: [160, 76],
    exploreMin: 3,
    exploreGain: 20,
    xp: { netzwerk: 6 },
  },
  {
    id: 'bergheim.campus',
    cityId: 'city.bergheim',
    name: 'Campus',
    kind: 'university',
    description: 'Hörsäle, eine stillgelegte Mensa und Studis mit zu viel Zeit.',
    shape: [
      [220, 24],
      [340, 20],
      [344, 124],
      [230, 118],
    ],
    label: [284, 70],
    exploreMin: 3,
    exploreGain: 20,
    xp: { netzwerk: 5, organisation: 2 },
  },
  {
    id: 'bergheim.tal',
    cityId: 'city.bergheim',
    name: 'Mühlental',
    kind: 'industrial',
    description: 'Alte Papiermühlen am Bach. Halb verfallen, halb Künstlerateliers.',
    shape: [
      [16, 132],
      [96, 126],
      [230, 118],
      [236, 284],
      [24, 288],
    ],
    label: [124, 208],
    exploreMin: 4,
    exploreGain: 17,
    xp: { netzwerk: 3, technik: 3 },
  },
  {
    id: 'bergheim.hoehen',
    cityId: 'city.bergheim',
    name: 'Bergwald',
    kind: 'forest',
    description: 'Buchenwald, eine Sternwarte auf der Kuppe und ein stillgelegter Kalkbruch.',
    shape: [
      [230, 118],
      [344, 124],
      [348, 290],
      [236, 284],
    ],
    label: [290, 204],
    exploreMin: 7,
    exploreGain: 14,
    xp: { netzwerk: 2, technik: 2, organisation: 3 },
    requires: [{ t: 'itemTag', tag: 'mobility' }],
  },
  // ── Nordhafen ────────────────────────────────────────────
  {
    id: 'nordhafen.kiez',
    cityId: 'city.nordhafen',
    name: 'Kiez',
    kind: 'center',
    description: 'Neon, Kneipen, Clubs bis zum Morgen. Wer hier nicht gesehen wird, existiert nicht.',
    shape: [
      [100, 24],
      [230, 18],
      [240, 132],
      [108, 140],
    ],
    label: [170, 78],
    exploreMin: 4,
    exploreGain: 15,
    xp: { netzwerk: 7 },
  },
  {
    id: 'nordhafen.speicher',
    cityId: 'city.nordhafen',
    name: 'Speicherstadt',
    kind: 'commercial',
    description: 'Backsteinspeicher, teure Lofts und Böden, die keiner mehr braucht.',
    shape: [
      [230, 18],
      [346, 26],
      [350, 140],
      [240, 132],
    ],
    label: [292, 78],
    exploreMin: 4,
    exploreGain: 15,
    xp: { business: 4, netzwerk: 2 },
  },
  {
    id: 'nordhafen.docks',
    cityId: 'city.nordhafen',
    name: 'Docklands',
    kind: 'harbor',
    description: 'Kräne, Containerberge, ein Strand aus Hafensand. Endlos Platz – und endlos Ärger.',
    shape: [
      [10, 146],
      [108, 140],
      [240, 132],
      [248, 286],
      [18, 290],
    ],
    label: [128, 214],
    exploreMin: 5,
    exploreGain: 13,
    xp: { netzwerk: 3, technik: 3, organisation: 2 },
  },
  {
    id: 'nordhafen.raffinerie',
    cityId: 'city.nordhafen',
    name: 'Raffinerie-Ufer',
    kind: 'industrial',
    description: 'Stillgelegte Tanklager hinter Stacheldraht. Riesig, gefährlich, legendär.',
    shape: [
      [240, 132],
      [350, 140],
      [346, 290],
      [248, 286],
    ],
    label: [296, 212],
    exploreMin: 8,
    exploreGain: 12,
    xp: { technik: 3, organisation: 4 },
    requires: [{ t: 'itemTag', tag: 'mobility' }],
  },
];
