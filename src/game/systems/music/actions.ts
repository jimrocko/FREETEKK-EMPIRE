import { defineAction } from '../../core/actions';
import { minutes } from '../../core/time';
import { fmtMoney } from '../../core/format';
import { MIX_EFFORTS } from '../../content/music';
import { PERSONS_BY_ID, personDef } from '../../content/registry';
import { chance } from '../../core/rng';
import { startActivity } from '../activities/logic';
import { moneyReason, spend } from '../finance/logic';
import { addRep, incStat } from '../progression/logic';
import { adjustRelation, adjustTrust, knowsPerson, shortName } from '../people/logic';
import { sendDirect } from '../messages/logic';
import { notify } from '../../core/notify';
import { findTrack, genreDef, planReason, type ProductionPlan } from './logic';
import type { Track } from './state';

export const UPLOAD_FEE = 10;
const DJ_ROLES = ['dj', 'producer', 'artist'];

export const produceTrack = defineAction<ProductionPlan>({
  id: 'music.produce',
  check: (s, p) => planReason(s, p),
  run: (d, p) => {
    const effort = MIX_EFFORTS.find((e) => e.id === p.effort)!;
    const track: Track = {
      id: `t${d.music.nextId++}`,
      name: p.name.trim(),
      genreId: p.genreId,
      bpm: Math.round(p.bpm),
      elements: {},
      arrangement: p.arrangement,
      effort: p.effort,
      stats: { energie: 0, druck: 0, groove: 0, haerte: 0, melodie: 0, atmosphaere: 0, originalitaet: 0, qualitaet: 0 },
      score: 0,
      createdAt: d.clock.now,
      status: 'producing',
      hype: 1,
      givenTo: [],
      playedBy: [],
    };
    d.music.tracks.push(track);
    const a = startActivity(d, {
      kind: 'produce',
      channel: 'studio',
      label: `Produktion: ${track.name}`,
      durationMs: minutes(effort.minutes),
      payload: { trackId: track.id, plan: JSON.stringify(p) },
    });
    for (const uid of new Set(Object.values(p.elements))) {
      if (uid && d.inventory.items[uid]) d.inventory.items[uid].locked = `studio:${a.id}`;
    }
    return `Studio läuft: ${track.name} (${genreDef(p.genreId).name}).`;
  },
});

export const uploadTrack = defineAction<{ trackId: string }>({
  id: 'music.upload',
  check: (s, p) => {
    const t = findTrack(s, p.trackId);
    if (!t || t.status !== 'done') return 'Track ist noch nicht fertig.';
    if (t.uploadedAt !== undefined) return 'Schon online.';
    return moneyReason(s, UPLOAD_FEE);
  },
  run: (d, p) => {
    const t = findTrack(d, p.trackId)!;
    spend(d, UPLOAD_FEE, 'music', `Vertrieb: ${t.name}`);
    t.uploadedAt = d.clock.now;
    t.hype = Math.max(t.hype, 1 + Math.min(2, d.progression.reputation / 800));
    incStat(d, 'tracksUploaded');
    if (t.score >= 50) addRep(d, 1);
    return `${t.name} ist online. Streams bringen ab jetzt Geld (${fmtMoney(UPLOAD_FEE)} Vertrieb).`;
  },
});

export const giveTrack = defineAction<{ trackId: string; personId: string }>({
  id: 'music.give',
  check: (s, p) => {
    const t = findTrack(s, p.trackId);
    if (!t || t.status !== 'done') return 'Track ist noch nicht fertig.';
    const person = PERSONS_BY_ID.get(p.personId);
    if (!person || !knowsPerson(s, p.personId)) return 'Unbekannter Kontakt.';
    if (!person.roles.some((r) => DJ_ROLES.includes(r))) return `${shortName(person)} legt nicht auf.`;
    if (s.people.people[p.personId].trust < 10) return `${shortName(person)} kennt dich noch zu wenig (Vertrauen 10).`;
    if (t.givenTo.includes(p.personId)) return 'Hat den Track schon.';
    return null;
  },
  run: (d, p) => {
    const t = findTrack(d, p.trackId)!;
    const person = personDef(p.personId);
    t.givenTo.push(person.id);
    incStat(d, 'tracksGiven');
    adjustTrust(d, person.id, Math.round(t.score / 15));
    adjustRelation(d, person.id, 3);
    const quality = t.score >= 70 ? 'top' : t.score >= 45 ? 'mid' : 'low';
    const replies = {
      top: `„${t.name}“? Bombe. Läuft am Wochenende, versprochen.`,
      mid: `Hab „${t.name}“ gehört. Solide! Mal sehen, ob er ins Set passt.`,
      low: `Danke für „${t.name}“… da geht noch was. Bleib dran.`,
    };
    sendDirect(d, person.id, replies[quality], { online: true });
    // Good tracks get played – a known DJ spreads your name.
    if (t.score >= 55 && chance(d, t.score / 120)) {
      t.playedBy.push(person.id);
      const rep = Math.max(1, Math.round(person.stats.bekanntheit / 15));
      addRep(d, rep);
      if (t.uploadedAt !== undefined) t.hype += person.stats.bekanntheit / 100;
      incStat(d, 'tracksPlayed');
      notify(d, { tone: 'discovery', title: `${shortName(person)} spielt deinen Track`, text: `„${t.name}“ lief auf einer Party. +${rep} Reputation.`, link: '/studio/tracks' });
    }
    return `${t.name} an ${shortName(person)} geschickt.`;
  },
});

export const deleteTrack = defineAction<{ trackId: string }>({
  id: 'music.delete',
  check: (s, p) => {
    const t = findTrack(s, p.trackId);
    if (!t || t.status !== 'done') return 'Track nicht gefunden.';
    if (t.uploadedAt !== undefined) return 'Online-Tracks bleiben im Katalog.';
    return null;
  },
  run: (d, p) => {
    d.music.tracks = d.music.tracks.filter((t) => t.id !== p.trackId);
    return 'Track gelöscht.';
  },
});
