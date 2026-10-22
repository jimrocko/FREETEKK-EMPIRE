import type { ActivityHandler } from '../activities/handler';
import type { SkillId } from '../../core/types';
import { ALL_ITEMS } from '../../content/items';
import { districtDef, poiDef, rumorDef, spotDef } from '../../content/registry';
import { SKILL_DEFS } from '../../content/skills';
import { fmtMoney } from '../../core/format';
import { notify } from '../../core/notify';
import { chance, pick, randInt, rand } from '../../core/rng';
import { earn } from '../finance/logic';
import { addRep, addXp, incStat, skillLevel } from '../progression/logic';
import { addItem, freeVolume } from '../inventory/logic';
import { generateOffer, MAX_OFFERS } from '../market/logic';
import { districtState, exploreGain, findableIn, revealPoi, revealSpot, rollRumor } from './logic';
import { rollMeet } from '../people/logic';

function xpText(xp: Partial<Record<SkillId, number>>): string[] {
  return (Object.entries(xp) as [SkillId, number][]).filter(([, v]) => v > 0).map(([k, v]) => `+${v} XP ${SKILL_DEFS[k].name}`);
}

export const exploreHandler: ActivityHandler = {
  cancelLabel: 'Erkundung abbrechen',
  complete(d, a) {
    const def = districtDef(String(a.payload.districtId));
    const st = (d.map.districts[def.id] ??= { explored: 0, visits: 0 });
    const before = st.explored;
    const gain = exploreGain(d, def);
    st.explored = Math.min(100, before + gain);
    st.visits++;
    incStat(d, 'explorations');
    const found: string[] = [];

    // Places: newly reachable ones are likely, older ones still possible.
    const bonus = 0.03 * (skillLevel(d, 'netzwerk') - 1);
    const candidates = findableIn(d, def.id, st.explored).sort((x, y) => x.threshold - y.threshold);
    for (const c of candidates) {
      if (found.length >= 2) break;
      const p = (c.threshold > before ? 0.75 : 0.45) + bonus;
      if (!chance(d, Math.min(0.95, p))) continue;
      if (c.kind === 'spot' ? revealSpot(d, c.id, 'explore', 35) : revealPoi(d, c.id, 'explore')) found.push(c.id);
    }

    // Rumors tied to this district.
    const rumor = rollRumor(d, { district: def.id, minExplored: 0 }, 0.4, 'explore');
    const met = rollMeet(d, { district: def.id });

    // Small surprises on the way.
    const extras: string[] = [];
    const roll = rand(d);
    if (roll < 0.12) {
      const coins = randInt(d, 2, 12);
      earn(d, coins, 'other', 'Pfand & Kleingeld gefunden');
      extras.push(`${fmtMoney(coins)} Pfand gefunden`);
    } else if (roll < 0.19) {
      const pool = ALL_ITEMS.filter((it) => it.usedMarket && it.tier === 1 && it.volumeL <= freeVolume(d));
      if (pool.length > 0) {
        const item = pick(d, pool);
        addItem(d, item.id, { condition: randInt(d, 15, 45) });
        incStat(d, 'junkFinds');
        extras.push(`Sperrmüll-Fund: ${item.name}`);
        notify(d, { tone: 'discovery', title: `Sperrmüll-Fund: ${item.name}`, text: 'Stand einfach an der Straße. Ziemlich ramponiert, aber vielleicht noch was wert.', link: '/inventar' });
      }
    } else if (roll < 0.27 && d.market.offers.length <= MAX_OFFERS) {
      const offer = generateOffer(d, { factor: 0.72 });
      if (offer) {
        d.market.offers.push(offer);
        const name = ALL_ITEMS.find((it) => it.id === offer.defId)?.name ?? 'Gerät';
        extras.push(`Aushang: ${name} günstig abzugeben`);
        notify(d, { tone: 'discovery', title: 'Aushang am Laternenpfahl', text: `${name} für ${fmtMoney(offer.price)} – steht jetzt im Gebrauchtmarkt.`, link: '/markt' });
      }
    }

    for (const [skill, xp] of Object.entries(def.xp) as [SkillId, number][]) addXp(d, skill, xp);
    const parts = [`+${st.explored - before} % erkundet`];
    if (found.length > 0) parts.push(`${found.length} ${found.length === 1 ? 'Fund' : 'Funde'}`);
    if (rumor) parts.push('ein Gerücht');
    if (met) parts.push('neuer Kontakt');
    parts.push(...extras, ...xpText(def.xp));
    notify(d, { tone: 'success', title: `${def.name} erkundet (${st.explored} %)`, text: parts.join(' · '), link: '/karte' });
  },
};

export const visitHandler: ActivityHandler = {
  cancelLabel: 'Früher gehen',
  complete(d, a) {
    const poi = poiDef(String(a.payload.poiId));
    const visit = poi.visit!;
    for (const [skill, xp] of Object.entries(visit.xp) as [SkillId, number][]) addXp(d, skill, xp);
    if (visit.rep) addRep(d, visit.rep);
    incStat(d, 'visits');
    const rumor = rollRumor(d, { poi: poi.id }, visit.rumorChance, 'visit');
    const met = rollMeet(d, { poi: poi.id });
    const parts = xpText(visit.xp);
    if (met) parts.push('neuer Kontakt');
    if (visit.rep) parts.push(`+${visit.rep} Reputation`);
    if (rumor) parts.push('Gerücht aufgeschnappt');
    notify(d, { tone: 'success', title: `${visit.label}: ${poi.name}`, text: parts.join(' · '), link: `/karte/ort/${poi.id}` });
  },
};

export const rumorHandler: ActivityHandler = {
  cancelLabel: 'Suche abbrechen',
  complete(d, a) {
    const r = rumorDef(String(a.payload.rumorId));
    const state = d.map.rumors[r.id];
    if (state) state.resolved = true;
    incStat(d, 'rumorsFollowed');
    addXp(d, 'netzwerk', 6);
    if (r.target.kind === 'spot') revealSpot(d, r.target.id, 'rumor', 30);
    else revealPoi(d, r.target.id, 'rumor');
    // Following a rumor also teaches you a bit about the district.
    const districtId = r.target.kind === 'spot' ? spotDef(r.target.id).districtId : poiDef(r.target.id).districtId;
    const st = districtState(d, districtId);
    d.map.districts[districtId] = { ...st, explored: Math.min(100, st.explored + 3) };
  },
};
