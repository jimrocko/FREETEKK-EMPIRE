import type { RumorDef } from './types';

/** Rumors lead to places that exploring alone will not reveal (or not yet). */
export const RUMORS: readonly RumorDef[] = [
  {
    id: 'rumor.bunker',
    text: 'Ein Barkeeper erzählt von einem Hochbunker am Nordring, in dem früher heimlich gefeiert wurde.',
    target: { kind: 'spot', id: 'spot.bunker-nord' },
    sources: [{ job: 'job.theke' }, { poi: 'poi.halle23' }],
    followMin: 5,
  },
  {
    id: 'rumor.kantine',
    text: 'Der Wirt vom Anker erwähnt die alte Hafenkantine – seit Jahren zu, aber Strom und Wasser laufen noch.',
    target: { kind: 'spot', id: 'spot.kantine' },
    sources: [{ poi: 'poi.anker' }],
    followMin: 4,
  },
  {
    id: 'rumor.steinbruch',
    text: 'Spaziergänger reden von einem alten Steinbruch tief im Wald. Das Echo dort soll unglaublich sein.',
    target: { kind: 'spot', id: 'spot.steinbruch' },
    sources: [{ district: 'steinhafen.stadtwald', minExplored: 40 }, { poi: 'poi.skatepark' }],
    followMin: 8,
  },
  {
    id: 'rumor.audimax',
    text: 'Auf der Mensawiese heißt es, der AStA vergibt den Keller unterm Audimax für Partys.',
    target: { kind: 'spot', id: 'spot.audimax-keller' },
    sources: [{ poi: 'poi.mensawiese' }],
    followMin: 4,
  },
  {
    id: 'rumor.parkhaus',
    text: 'Ein Stammkunde im Plattenladen schwärmt von einer Nacht auf dem Parkhausdach in der Altstadt.',
    target: { kind: 'spot', id: 'spot.parkhaus-dach' },
    sources: [{ job: 'job.plattenladen' }, { poi: 'poi.drehmoment' }],
    followMin: 4,
  },
  {
    id: 'rumor.lackfabrik',
    text: 'Ein Kollege vom Aufbau erzählt von der alten Lackfabrik im Norden – „riesig, aber pass aufs Dach auf“.',
    target: { kind: 'spot', id: 'spot.lackfabrik' },
    sources: [{ job: 'job.aufbau' }, { job: 'job.tontechnik' }],
    followMin: 6,
  },
  {
    id: 'rumor.gleisdreieck',
    text: 'Die Skater reden von einer Brache zwischen drei Bahnlinien im Westen. Kein Nachbar weit und breit.',
    target: { kind: 'spot', id: 'spot.gleisdreieck' },
    sources: [{ poi: 'poi.skatepark' }, { poi: 'poi.kesselhaus' }],
    followMin: 6,
  },
  {
    id: 'rumor.selfstorage',
    text: 'Im Lager hörst du von Self-Storage-Boxen im Gewerbegebiet West – groß genug für eine ganze Anlage.',
    target: { kind: 'poi', id: 'poi.selfstorage' },
    sources: [{ job: 'job.lager' }, { job: 'job.messebau' }],
    followMin: 4,
  },
  {
    id: 'rumor.industrial-north',
    text: 'Im Club wird über die alte Gießerei im Norden geflüstert. „Industrial North“ nennen sie die Halle.',
    target: { kind: 'spot', id: 'spot.industrial-north' },
    sources: [{ poi: 'poi.kesselhaus' }, { job: 'job.flyer' }],
    followMin: 5,
  },
];
