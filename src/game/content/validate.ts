import type { Condition, Effect } from '../core/types';
import { SKILLS } from '../core/types';
import { ALL_ITEMS } from './items';
import { JOBS } from './jobs';
import { GOALS } from './goals';
import { HOMES } from './homes';
import { RECURRING_COSTS } from './recurring';
import { REP_TIERS } from './reputation';
import { ITEMS, GOALS_BY_ID, SHOPS_BY_ID, DISTRICTS_BY_ID, CITIES_BY_ID, SPOTS_BY_ID, POIS_BY_ID, JOBS_BY_ID, RUMORS_BY_ID } from './registry';
import { CITIES, DISTRICTS } from './cities';
import { SPOTS } from './spots';
import { POIS } from './pois';
import { SHOPS } from './shops';
import { RUMORS } from './rumors';
import { PEOPLE } from './people';
import { MESSAGE_TEMPLATES } from './messages';
import { TEMPLATES_BY_ID, PERSONS_BY_ID } from './registry';

/** Ray casting point-in-polygon test. */
export function pointInPolygon([x, y]: [number, number], poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Checks content for duplicate ids and dangling references. Returns a list of problems. */
export function validateContent(): string[] {
  const problems: string[] = [];

  const checkUnique = (kind: string, list: readonly { id: string }[]) => {
    const seen = new Set<string>();
    for (const e of list) {
      if (seen.has(e.id)) problems.push(`${kind}: doppelte id ${e.id}`);
      seen.add(e.id);
    }
  };
  checkUnique('item', ALL_ITEMS);
  checkUnique('job', JOBS);
  checkUnique('goal', GOALS);
  checkUnique('home', HOMES);
  checkUnique('cost', RECURRING_COSTS);
  checkUnique('city', CITIES);
  checkUnique('district', DISTRICTS);
  checkUnique('spot', SPOTS);
  checkUnique('poi', POIS);
  checkUnique('shop', SHOPS);
  checkUnique('rumor', RUMORS);
  checkUnique('person', PEOPLE);
  checkUnique('template', MESSAGE_TEMPLATES);

  const checkCondition = (where: string, c: Condition) => {
    switch (c.t) {
      case 'item':
        if (!ITEMS.has(c.item)) problems.push(`${where}: unbekanntes Item ${c.item}`);
        break;
      case 'itemTag':
        if (!ALL_ITEMS.some((it) => it.tags?.includes(c.tag))) problems.push(`${where}: kein Item mit Tag ${c.tag}`);
        break;
      case 'skill':
        if (!SKILLS.includes(c.skill)) problems.push(`${where}: unbekannte Fähigkeit ${c.skill}`);
        break;
      case 'goal':
        if (!GOALS_BY_ID.has(c.id)) problems.push(`${where}: unbekanntes Ziel ${c.id}`);
        break;
      case 'districtExplored':
        if (!DISTRICTS_BY_ID.has(c.district)) problems.push(`${where}: unbekannter Bezirk ${c.district}`);
        break;
      case 'spotKnown':
        if (!SPOTS_BY_ID.has(c.spot)) problems.push(`${where}: unbekannter Spot ${c.spot}`);
        break;
      case 'poiKnown':
        if (!POIS_BY_ID.has(c.poi)) problems.push(`${where}: unbekannter Ort ${c.poi}`);
        break;
      case 'knows':
      case 'trust':
        if (c.person !== '$from' && !PERSONS_BY_ID.has(c.person)) problems.push(`${where}: unbekannte Person ${c.person}`);
        break;
      case 'all':
      case 'any':
        c.of.forEach((x) => checkCondition(where, x));
        break;
      case 'not':
        checkCondition(where, c.c);
        break;
      default:
        break;
    }
  };
  const checkEffect = (where: string, e: Effect): void => {
    if ((e.t === 'trust' || e.t === 'relation' || e.t === 'favor' || e.t === 'meet') && e.person !== '$from' && !PERSONS_BY_ID.has(e.person)) {
      problems.push(`${where}: unbekannte Person ${e.person}`);
    }
    if (e.t === 'message' && !TEMPLATES_BY_ID.has(e.template)) problems.push(`${where}: unbekannte Nachricht ${e.template}`);
    if (e.t === 'task') e.effects.forEach((x) => checkEffect(where, x));
    if (e.t === 'explore' && !DISTRICTS_BY_ID.has(e.district)) problems.push(`${where}: unbekannter Bezirk ${e.district}`);
    if (e.t === 'item' && !ITEMS.has(e.item)) problems.push(`${where}: unbekanntes Item ${e.item}`);
    if (e.t === 'xp' && !SKILLS.includes(e.skill)) problems.push(`${where}: unbekannte Fähigkeit ${e.skill}`);
    if (e.t === 'revealSpot' && !SPOTS_BY_ID.has(e.spot)) problems.push(`${where}: unbekannter Spot ${e.spot}`);
    if (e.t === 'revealPoi' && !POIS_BY_ID.has(e.poi)) problems.push(`${where}: unbekannter Ort ${e.poi}`);
    if (e.t === 'rumor' && !RUMORS_BY_ID.has(e.rumor)) problems.push(`${where}: unbekanntes Gerücht ${e.rumor}`);
  };

  for (const it of ALL_ITEMS) {
    if (!(it.price > 0)) problems.push(`${it.id}: Preis muss > 0 sein`);
    if (it.quality < 0 || it.quality > 100) problems.push(`${it.id}: Qualität außerhalb 0–100`);
    if (!(it.volumeL > 0) && it.category !== 'vehicle') problems.push(`${it.id}: Volumen muss > 0 sein`);
    if (!(it.weightKg > 0)) problems.push(`${it.id}: Gewicht muss > 0 sein`);
    if (!it.shops?.length && !it.usedMarket) problems.push(`${it.id}: weder im Shop noch auf dem Gebrauchtmarkt`);
    for (const shop of it.shops ?? []) if (!SHOPS_BY_ID.has(shop)) problems.push(`${it.id}: unbekannter Laden ${shop}`);
  }
  for (const job of JOBS) {
    if (!(job.durationMin > 0) || !(job.pay > 0)) problems.push(`${job.id}: Dauer und Lohn müssen > 0 sein`);
    job.requires?.forEach((c) => checkCondition(job.id, c));
    job.visibleWhen?.forEach((c) => checkCondition(job.id, c));
  }
  for (const g of GOALS) {
    if (g.complete.length === 0) problems.push(`${g.id}: keine Abschlussbedingung`);
    g.requires?.forEach((c) => checkCondition(g.id, c));
    g.complete.forEach((c) => checkCondition(g.id, c));
    g.rewards.forEach((e) => checkEffect(g.id, e));
  }
  for (const d of DISTRICTS) {
    if (!CITIES_BY_ID.has(d.cityId)) problems.push(`${d.id}: unbekannte Stadt ${d.cityId}`);
    if (!pointInPolygon(d.label, d.shape)) problems.push(`${d.id}: Label liegt außerhalb des Bezirks`);
    d.requires?.forEach((c) => checkCondition(d.id, c));
  }
  for (const c of CITIES) {
    for (const id of Object.keys(c.startExplored)) if (!DISTRICTS_BY_ID.has(id)) problems.push(`${c.id}: unbekannter Bezirk ${id}`);
  }
  const placeCheck = (id: string, districtId: string, pos: [number, number]) => {
    const district = DISTRICTS_BY_ID.get(districtId);
    if (!district) problems.push(`${id}: unbekannter Bezirk ${districtId}`);
    else if (!pointInPolygon(pos, district.shape)) problems.push(`${id}: Position liegt nicht im Bezirk ${districtId}`);
  };
  for (const sp of SPOTS) {
    placeCheck(sp.id, sp.districtId, sp.pos);
    for (const [k, v] of Object.entries(sp.stats)) if (v < 0) problems.push(`${sp.id}: ${k} negativ`);
    if (sp.explore === undefined && !RUMORS.some((r) => r.target.id === sp.id)) problems.push(`${sp.id}: kann nie entdeckt werden`);
  }
  for (const p of POIS) {
    placeCheck(p.id, p.districtId, p.pos);
    if (p.shopId && !SHOPS_BY_ID.has(p.shopId)) problems.push(`${p.id}: unbekannter Laden ${p.shopId}`);
    if (p.kind === 'storage' && !p.storage) problems.push(`${p.id}: Lager ohne Lagerdaten`);
    if ((p.kind === 'hangout' || p.kind === 'club') && !p.visit) problems.push(`${p.id}: Treffpunkt ohne Besuch`);
    if (p.explore === undefined && !RUMORS.some((r) => r.target.id === p.id)) problems.push(`${p.id}: kann nie entdeckt werden`);
  }
  for (const shop of SHOPS) {
    if (shop.poiId && POIS_BY_ID.get(shop.poiId)?.shopId !== shop.id) problems.push(`${shop.id}: Ort ${shop.poiId} passt nicht`);
  }
  for (const r of RUMORS) {
    const exists = r.target.kind === 'spot' ? SPOTS_BY_ID.has(r.target.id) : POIS_BY_ID.has(r.target.id);
    if (!exists) problems.push(`${r.id}: Ziel ${r.target.id} existiert nicht`);
    for (const src of r.sources) {
      if ('job' in src && !JOBS_BY_ID.has(src.job)) problems.push(`${r.id}: unbekannter Job ${src.job}`);
      if ('poi' in src && !POIS_BY_ID.get(src.poi)?.visit) problems.push(`${r.id}: Ort ${src.poi} unbekannt oder nicht besuchbar`);
      if ('district' in src && !DISTRICTS_BY_ID.has(src.district)) problems.push(`${r.id}: unbekannter Bezirk ${src.district}`);
    }
  }
  const knownBySomeone = new Set(PEOPLE.flatMap((p) => p.knows));
  for (const p of PEOPLE) {
    for (const k of p.knows) {
      if (!PERSONS_BY_ID.has(k)) problems.push(`${p.id}: kennt unbekannte Person ${k}`);
      if (k === p.id) problems.push(`${p.id}: kennt sich selbst`);
    }
    for (const sp of p.knowsSpots ?? []) if (!SPOTS_BY_ID.has(sp)) problems.push(`${p.id}: unbekannter Spot ${sp}`);
    for (const po of p.knowsPois ?? []) if (!POIS_BY_ID.has(po)) problems.push(`${p.id}: unbekannter Ort ${po}`);
    for (const [k, v] of Object.entries(p.stats)) if (v < 0 || v > 100) problems.push(`${p.id}: ${k} außerhalb 0–100`);
    for (const m of p.meet) {
      if ('job' in m && !JOBS_BY_ID.has(m.job)) problems.push(`${p.id}: unbekannter Job ${m.job}`);
      if ('poi' in m && !POIS_BY_ID.get(m.poi)?.visit) problems.push(`${p.id}: Ort ${m.poi} unbekannt oder nicht besuchbar`);
      if ('district' in m && !DISTRICTS_BY_ID.has(m.district)) problems.push(`${p.id}: unbekannter Bezirk ${m.district}`);
      if ('reaches' in m) m.reaches.forEach((c) => checkCondition(p.id, c));
    }
    if (p.meet.length === 0 && !knownBySomeone.has(p.id)) problems.push(`${p.id}: kann nie kennengelernt werden`);
  }
  const followUps = new Set<string>();
  const collectFollowUps = (list: readonly Effect[] | undefined) =>
    list?.forEach((e) => {
      if (e.t === 'message') followUps.add(e.template);
      if (e.t === 'task') collectFollowUps(e.effects);
    });
  for (const t of MESSAGE_TEMPLATES) {
    if ('person' in t.from && !PERSONS_BY_ID.has(t.from.person)) problems.push(`${t.id}: unbekannter Absender ${t.from.person}`);
    if ('role' in t.from && t.from.role.length === 0) problems.push(`${t.id}: keine Rollen`);
    t.when?.forEach((c) => checkCondition(t.id, c));
    t.onDeliver?.forEach((e) => checkEffect(t.id, e));
    t.onExpire?.forEach((e) => checkEffect(t.id, e));
    collectFollowUps(t.onDeliver);
    const ids = new Set<string>();
    for (const ch of t.choices ?? []) {
      if (ids.has(ch.id)) problems.push(`${t.id}: doppelte Antwort ${ch.id}`);
      ids.add(ch.id);
      ch.requires?.forEach((c) => checkCondition(t.id, c));
      ch.effects?.forEach((e) => checkEffect(t.id, e));
      collectFollowUps(ch.effects);
      for (const o of ch.outcomes ?? []) {
        o.effects.forEach((e) => checkEffect(t.id, e));
        collectFollowUps(o.effects);
      }
    }
  }
  for (const t of MESSAGE_TEMPLATES) if (t.followUpOnly && !followUps.has(t.id)) problems.push(`${t.id}: Folge-Nachricht wird nie ausgelöst`);
  for (let i = 1; i < REP_TIERS.length; i++) {
    if (REP_TIERS[i].min <= REP_TIERS[i - 1].min) problems.push(`Reputation-Stufen nicht aufsteigend bei ${REP_TIERS[i].id}`);
  }
  return problems;
}
