import type { GameState } from '../../state';
import type { Condition, Effect, ModifierKind, Reason } from '../../core/types';
import type { HappeningDef, HappeningTarget } from '../../content/types';
import { HAPPENINGS } from '../../content/happenings';
import { ITEMS, PERSONS_BY_ID, SPOTS_BY_ID } from '../../content/registry';
import { SPOTS } from '../../content/spots';
import { checkAll, requirementReason } from '../../core/conditions';
import { applyEffects } from '../../core/effects';
import { notify } from '../../core/notify';
import { pick, pickWeighted, rand } from '../../core/rng';
import { GAME_DAY_MS, HOUR, MINUTE } from '../../core/time';
import { skillLevel, incStat } from '../progression/logic';
import { isCrewMember } from '../crew/logic';
import { shortName } from '../people/logic';
import type { HappeningLog, OpenHappening } from './state';

export const LOG_LIMIT = 60;
const MAX_OPEN = 3;

export const HAPPENINGS_BY_ID: ReadonlyMap<string, HappeningDef> = new Map(HAPPENINGS.map((h) => [h.id, h]));

export function happeningDef(id: string): HappeningDef {
  const h = HAPPENINGS_BY_ID.get(id);
  if (!h) throw new Error(`Unknown happening: ${id}`);
  return h;
}

// ── Modifiers ──────────────────────────────────────────

export function activeModifiers(s: GameState) {
  return s.happenings.modifiers.filter((m) => m.until > s.clock.now);
}

/** Sum of active modifiers of one kind (e.g. 0.2 = +20 %). */
export function modifierValue(s: GameState, kind: ModifierKind): number {
  let v = 0;
  for (const m of s.happenings.modifiers) if (m.kind === kind && m.until > s.clock.now) v += m.value;
  return Math.max(-0.9, v);
}

export function addModifier(d: GameState, kind: ModifierKind, value: number, hours: number, label: string): void {
  d.happenings.modifiers = d.happenings.modifiers.filter((m) => m.until > d.clock.now);
  d.happenings.modifiers.push({ id: `mod${d.happenings.nextId++}`, kind, value, until: d.clock.now + hours * MINUTE, label });
}

// ── Targets ────────────────────────────────────────────

function nextPlayerEvent(s: GameState) {
  return s.events.list
    .filter((e) => e.status === 'scheduled' && e.startsAt - s.clock.now > 30 * MINUTE)
    .sort((a, b) => a.startsAt - b.startsAt)[0];
}

/** Picks what a happening is about. Null = it can't happen right now. */
export function pickTarget(d: GameState, target: HappeningTarget | undefined): Record<string, string> | null {
  if (!target) return {};
  switch (target) {
    case 'gear':
    case 'soundGear': {
      const cats = target === 'gear' ? ['music', 'sound', 'light', 'power', 'gadget'] : ['sound', 'light', 'power'];
      const pool = Object.values(d.inventory.items).filter((it) => {
        const def = ITEMS.get(it.defId);
        return def && cats.includes(def.category) && !it.locked && !it.broken && it.condition > 20;
      });
      if (pool.length === 0) return null;
      const it = pick(d, pool);
      return { item: it.uid, itemName: ITEMS.get(it.defId)!.name };
    }
    case 'nextEvent': {
      const ev = nextPlayerEvent(d);
      return ev ? { event: ev.id, eventName: ev.name, spot: ev.spotId, spotName: SPOTS_BY_ID.get(ev.spotId)!.name } : null;
    }
    case 'eventDj': {
      const evs = d.events.list.filter((e) => e.status === 'scheduled' && e.startsAt - d.clock.now > 30 * MINUTE);
      const pairs = evs.flatMap((e) => e.lineup.filter((id) => PERSONS_BY_ID.has(id) && !isCrewMember(d, id)).map((id) => ({ e, id })));
      if (pairs.length === 0) return null;
      const p = pick(d, pairs);
      return { event: p.e.id, eventName: p.e.name, person: p.id, personName: shortName(PERSONS_BY_ID.get(p.id)!) };
    }
    case 'unknownSpot': {
      const pool = SPOTS.filter((sp) => sp.cityId === d.map.cityId && !sp.hidden && !d.spots.spots[sp.id]?.known);
      if (pool.length === 0) return null;
      const sp = pickWeighted(d, pool, (x) => 1 + (x.explore === undefined ? 0.5 : 0) + 100 / (50 + x.stats.capacity));
      return sp ? { spot: sp.id, spotName: sp.name } : null;
    }
    case 'knownSpot': {
      const pool = SPOTS.filter((sp) => d.spots.spots[sp.id]?.known && d.spots.spots[sp.id].status === 'open');
      if (pool.length === 0) return null;
      const sp = pick(d, pool);
      return { spot: sp.id, spotName: sp.name };
    }
  }
}

function fill(text: string, ctx: Record<string, string>): string {
  return text
    .replace(/\{item\}/g, ctx.itemName ?? 'Gerät')
    .replace(/\{event\}/g, ctx.eventName ?? 'deine Party')
    .replace(/\{person\}/g, ctx.personName ?? 'Jemand')
    .replace(/\{spot\}/g, ctx.spotName ?? 'Spot');
}

/** Replaces '$item', '$event', '$person', '$spot' with the picked target. */
export function bindTarget<T extends Effect | Condition>(list: readonly T[] | undefined, ctx: Record<string, string>): T[] {
  if (!list) return [];
  let json = JSON.stringify(list);
  for (const key of ['item', 'event', 'person', 'spot']) if (ctx[key]) json = json.split(`"$${key}"`).join(JSON.stringify(ctx[key]));
  return JSON.parse(json) as T[];
}

// ── Rolling and answering ──────────────────────────────

export function happeningEligible(s: GameState, h: HappeningDef): boolean {
  if (h.weight <= 0) return false;
  if (h.once && s.happenings.last[h.id] !== undefined) return false;
  const last = s.happenings.last[h.id];
  if (last !== undefined && h.cooldownDays && s.clock.now - last < h.cooldownDays * GAME_DAY_MS) return false;
  if (s.happenings.open.some((o) => o.defId === h.id)) return false;
  return checkAll(s, h.when);
}

function pushLog(d: GameState, entry: Omit<HappeningLog, 'id'>): void {
  d.happenings.log.push({ id: `hl${d.happenings.nextId++}`, ...entry });
  if (d.happenings.log.length > LOG_LIMIT) d.happenings.log.splice(0, d.happenings.log.length - LOG_LIMIT);
}

/** Lets a specific happening occur now (also used by tests and the debug panel). */
export function fireHappening(d: GameState, h: HappeningDef, ctx: Record<string, string>): OpenHappening | null {
  const title = h.title;
  const text = fill(h.text, ctx);
  d.happenings.last[h.id] = d.clock.now;
  incStat(d, 'happenings');
  applyEffects(d, bindTarget(h.effects, ctx));
  if (h.choices?.length) {
    // A decision about a party has to be made before the party starts.
    const ev = ctx.event ? d.events.list.find((e) => e.id === ctx.event) : undefined;
    let expiresAt = h.expiresHours ? d.clock.now + h.expiresHours * HOUR : undefined;
    if (ev && expiresAt !== undefined) expiresAt = Math.max(d.clock.now + MINUTE, Math.min(expiresAt, ev.startsAt - MINUTE));
    const open: OpenHappening = {
      id: `h${d.happenings.nextId++}`,
      defId: h.id,
      at: d.clock.now,
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      title,
      text,
      ctx,
    };
    d.happenings.open.push(open);
    notify(d, { tone: 'discovery', title: `Ereignis: ${title}`, text, link: '/neuigkeiten' });
    return open;
  }
  pushLog(d, { defId: h.id, at: d.clock.now, title, text });
  notify(d, { tone: h.tone, title, text, link: '/neuigkeiten' });
  return null;
}

/** Picks and fires a random eligible happening. */
export function rollHappening(d: GameState): boolean {
  if (d.happenings.open.length >= MAX_OPEN) return false;
  const pool = HAPPENINGS.filter((h) => happeningEligible(d, h));
  for (let tries = 0; tries < 4 && pool.length > 0; tries++) {
    const h = pickWeighted(d, pool, (x) => x.weight);
    if (!h) return false;
    const ctx = pickTarget(d, h.target);
    if (ctx) {
      fireHappening(d, h, ctx);
      return true;
    }
    pool.splice(pool.indexOf(h), 1);
  }
  return false;
}

export function findOpen(s: GameState, id: string): OpenHappening | undefined {
  return s.happenings.open.find((o) => o.id === id);
}

export function happeningChoiceReason(s: GameState, id: string, choiceId: string): Reason {
  const open = findOpen(s, id);
  if (!open) return 'Dieses Ereignis ist vorbei.';
  const choice = happeningDef(open.defId).choices?.find((c) => c.id === choiceId);
  if (!choice) return 'Unbekannte Antwort.';
  return requirementReason(s, bindTarget(choice.requires, open.ctx));
}

/** Applies a decision; returns the result text. */
export function answerHappening(d: GameState, id: string, choiceId: string): string | null {
  const open = findOpen(d, id)!;
  const h = happeningDef(open.defId);
  const choice = h.choices!.find((c) => c.id === choiceId)!;
  d.happenings.open = d.happenings.open.filter((o) => o.id !== id);
  applyEffects(d, bindTarget(choice.effects, open.ctx));
  let result = choice.reply ?? null;
  if (choice.outcomes?.length) {
    const weighted = choice.outcomes.map((o) => ({ o, w: Math.max(0, o.weight + (o.skillBonus ? o.skillBonus.per * (skillLevel(d, o.skillBonus.skill) - 1) : 0)) }));
    const total = weighted.reduce((sum, x) => sum + x.w, 0);
    let roll = rand(d) * total;
    let picked = weighted[weighted.length - 1].o;
    for (const x of weighted) {
      roll -= x.w;
      if (roll < 0) {
        picked = x.o;
        break;
      }
    }
    applyEffects(d, bindTarget(picked.effects, open.ctx));
    result = picked.reply ?? result;
  }
  if (result) result = fill(result, open.ctx);
  pushLog(d, { defId: h.id, at: d.clock.now, title: open.title, text: open.text, choice: choice.label, ...(result ? { result } : {}) });
  incStat(d, 'happeningsAnswered');
  return result;
}

export function expireHappenings(d: GameState): void {
  const now = d.clock.now;
  for (const open of d.happenings.open.filter((o) => o.expiresAt !== undefined && o.expiresAt <= now)) {
    d.happenings.open = d.happenings.open.filter((o) => o.id !== open.id);
    const h = happeningDef(open.defId);
    applyEffects(d, bindTarget(h.onExpire, open.ctx));
    pushLog(d, { defId: h.id, at: now, title: open.title, text: open.text, choice: 'expired', result: 'Du hast nicht reagiert.' });
  }
}
