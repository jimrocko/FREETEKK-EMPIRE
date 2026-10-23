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
import { MANUFACTURERS, MERCH_PRODUCTS } from './merch';
import { TRADE_PARTNERS } from './trade';
import { LOAN_OFFERS } from './finance';
import { RIVAL_CREWS } from './rivals';
import { UNLOCKS } from './unlocks';
import { PROJECTS } from './projects';
import { PERKS, SCENARIOS } from './legacy';
import { EVENT_FORMATS } from './events';
import { HAPPENINGS } from './happenings';
import { GENRES } from './music';
import { RIVALS_BY_ID } from './registry';

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
      case 'unlocked':
        if (!UNLOCKS.some((u) => u.id === c.id)) problems.push(`${where}: unbekannte Freischaltung ${c.id}`);
        break;
      case 'cityFame':
        if (!CITIES_BY_ID.has(c.city)) problems.push(`${where}: unbekannte Stadt ${c.city}`);
        break;
      case 'rivalRelation':
      case 'rivalActive':
      case 'outrank':
        if (c.rival !== '$rival' && !RIVALS_BY_ID.has(c.rival)) problems.push(`${where}: unbekannte Crew ${c.rival}`);
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
    if ((e.t === 'trust' || e.t === 'relation' || e.t === 'favor' || e.t === 'meet') && !e.person.startsWith('$') && !PERSONS_BY_ID.has(e.person)) {
      problems.push(`${where}: unbekannte Person ${e.person}`);
    }
    if (e.t === 'message' && !TEMPLATES_BY_ID.has(e.template)) problems.push(`${where}: unbekannte Nachricht ${e.template}`);
    if (e.t === 'task') e.effects.forEach((x) => checkEffect(where, x));
    if (e.t === 'explore' && !DISTRICTS_BY_ID.has(e.district)) problems.push(`${where}: unbekannter Bezirk ${e.district}`);
    if (e.t === 'item' && !ITEMS.has(e.item)) problems.push(`${where}: unbekanntes Item ${e.item}`);
    if (e.t === 'xp' && !SKILLS.includes(e.skill)) problems.push(`${where}: unbekannte Fähigkeit ${e.skill}`);
    if (e.t === 'revealSpot' && !e.spot.startsWith('$') && !SPOTS_BY_ID.has(e.spot)) problems.push(`${where}: unbekannter Spot ${e.spot}`);
    if ((e.t === 'rivalRelation' || e.t === 'coop' || e.t === 'rivalBooking' || e.t === 'rivalSpotTip') && e.rival !== '$rival' && !RIVALS_BY_ID.has(e.rival)) {
      problems.push(`${where}: unbekannte Crew ${e.rival}`);
    }
    if (e.t === 'rareOffer' && !ITEMS.has(e.item)) problems.push(`${where}: unbekanntes Item ${e.item}`);
    if (e.t === 'spotChange' && e.spot && !e.spot.startsWith('$') && !SPOTS_BY_ID.has(e.spot)) problems.push(`${where}: unbekannter Spot ${e.spot}`);
    if (e.t === 'revealPoi' && !POIS_BY_ID.has(e.poi)) problems.push(`${where}: unbekannter Ort ${e.poi}`);
    if (e.t === 'rumor' && !RUMORS_BY_ID.has(e.rumor)) problems.push(`${where}: unbekanntes Gerücht ${e.rumor}`);
  };

  for (const it of ALL_ITEMS) {
    if (!(it.price > 0)) problems.push(`${it.id}: Preis muss > 0 sein`);
    if (it.quality < 0 || it.quality > 100) problems.push(`${it.id}: Qualität außerhalb 0–100`);
    if (!(it.volumeL > 0) && it.category !== 'vehicle') problems.push(`${it.id}: Volumen muss > 0 sein`);
    if (!(it.weightKg > 0)) problems.push(`${it.id}: Gewicht muss > 0 sein`);
    if (!it.shops?.length && !it.usedMarket && it.category !== 'goods' && !it.tags?.includes('crafted')) problems.push(`${it.id}: weder im Shop noch auf dem Gebrauchtmarkt`);
    if (it.unlock && !UNLOCKS.some((u) => u.id === it.unlock)) problems.push(`${it.id}: unbekannte Freischaltung ${it.unlock}`);
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
    if (sp.explore === undefined && !sp.hidden && !RUMORS.some((r) => r.target.id === sp.id)) problems.push(`${sp.id}: kann nie entdeckt werden`);
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
    if ('rival' in t.from !== !!t.rival) problems.push(`${t.id}: Crew-Nachrichten brauchen from: { rival: true } und eine Art`);
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
  checkUnique('merch', MERCH_PRODUCTS);
  checkUnique('manufacturer', MANUFACTURERS);
  checkUnique('loan', LOAN_OFFERS);
  for (const m of MANUFACTURERS) {
    if (m.personId && !PERSONS_BY_ID.has(m.personId)) problems.push(`${m.id}: unbekannte Person ${m.personId}`);
    for (const pid of Object.keys(m.products)) if (!MERCH_PRODUCTS.some((p) => p.id === pid)) problems.push(`${m.id}: unbekanntes Produkt ${pid}`);
    m.requires?.forEach((c) => checkCondition(m.id, c));
  }
  for (const t of TRADE_PARTNERS) if (!PERSONS_BY_ID.has(t.personId)) problems.push(`Handel: unbekannte Person ${t.personId}`);
  for (const l of LOAN_OFFERS) {
    if (l.total < l.amount) problems.push(`${l.id}: Rückzahlung kleiner als Kredit`);
    l.requires?.forEach((c) => checkCondition(l.id, c));
  }
  for (const poi of POIS) poi.storage?.requires?.forEach((c) => checkCondition(poi.id, c));
  checkUnique('unlock', UNLOCKS);
  const unlockIds = new Set(UNLOCKS.map((u) => u.id));
  for (const u of UNLOCKS) {
    for (const r of u.requires ?? []) if (!unlockIds.has(r)) problems.push(`${u.id}: braucht unbekannte Freischaltung ${r}`);
    u.conditions?.forEach((c) => checkCondition(u.id, c));
    if (u.cost <= 0) problems.push(`${u.id}: kostet keine Szenepunkte`);
  }
  for (const c of CITIES) if (c.travel.unlock && !unlockIds.has(c.travel.unlock)) problems.push(`${c.id}: unbekannte Freischaltung ${c.travel.unlock}`);
  for (const f of EVENT_FORMATS) if (f.unlock && !unlockIds.has(f.unlock)) problems.push(`Format ${f.id}: unbekannte Freischaltung ${f.unlock}`);
  for (const m of MERCH_PRODUCTS) if (m.unlock && !unlockIds.has(m.unlock)) problems.push(`${m.id}: unbekannte Freischaltung ${m.unlock}`);
  checkUnique('project', PROJECTS);
  for (const p of PROJECTS) {
    if (!unlockIds.has(p.unlock)) problems.push(`${p.id}: unbekannte Freischaltung ${p.unlock}`);
    if (p.stages.length === 0) problems.push(`${p.id}: keine Etappen`);
    for (const st of p.stages) st.requires?.forEach((c) => checkCondition(`${p.id}/${st.id}`, c));
  }
  checkUnique('scenario', SCENARIOS);
  for (const sc of SCENARIOS) {
    for (const it of sc.items) if (!ITEMS.has(it.id)) problems.push(`${sc.id}: unbekanntes Item ${it.id}`);
    for (const id of Object.keys(sc.contacts ?? {})) if (!PERSONS_BY_ID.has(id)) problems.push(`${sc.id}: unbekannte Person ${id}`);
    if (sc.cityId && !CITIES_BY_ID.has(sc.cityId)) problems.push(`${sc.id}: unbekannte Stadt ${sc.cityId}`);
    for (const u of sc.unlocks ?? []) if (!unlockIds.has(u)) problems.push(`${sc.id}: unbekannte Freischaltung ${u}`);
  }
  checkUnique('perk', PERKS);
  checkUnique('rival', RIVAL_CREWS);
  for (const r of RIVAL_CREWS) {
    if (!PERSONS_BY_ID.has(r.leaderId)) problems.push(`${r.id}: unbekannte Person ${r.leaderId}`);
    if (PERSONS_BY_ID.get(r.leaderId)?.crewable !== false) problems.push(`${r.id}: Kopf der Crew darf nicht anwerbbar sein`);
    if (!CITIES_BY_ID.has(r.cityId)) problems.push(`${r.id}: unbekannte Stadt ${r.cityId}`);
    if (!GENRES.some((g) => g.id === r.style)) problems.push(`${r.id}: unbekanntes Genre ${r.style}`);
    for (const sp of r.spots) if (!SPOTS_BY_ID.has(sp)) problems.push(`${r.id}: unbekannter Spot ${sp}`);
    r.appears?.forEach((c) => checkCondition(r.id, c));
  }
  checkUnique('happening', HAPPENINGS);
  const TARGET_KEYS: Record<string, string[]> = {
    gear: ['item'],
    soundGear: ['item'],
    nextEvent: ['event', 'spot'],
    eventDj: ['event', 'person'],
    unknownSpot: ['spot'],
    knownSpot: ['spot'],
  };
  for (const h of HAPPENINGS) {
    const provided = h.target ? TARGET_KEYS[h.target] : [];
    const json = JSON.stringify(h);
    for (const key of ['item', 'event', 'person', 'spot']) {
      if ((json.includes(`"$${key}"`) || h.text.includes(`{${key}}`)) && !provided.includes(key)) problems.push(`${h.id}: nutzt ${key}, das Ziel liefert es nicht`);
    }
    h.when?.forEach((c) => checkCondition(h.id, c));
    h.effects?.forEach((e) => checkEffect(h.id, e));
    h.onExpire?.forEach((e) => checkEffect(h.id, e));
    const ids = new Set<string>();
    for (const ch of h.choices ?? []) {
      if (ids.has(ch.id)) problems.push(`${h.id}: doppelte Antwort ${ch.id}`);
      ids.add(ch.id);
      ch.requires?.forEach((c) => checkCondition(h.id, c));
      ch.effects?.forEach((e) => checkEffect(h.id, e));
      ch.outcomes?.forEach((o) => o.effects.forEach((e) => checkEffect(h.id, e)));
    }
  }
  for (let i = 1; i < REP_TIERS.length; i++) {
    if (REP_TIERS[i].min <= REP_TIERS[i - 1].min) problems.push(`Reputation-Stufen nicht aufsteigend bei ${REP_TIERS[i].id}`);
  }
  return problems;
}
