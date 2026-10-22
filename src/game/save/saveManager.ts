import { STATE_VERSION, type GameState } from '../state';
import { hashString } from '../core/rng';
import { migrate } from './migrations';
import { hydrate, validateState } from './hydrate';
import type { SaveStorage } from './storage';

export const SAVE_FORMAT = 'tekklife';
export const SLOT_MAIN = 'tekklife.save.main';
export const SLOT_BACKUP = 'tekklife.save.backup';
const EXPORT_PREFIX = 'TEKKLIFE1:';

interface SaveEnvelope {
  format: string;
  v: number;
  savedAt: number;
  checksum: number;
  data: unknown;
}

export type ParseResult = { ok: true; state: GameState; savedAt: number } | { ok: false; error: string };

export function serializeSave(state: GameState, savedAt: number): string {
  const data = JSON.stringify(state);
  const envelope = `{"format":"${SAVE_FORMAT}","v":${state.meta.version},"savedAt":${savedAt},"checksum":${hashString(data)},"data":${data}}`;
  return envelope;
}

export function parseSave(text: string | null): ParseResult {
  if (!text) return { ok: false, error: 'Kein Spielstand vorhanden.' };
  let env: SaveEnvelope;
  try {
    env = JSON.parse(text) as SaveEnvelope;
  } catch {
    return { ok: false, error: 'Spielstand ist kein gültiges JSON.' };
  }
  if (env?.format !== SAVE_FORMAT || typeof env.data !== 'object' || env.data === null) {
    return { ok: false, error: 'Unbekanntes Spielstand-Format.' };
  }
  if (hashString(JSON.stringify(env.data)) !== env.checksum) {
    return { ok: false, error: 'Prüfsumme stimmt nicht – Spielstand beschädigt.' };
  }
  if (typeof env.v !== 'number' || env.v > STATE_VERSION) {
    return { ok: false, error: 'Spielstand stammt aus einer neueren Spielversion.' };
  }
  try {
    const migrated = migrate(env.data, env.v, STATE_VERSION) as Record<string, unknown>;
    const state = hydrate(migrated);
    state.meta.version = STATE_VERSION;
    const problems = validateState(state);
    if (problems.length > 0) return { ok: false, error: `Ungültige Daten: ${problems.join(', ')}` };
    return { ok: true, state, savedAt: env.savedAt };
  } catch (err) {
    return { ok: false, error: `Spielstand konnte nicht gelesen werden (${(err as Error).message}).` };
  }
}

/** Writes the save. The previous valid main save becomes the backup. */
export function writeSave(storage: SaveStorage, state: GameState, now: number): void {
  const previous = storage.get(SLOT_MAIN);
  if (previous && parseSave(previous).ok) storage.set(SLOT_BACKUP, previous);
  storage.set(SLOT_MAIN, serializeSave(state, now));
}

export type LoadResult =
  | { state: GameState; source: 'main' | 'backup'; warning?: string }
  | { state: null; error?: string };

export function loadSave(storage: SaveStorage): LoadResult {
  const mainText = storage.get(SLOT_MAIN);
  const main = parseSave(mainText);
  if (main.ok) return { state: main.state, source: 'main' };
  const backup = parseSave(storage.get(SLOT_BACKUP));
  if (backup.ok) {
    return { state: backup.state, source: 'backup', warning: `Hauptspielstand defekt (${main.error}) – Backup geladen.` };
  }
  if (!mainText) return { state: null };
  return { state: null, error: main.error };
}

export function deleteSave(storage: SaveStorage): void {
  storage.remove(SLOT_MAIN);
  storage.remove(SLOT_BACKUP);
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Portable text code for backups (copy/paste or file). */
export function exportSave(state: GameState, now: number): string {
  return EXPORT_PREFIX + toBase64(serializeSave(state, now));
}

export function importSave(text: string): ParseResult {
  const trimmed = text.trim();
  if (trimmed.startsWith(EXPORT_PREFIX)) {
    try {
      return parseSave(fromBase64(trimmed.slice(EXPORT_PREFIX.length).replace(/\s+/g, '')));
    } catch {
      return { ok: false, error: 'Export-Code ist beschädigt.' };
    }
  }
  return parseSave(trimmed);
}
