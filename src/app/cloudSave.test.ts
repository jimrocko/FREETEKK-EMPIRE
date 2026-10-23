import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../game/state';
import { serializeSave } from '../game/save/saveManager';

/** A stand-in for the claude.ai viewer runtime with an in-memory db. */
function fakeViewer() {
  const docs = new Map<string, Record<string, unknown>>();
  const db = {
    doc: (path: string) => ({
      get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
      set: async (data: Record<string, unknown>) => void docs.set(path, structuredClone(data)),
      delete: async () => void docs.delete(path),
    }),
  };
  const user = { id: async () => 'u1' };
  (globalThis as { claude?: unknown }).claude = { use: async (name: string) => (name === 'db' ? db : name === 'user' ? user : null) };
  return docs;
}

const flush = () => new Promise((r) => setTimeout(r, 20));

describe('cloud save', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    delete (globalThis as { claude?: unknown }).claude;
  });

  it('round-trips a save, compressed, in the private user document', async () => {
    const docs = fakeViewer();
    const { readCloud, writeCloud } = await import('./cloudSave');
    const s = createInitialState({ now: 1000, seed: 1, playerName: 'Cloudi' });
    const text = serializeSave(s, 1000);
    expect(await writeCloud({ text, savedAt: 1000, playTimeMs: 5 })).toBe('saved');
    const body = docs.get('data/users/u1/save')!;
    expect(body.enc).toBe('gzip');
    expect((body.data as string).length).toBeLessThan(text.length);
    expect(await readCloud()).toEqual({ text, savedAt: 1000, playTimeMs: 5 });
  });

  it('does nothing outside the viewer', async () => {
    const { cloudAvailable, readCloud, writeCloud } = await import('./cloudSave');
    expect(await cloudAvailable()).toBe(false);
    expect(await readCloud()).toBeNull();
    expect(await writeCloud({ text: '{}', savedAt: 1, playTimeMs: 0 })).toBe('unavailable');
  });

  it('a fresh device loads the cloud game; a reset deletes it', async () => {
    vi.useFakeTimers({ toFake: ['setInterval'] });
    const docs = fakeViewer();
    const { writeCloud } = await import('./cloudSave');
    const remote = createInitialState({ now: Date.now(), seed: 2, playerName: 'Cloudi' });
    await writeCloud({ text: serializeSave(remote, Date.now()), savedAt: Date.now(), playTimeMs: 60_000 });

    const { boot, resetGame } = await import('./runtime');
    const { appStore } = await import('./store');
    boot();
    await flush();
    expect(appStore.getState().game?.player.name).toBe('Cloudi');
    expect(appStore.getState().cloud).toBe('on');

    resetGame();
    await flush();
    expect(docs.has('data/users/u1/save')).toBe(false);
    vi.useRealTimers();
  });
});
