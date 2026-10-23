import type { GameState } from '../../state';
import type { MessageTemplateDef } from '../../content/types';
import { MESSAGE_TEMPLATES } from '../../content/messages';
import { PERSONS_BY_ID, personDef, templateDef } from '../../content/registry';
import { checkAll, requirementReason } from '../../core/conditions';
import { applyEffects } from '../../core/effects';
import { notify } from '../../core/notify';
import { pick, pickWeighted, rand } from '../../core/rng';
import { GAME_DAY_MS, HOUR } from '../../core/time';
import type { Reason } from '../../core/types';
import { addXp, incStat, skillLevel } from '../progression/logic';
import { knowsPerson, metPeople, shortName } from '../people/logic';
import type { Message } from './state';
import { fillText, resolveConditions, resolveEffects } from './resolve';

export const MESSAGE_LIMIT = 250;

function pushMessage(d: GameState, m: Omit<Message, 'id'>): Message {
  const msg: Message = { id: `m${d.messages.nextId++}`, ...m };
  d.messages.list.push(msg);
  if (d.messages.list.length > MESSAGE_LIMIT) {
    // Drop the oldest settled messages first.
    const idx = d.messages.list.findIndex((x) => !x.open);
    d.messages.list.splice(idx >= 0 ? idx : 0, 1);
  }
  return msg;
}

/** A plain message without a template (e.g. someone introducing themselves). */
export function sendDirect(d: GameState, from: string, text: string, opts: { online?: boolean } = {}): Message {
  const def = personDef(from);
  const msg = pushMessage(d, { from, at: d.clock.now, text, read: false, online: opts.online });
  notify(d, { tone: 'info', title: `Nachricht von ${shortName(def)}`, text: text.length > 90 ? `${text.slice(0, 88)}…` : text, link: `/netzwerk/chat/${from}` });
  return msg;
}

export function deliverTemplate(d: GameState, templateId: string, from: string, opts: { online?: boolean } = {}): Message {
  const t = templateDef(templateId);
  const def = personDef(from);
  const text = fillText(t.text, { name: shortName(def), player: d.player.name, from });
  const hasChoices = !!t.choices?.length;
  const msg = pushMessage(d, {
    from,
    at: d.clock.now,
    text,
    templateId,
    read: false,
    online: opts.online,
    ...(hasChoices ? { open: true, ...(t.expiresHours ? { expiresAt: d.clock.now + t.expiresHours * HOUR } : {}) } : {}),
  });
  d.messages.sent[templateId] = d.clock.now;
  incStat(d, 'messagesReceived');
  applyEffects(d, resolveEffects(t.onDeliver, from));
  notify(d, {
    tone: hasChoices ? 'discovery' : 'info',
    title: `Nachricht von ${shortName(def)}`,
    text: text.length > 90 ? `${text.slice(0, 88)}…` : text,
    link: `/netzwerk/chat/${from}`,
  });
  return msg;
}

export function queueMessage(d: GameState, templateId: string, from: string, delayMin = 0): void {
  d.messages.queue.push({ templateId, from, deliverAt: d.clock.now + delayMin * 60_000 });
}

function hasOpenFrom(s: GameState, personId: string): boolean {
  return s.messages.list.some((m) => m.open && m.from === personId);
}

function senderCandidates(s: GameState, t: MessageTemplateDef): string[] {
  const minTrust = t.minTrust ?? 0;
  const ok = (id: string) => knowsPerson(s, id) && (s.people.people[id]?.trust ?? 0) >= minTrust && !hasOpenFrom(s, id);
  if ('rival' in t.from) return [];
  if ('person' in t.from) return ok(t.from.person) ? [t.from.person] : [];
  const roles = t.from.role;
  return metPeople(s)
    .filter((p) => p.roles.some((r) => roles.includes(r)))
    .map((p) => p.id)
    .filter(ok);
}

export function templateEligible(s: GameState, t: MessageTemplateDef): boolean {
  if (t.followUpOnly || t.weight <= 0) return false;
  if (t.once && s.messages.sent[t.id] !== undefined) return false;
  const last = s.messages.sent[t.id];
  if (last !== undefined && t.cooldownDays && s.clock.now - last < t.cooldownDays * GAME_DAY_MS) return false;
  if (!checkAll(s, t.when)) return false;
  return senderCandidates(s, t).length > 0;
}

/** Picks and delivers a random eligible message. */
export function rollMessage(d: GameState): Message | null {
  const pool = MESSAGE_TEMPLATES.filter((t) => templateEligible(d, t));
  const t = pickWeighted(d, pool, (x) => x.weight);
  if (!t) return null;
  const from = pick(d, senderCandidates(d, t));
  return deliverTemplate(d, t.id, from, { online: true });
}

export function findMessage(s: GameState, id: string): Message | undefined {
  return s.messages.list.find((m) => m.id === id);
}

export function choiceReason(s: GameState, msg: Message, choiceId: string): Reason {
  if (!msg.open) return 'Diese Nachricht ist erledigt.';
  const t = msg.templateId ? templateDef(msg.templateId) : null;
  const choice = t?.choices?.find((c) => c.id === choiceId);
  if (!choice) return 'Unbekannte Antwort.';
  return requirementReason(s, resolveConditions(choice.requires, msg.from));
}

/** Applies a decision. Returns the sender's reply text (if any). */
export function answerMessage(d: GameState, msgId: string, choiceId: string): string | null {
  const msg = findMessage(d, msgId)!;
  const t = templateDef(msg.templateId!);
  const choice = t.choices!.find((c) => c.id === choiceId)!;
  msg.open = false;
  msg.resolved = choiceId;
  msg.read = true;
  pushMessage(d, { from: msg.from, at: d.clock.now, text: choice.label, mine: true, read: true });
  incStat(d, 'messagesAnswered');
  addXp(d, 'netzwerk', 2);
  d.people.people[msg.from].lastContactAt = d.clock.now;

  applyEffects(d, resolveEffects(choice.effects, msg.from));
  let reply = choice.reply ?? null;
  if (choice.outcomes?.length) {
    const weighted = choice.outcomes.map((o) => ({
      o,
      w: o.weight + (o.skillBonus ? o.skillBonus.per * (skillLevel(d, o.skillBonus.skill) - 1) : 0),
    }));
    const total = weighted.reduce((sum, x) => sum + Math.max(0, x.w), 0);
    let roll = rand(d) * total;
    let picked = weighted[weighted.length - 1].o;
    for (const x of weighted) {
      roll -= Math.max(0, x.w);
      if (roll < 0) {
        picked = x.o;
        break;
      }
    }
    applyEffects(d, resolveEffects(picked.effects, msg.from));
    reply = picked.reply ?? reply;
  }
  if (reply) {
    const def = PERSONS_BY_ID.get(msg.from)!;
    reply = fillText(reply, { name: shortName(def), player: d.player.name, from: msg.from });
    pushMessage(d, { from: msg.from, at: d.clock.now, text: reply, read: true });
  }
  return reply;
}

export function expireMessages(d: GameState): void {
  for (const m of d.messages.list) {
    if (!m.open || m.expiresAt === undefined || m.expiresAt > d.clock.now) continue;
    m.open = false;
    m.resolved = 'expired';
    if (m.online && m.templateId) applyEffects(d, resolveEffects(templateDef(m.templateId).onExpire, m.from));
  }
}

export function openMessages(s: GameState): Message[] {
  return s.messages.list.filter((m) => m.open);
}

export function unreadMessages(s: GameState): number {
  return s.messages.list.filter((m) => !m.read && !m.mine).length;
}

export interface ThreadSummary {
  personId: string;
  last: Message;
  unread: number;
  open: number;
}

export function threads(s: GameState): ThreadSummary[] {
  const map = new Map<string, ThreadSummary>();
  for (const m of s.messages.list) {
    const cur = map.get(m.from) ?? { personId: m.from, last: m, unread: 0, open: 0 };
    cur.last = m;
    if (!m.read && !m.mine) cur.unread++;
    if (m.open) cur.open++;
    map.set(m.from, cur);
  }
  return [...map.values()].sort((a, b) => b.last.at - a.last.at);
}
