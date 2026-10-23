import type { GameState } from '../../state';
import type { Reason } from '../../core/types';
import type { PersonDef } from '../../content/types';
import { PEOPLE } from '../../content/people';
import { ITEMS, spotDef, SPOTS_BY_ID } from '../../content/registry';
import { EVENT_FORMATS, EVENT_TASKS, HELPER_COST, AWARENESS_COST, MEDICS_COST, MIN_LEAD_MIN, PA_RENTALS, PROMO_CHANNELS, eventFormat } from '../../content/events';
import { RENTAL_OPTIONS } from '../../content/vehicles';
import { checkAll, requirementReason } from '../../core/conditions';
import { GAME_DAY_MS, GAME_HOUR_MS, MINUTE, dayStartAt, gameDayAt, gameTimeAt } from '../../core/time';
import { fmtMoney } from '../../core/format';
import { moneyReason } from '../finance/logic';
import { findSystem, systemStats } from '../sound/logic';
import { transportCapacity } from '../transport/logic';
import { hasBooker, isCrewMember } from '../crew/logic';
import { knowsPerson, shortName } from '../people/logic';
import { daysSinceCheck } from '../spots/logic';
import { doneTracks } from '../music/logic';
import { isUnlocked, skillLevel } from '../progression/logic';
import { needsUnlock } from '../progression/tree';
import { countTag } from '../inventory/logic';
import { stockLoad, totalPieces } from '../merch/logic';
import { rivalEventOnSpot } from '../rivals/logic';
import { RIVALS_BY_ID } from '../../content/registry';
import { crewVerb } from '../../content/rivals';
import type { EventPlanInput, GameEvent } from './state';

export const DJ_ROLES = ['dj', 'producer', 'artist'];
export const DURATIONS = [4, 6, 8, 10, 12];
export const ENTRY_OPTIONS = [0, 5, 8, 10, 15, 20, 30];

export interface NightOption {
  startsAt: number;
  day: number;
  label: string;
  weekday: number;
}

/** The next seven nights (22:00) that are still far enough away. */
export function upcomingNights(s: GameState): NightOption[] {
  const today = gameDayAt(s.clock, s.clock.now);
  const out: NightOption[] = [];
  for (let day = today; day < today + 8 && out.length < 7; day++) {
    const startsAt = dayStartAt(s.clock, day) + 22 * GAME_HOUR_MS;
    if (startsAt - s.clock.now < MIN_LEAD_MIN * MINUTE) continue;
    const info = gameTimeAt(s.clock, startsAt);
    const label = day === today ? 'Heute Nacht' : day === today + 1 ? `Morgen (${info.weekdayShort})` : `${info.weekdayName}`;
    out.push({ startsAt, day, label, weekday: info.weekday });
  }
  return out;
}

export function dayFactor(weekday: number): number {
  if (weekday === 4 || weekday === 5) return 1.4;
  if (weekday === 3) return 0.85;
  if (weekday === 6) return 0.75;
  return 0.6;
}

export function maxLineup(durationH: number): number {
  return Math.max(1, Math.min(8, Math.floor(durationH / 2)));
}

/** People who fit in over the whole event (formats with turnover fit more). */
export function eventCapacity(capacity: number, plan: Pick<EventPlanInput, 'format'>): number {
  return Math.round(capacity * eventFormat(plan.format).turnover);
}

export function formatReason(s: GameState, plan: Pick<EventPlanInput, 'format' | 'spotId'>): Reason {
  const f = eventFormat(plan.format);
  const locked = needsUnlock(s, f.unlock);
  if (locked) return locked;
  const spot = SPOTS_BY_ID.get(plan.spotId);
  if (!spot) return null;
  if (f.minWeather !== undefined && spot.stats.weather < f.minWeather) return `${f.label} geht nur draußen – ${spot.name} ist ein Innenraum.`;
  if (f.minCapacity !== undefined && spot.stats.capacity < f.minCapacity) return `Für ein ${f.label} ist ${spot.name} zu klein (mind. ${f.minCapacity} Leute).`;
  return null;
}

export function canPlaySelf(s: GameState): boolean {
  return doneTracks(s).length > 0 || skillLevel(s, 'produktion') >= 2;
}

/** Why you can't play a live set (null = you can). */
export function liveReason(s: GameState): Reason {
  const locked = needsUnlock(s, 'u.liveact');
  if (locked) return locked;
  if (doneTracks(s).length < 3) return 'Für ein Live-Set brauchst du mindestens drei eigene Tracks.';
  if (countTag(s, 'synth') + countTag(s, 'drums') === 0) return 'Ohne Synth oder Drum-Machine kein Live-Set.';
  return null;
}

/** Line-up slots that are real people (not you, your live set or a stand-in). */
export function isPersonSlot(id: string): boolean {
  return PEOPLE.some((p) => p.id === id);
}

export function repNeededFor(p: PersonDef, s?: GameState): number {
  const base = Math.max(0, (p.stats.bekanntheit - 40) * 5);
  return s && hasBooker(s) ? Math.round(base * 0.6) : base;
}

export function sameNight(a: number, b: number): boolean {
  return Math.abs(a - b) < GAME_DAY_MS / 2;
}

export function performerReason(s: GameState, id: string, startsAt: number, ignoreEvent?: string): Reason {
  if (id === 'self') return canPlaySelf(s) ? null : 'Du brauchst eigene Tracks oder Produktion Lv. 2 für ein eigenes Set.';
  if (id === 'live') return liveReason(s);
  const p = PEOPLE.find((x) => x.id === id);
  if (!p || !knowsPerson(s, id)) return 'Unbekannt.';
  if (!p.roles.some((r) => DJ_ROLES.includes(r))) return `${shortName(p)} legt nicht auf.`;
  if (!isCrewMember(s, id) && s.people.people[id].trust < 20) return `${shortName(p)} kennt dich zu wenig (Vertrauen 20).`;
  if (s.progression.reputation < repNeededFor(p, s)) return `${shortName(p)} spielt erst ab Reputation ${repNeededFor(p, s)}.`;
  if (s.events.list.some((e) => e.id !== ignoreEvent && (e.status === 'scheduled' || e.status === 'running') && e.lineup.includes(id) && sameNight(e.startsAt, startsAt))) {
    return `${shortName(p)} spielt in der Nacht schon woanders.`;
  }
  return null;
}

export function performerFee(s: GameState, id: string): number {
  if (id === 'self' || isCrewMember(s, id)) return 0;
  const price = PEOPLE.find((p) => p.id === id)?.price ?? 0;
  return hasBooker(s) ? Math.round(price * 0.85) : price;
}

export function lineupCandidates(s: GameState): string[] {
  const out: string[] = [];
  if (canPlaySelf(s)) out.push('self');
  if (isUnlocked(s, 'u.liveact')) out.push('live');
  for (const p of PEOPLE) if (knowsPerson(s, p.id) && p.roles.some((r) => DJ_ROLES.includes(r))) out.push(p.id);
  return out;
}

export interface SoundSummary {
  reach: number;
  quality: number;
  reliability: number;
  powerKw: number;
  generatorKw: number;
  volumeL: number;
  weightKg: number;
  lightFx: number;
  rentalCost: number;
}

export function soundSummary(s: GameState, plan: Pick<EventPlanInput, 'sound' | 'spotId'>): SoundSummary | null {
  if (plan.sound.kind === 'own') {
    const sys = findSystem(s, plan.sound.systemId);
    if (!sys) return null;
    const st = systemStats(s, sys);
    return { reach: st.reach, quality: st.quality, reliability: st.reliability, powerKw: st.powerKw, generatorKw: st.generatorKw, volumeL: st.volumeL, weightKg: st.weightKg, lightFx: st.lightFx, rentalCost: 0 };
  }
  const opt = PA_RENTALS.find((o) => o.id === (plan.sound as { optionId: string }).optionId);
  if (!opt) return null;
  const spot = SPOTS_BY_ID.get(plan.spotId);
  // Rental companies bring a generator when the spot has too little power.
  const needsGen = !spot || spot.stats.powerKw < opt.powerKw;
  return {
    reach: opt.reach,
    quality: opt.quality,
    reliability: opt.reliability,
    powerKw: opt.powerKw,
    generatorKw: needsGen ? opt.powerKw : 0,
    volumeL: 0,
    weightKg: 0,
    lightFx: 0,
    rentalCost: opt.cost + (needsGen ? Math.round(opt.cost * 0.35) : 0),
  };
}

/** Goods the plan brings along (all stock of each priced good). */
export function goodsLoad(s: GameState, plan: Pick<EventPlanInput, 'prices'>): { volumeL: number; weightKg: number; servings: Record<string, number> } {
  let volumeL = 0;
  let weightKg = 0;
  const servings: Record<string, number> = {};
  for (const defId of Object.keys(plan.prices)) {
    const def = ITEMS.get(defId);
    if (!def) continue;
    const qty = Object.values(s.inventory.items).filter((it) => it.defId === defId && !it.locked).reduce((sum, it) => sum + it.qty, 0);
    volumeL += def.volumeL * qty;
    weightKg += def.weightKg * qty;
    servings[def.type] = (servings[def.type] ?? 0) + qty * (def.stats?.servings ?? 0);
  }
  return { volumeL, weightKg, servings };
}

/** Cheapest rental van that fits the load (or null). */
export function vanFor(s: GameState, volumeL: number, weightKg: number): (typeof RENTAL_OPTIONS)[number] | null {
  for (const o of RENTAL_OPTIONS) {
    const def = ITEMS.get(o.defId);
    if (!def) continue;
    if ((def.stats?.capacityL ?? 0) >= volumeL && (def.stats?.maxLoadKg ?? 0) >= weightKg && checkAll(s, o.requires)) return o;
  }
  return null;
}

export interface CostLineItem {
  label: string;
  amount: number;
}

/** Costs paid when the event is planned. */
export function upfrontCosts(s: GameState, plan: EventPlanInput): CostLineItem[] {
  const out: CostLineItem[] = [];
  const spot = SPOTS_BY_ID.get(plan.spotId);
  if (spot && spot.rent > 0) out.push({ label: 'Miete Spot', amount: spot.rent });
  const fmt = eventFormat(plan.format);
  if (fmt.orgCost > 0) out.push({ label: `Infrastruktur ${fmt.label}`, amount: fmt.orgCost });
  const sound = soundSummary(s, plan);
  if (sound && sound.rentalCost > 0) out.push({ label: 'Verleih-PA', amount: sound.rentalCost });
  for (const id of plan.promo) {
    const ch = PROMO_CHANNELS.find((c) => c.id === id);
    if (ch && ch.cost > 0) out.push({ label: `Werbung: ${ch.label}`, amount: ch.cost });
  }
  if (plan.transport === 'rent') {
    const load = transportLoad(s, plan);
    if (load.volumeL > 0) {
      const van = vanFor(s, load.volumeL, load.weightKg);
      if (van) out.push({ label: van.label, amount: van.perDay });
    }
  }
  if (plan.helpers > 0) out.push({ label: `Helfer ×${plan.helpers}`, amount: plan.helpers * HELPER_COST });
  if (plan.awareness) out.push({ label: 'Awareness-Team', amount: AWARENESS_COST });
  if (plan.medics) out.push({ label: 'Sanitäter', amount: MEDICS_COST });
  return out;
}

export function transportLoad(s: GameState, plan: EventPlanInput): { volumeL: number; weightKg: number } {
  const goods = goodsLoad(s, plan);
  const sound = soundSummary(s, plan);
  const merch = plan.merch ? stockLoad(s) : { volumeL: 0, weightKg: 0 };
  return { volumeL: goods.volumeL + (sound?.volumeL ?? 0) + merch.volumeL, weightKg: goods.weightKg + (sound?.weightKg ?? 0) + merch.weightKg };
}

export function eventTasksFor(s: GameState, plan: EventPlanInput): Record<string, 'open' | 'done'> {
  const tasks: Record<string, 'open' | 'done'> = {};
  tasks['task.check'] = daysSinceCheck(s, plan.spotId) <= 7 ? 'done' : 'open';
  if (plan.promo.includes('promo.flyer')) tasks['task.flyer'] = 'open';
  if (plan.lineup.some((id) => isPersonSlot(id) && !isCrewMember(s, id))) tasks['task.lineup'] = 'open';
  return tasks;
}

export function taskDef(id: string) {
  return EVENT_TASKS.find((t) => t.id === id)!;
}

export function planReason(s: GameState, plan: EventPlanInput): Reason {
  const name = plan.name.trim();
  if (name.length < 2 || name.length > 40) return 'Gib dem Event einen Namen (2–40 Zeichen).';
  const spot = SPOTS_BY_ID.get(plan.spotId);
  const st = s.spots.spots[plan.spotId];
  if (!spot || !st?.known) return 'Wähle einen bekannten Spot.';
  if (st.status === 'closed') return `${spot.name} ist gerade abgesperrt.`;
  if (spot.cityId !== s.map.cityId) return 'Der Spot liegt nicht in deiner Stadt.';
  if (!upcomingNights(s).some((n) => n.startsAt === plan.startsAt)) return 'Wähle eine der nächsten Nächte.';
  if (s.events.list.some((e) => (e.status === 'scheduled' || e.status === 'running') && sameNight(e.startsAt, plan.startsAt))) return 'In dieser Nacht läuft schon ein Event von dir.';
  const taken = rivalEventOnSpot(s, plan.spotId, plan.startsAt);
  if (taken) {
    const crew = RIVALS_BY_ID.get(taken.crewId);
    return `In dieser Nacht ${crewVerb(crew, 'feiern', 'feiert')} dort schon ${crew?.name ?? 'eine andere Crew'}.`;
  }
  if (!EVENT_FORMATS.some((f) => f.id === (plan.format ?? 'party'))) return 'Unbekanntes Format.';
  const fmt = formatReason(s, plan);
  if (fmt) return fmt;
  if (!eventFormat(plan.format).durations.includes(plan.durationH)) return 'Ungültige Dauer.';
  if (!ENTRY_OPTIONS.includes(plan.entry)) return 'Ungültiger Eintritt.';
  if (plan.lineup.length === 0) return 'Ohne Line-up keine Party – wähle mindestens einen DJ.';
  if (plan.lineup.length > maxLineup(plan.durationH)) return `Für ${plan.durationH} Stunden passen höchstens ${maxLineup(plan.durationH)} Sets.`;
  if (new Set(plan.lineup).size !== plan.lineup.length) return 'Jede Person nur einmal im Line-up.';
  if (plan.lineup.includes('self') && plan.lineup.includes('live')) return 'DJ-Set oder Live-Set – beides gleichzeitig schaffst du nicht.';
  for (const id of plan.lineup) {
    const r = performerReason(s, id, plan.startsAt);
    if (r) return r;
  }
  if (plan.sound.kind === 'rental') {
    const opt = PA_RENTALS.find((o) => o.id === (plan.sound as { optionId: string }).optionId);
    if (!opt) return 'Unbekannte Verleih-PA.';
    const r = requirementReason(s, opt.requires);
    if (r) return r;
  } else {
    const sys = findSystem(s, plan.sound.systemId);
    if (!sys) return 'Soundsystem nicht gefunden.';
    if (systemStats(s, sys).reach <= 0) return `„${sys.name}“ macht noch keinen Ton – Boxen fehlen.`;
    const rental = s.activities.running.find((a) => a.kind === 'system-rental' && a.payload.systemId === sys.id);
    if (rental && rental.endsAt > plan.startsAt) return `„${sys.name}“ ist in der Nacht vermietet.`;
    if (s.events.list.some((e) => (e.status === 'scheduled' || e.status === 'running') && e.sound.kind === 'own' && e.sound.systemId === sys.id && sameNight(e.startsAt, plan.startsAt))) {
      return 'Das System ist in der Nacht schon verplant.';
    }
  }
  for (const id of plan.promo) {
    const ch = PROMO_CHANNELS.find((c) => c.id === id);
    if (!ch) return 'Unbekannter Werbekanal.';
    const r = requirementReason(s, ch.requires);
    if (r) return `${ch.label}: ${r}`;
  }
  for (const [defId, price] of Object.entries(plan.prices)) {
    if (ITEMS.get(defId)?.category !== 'goods') return 'Ungültige Ware.';
    if (!(price >= 0 && price <= 20)) return 'Preise zwischen 0 und 20 €.';
  }
  if (plan.helpers < 0 || plan.helpers > 20) return 'Höchstens 20 Helfer.';
  if (plan.merch && totalPieces(s) === 0) return 'Für einen Merch-Stand fehlt Ware – erst produzieren lassen.';
  const load = transportLoad(s, plan);
  if (load.volumeL > 0) {
    if (plan.transport === 'own') {
      const cap = transportCapacity(s);
      if (load.volumeL > cap.volumeL || load.weightKg > cap.weightKg) {
        return cap.count === 0
          ? `Zu viel zum Tragen (${Math.round(load.volumeL)} L / ${Math.round(load.weightKg)} kg) – Transport mieten oder Fahrzeug kaufen.`
          : `Passt nicht in deine Fahrzeuge (${Math.round(load.volumeL)} L / ${Math.round(load.weightKg)} kg).`;
      }
    } else if (!vanFor(s, load.volumeL, load.weightKg)) {
      return 'Kein Mietwagen ist groß genug (oder dir fehlt die Organisation für den 7,5-Tonner).';
    }
  }
  const total = upfrontCosts(s, plan).reduce((sum, c) => sum + c.amount, 0);
  const money = moneyReason(s, total);
  if (money) return `Vorkosten ${fmtMoney(total)}: ${money}`;
  return null;
}

export function findEvent(s: GameState, id: string): GameEvent | undefined {
  return s.events.list.find((e) => e.id === id);
}

export function upcomingEvents(s: GameState): GameEvent[] {
  return s.events.list.filter((e) => e.status === 'scheduled' || e.status === 'running').sort((a, b) => a.startsAt - b.startsAt);
}

export function spotName(id: string): string {
  return spotDef(id).name;
}
