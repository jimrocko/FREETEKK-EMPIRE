import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

function readHash(): string {
  if (typeof location === 'undefined') return '/';
  const h = location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : '/';
}

const routeStore = createStore<{ path: string }>(() => ({ path: readHash() }));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    routeStore.setState({ path: readHash() });
  });
}

export function navigate(path: string): void {
  if (typeof location === 'undefined') return;
  if (readHash() === path) return;
  location.hash = path;
  routeStore.setState({ path });
  window.scrollTo({ top: 0 });
}

export function useRoute(): string {
  return useStore(routeStore, (s) => s.path);
}
