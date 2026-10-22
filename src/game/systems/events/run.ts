import type { GameState } from '../../state';
import { PEOPLE } from '../../content/people';
import { ITEMS, spotDef } from '../../content/registry';
import { PROMO_CHANNELS } from '../../content/events';
import { GAME_HOUR_MS, gameDayAt } from '../../core/time';
import { notify } from '../../core/notify';
import { chance, pick, rand, randInt, randRange } from '../../core/rng';
import { fmtMoney, fmtNumber } from '../../core/format';
import { earn, spend } from '../finance/logic';
import { addRep, addXp, incStat, stat } from '../progression/logic';
import { adjustRelation, adjustTrust, meetSomeone, shortName } from '../people/logic';
import { findSystem } from '../sound/logic';
import { wearItem } from '../equipment/logic';
import { removeItem } from '../inventory/logic';
import { effectiveStats } from '../spots/logic';
import { addBrand, standSales } from '../merch/logic';
import { canPlaySelf, soundSummary, spotName } from './plan';
import {
  demandFor,
  performers,
  policeRisk,
  powerAvailable,
  rollWeather,
  scoresFor,
  supplyResult,
  type Roll,
} from './simulate';
import type { EventReport, GameEvent } from './state';


function lockSystem(d: GameState, ev: GameEvent, lock: boolean): void {
  if (ev.sound.kind !== 'own') return;
  const sys = findSystem(d, ev.sound.systemId);
  if (!sys) return;
  for (const uid of sys.components) {
    const it = d.inventory.items[uid];
    if (!it) continue;
    if (lock && !it.locked) it.locked = `event:${ev.id}`;
    if (!lock && it.locked === `event:${ev.id}`) delete it.locked;
  }
}

function cancel(d: GameState, ev: GameEvent, reason: string, refundRent: boolean): void {
  ev.status = 'cancelled';
  ev.cancelReason = reason;
  if (refundRent && ev.paid['Miete Spot']) earn(d, ev.paid['Miete Spot'], 'event', `Miete zurück: ${ev.name}`);
  notify(d, { tone: 'danger', title: `Abgesagt: ${ev.name}`, text: reason, link: `/events/bericht/${ev.id}` });
}

/** The night begins: checks spot and sound, rolls the weather, locks the gear. */
export function startEvent(d: GameState, ev: GameEvent): void {
  const st = d.spots.spots[ev.spotId];
  if (!st || st.status === 'closed') {
    cancel(d, ev, 'Der Spot wurde abgesperrt. Die Party fällt aus – die Miete gibt es zurück.', true);
    addRep(d, -1);
    return;
  }
  const sound = soundSummary(d, ev);
  if (!sound || sound.reach <= 0) {
    cancel(d, ev, 'Ohne funktionierende Anlage keine Party. Die Leute stehen vor einem stillen Spot.', false);
    addRep(d, -3);
    return;
  }
  ev.status = 'running';
  ev.weather = rollWeather(rand(d));
  ev.endsAt = ev.startsAt + ev.durationH * GAME_HOUR_MS;
  lockSystem(d, ev, true);
  notify(d, { tone: 'discovery', title: `Es geht los: ${ev.name}`, text: `${spotName(ev.spotId)} · Wetter: ${ev.weather}`, link: '/events' });
}

/** The night is over: simulate, book money, hand out rewards, write the report. */
export function finishEvent(d: GameState, ev: GameEvent): EventReport {
  lockSystem(d, ev, false);
  const roll: Roll = () => rand(d);
  const spot = spotDef(ev.spotId);
  const stats = effectiveStats(d, ev.spotId);
  const st = d.spots.spots[ev.spotId];
  const weather = ev.weather ?? 'klar';
  const sound = soundSummary(d, ev) ?? { reach: 0, quality: 0, reliability: 0, powerKw: 0, generatorKw: 0, volumeL: 0, weightKg: 0, lightFx: 0, rentalCost: 0 };
  const incidents: string[] = [];
  const highlights: string[] = [];
  let moodPenalty = 0;
  let hours = ev.durationH;
  const tasksDone = Object.values(ev.tasks).filter((t) => t === 'done').length / Math.max(1, Object.keys(ev.tasks).length);

  // Surprise at an unchecked spot.
  if (ev.tasks['task.check'] === 'open' && chance(d, 0.3)) {
    incidents.push('Ungecheckter Spot: Das Tor war verschlossen, der Aufbau verzögerte sich um zwei Stunden.');
    hours = Math.max(2, hours - 2);
    moodPenalty += 5;
  }

  // Performers – someone may not show up.
  let present = performers(d, ev.lineup);
  const noShows: string[] = [];
  for (const p of [...present]) {
    if (p.id === 'self') continue;
    const risk = ((100 - p.reliability) / 300) * (ev.tasks['task.lineup'] === 'done' ? 0.5 : 1);
    if (chance(d, risk)) {
      noShows.push(p.id);
      present = present.filter((x) => x.id !== p.id);
      const person = PEOPLE.find((x) => x.id === p.id)!;
      incidents.push(`${shortName(person)} ist nicht aufgetaucht.`);
      adjustRelation(d, p.id, -10);
      moodPenalty += 4;
    }
  }
  if (present.length === 0) {
    if (canPlaySelf(d)) {
      present = performers(d, ['self']).map((p) => ({ ...p, skill: p.skill * 0.85 }));
      incidents.push('Du bist selbst eingesprungen und hast die Nacht gerettet.');
      moodPenalty += 4;
    } else {
      incidents.push('Niemand am Pult – jemand hat eine Playlist vom Handy laufen lassen.');
      present = [{ id: 'playlist', draw: 0, skill: 18, reliability: 100 }];
      moodPenalty += 8;
    }
  }

  const flyerDone = ev.tasks['task.flyer'] !== 'open';
  const demand = demandFor(d, ev, flyerDone, weather, roll, ev.createdAt);
  let visitors = Math.min(demand, stats.capacity);
  if (demand > stats.capacity * 1.25) {
    highlights.push(`Ausverkauft: ${fmtNumber(demand - stats.capacity)} Leute mussten draußen bleiben.`);
  }

  // Power and gear.
  let powerOk = powerAvailable(d, ev, sound);
  if (!powerOk && chance(d, 0.6)) {
    incidents.push('Der Strom reichte nicht – Sicherung raus, Sound nur mit halber Leistung.');
    moodPenalty += 8;
  } else powerOk = true;
  let soundHit = 1;
  if (chance(d, Math.max(0, (100 - sound.reliability) / 120))) {
    soundHit = 0.75;
    moodPenalty += 6;
    if (ev.sound.kind === 'own') {
      const sys = findSystem(d, ev.sound.systemId);
      const speakers = (sys?.components ?? []).filter((uid) => ['top', 'sub', 'amp'].includes(ITEMS.get(d.inventory.items[uid]?.defId ?? '')?.type ?? ''));
      if (speakers.length > 0) {
        const uid = pick(d, speakers);
        const name = ITEMS.get(d.inventory.items[uid].defId)?.name;
        wearItem(d, uid, 25);
        incidents.push(`Technik-Ausfall: ${name} ist mitten in der Nacht ausgestiegen.`);
      }
    } else incidents.push('Technik-Ausfall bei der Verleih-PA – der Techniker brauchte eine halbe Stunde.');
  }

  // Weather.
  if (weather === 'regen' && spot.stats.weather > 50) incidents.push('Regen. Wer keine Plane dabei hatte, ist früh gegangen.');
  if (weather === 'sturm' && spot.stats.weather > 50) {
    incidents.push('Sturm! Pavillons flogen, die Party endete früher.');
    hours = Math.max(2, Math.round(hours * 0.6));
  }

  // Police.
  let policeEnded = false;
  if (chance(d, policeRisk(d, ev, visitors))) {
    policeEnded = true;
    const frac = randRange(d, 0.35, 0.75);
    hours = Math.max(1, Math.round(hours * frac));
    moodPenalty += 15;
    incidents.push('Polizei! Die Party wurde aufgelöst.');
    if (spot.legality === 'illegal') {
      const fine = randInt(d, 150, 600) * Math.min(5, Math.max(1, visitors / 100));
      spend(d, Math.round(fine), 'event', `Bußgeld: ${ev.name}`);
      incidents.push(`Bußgeld: ${fmtMoney(Math.round(fine))}.`);
    }
    if (st) {
      st.status = 'closed';
      st.closedUntilDay = gameDayAt(d.clock, d.clock.now) + randInt(d, 4, 10);
      st.fame = Math.min(100, st.fame + 20);
    }
    incStat(d, 'raids');
  }

  const supply = supplyResult(d, ev, visitors, hours);
  if (Object.keys(ev.prices).length > 0 && supply.coverage < 0.5) {
    incidents.push('Die Getränke waren früh alle.');
    moodPenalty += 8;
  }

  const scores = scoresFor(
    d,
    ev,
    {
      visitors,
      sound: { ...sound, quality: sound.quality * soundHit },
      powerOk,
      performersPresent: present,
      weather,
      supplyCoverage: supply.coverage,
      hasGoods: Object.keys(ev.prices).length > 0,
      tasksDone,
      helpers: ev.helpers,
      awareness: ev.awareness,
      medics: ev.medics,
    },
    roll,
  );
  scores.mood = Math.max(0, scores.mood - moodPenalty);
  if (visitors > sound.reach * 1.2) incidents.push('Zu wenig Anlage für so viele Leute – hinten hörte man kaum etwas.');
  if (scores.mood >= 80) highlights.push('Legendäre Nacht – alle reden noch tagelang davon.');
  else if (scores.mood >= 65) highlights.push('Richtig gute Stimmung bis zum Schluss.');

  // Money.
  const share = hours / ev.durationH;
  const revenue: Record<string, number> = {};
  if (ev.entry > 0) revenue['Eintritt'] = Math.round(visitors * ev.entry * 0.92);
  else revenue['Spenden'] = Math.round(visitors * 1.8 * (scores.mood / 100));
  if (supply.revenue > 0) revenue['Bar'] = Math.round(supply.revenue * share);
  const costs: Record<string, number> = { ...ev.paid };
  for (const p of present) {
    if (p.id === 'self' || p.id === 'playlist') continue;
    const fee = d.crew.members.some((m) => m.personId === p.id) ? 0 : (PEOPLE.find((x) => x.id === p.id)?.price ?? 0);
    if (fee > 0) costs[`Gage ${shortName(PEOPLE.find((x) => x.id === p.id)!)}`] = fee;
  }
  if (ev.sound.kind === 'own' && sound.generatorKw > 0) costs['Sprit Generator'] = Math.round(sound.powerKw * hours * 0.45);
  for (const [label, amount] of Object.entries(revenue)) if (amount > 0) earn(d, amount, 'event', `${label}: ${ev.name}`);
  for (const [label, amount] of Object.entries(costs)) {
    if (label in ev.paid) continue;
    spend(d, amount, 'event', `${label}: ${ev.name}`);
  }
  // (Wareneinsatz is added below and never booked again.)
  // Goods consumed (already paid when bought – shown as "Wareneinsatz").
  let goodsCost = 0;
  for (const [type, used] of Object.entries(supply.servingsUsed)) {
    let left = used;
    for (const it of Object.values(d.inventory.items)) {
      const def = ITEMS.get(it.defId);
      if (left <= 0 || def?.type !== type || def.category !== 'goods' || !(it.defId in ev.prices)) continue;
      const crates = Math.min(it.qty, Math.ceil(left / (def.stats?.servings ?? 1)));
      left -= crates * (def.stats?.servings ?? 1);
      goodsCost += it.qty > 0 ? (it.paid / it.qty) * crates : 0;
      removeItem(d, it.uid, crates);
    }
  }
  if (goodsCost > 0) costs['Wareneinsatz'] = Math.round(goodsCost);

  // Merch stand (pieces were paid when ordered – their cost shows as "Merch-Wareneinsatz").
  if (ev.merch) {
    const stand = standSales(d, visitors, scores.mood, share, roll);
    for (const [key, n] of Object.entries(stand.sold)) d.merch.stock[key].qty -= n;
    if (stand.pieces > 0) {
      revenue['Merch'] = Math.round(stand.revenue);
      costs['Merch-Wareneinsatz'] = Math.round(stand.cost);
      earn(d, stand.revenue, 'merch', `Merch-Stand: ${ev.name}`);
      incStat(d, 'merchSold', stand.pieces);
      addBrand(d, stand.pieces * 0.02);
      highlights.push(`${fmtNumber(stand.pieces)} Merch-Teile verkauft.`);
    }
  }
  // Every good night makes the crew's name stronger.
  if (d.crew.founded) addBrand(d, Math.sqrt(visitors) * (scores.mood / 100) * 0.25);
  const totalRevenue = Object.values(revenue).reduce((a, b) => a + b, 0);
  const totalCosts = Object.values(costs).reduce((a, b) => a + b, 0);
  const profit = totalRevenue - totalCosts;

  // Rewards.
  const rep = Math.max(policeEnded ? 1 : 0, Math.round(1.6 * Math.sqrt(visitors) * (0.4 + scores.mood / 100)));
  addRep(d, rep);
  const xp: Record<string, number> = {
    organisation: Math.min(220, Math.round(15 + visitors / 8)),
    netzwerk: Math.min(150, Math.round(8 + visitors / 15)),
    business: profit > 0 ? Math.min(90, Math.round(profit / 40) + 5) : 5,
  };
  if (ev.sound.kind === 'own') xp.technik = Math.min(130, Math.round(10 + sound.reach / 40));
  if (ev.lineup.includes('self')) xp.produktion = 15;
  for (const [skill, amount] of Object.entries(xp)) addXp(d, skill as 'organisation', amount);

  if (st) {
    const promoFame = ev.promo.reduce((sum, id) => sum + (PROMO_CHANNELS.find((c) => c.id === id)?.fame ?? 0), 0);
    st.fame = Math.min(100, st.fame + Math.min(30, visitors / 25 + promoFame));
    st.events++;
    st.condition = Math.max(10, st.condition - visitors / 200);
  }

  // People.
  const newPeople: string[] = [];
  const tries = (visitors >= 40 ? 1 : 0) + (visitors >= 300 ? 1 : 0) + (scores.mood >= 70 ? 1 : 0);
  for (let i = 0; i < tries; i++) {
    if (!chance(d, 0.6)) continue;
    const met = meetSomeone(d);
    if (met) newPeople.push(met);
  }
  for (const p of present) {
    if (p.id === 'self' || p.id === 'playlist') continue;
    adjustRelation(d, p.id, scores.mood >= 50 ? 4 : -2);
    if (scores.mood >= 50) adjustTrust(d, p.id, 3);
  }
  for (const m of d.crew.members) m.morale = Math.max(0, Math.min(100, m.morale + (scores.mood - 50) / 5));

  // Gear wear.
  if (ev.sound.kind === 'own') {
    const sys = findSystem(d, ev.sound.systemId);
    const protection = (sys?.components ?? []).reduce((best, uid) => Math.max(best, ITEMS.get(d.inventory.items[uid]?.defId ?? '')?.stats?.protection ?? 0), 0);
    for (const uid of sys?.components ?? []) wearItem(d, uid, 1.5 * (hours / 6) * (1 - protection / 100) * (0.5 + rand(d)));
  }

  incStat(d, 'eventsHeld');
  incStat(d, 'eventVisitors', visitors);
  if (visitors > stat(d, 'bestEventVisitors')) d.progression.stats.bestEventVisitors = visitors;
  if (profit > 0) incStat(d, 'eventsProfitable');
  if (scores.mood > stat(d, 'bestEventMood')) d.progression.stats.bestEventMood = scores.mood;

  const report: EventReport = {
    visitors,
    demand,
    revenue,
    costs,
    profit,
    scores,
    incidents,
    highlights,
    rep,
    xp,
    newPeople,
    played: present.map((p) => p.id).filter((id) => id !== 'playlist'),
    weather,
    hoursPlayed: hours,
  };
  ev.report = report;
  ev.status = 'done';
  notify(d, {
    tone: profit >= 0 ? 'success' : 'warning',
    title: `Bericht: ${ev.name}`,
    text: `${fmtNumber(visitors)} Leute · Stimmung ${scores.mood} · ${fmtMoney(profit, { sign: true })} · +${rep} Reputation`,
    link: `/events/bericht/${ev.id}`,
  });
  return report;
}
