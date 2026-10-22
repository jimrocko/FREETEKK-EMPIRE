import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { Tone } from '../game/core/types';

export interface Toast {
  id: number;
  tone: Tone;
  title: string;
  text?: string;
  link?: string;
}

interface ToastState {
  toasts: Toast[];
  nextId: number;
}

export const toastStore = createStore<ToastState>(() => ({ toasts: [], nextId: 1 }));

const MAX_TOASTS = 3;
const LIFETIME_MS = 4500;

export function pushToast(t: Omit<Toast, 'id'>): void {
  const { nextId, toasts } = toastStore.getState();
  const toast = { ...t, id: nextId };
  toastStore.setState({ nextId: nextId + 1, toasts: [...toasts, toast].slice(-MAX_TOASTS) });
  setTimeout(() => dismissToast(toast.id), LIFETIME_MS);
}

export function dismissToast(id: number): void {
  toastStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
}

export function useToasts(): Toast[] {
  return useStore(toastStore, (s) => s.toasts);
}
