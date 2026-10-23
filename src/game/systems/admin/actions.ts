import type { GameState } from '../../state';
import { SKILLS } from '../../core/types';
import { defineAction } from '../../core/actions';
import { fmtMoney, fmtNumber } from '../../core/format';
import { DISTRICTS } from '../../content/cities';
import { SPOTS } from '../../content/spots';
import { POIS } from '../../content/pois';
import { PEOPLE } from '../../content/people';
import { UNLOCKS } from '../../content/unlocks';
import { adminGrant } from '../finance/logic';
import { addPoints, addRep, incStat, levelForXp, unlock, xpForLevel } from '../progression/logic';
import { revealPoi, revealSpot } from '../map/logic';
import { meetPerson } from '../people/logic';
import { boostMorale } from '../crew/logic';

/**
 * The hack menu: cheats for your own game. They skip the rules on purpose;
 * every use is counted in the stats (`cheatsUsed`).
 */
function cheat<P>(id: string, run: (d: GameState, p: P) => string) {
  return defineAction<P>({
    id: `admin.${id}`,
    check: () => null,
    run: (d, p) => {
      incStat(d, 'cheatsUsed');
      return run(d, p);
    },
  });
}

export const MAX_SKILL_LEVEL = 20;

export const cheatMoney = cheat<{ amount: number }>('money', (d, p) => {
  adminGrant(d, p.amount);
  return `${fmtMoney(p.amount)} überwiesen.`;
});

export const cheatRep = cheat<{ amount: number }>('rep', (d, p) => {
  addRep(d, p.amount);
  return `+${fmtNumber(p.amount)} Reputation.`;
});

export const cheatPoints = cheat<{ amount: number }>('points', (d, p) => {
  addPoints(d, p.amount);
  return `+${fmtNumber(p.amount)} Szenepunkte.`;
});

/** Raises every skill by `levels` (up to the cap). */
export const cheatSkills = cheat<{ levels: number }>('skills', (d, p) => {
  for (const k of SKILLS) {
    const level = Math.min(MAX_SKILL_LEVEL, levelForXp(d.progression.skills[k]) + p.levels);
    d.progression.skills[k] = Math.max(d.progression.skills[k], xpForLevel(level));
  }
  return `Alle Fähigkeiten +${p.levels} Level.`;
});

/** Every district, spot and place of the current city. */
export const cheatRevealMap = cheat<Record<string, never>>('map', (d) => {
  const city = d.map.cityId;
  for (const dist of DISTRICTS) if (dist.cityId === city) (d.map.districts[dist.id] ??= { explored: 0, visits: 0 }).explored = 100;
  let found = 0;
  for (const sp of SPOTS) if (sp.cityId === city && !sp.hidden && revealSpot(d, sp.id, 'admin', 100, { silent: true })) found++;
  for (const poi of POIS) if (poi.cityId === city && revealPoi(d, poi.id, 'admin', { silent: true })) found++;
  return `Karte aufgedeckt: ${found} neue Orte.`;
});

export const cheatMeetAll = cheat<Record<string, never>>('people', (d) => {
  let n = 0;
  for (const p of PEOPLE) {
    if (meetPerson(d, p.id, 'admin', { trust: 50, silent: true })) n++;
    const st = d.people.people[p.id];
    if (st) st.trust = Math.max(st.trust, 50);
  }
  return `${n} neue Kontakte, alle vertrauen dir.`;
});

export const cheatRepair = cheat<Record<string, never>>('repair', (d) => {
  let n = 0;
  for (const it of Object.values(d.inventory.items)) {
    if (it.condition < 100 || it.broken) n++;
    it.condition = 100;
    it.broken = false;
  }
  return `${n} Geräte wie neu.`;
});

export const cheatCrew = cheat<Record<string, never>>('crew', (d) => {
  boostMorale(d, 100);
  return d.crew.members.length ? 'Die Crew ist bestens gelaunt.' : 'Noch keine Crew – aber gute Laune ist gespeichert.';
});

/** Everything that runs finishes with the next tick. */
export const cheatFinish = cheat<Record<string, never>>('finish', (d) => {
  for (const a of d.activities.running) a.endsAt = Math.min(a.endsAt, d.clock.now);
  for (const st of Object.values(d.projects.list)) if (st.running) st.running.endsAt = Math.min(st.running.endsAt, d.clock.now);
  for (const o of d.merch.orders) o.readyAt = Math.min(o.readyAt, d.clock.now);
  return 'Alles läuft auf Turbo – gleich fertig.';
});

export const cheatCooldowns = cheat<Record<string, never>>('cooldowns', (d) => {
  for (const o of Object.values(d.lifestyle.owned)) delete o.usedAt;
  d.lifestyle.lastExperience = {};
  return 'Alle Abklingzeiten zurückgesetzt.';
});

export const cheatUnlockAll = cheat<Record<string, never>>('unlocks', (d) => {
  let n = 0;
  for (const u of UNLOCKS) if (unlock(d, u.id)) n++;
  return `${n} Freischaltungen aktiviert.`;
});

export const cheatClearDebts = cheat<Record<string, never>>('debts', (d) => {
  const n = d.finance.loans.length;
  d.finance.loans = [];
  if (d.finance.cash < 0) d.finance.cash = 0;
  return n ? `${n} Kredite gelöscht.` : 'Keine Schulden – Konto glattgezogen.';
});
