import type { GameState } from '../../state';
import type { Reason, Tone } from '../../core/types';
import type { RivalCrewDef } from '../../content/rivals';
import { RIVAL_CREWS, crewVerb } from '../../content/rivals';
import { SPOTS } from '../../content/spots';
import { MESSAGE_TEMPLATES } from '../../content/messages';
import { RIVALS_BY_ID, rivalDef, spotDef } from '../../content/registry';
import { checkAll } from '../../core/conditions';
import { notify } from '../../core/notify';
import { chance, pickWeighted, rand, randInt, randRange } from '../../core/rng';
import { GAME_DAY_MS, GAME_HOUR_MS, dayStartAt, gameDayAt, gameTimeAt } from '../../core/time';
import { fmtNumber } from '../../core/format';
import { effectiveStats } from '../spots/logic';
import { dayFactor, sameNight } from '../events/plan';
import { modifierValue } from '../happenings/logic';
import { addRep, addXp, incStat } from '../progression/logic';
import { earn } from '../finance/logic';
import { meetPerson } from '../people/logic';
import { deliverTemplate } from '../messages/logic';
import { resolveConditionsRival } from '../messages/resolve';
import type { RivalCrewState, RivalEvent } from './state';

export const NEWS_LIMIT = 80;
const EVENT_KEEP = 40;

export function crewState(s: GameState, id: string): RivalCrewState {
  return s.rivals.crews[id];
}

/** Crews that are around right now, strongest first. */
export function activeCrews(s: GameState): { def: RivalCrewDef; st: RivalCrewState }[] {
  return RIVAL_CREWS.filter((def) => s.rivals.crews[def.id]?.active && def.cityId === s.map.cityId)
    .map((def) => ({ def, st: s.rivals.crews[def.id] }))
    .sort((a, b) => b.st.rep - a.st.rep);
}

export function addNews(d: GameState, text: string, tone: Tone, opts: { crewId?: string; spotId?: string } = {}): void {
  d.rivals.news.push({ id: d.rivals.nextId++, at: d.clock.now, text, tone, ...opts });
  if (d.rivals.news.length > NEWS_LIMIT) d.rivals.news.splice(0, d.rivals.news.length - NEWS_LIMIT);
}

/** Unseen scene news that matter (raids, conflicts, coops) – for the menu badge. */
export function unseenNews(s: GameState): number {
  return s.rivals.news.filter((n) => n.id > s.rivals.seenNews && n.tone !== 'info' && n.tone !== 'discovery').length;
}

export function adjustRivalRelation(d: GameState, id: string, amount: number): void {
  const st = d.rivals.crews[id];
  if (!st) return;
  st.relation = Math.max(-100, Math.min(100, Math.round((st.relation + amount) * 10) / 10));
}

export function rivalRelationLabel(rel: number): string {
  if (rel <= -50) return 'Feindselig';
  if (rel <= -15) return 'Angespannt';
  if (rel < 15) return 'Neutral';
  if (rel < 50) return 'Freundlich';
  return 'Verbündet';
}

/** Name of a spot as the player may see it (unknown spots stay secret). */
export function spotLabel(s: GameState, spotId: string): string {
  return s.spots.spots[spotId]?.known ? spotDef(spotId).name : 'einem geheimen Ort';
}

export function eventEndsAt(ev: RivalEvent): number {
  return ev.startsAt + ev.durationH * GAME_HOUR_MS;
}

export function isRunning(s: GameState, ev: RivalEvent): boolean {
  return ev.status === 'scheduled' && ev.startsAt <= s.clock.now && s.clock.now < eventEndsAt(ev);
}

export function upcomingRivalEvents(s: GameState): RivalEvent[] {
  return s.rivals.events.filter((e) => e.status === 'scheduled').sort((a, b) => a.startsAt - b.startsAt);
}

export function rivalEventOnSpot(s: GameState, spotId: string, startsAt: number): RivalEvent | undefined {
  return s.rivals.events.find((e) => e.status === 'scheduled' && e.spotId === spotId && sameNight(e.startsAt, startsAt));
}

export function rivalEventsInNight(s: GameState, startsAt: number): RivalEvent[] {
  return s.rivals.events.filter((e) => e.status === 'scheduled' && sameNight(e.startsAt, startsAt));
}

function playerEventsInNight(s: GameState, startsAt: number) {
  return s.events.list.filter((e) => (e.status === 'scheduled' || e.status === 'running') && sameNight(e.startsAt, startsAt));
}

/**
 * Other parties in the same night split the crowd. Returns the factor for
 * the player's demand and the crews involved. A coop partner doesn't compete.
 */
export function competition(s: GameState, startsAt: number): { factor: number; crews: string[] } {
  let factor = 1;
  const crews: string[] = [];
  const player = Math.max(10, s.progression.reputation);
  for (const ev of rivalEventsInNight(s, startsAt)) {
    if (s.rivals.coop?.crewId === ev.crewId) continue;
    const rep = s.rivals.crews[ev.crewId]?.rep ?? 0;
    factor *= 1 - 0.35 * (rep / (rep + player + 50));
    crews.push(ev.crewId);
  }
  return { factor: Math.max(0.45, factor), crews };
}

/** Extra visitors a coop partner brings to the player's party. */
export function coopDemand(s: GameState, startsAt: number, weekday: number): number {
  const coop = s.rivals.coop;
  if (!coop || startsAt > coop.until) return 0;
  const crew = s.rivals.crews[coop.crewId];
  return crew ? Math.round((crew.rep * 0.35 + crew.members * 6) * dayFactor(weekday)) : 0;
}

// ── Rival party simulation ─────────────────────────────

export function rivalPoliceRisk(s: GameState, ev: RivalEvent, visitors: number): number {
  const spot = spotDef(ev.spotId);
  const base = spot.legality === 'illegal' ? 0.1 : spot.legality === 'grey' ? 0.035 : 0;
  if (base === 0) return 0;
  const st = s.spots.spots[ev.spotId];
  const stats = effectiveStats(s, ev.spotId);
  return Math.min(0.8, base * (1 + (st?.fame ?? 0) / 50) * (1 - stats.security / 200) * (visitors > 150 ? 1.2 : 1) * (1 + modifierValue(s, 'police')));
}

/** Expected crowd for a crew's party (before the random factor). */
export function rivalDemand(s: GameState, crewId: string, ev: Pick<RivalEvent, 'spotId' | 'startsAt'>): number {
  const crew = s.rivals.crews[crewId];
  const fame = s.spots.spots[ev.spotId]?.fame ?? 0;
  const weekday = gameTimeAt(s.clock, ev.startsAt).weekday;
  let base = (25 + crew.rep * 0.55 + crew.members * 8 + fame * 2) * dayFactor(weekday) * (1 + modifierValue(s, 'demand'));
  // The player's parties in the same night take their share.
  const clashes = s.rivals.coop?.crewId === crewId ? 0 : playerEventsInNight(s, ev.startsAt).length;
  if (clashes > 0) {
    const player = Math.max(10, s.progression.reputation);
    base *= 1 - 0.35 * (player / (player + crew.rep + 50));
  }
  return base;
}

function cancelRivalEvent(d: GameState, ev: RivalEvent, note: string): void {
  ev.status = 'cancelled';
  ev.note = note;
  const def = rivalDef(ev.crewId);
  addNews(d, `${def.name}: Party ${d.spots.spots[ev.spotId]?.known ? `im ${spotDef(ev.spotId).name}` : ''} fällt aus – ${note}`, 'warning', { crewId: def.id, spotId: ev.spotId });
}

/** The night of a rival party: crowd, mood, money, mistakes, police. */
export function resolveRivalEvent(d: GameState, ev: RivalEvent): void {
  const def = rivalDef(ev.crewId);
  const crew = d.rivals.crews[ev.crewId];
  const st = d.spots.spots[ev.spotId];
  if (!crew.active) {
    cancelRivalEvent(d, ev, 'die Crew gibt es gerade nicht mehr.');
    return;
  }
  if (!st || st.status === 'closed') {
    cancelRivalEvent(d, ev, 'der Spot war abgesperrt.');
    crew.rep = Math.max(0, crew.rep - 2);
    return;
  }
  const spot = spotDef(ev.spotId);
  const stats = effectiveStats(d, ev.spotId);
  const demand = Math.round(rivalDemand(d, def.id, ev) * randRange(d, 0.75, 1.25));
  let visitors = Math.min(demand, stats.capacity);
  let mood = crew.quality * 0.6 + stats.atmosphere * 0.3 + randRange(d, -8, 12);
  if (visitors > crew.reach * 1.2) mood -= 15;
  const notes: string[] = [];
  if (chance(d, def.sloppiness / 400)) {
    mood -= 20;
    notes.push('Technik-Ausfall');
    crew.reach = Math.max(60, Math.round(crew.reach * 0.92));
  }
  if (chance(d, def.sloppiness / 700) && crew.members > 2) {
    crew.members--;
    notes.push('Streit in der Crew – jemand ist ausgestiegen');
  }
  let raided = false;
  if (chance(d, rivalPoliceRisk(d, ev, visitors))) {
    raided = true;
    visitors = Math.round(visitors * randRange(d, 0.4, 0.7));
    mood -= 20;
    const fine = Math.round(randInt(d, 200, 700) * Math.min(4, Math.max(1, visitors / 120)));
    crew.money -= fine;
    st.status = 'closed';
    st.closedUntilDay = gameDayAt(d.clock, d.clock.now) + randInt(d, 4, 10);
    st.fame = Math.min(100, st.fame + 20);
    notes.push('Polizei hat aufgelöst');
    if (st.known) {
      notify(d, {
        tone: 'warning',
        title: `Razzia im ${spot.name}`,
        text: `Bei ${def.name} war die Polizei. Der Spot ist erst mal abgesperrt.`,
        link: `/karte/spot/${spot.id}`,
      });
    }
  }
  mood = Math.max(5, Math.min(100, Math.round(mood)));
  const costs = spot.rent + 120 + crew.members * 15;
  crew.money += Math.round(visitors * 6.5 - costs);
  const repGain = Math.round(1.2 * Math.sqrt(visitors) * (0.4 + mood / 100)) - (raided ? 4 : 0);
  crew.rep = Math.max(0, crew.rep + repGain);
  crew.eventsHeld++;
  crew.bestVisitors = Math.max(crew.bestVisitors, visitors);
  st.fame = Math.min(100, st.fame + Math.min(25, visitors / 25));
  st.condition = Math.max(10, st.condition - visitors / 250);

  // Same night as one of your parties: they don't like that.
  if (playerEventsInNight(d, ev.startsAt).length > 0 && d.rivals.coop?.crewId !== def.id) adjustRivalRelation(d, def.id, -def.aggression / 12);

  ev.status = 'done';
  ev.visitors = visitors;
  ev.mood = mood;
  ev.raided = raided;
  ev.note = notes.join(' · ') || undefined;
  const where = spotLabel(d, ev.spotId);
  addNews(d, `${def.name} ${where === 'einem geheimen Ort' ? 'an einem geheimen Ort' : `im ${where}`}: ${fmtNumber(visitors)} Gäste, Stimmung ${mood}${notes.length ? ` – ${notes.join(', ')}` : ''}.`, raided ? 'warning' : 'info', {
    crewId: def.id,
    spotId: ev.spotId,
  });

  if (ev.guest) guestSetRewards(d, def, visitors, mood);
}

function guestSetRewards(d: GameState, def: RivalCrewDef, visitors: number, mood: number): void {
  const fee = Math.round(40 + visitors * 0.4);
  const rep = Math.max(1, Math.round(Math.sqrt(visitors) * 0.6 * (0.5 + mood / 100)));
  earn(d, fee, 'music', `Gastset bei ${def.name}`);
  addRep(d, rep);
  addXp(d, 'produktion', 25);
  addXp(d, 'netzwerk', 15);
  adjustRivalRelation(d, def.id, 6);
  incStat(d, 'guestSets');
  notify(d, {
    tone: 'success',
    title: `Dein Set bei ${def.name}`,
    text: `${fmtNumber(visitors)} Leute · +${rep} Reputation · Gage ${fee} €`,
    link: `/szene/crew/${def.id}`,
  });
}

// ── Crew decisions ─────────────────────────────────────

function pickNight(d: GameState, def: RivalCrewDef): number | null {
  const today = gameDayAt(d.clock, d.clock.now);
  const hostile = def.aggression >= 50 && d.rivals.crews[def.id].relation < -20;
  const options: { startsAt: number; w: number }[] = [];
  for (let day = today + 1; day <= today + 5; day++) {
    const startsAt = dayStartAt(d.clock, day) + 22 * GAME_HOUR_MS;
    const weekday = gameTimeAt(d.clock, startsAt).weekday;
    let w = dayFactor(weekday);
    // A hostile crew sets its party against yours on purpose.
    if (hostile && playerEventsInNight(d, startsAt).length > 0) w *= 4;
    if (d.rivals.events.some((e) => e.status === 'scheduled' && e.crewId === def.id && sameNight(e.startsAt, startsAt))) continue;
    options.push({ startsAt, w });
  }
  return pickWeighted(d, options, (o) => o.w)?.startsAt ?? null;
}

function pickSpot(d: GameState, def: RivalCrewDef, startsAt: number): string | null {
  const crew = d.rivals.crews[def.id];
  const expected = rivalDemand(d, def.id, { spotId: crew.knownSpots[0] ?? '', startsAt });
  const options = crew.knownSpots.filter((id) => {
    const st = d.spots.spots[id];
    if (!st || st.status === 'closed') return false;
    if (d.events.list.some((e) => (e.status === 'scheduled' || e.status === 'running') && e.spotId === id && sameNight(e.startsAt, startsAt))) return false;
    return !rivalEventOnSpot(d, id, startsAt);
  });
  return (
    pickWeighted(d, options, (id) => {
      const stats = effectiveStats(d, id);
      const fit = Math.min(stats.capacity, expected) / Math.max(stats.capacity, expected);
      return 0.2 + fit * (stats.atmosphere / 100);
    }) ?? null
  );
}

function planParty(d: GameState, def: RivalCrewDef): boolean {
  const crew = d.rivals.crews[def.id];
  const startsAt = pickNight(d, def);
  if (startsAt === null) return false;
  const spotId = pickSpot(d, def, startsAt);
  if (!spotId) return false;
  const ev: RivalEvent = {
    id: `r${d.rivals.nextId++}`,
    crewId: def.id,
    spotId,
    startsAt,
    durationH: pickWeighted(d, [6, 8, 10], (h) => (h === 8 ? 3 : 1)) ?? 8,
    status: 'scheduled',
  };
  if (crew.pendingGuest) {
    ev.guest = true;
    delete crew.pendingGuest;
  }
  d.rivals.events.push(ev);
  const info = gameTimeAt(d.clock, startsAt);
  addNews(d, `${def.name} ${crewVerb(def, 'kündigen', 'kündigt')} eine Party an: ${info.weekdayName} ${spotLabel(d, spotId) === 'einem geheimen Ort' ? 'an einem geheimen Ort' : `im ${spotLabel(d, spotId)}`}.`, 'discovery', {
    crewId: def.id,
    spotId,
  });
  if (playerEventsInNight(d, startsAt).length > 0 && d.rivals.coop?.crewId !== def.id) {
    notify(d, { tone: 'warning', title: `Konkurrenz: ${def.name}`, text: `${def.name} ${crewVerb(def, 'feiern', 'feiert')} in derselben Nacht wie du. Das kostet Gäste.`, link: '/szene' });
  }
  return true;
}

function exploreSpot(d: GameState, def: RivalCrewDef): boolean {
  const crew = d.rivals.crews[def.id];
  const pool = SPOTS.filter((sp) => sp.cityId === def.cityId && !crew.knownSpots.includes(sp.id));
  const found = pickWeighted(d, pool, (sp) => 5 + (d.spots.spots[sp.id]?.fame ?? 0));
  if (!found) return false;
  crew.knownSpots.push(found.id);
  const st = d.spots.spots[found.id];
  if (st?.known) {
    const yours = d.events.list.some((e) => e.spotId === found.id && e.status === 'done');
    addNews(d, `${def.name} ${crewVerb(def, 'haben', 'hat')} den Spot ${found.name} entdeckt.`, yours ? 'warning' : 'info', { crewId: def.id, spotId: found.id });
    if (yours) notify(d, { tone: 'warning', title: `${def.name} kennen jetzt ${found.name}`, text: 'Dein Spot ist nicht mehr nur deiner.', link: `/karte/spot/${found.id}` });
  }
  return true;
}

function upgrade(d: GameState, def: RivalCrewDef): boolean {
  const crew = d.rivals.crews[def.id];
  if (crew.money < 900) return false;
  // More boxes only when the crowd outgrows the system.
  if (crew.bestVisitors > crew.reach * 0.9 && rand(d) < 0.7) {
    const add = randInt(d, 40, 120);
    crew.money -= add * 14;
    crew.reach += add;
    addNews(d, `${def.name} ${crewVerb(def, 'haben', 'hat')} aufgerüstet – die Anlage schafft jetzt ${fmtNumber(crew.reach)} Leute.`, 'info', { crewId: def.id });
  } else {
    // Better gear gets expensive near the top.
    const cost = 300 + crew.quality * 12;
    if (crew.money < cost) return false;
    crew.money -= cost;
    crew.quality = Math.min(95, crew.quality + (crew.quality < 70 ? randInt(d, 1, 3) : 1));
  }
  return true;
}

function recruit(d: GameState, def: RivalCrewDef): boolean {
  const crew = d.rivals.crews[def.id];
  if (crew.money < 250 || crew.members >= 4 + crew.rep / 150) return false;
  crew.money -= 150;
  crew.members++;
  return true;
}

/** Messages to the player: cooperation, booking, spot tips – or hostility. */
export function contactPlayer(d: GameState, def: RivalCrewDef): boolean {
  const crew = d.rivals.crews[def.id];
  if (d.progression.reputation < 40) return false;
  if (crew.lastContactAt !== undefined && d.clock.now - crew.lastContactAt < 4 * GAME_DAY_MS) return false;
  // At most one crew message per game day overall.
  const lastAny = Math.max(...Object.values(d.rivals.crews).map((c) => c.lastContactAt ?? Number.NEGATIVE_INFINITY));
  if (d.clock.now - lastAny < GAME_DAY_MS) return false;
  if (d.messages.list.some((m) => m.open && m.from === def.leaderId)) return false;
  const hostile = def.aggression >= 50 && crew.relation <= 10 && d.progression.reputation >= crew.rep * 0.15;
  const friendly = def.cooperation >= 50 && crew.relation >= -5;
  const kinds = [...(hostile ? ['hostile'] : []), ...(friendly ? ['coop', 'booking', 'tip'] : [])];
  if (kinds.length === 0) return false;
  const pool = MESSAGE_TEMPLATES.filter((t) => t.rival && kinds.includes(t.rival) && checkAll(d, resolveConditionsRival(t.when, def.id)));
  const t = pickWeighted(d, pool, (x) => Math.max(1, x.weight));
  if (!t) return false;
  meetPerson(d, def.leaderId, 'rival', { trust: 10, silent: true });
  deliverTemplate(d, t.id, def.leaderId, { online: true });
  crew.lastContactAt = d.clock.now;
  return true;
}

/** One decision of a crew: plan, explore, buy, recruit or reach out. */
export function crewAct(d: GameState, def: RivalCrewDef, online: boolean): void {
  const crew = d.rivals.crews[def.id];
  const hasPlan = d.rivals.events.some((e) => e.status === 'scheduled' && e.crewId === def.id);
  const options: { kind: string; w: number }[] = [];
  if (!hasPlan && crew.money >= 80) options.push({ kind: 'plan', w: 2 + def.ambition / 25 });
  options.push({ kind: 'explore', w: 0.12 });
  if (crew.money > 900) options.push({ kind: 'upgrade', w: 0.2 + def.ambition / 200 });
  options.push({ kind: 'recruit', w: 0.3 });
  if (online) options.push({ kind: 'contact', w: 1.2 });
  const picked = pickWeighted(d, options, (o) => o.w);
  if (!picked) return;
  if (picked.kind === 'plan') planParty(d, def);
  else if (picked.kind === 'explore') exploreSpot(d, def);
  else if (picked.kind === 'upgrade') upgrade(d, def);
  else if (picked.kind === 'recruit') recruit(d, def);
  else if (picked.kind === 'contact') contactPlayer(d, def);
}

/** Real ms until the crew's next decision (a few per game day). */
export function nextActionGap(d: GameState, def: RivalCrewDef): number {
  return randRange(d, 4, 12) * 60_000 * (1.5 - def.ambition / 100);
}

/** New crews appear once their conditions hold. */
export function checkAppearances(d: GameState): void {
  for (const def of RIVAL_CREWS) {
    const st = d.rivals.crews[def.id];
    if (!st || st.active || st.dissolved || st.appearedAt !== undefined) continue;
    if (!checkAll(d, def.appears)) continue;
    st.active = true;
    st.appearedAt = d.clock.now;
    st.nextActionAt = d.clock.now + 5 * 60_000;
    addNews(d, `Neue Crew in der Stadt: ${def.name}. ${def.description}`, 'discovery', { crewId: def.id });
    notify(d, { tone: 'discovery', title: `Neue Crew: ${def.name}`, text: def.description, link: `/szene/crew/${def.id}` });
  }
}

/** Upkeep, slow fading, going broke and comebacks. */
export function crewNewDay(d: GameState, day: number): void {
  for (const def of RIVAL_CREWS) {
    const crew = d.rivals.crews[def.id];
    if (!crew) continue;
    if (crew.dissolved) {
      if (crew.appearedAt !== undefined && day - gameDayAt(d.clock, crew.appearedAt) >= 12) {
        crew.dissolved = false;
        crew.active = true;
        crew.appearedAt = d.clock.now;
        crew.money = 500;
        crew.brokeDays = 0;
        crew.members = Math.max(2, Math.round(crew.members / 2));
        crew.nextActionAt = d.clock.now + 10 * 60_000;
        addNews(d, `${def.name} ${crewVerb(def, 'sind', 'ist')} zurück – kleiner, aber mit neuer Energie.`, 'discovery', { crewId: def.id });
      }
      continue;
    }
    if (!crew.active) continue;
    crew.money -= 10 + crew.members * 8;
    crew.rep = Math.max(0, crew.rep * 0.997);
    if (crew.money < 0) crew.brokeDays++;
    else crew.brokeDays = 0;
    if (crew.brokeDays === 3) {
      crew.reach = Math.max(60, Math.round(crew.reach * 0.8));
      crew.money += 400;
      addNews(d, `${def.name} ${crewVerb(def, 'mussten', 'musste')} Boxen verkaufen – das Geld war alle.`, 'warning', { crewId: def.id });
    }
    if (crew.brokeDays >= 7) {
      crew.active = false;
      crew.dissolved = true;
      crew.appearedAt = d.clock.now;
      crew.rep = Math.round(crew.rep * 0.6);
      for (const e of d.rivals.events) if (e.crewId === def.id && e.status === 'scheduled') e.status = 'cancelled';
      addNews(d, `${def.name} ${crewVerb(def, 'haben', 'hat')} sich aufgelöst. Schulden, Streit, zu viel auf einmal.`, 'danger', { crewId: def.id });
    }
  }
  // Keep the event list short.
  const settled = d.rivals.events.filter((e) => e.status !== 'scheduled');
  if (settled.length > EVENT_KEEP) {
    const drop = new Set(settled.slice(0, settled.length - EVENT_KEEP).map((e) => e.id));
    d.rivals.events = d.rivals.events.filter((e) => !drop.has(e.id));
  }
}

export function coopReason(s: GameState, crewId: string): Reason {
  const def = RIVALS_BY_ID.get(crewId);
  const crew = s.rivals.crews[crewId];
  if (!def || !crew?.active) return 'Diese Crew ist gerade nicht aktiv.';
  if (s.rivals.coop && s.rivals.coop.until > s.clock.now) return 'Es läuft schon eine Kooperation.';
  if (def.cooperation < 35) return `${def.name} ${crewVerb(def, 'machen', 'macht')} nichts gemeinsam mit anderen.`;
  if (s.progression.reputation < 100) return 'Dafür kennt man dich noch zu wenig (Reputation 100).';
  if (crew.relation < 20) return `Euer Verhältnis ist zu schlecht (${rivalRelationLabel(crew.relation)}).`;
  if (crew.lastContactAt !== undefined && s.clock.now - crew.lastContactAt < GAME_DAY_MS) return 'Ihr habt gerade erst miteinander geredet.';
  return null;
}
