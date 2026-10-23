import { describe, expect, it } from 'vitest';
import { act, advance, newGame } from '../../test/helpers';
import { GAME_DAY_MS, GAME_HOUR_MS, MINUTE, dayStartAt, gameDayAt } from '../core/time';
import { tick } from '../engine';
import type { GameState } from '../state';
import type { ActionResult } from '../core/actions';
import { HAPPENINGS } from '../content/happenings';
import { RIVAL_CREWS } from '../content/rivals';
import { MESSAGE_TEMPLATES } from '../content/messages';
import { applyEffects } from '../core/effects';
import { hydrate } from '../save/hydrate';
import { planEvent } from './events/actions';
import { planReason, upcomingNights } from './events/plan';
import { forecast } from './events/simulate';
import type { EventPlanInput } from './events/state';
import { addItem } from './inventory/logic';
import { jobPay } from './jobs/logic';
import { JOBS } from '../content/jobs';
import { goodsPrice } from './events/actions';
import { answerHappening, fireHappening, happeningChoiceReason, happeningDef, modifierValue, pickTarget, rollHappening } from './happenings/logic';
import { answerEvent } from './happenings/actions';
import { competition, contactPlayer, resolveRivalEvent, rivalPoliceRisk } from './rivals/logic';
import { askSpotTip, proposeCoop, visitRivalParty } from './rivals/actions';
import type { RivalEvent } from './rivals/state';
import { answerMessage, deliverTemplate } from './messages/logic';
import { meetPerson } from './people/logic';

const why = (r: ActionResult) => (r.ok ? null : r.reason);

function setup(seed = 3): GameState {
  const s = newGame(seed);
  s.finance.cash = 3000;
  // Keep random events out unless a test wants them.
  s.happenings.nextRollAt = s.clock.now + 1e12;
  const st = s.spots.spots['spot.keller-block9'];
  st.known = true;
  st.intel = 100;
  st.lastCheckedAt = s.clock.now;
  return s;
}

function plan(s: GameState, extra: Partial<EventPlanInput> = {}): EventPlanInput {
  return {
    name: 'Kellerrave',
    spotId: 'spot.keller-block9',
    startsAt: upcomingNights(s)[1].startsAt,
    durationH: 6,
    entry: 5,
    lineup: ['p.jule'],
    sound: { kind: 'rental', optionId: 'pa.small' },
    transport: 'own',
    promo: ['promo.word'],
    prices: {},
    freeWater: false,
    helpers: 0,
    awareness: false,
    medics: false,
    ...extra,
  };
}

function rivalParty(s: GameState, crewId: string, spotId: string, startsAt: number): RivalEvent {
  const ev: RivalEvent = { id: `r${s.rivals.nextId++}`, crewId, spotId, startsAt, durationH: 8, status: 'scheduled' };
  s.rivals.events.push(ev);
  return ev;
}

describe('rival crews', () => {
  it('plan parties, grow and write scene news on their own', () => {
    const s = setup(5);
    const rep = s.rivals.crews['rival.bunkerkinder'].rep;
    for (let i = 0; i < 12; i++) tick(s, s.clock.now + GAME_DAY_MS);
    const done = s.rivals.events.filter((e) => e.status === 'done');
    expect(done.length).toBeGreaterThan(2);
    expect(done.every((e) => (e.visitors ?? 0) > 0)).toBe(true);
    expect(s.rivals.news.length).toBeGreaterThan(3);
    expect(s.rivals.crews['rival.bunkerkinder'].rep).not.toBe(rep);
  });

  it('keep moving while the player is away (offline catch-up)', () => {
    const s = setup(6);
    tick(s, s.clock.now + 6 * GAME_DAY_MS);
    expect(s.rivals.events.some((e) => e.status === 'done')).toBe(true);
  });

  it('new crews appear once their conditions hold', () => {
    const s = setup();
    expect(s.rivals.crews['rival.hafenlaerm'].active).toBe(false);
    expect(s.rivals.crews['rival.waldfrequenz'].active).toBe(false);
    s.progression.reputation = 120;
    advance(s, MINUTE);
    expect(s.rivals.crews['rival.hafenlaerm'].active).toBe(true);
    expect(s.rivals.crews['rival.waldfrequenz'].active).toBe(false);
    expect(s.notifications.feed.some((n) => n.title.includes('Hafenlärm'))).toBe(true);
  });

  it('a rival party in the same night costs the player guests', () => {
    const s = setup();
    const p = plan(s);
    const alone = forecast(s, p)!;
    rivalParty(s, 'rival.bunkerkinder', 'spot.bunker-nord', p.startsAt);
    const shared = forecast(s, p)!;
    expect(shared.rivals).toEqual(['rival.bunkerkinder']);
    expect(shared.demand).toBeLessThan(alone.demand);
    expect(competition(s, p.startsAt).factor).toBeLessThan(1);
  });

  it('a spot booked by a rival is taken that night', () => {
    const s = setup();
    const p = plan(s);
    rivalParty(s, 'rival.acidkollektiv', 'spot.keller-block9', p.startsAt);
    expect(planReason(s, p)).toMatch(/Acid Kollektiv/);
  });

  it('raids at rival parties close the shared spot', () => {
    const s = setup();
    s.spots.spots['spot.bunker-nord'].known = true;
    s.spots.spots['spot.bunker-nord'].fame = 100;
    s.happenings.modifiers.push({ id: 'x', kind: 'police', value: 10, until: s.clock.now + 1e9, label: 'test' });
    let raided = false;
    for (let i = 0; i < 20 && !raided; i++) {
      s.spots.spots['spot.bunker-nord'].status = 'open';
      const ev = rivalParty(s, 'rival.bunkerkinder', 'spot.bunker-nord', s.clock.now - 9 * GAME_HOUR_MS);
      expect(rivalPoliceRisk(s, ev, 200)).toBeGreaterThan(0.5);
      resolveRivalEvent(s, ev);
      raided = ev.raided === true;
    }
    expect(raided).toBe(true);
    expect(s.spots.spots['spot.bunker-nord'].status).toBe('closed');
  });

  it('visiting a rival party: only while it runs, makes friends and reveals the spot', () => {
    const s = setup();
    const startsAt = dayStartAt(s.clock, gameDayAt(s.clock, s.clock.now) + 1) + 22 * GAME_HOUR_MS;
    const ev = rivalParty(s, 'rival.acidkollektiv', 'spot.garagenhof', startsAt);
    expect(why(act(s, visitRivalParty, { eventId: ev.id }))).toMatch(/noch nicht angefangen/);
    tick(s, startsAt + MINUTE);
    const rel = s.rivals.crews['rival.acidkollektiv'].relation;
    expect(act(s, visitRivalParty, { eventId: ev.id }).ok).toBe(true);
    advance(s, 6 * MINUTE);
    expect(s.rivals.crews['rival.acidkollektiv'].relation).toBeGreaterThan(rel);
    expect(s.people.people['p.jonte'].met).toBe(true);
    expect(s.spots.spots['spot.garagenhof'].known).toBe(true);
  });

  it('a coop brings their crowd, takes a share and improves the relation', () => {
    let s = setup();
    let ok = false;
    for (let seed = 1; seed < 20 && !ok; seed++) {
      s = setup(seed);
      s.progression.reputation = 150;
      s.rivals.crews['rival.acidkollektiv'].relation = 40;
      expect(why(act(s, proposeCoop, { crewId: 'rival.bunkerkinder' }))).toMatch(/Verhältnis|nichts gemeinsam/);
      ok = act(s, proposeCoop, { crewId: 'rival.acidkollektiv' }).ok && !!s.rivals.coop;
    }
    expect(ok).toBe(true);
    const p = plan(s, { transport: 'rent' });
    const f = forecast(s, p)!;
    expect(f.coop).toBe('rival.acidkollektiv');
    expect(act(s, planEvent, p).ok).toBe(true);
    const ev = s.events.list[0];
    const rel = s.rivals.crews['rival.acidkollektiv'].relation;
    tick(s, ev.startsAt + 1);
    tick(s, ev.startsAt + ev.durationH * MINUTE + 1);
    expect(ev.status).toBe('done');
    expect(ev.report!.costs['Anteil Acid Kollektiv Ostend']).toBeGreaterThanOrEqual(0);
    expect(s.rivals.coop).toBeUndefined();
    expect(s.rivals.crews['rival.acidkollektiv'].relation).toBeGreaterThan(rel);
  });

  it('spot tips need a good relation', () => {
    const s = setup();
    expect(why(act(s, askSpotTip, { crewId: 'rival.acidkollektiv' }))).toMatch(/besser verstehen/);
    s.rivals.crews['rival.acidkollektiv'].relation = 60;
    expect(act(s, askSpotTip, { crewId: 'rival.acidkollektiv' }).ok).toBe(true);
    expect(s.rivals.crews['rival.acidkollektiv'].knownSpots.some((id) => s.spots.spots[id].known)).toBe(true);
    expect(why(act(s, askSpotTip, { crewId: 'rival.acidkollektiv' }))).toMatch(/Heute|keinen Spot/);
  });

  it('crew leaders write; answers act on the right crew', () => {
    const s = setup();
    s.progression.reputation = 150;
    meetPerson(s, 'p.jonte', 'rival', { silent: true });
    const msg = deliverTemplate(s, 'rv.coop-party', 'p.jonte', { online: true });
    expect(msg.text).toContain('Acid Kollektiv Ostend');
    answerMessage(s, msg.id, 'yes');
    expect(s.rivals.coop?.crewId).toBe('rival.acidkollektiv');
    // The simulation picks fitting templates on its own.
    const t = setup(8);
    t.progression.reputation = 200;
    expect(contactPlayer(t, RIVAL_CREWS.find((r) => r.id === 'rival.acidkollektiv')!)).toBe(true);
    expect(t.messages.list.some((m) => m.from === 'p.jonte' && m.open)).toBe(true);
    // …but not twice in a row.
    expect(contactPlayer(t, RIVAL_CREWS.find((r) => r.id === 'rival.acidkollektiv')!)).toBe(false);
  });

  it('a guest set at a rival party pays and gives reputation', () => {
    const s = setup();
    meetPerson(s, 'p.jonte', 'rival', { silent: true });
    applyEffects(s, [{ t: 'rivalBooking', rival: 'rival.acidkollektiv' }]);
    const ev = rivalParty(s, 'rival.acidkollektiv', 'spot.garagenhof', s.clock.now - 9 * GAME_HOUR_MS);
    ev.guest = true;
    const rep = s.progression.reputation;
    const cash = s.finance.cash;
    resolveRivalEvent(s, ev);
    expect(s.finance.cash).toBeGreaterThan(cash);
    expect(s.progression.reputation).toBeGreaterThan(rep);
    expect(s.progression.stats.guestSets).toBe(1);
  });

  it('rival templates are only sent by the scene', () => {
    const rivalTemplates = MESSAGE_TEMPLATES.filter((t) => t.rival);
    expect(rivalTemplates.length).toBeGreaterThanOrEqual(4);
    expect(rivalTemplates.every((t) => 'rival' in t.from)).toBe(true);
  });
});

describe('random events', () => {
  function richState(): GameState {
    const s = setup(4);
    s.finance.cash = 5000;
    s.progression.reputation = 400;
    s.progression.stats.tracksMade = 1;
    s.progression.stats.eventsHeld = 3;
    s.progression.skills.produktion = 3000;
    for (const id of ['item.tr-66', 'item.pa-active-12', 'item.car-kombi']) addItem(s, id, { condition: 80 });
    for (const sp of ['spot.garagenhof', 'spot.kantine']) s.spots.spots[sp].known = true;
    meetPerson(s, 'p.miro', 'intro');
    meetPerson(s, 'p.nika', 'intro');
    meetPerson(s, 'p.ole', 'intro');
    act(s, planEvent, plan(s, { transport: 'rent' }));
    return s;
  }

  it('every happening can fire and every answer works', () => {
    for (const h of HAPPENINGS) {
      for (const c of h.choices ?? [{ id: '' }]) {
        const s = richState();
        const ctx = pickTarget(s, h.target);
        expect(ctx, h.id).not.toBeNull();
        const open = fireHappening(s, h, ctx!);
        if (!c.id) continue;
        expect(happeningChoiceReason(s, open!.id, c.id), `${h.id}/${c.id}`).toBeNull();
        expect(() => answerHappening(s, open!.id, c.id)).not.toThrow();
        expect(s.happenings.open).toHaveLength(0);
        expect(() => advance(s, 30 * MINUTE)).not.toThrow();
      }
    }
  });

  it('respect targets, cooldowns and once', () => {
    const s = setup();
    expect(pickTarget(s, 'eventDj')).toBeNull();
    expect(pickTarget(s, 'nextEvent')).toBeNull();
    const h = happeningDef('h.interview');
    s.progression.reputation = 500;
    fireHappening(s, h, {});
    s.happenings.open = [];
    for (let i = 0; i < 40; i++) rollHappening(s);
    expect(s.happenings.log.filter((l) => l.defId === 'h.interview').length + s.happenings.open.filter((o) => o.defId === 'h.interview').length).toBe(0);
  });

  it('roll on their own while you play', () => {
    const s = setup();
    s.happenings.nextRollAt = s.clock.now + MINUTE;
    tick(s, s.clock.now + 2 * GAME_DAY_MS);
    expect(s.progression.stats.happenings ?? 0).toBeGreaterThan(0);
  });

  it('a sick DJ can be replaced by yourself', () => {
    const s = richState();
    const open = fireHappening(s, happeningDef('h.dj-sick'), pickTarget(s, 'eventDj')!)!;
    expect(open.text).toContain('Jule');
    expect(act(s, answerEvent, { id: open.id, choiceId: 'self' }).ok).toBe(true);
    expect(s.events.list[0].lineup).toEqual(['self']);
  });

  it('demand boosts change the next party', () => {
    const s = richState();
    const ev = s.events.list[0];
    fireHappening(s, happeningDef('h.blog'), pickTarget(s, 'nextEvent')!);
    expect(ev.boosts?.[0].value).toBe(0.25);
  });

  it('ignoring a decision has consequences', () => {
    const s = richState();
    s.happenings.nextRollAt = s.clock.now + 1e12;
    fireHappening(s, happeningDef('h.posters-torn'), pickTarget(s, 'nextEvent')!);
    advance(s, 3 * 60 * MINUTE);
    expect(s.happenings.open).toHaveLength(0);
    expect(s.events.list[0].boosts?.some((b) => b.value < 0)).toBe(true);
    expect(s.happenings.log.at(-1)?.choice).toBe('expired');
  });

  it('modifiers change job pay, drink prices and police risk for a while', () => {
    const s = setup();
    const job = JOBS[0];
    const pay = jobPay(s, job);
    const price = goodsPrice(s, 'sup.discounter', 'item.goods-beer');
    fireHappening(s, happeningDef('h.trade-fair'), {});
    fireHappening(s, happeningDef('h.heatwave'), {});
    expect(jobPay(s, job)).toBeGreaterThan(pay);
    expect(goodsPrice(s, 'sup.discounter', 'item.goods-beer')).toBeGreaterThan(price);
    expect(modifierValue(s, 'jobPay')).toBeCloseTo(0.3);
    advance(s, 25 * 60 * MINUTE);
    expect(modifierValue(s, 'jobPay')).toBe(0);
    expect(jobPay(s, job)).toBe(pay);
  });

  it('rare offers show up on the used market', () => {
    const s = setup();
    fireHappening(s, happeningDef('h.rare-303'), {});
    expect(s.market.offers.some((o) => o.defId === 'item.tb-303')).toBe(true);
  });
});

describe('saves from before Phase 8', () => {
  it('load with fresh scene and random event slices', () => {
    const raw = JSON.parse(JSON.stringify(newGame())) as Record<string, unknown>;
    delete raw.rivals;
    delete raw.happenings;
    const s = hydrate(raw);
    expect(Object.keys(s.rivals.crews)).toHaveLength(RIVAL_CREWS.length);
    expect(s.happenings.open).toEqual([]);
    expect(() => tick(s, s.clock.now + GAME_DAY_MS)).not.toThrow();
  });
});
