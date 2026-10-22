import { describe, expect, it } from 'vitest';
import { act, advance, newGame } from '../../test/helpers';
import { createMemoryStorage } from './storage';
import { SLOT_BACKUP, SLOT_MAIN, exportSave, importSave, loadSave, parseSave, serializeSave, writeSave } from './saveManager';
import { STATE_VERSION } from '../state';
import { startJob } from '../systems/jobs/actions';
import { MINUTE } from '../core/time';
import { tick } from '../engine';
import { hashString } from '../core/rng';

describe('save system', () => {
  it('round-trips the complete state including running timers', () => {
    const s = newGame();
    act(s, startJob, { jobId: 'job.aufbau' });
    advance(s, 2 * MINUTE);
    const parsed = parseSave(serializeSave(s, s.clock.now));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state).toEqual(s);
    // The loaded game continues exactly like the original.
    tick(s, s.clock.now + 10 * MINUTE);
    tick(parsed.state, parsed.state.clock.now + 10 * MINUTE);
    expect(parsed.state).toEqual(s);
    expect(s.progression.skills.technik).toBe(12);
  });

  it('keeps the previous save as backup and falls back to it when main is corrupt', () => {
    const storage = createMemoryStorage();
    const s = newGame();
    writeSave(storage, s, s.clock.now);
    s.finance.cash = 777;
    writeSave(storage, s, s.clock.now);
    expect(storage.data[SLOT_BACKUP]).toBeDefined();

    storage.data[SLOT_MAIN] = storage.data[SLOT_MAIN].replace('"cash":777', '"cash":999999');
    const loaded = loadSave(storage);
    expect(loaded.state).not.toBeNull();
    if (loaded.state) {
      expect('source' in loaded && loaded.source).toBe('backup');
      expect(loaded.state.finance.cash).toBe(500);
    }
  });

  it('does not overwrite a good backup with a corrupt main save', () => {
    const storage = createMemoryStorage();
    const s = newGame();
    writeSave(storage, s, s.clock.now);
    writeSave(storage, s, s.clock.now);
    const goodBackup = storage.data[SLOT_BACKUP];
    storage.data[SLOT_MAIN] = 'garbage';
    writeSave(storage, s, s.clock.now);
    expect(storage.data[SLOT_BACKUP]).toBe(goodBackup);
  });

  it('returns no state for an empty storage', () => {
    expect(loadSave(createMemoryStorage()).state).toBeNull();
  });

  it('fills slices that are missing in older saves', () => {
    const s = newGame();
    const raw = JSON.parse(serializeSave(s, s.clock.now));
    delete raw.data.goals;
    delete raw.data.progression.skills.business;
    raw.checksum = hashString(JSON.stringify(raw.data));
    const parsed = parseSave(JSON.stringify(raw));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.state.goals).toEqual({ done: {} });
      expect(parsed.state.progression.skills.business).toBe(0);
    }
  });

  it('rejects saves from a newer version', () => {
    const s = newGame();
    const text = serializeSave({ ...s, meta: { ...s.meta, version: STATE_VERSION + 1 } }, s.clock.now);
    const parsed = parseSave(text);
    expect(parsed.ok).toBe(false);
  });

  it('exports and imports a portable code', () => {
    const s = newGame();
    s.player.name = 'Ümläut ß 🎧';
    const code = exportSave(s, s.clock.now);
    expect(code.startsWith('TEKKLIFE1:')).toBe(true);
    const parsed = importSave(code);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.state).toEqual(s);
    expect(importSave('TEKKLIFE1:@@@').ok).toBe(false);
    expect(importSave('hello').ok).toBe(false);
  });
});
