import { describe, expect, it } from 'vitest';
import { act, advance, newGame } from '../../test/helpers';
import { MINUTE, GAME_DAY_MS } from '../core/time';
import { tick } from '../engine';
import { askIntro, callFavor, meetUp, writeTo } from './people/actions';
import { knowsPerson, meetPerson, metPeople, rollMeet, neighbours } from './people/logic';
import { answerMessage, choiceReason, deliverTemplate, openMessages, rollMessage, templateEligible } from './messages/logic';
import { MESSAGE_TEMPLATES } from '../content/messages';
import { PEOPLE } from '../content/people';
import { checkCondition } from '../core/conditions';
import { startJob } from './jobs/actions';
import { jobListings } from './jobs/logic';

describe('people', () => {
  it('starts with three contacts', () => {
    const s = newGame();
    expect(metPeople(s).map((p) => p.id).sort()).toEqual(['p.jule', 'p.kemal', 'p.miro']);
  });

  it('writing builds the relationship once per day', () => {
    const s = newGame();
    const before = s.people.people['p.miro'].relation;
    expect(act(s, writeTo, { personId: 'p.miro' }).ok).toBe(true);
    expect(s.people.people['p.miro'].relation).toBeGreaterThan(before);
    expect(act(s, writeTo, { personId: 'p.miro' }).ok).toBe(false);
    tick(s, s.clock.now + GAME_DAY_MS);
    expect(act(s, writeTo, { personId: 'p.miro' }).ok).toBe(true);
    expect(act(s, writeTo, { personId: 'p.nika' }).ok).toBe(false);
  });

  it('meeting up costs money, takes time and raises trust', () => {
    const s = newGame();
    const trust = s.people.people['p.miro'].trust;
    const cash = s.finance.cash;
    expect(act(s, meetUp, { personId: 'p.miro' }).ok).toBe(true);
    expect(s.finance.cash).toBe(cash - 12);
    advance(s, 10 * MINUTE);
    expect(s.people.people['p.miro'].trust).toBeGreaterThan(trust);
    expect(s.people.people['p.miro'].meetings).toBe(1);
    expect(act(s, meetUp, { personId: 'p.miro' }).ok).toBe(false);
  });

  it('introductions need revealed contacts and enough trust', () => {
    const s = newGame();
    const miro = s.people.people['p.miro'];
    expect(act(s, askIntro, { personId: 'p.miro', targetId: 'p.nika' }).ok).toBe(false);
    miro.revealed.push('p.nika');
    miro.trust = 10;
    const low = act(s, askIntro, { personId: 'p.miro', targetId: 'p.nika' });
    expect(low.ok).toBe(false);
    if (!low.ok) expect(low.reason).toMatch(/vertraut/);
    miro.trust = 40;
    expect(act(s, askIntro, { personId: 'p.miro', targetId: 'p.nika' }).ok).toBe(true);
    expect(knowsPerson(s, 'p.nika')).toBe(true);
    expect(miro.favor).toBe(-1);
  });

  it('a contact chain leads to new people and spots (Miro → Marek → Industrial North)', () => {
    const s = newGame(21);
    meetPerson(s, 'p.marek', 'intro');
    s.people.people['p.marek'].trust = 60;
    let told = false;
    for (let day = 0; day < 20 && !told; day++) {
      tick(s, s.clock.now + GAME_DAY_MS);
      act(s, meetUp, { personId: 'p.marek' });
      advance(s, 10 * MINUTE);
      told = s.spots.spots['spot.industrial-north'].known || s.spots.spots['spot.lackfabrik'].known;
    }
    expect(told).toBe(true);
  });

  it('favors can be called in for places or contacts', () => {
    const s = newGame();
    expect(act(s, callFavor, { personId: 'p.kemal' }).ok).toBe(false);
    s.people.people['p.kemal'].favor = 1;
    expect(act(s, callFavor, { personId: 'p.kemal' }).ok).toBe(true);
    expect(s.people.people['p.kemal'].favor).toBe(0);
  });

  it('jobs, places and districts can lead to new contacts', () => {
    const s = newGame();
    let met: string | null = null;
    for (let i = 0; i < 200 && !met; i++) met = rollMeet(s, { job: 'job.aufbau' });
    expect(met).toBe('p.ole');
    expect(rollMeet(s, { job: 'job.aufbau' })).toBeNull();
  });

  it('every person is reachable through the network or a meeting place', () => {
    const reachable = new Set(PEOPLE.filter((p) => p.meet.length > 0).map((p) => p.id));
    let grew = true;
    while (grew) {
      grew = false;
      for (const p of PEOPLE) {
        if (!reachable.has(p.id)) continue;
        for (const k of p.knows) if (!reachable.has(k)) reachable.add(k), (grew = true);
      }
    }
    expect(PEOPLE.filter((p) => !reachable.has(p.id)).map((p) => p.id)).toEqual([]);
    expect(neighbours('p.miro')).toContain('p.nika');
  });

  it('people reach out by themselves once the condition holds', () => {
    const s = newGame();
    s.progression.stats.usedBought = 3;
    tick(s, s.clock.now + GAME_DAY_MS);
    expect(knowsPerson(s, 'p.lukas')).toBe(true);
    expect(s.messages.list.some((m) => m.from === 'p.lukas')).toBe(true);
  });

  it('the bar job opens up through a recommendation', () => {
    const s = newGame();
    expect(act(s, startJob, { jobId: 'job.theke' }).ok).toBe(false);
    s.progression.flags['ref.kesselhaus'] = 1;
    expect(jobListings(s).find((l) => l.job.id === 'job.theke')?.available).toBe(true);
    expect(act(s, startJob, { jobId: 'job.theke' }).ok).toBe(true);
  });
});

describe('messages', () => {
  it('messages arrive while playing', () => {
    const s = newGame(8);
    tick(s, s.clock.now + 60 * MINUTE);
    expect(s.messages.list.length).toBeGreaterThan(0);
  });

  it('no spontaneous messages during offline catch-up', () => {
    const s = newGame(8);
    tick(s, s.clock.now + 60 * MINUTE, { offline: true });
    expect(s.messages.list.length).toBe(0);
  });

  it('accepting a gig starts a task that pays on completion', () => {
    const s = newGame();
    const msg = deliverTemplate(s, 'm.miro-help', 'p.miro', { online: true });
    expect(msg.open).toBe(true);
    const cash = s.finance.cash;
    answerMessage(s, msg.id, 'yes');
    expect(msg.open).toBe(false);
    expect(s.activities.running.some((a) => a.kind === 'task')).toBe(true);
    advance(s, 9 * MINUTE);
    expect(s.finance.cash).toBeGreaterThanOrEqual(cash + 110);
    expect(s.progression.skills.technik).toBeGreaterThanOrEqual(16);
  });

  it('choices explain unmet requirements', () => {
    const s = newGame();
    s.finance.cash = 10;
    const msg = deliverTemplate(s, 'm.jule-loan', 'p.jule', { online: true });
    expect(choiceReason(s, msg, 'yes')).toMatch(/Bargeld/);
    expect(choiceReason(s, msg, 'no')).toBeNull();
  });

  it('a loan comes back later with a follow-up message', () => {
    const s = newGame();
    const msg = deliverTemplate(s, 'm.jule-loan', 'p.jule', { online: true });
    answerMessage(s, msg.id, 'yes');
    expect(s.finance.cash).toBe(450);
    expect(s.people.people['p.jule'].favor).toBe(1);
    advance(s, 100 * MINUTE);
    expect(s.messages.list.some((m) => m.templateId === 'm.jule-repay')).toBe(true);
    expect(s.finance.cash).toBeGreaterThanOrEqual(510 - 5 * 5);
  });

  it('ignoring a message lets it expire with consequences', () => {
    const s = newGame();
    const before = s.people.people['p.miro'].relation;
    const msg = deliverTemplate(s, 'm.miro-help', 'p.miro', { online: true });
    advance(s, 3 * 60 * MINUTE);
    expect(msg.open).toBe(false);
    const after = s.messages.list.find((m) => m.id === msg.id)!;
    expect(after.resolved).toBe('expired');
    expect(s.people.people['p.miro'].relation).toBeLessThan(before);
  });

  it('only one open message per person at a time', () => {
    const s = newGame();
    deliverTemplate(s, 'm.miro-help', 'p.miro', { online: true });
    const miroTemplates = MESSAGE_TEMPLATES.filter((t) => 'person' in t.from && t.from.person === 'p.miro');
    for (const t of miroTemplates) expect(templateEligible(s, t)).toBe(false);
  });

  it('once-templates are only sent once', () => {
    const s = newGame();
    s.people.people['p.kemal'].trust = 50;
    const msg = deliverTemplate(s, 'm.kemal-records', 'p.kemal', { online: true });
    answerMessage(s, msg.id, 'no');
    const t = MESSAGE_TEMPLATES.find((x) => x.id === 'm.kemal-records')!;
    expect(templateEligible(s, t)).toBe(false);
  });

  it('every template with choices can be answered without errors', () => {
    for (const t of MESSAGE_TEMPLATES) {
      if (!t.choices) continue;
      for (const c of t.choices) {
        const s = newGame(3);
        s.finance.cash = 5000;
        const from = 'person' in t.from ? t.from.person : 'p.miro';
        meetPerson(s, from, 'intro');
        const msg = deliverTemplate(s, t.id, from, { online: true });
        expect(choiceReason(s, msg, c.id)).toBeNull();
        expect(() => answerMessage(s, msg.id, c.id)).not.toThrow();
        expect(() => advance(s, 30 * MINUTE)).not.toThrow();
      }
    }
  });

  it('random rolls respect conditions', () => {
    const s = newGame(4);
    for (let i = 0; i < 30; i++) {
      const m = rollMessage(s);
      if (m?.open) answerMessage(s, m.id, s.messages.list.find((x) => x.id === m.id)!.templateId === 'm.jule-loan' ? 'no' : 'no');
      tick(s, s.clock.now + GAME_DAY_MS);
    }
    expect(openMessages(s).length).toBeLessThanOrEqual(3);
    expect(checkCondition(s, { t: 'contacts', gte: 3 })).toBe(true);
  });
});
