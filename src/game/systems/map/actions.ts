import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { fmtMoney } from '../../core/format';
import { DISTRICTS_BY_ID, POIS_BY_ID, RUMORS_BY_ID, districtDef, poiDef, rumorDef } from '../../content/registry';
import { channelReason, startActivity } from '../activities/logic';
import { earn, moneyReason, spend } from '../finance/logic';
import { incStat } from '../progression/logic';
import { storageCapacity, usedVolume } from '../inventory/logic';
import { districtLockReason, districtState, exploreDurationMin, isPoiKnown, mobilityFactor } from './logic';

export const exploreDistrict = defineAction<{ districtId: string }>({
  id: 'map.explore',
  check: (s, p) => {
    const def = DISTRICTS_BY_ID.get(p.districtId);
    if (!def || def.cityId !== s.map.cityId) return 'Unbekannter Bezirk.';
    return districtLockReason(s, def) ?? channelReason(s, 'explore');
  },
  run: (d, p) => {
    const def = districtDef(p.districtId);
    startActivity(d, {
      kind: 'explore',
      channel: 'explore',
      label: `Erkunden: ${def.name}`,
      durationMs: minutes(exploreDurationMin(d, def)),
      payload: { districtId: def.id },
    });
    const explored = districtState(d, def.id).explored;
    return explored >= 100 ? `Du streifst noch einmal durch ${def.name}.` : `Du ziehst los: ${def.name}.`;
  },
});

export const visitPoi = defineAction<{ poiId: string }>({
  id: 'map.visit',
  check: (s, p) => {
    const def = POIS_BY_ID.get(p.poiId);
    if (!def?.visit) return 'Hier kann man nicht hingehen.';
    if (!isPoiKnown(s, def.id)) return 'Ort ist noch unbekannt.';
    return moneyReason(s, def.visit.cost) ?? channelReason(s, 'explore');
  },
  run: (d, p) => {
    const def = poiDef(p.poiId);
    const visit = def.visit!;
    if (visit.cost > 0) spend(d, visit.cost, 'network', `${visit.label}: ${def.name}`);
    startActivity(d, {
      kind: 'visit',
      channel: 'explore',
      label: `${visit.label}: ${def.name}`,
      durationMs: minutes(Math.max(1, visit.durationMin * mobilityFactor(d))),
      payload: { poiId: def.id },
    });
    return `Unterwegs zu ${def.name}.`;
  },
});

export const followRumor = defineAction<{ rumorId: string }>({
  id: 'map.followRumor',
  check: (s, p) => {
    const r = RUMORS_BY_ID.get(p.rumorId);
    const st = s.map.rumors[p.rumorId];
    if (!r || !st) return 'Gerücht unbekannt.';
    if (st.resolved) return 'Diesem Gerücht bist du schon nachgegangen.';
    if (s.activities.running.some((a) => a.kind === 'rumor' && a.payload.rumorId === p.rumorId)) return 'Du gehst dem schon nach.';
    return channelReason(s, 'explore');
  },
  run: (d, p) => {
    const r = rumorDef(p.rumorId);
    startActivity(d, {
      kind: 'rumor',
      channel: 'explore',
      label: 'Gerücht nachgehen',
      durationMs: minutes(Math.max(1, r.followMin * mobilityFactor(d))),
      payload: { rumorId: r.id },
    });
    return 'Du gehst dem Gerücht nach.';
  },
});

export const rentStorage = defineAction<{ poiId: string }>({
  id: 'map.rentStorage',
  check: (s, p) => {
    const def = POIS_BY_ID.get(p.poiId);
    if (!def?.storage) return 'Hier gibt es nichts zu mieten.';
    if (!isPoiKnown(s, def.id)) return 'Ort ist noch unbekannt.';
    if (s.map.rentals[def.id]) return 'Schon gemietet.';
    return moneyReason(s, def.storage.deposit + def.storage.perDay);
  },
  run: (d, p) => {
    const def = poiDef(p.poiId);
    const storage = def.storage!;
    spend(d, storage.deposit, 'property', `Kaution: ${def.name}`);
    spend(d, storage.perDay, 'property', `Miete: ${def.name}`);
    d.map.rentals[def.id] = { since: d.clock.now };
    incStat(d, 'storageRented');
    return `${def.name} gemietet (+${storage.capacityL} L).`;
  },
});

export const cancelStorage = defineAction<{ poiId: string }>({
  id: 'map.cancelStorage',
  check: (s, p) => {
    const def = POIS_BY_ID.get(p.poiId);
    if (!def?.storage || !s.map.rentals[p.poiId]) return 'Nicht gemietet.';
    const after = storageCapacity(s) - def.storage.capacityL;
    if (usedVolume(s) > after) return `Erst Platz schaffen: Danach wären nur ${after} L frei für ${Math.ceil(usedVolume(s))} L Zeug.`;
    return null;
  },
  run: (d, p) => {
    const def = poiDef(p.poiId);
    delete d.map.rentals[def.id];
    earn(d, def.storage!.deposit, 'property', `Kaution zurück: ${def.name}`);
    return `${def.name} gekündigt – ${fmtMoney(def.storage!.deposit)} Kaution zurück.`;
  },
});
