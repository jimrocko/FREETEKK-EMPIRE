import { defineAction } from '../../core/actions';
import { ITEMS } from '../../content/registry';
import { incStat } from '../progression/logic';
import { availableParts, findSystem, isSystemPart } from './logic';
import type { GameState } from '../../state';

/** A system that is playing right now cannot be changed. */
function inUseReason(s: GameState, systemId: string): string | null {
  const ev = s.events.list.find((e) => e.status === 'running' && e.sound.kind === 'own' && e.sound.systemId === systemId);
  if (ev) return `Läuft gerade auf „${ev.name}“.`;
  return s.activities.running.some((a) => a.kind === 'system-rental' && a.payload.systemId === systemId) ? 'Ist gerade vermietet.' : null;
}

export const MAX_SYSTEMS = 6;

export const createSystem = defineAction<{ name: string }>({
  id: 'sound.create',
  check: (s, p) => {
    const n = p.name.trim();
    if (n.length < 2 || n.length > 28) return 'Name mit 2–28 Zeichen.';
    if (s.sound.systems.length >= MAX_SYSTEMS) return `Mehr als ${MAX_SYSTEMS} Systeme kann niemand verwalten.`;
    return null;
  },
  run: (d, p) => {
    d.sound.systems.push({ id: `sys${d.sound.nextId++}`, name: p.name.trim(), components: [], createdAt: d.clock.now });
    incStat(d, 'systemsBuilt');
    return `Soundsystem „${p.name.trim()}“ angelegt.`;
  },
});

export const addPart = defineAction<{ systemId: string; uid: string }>({
  id: 'sound.add',
  check: (s, p) => {
    if (!findSystem(s, p.systemId)) return 'System nicht gefunden.';
    const it = s.inventory.items[p.uid];
    if (!it || !isSystemPart(ITEMS.get(it.defId))) return 'Passt nicht in ein Soundsystem.';
    if (!availableParts(s).some((x) => x.uid === p.uid)) return 'Ist schon verbaut oder gebunden.';
    return null;
  },
  run: (d, p) => {
    findSystem(d, p.systemId)!.components.push(p.uid);
  },
});

export const removePart = defineAction<{ systemId: string; uid: string }>({
  id: 'sound.remove',
  check: (s, p) => (findSystem(s, p.systemId)?.components.includes(p.uid) ? inUseReason(s, p.systemId) : 'Nicht im System.'),
  run: (d, p) => {
    const sys = findSystem(d, p.systemId)!;
    sys.components = sys.components.filter((x) => x !== p.uid);
  },
});

export const deleteSystem = defineAction<{ systemId: string }>({
  id: 'sound.delete',
  check: (s, p) => (findSystem(s, p.systemId) ? inUseReason(s, p.systemId) : 'System nicht gefunden.'),
  run: (d, p) => {
    d.sound.systems = d.sound.systems.filter((x) => x.id !== p.systemId);
    return 'System aufgelöst – die Teile liegen wieder im Lager.';
  },
});

export const renameSystem = defineAction<{ systemId: string; name: string }>({
  id: 'sound.rename',
  check: (s, p) => {
    if (!findSystem(s, p.systemId)) return 'System nicht gefunden.';
    const n = p.name.trim();
    return n.length < 2 || n.length > 28 ? 'Name mit 2–28 Zeichen.' : null;
  },
  run: (d, p) => {
    findSystem(d, p.systemId)!.name = p.name.trim();
  },
});
