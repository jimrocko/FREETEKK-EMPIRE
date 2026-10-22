/** Minimal key/value storage so the save system can run on localStorage, in tests, or elsewhere later. */
export interface SaveStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function createMemoryStorage(initial: Record<string, string> = {}): SaveStorage & { data: Record<string, string> } {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    get: (k) => (k in data ? data[k] : null),
    set: (k, v) => {
      data[k] = v;
    },
    remove: (k) => {
      delete data[k];
    },
  };
}

export function createLocalStorage(): SaveStorage | null {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const probe = '__tekklife_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      get: (k) => ls.getItem(k),
      set: (k, v) => ls.setItem(k, v),
      remove: (k) => ls.removeItem(k),
    };
  } catch {
    return null;
  }
}
