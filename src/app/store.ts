import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { produce } from 'immer';
import type { GameState } from '../game/state';
import type { CatchUpReport } from '../game/engine';

export interface AppState {
  /** null until a game was loaded or created. */
  game: GameState | null;
  /** Offline report waiting to be shown. */
  report: CatchUpReport | null;
  /** Problems while loading (shown on the start screen / settings). */
  loadError: string | null;
  loadWarning: string | null;
  saveError: string | null;
  lastSavedAt: number | null;
  /** Game changed since the last save. */
  dirty: boolean;
  /** Storage is not persistent (private mode etc.). */
  volatileStorage: boolean;
}

export const appStore = createStore<AppState>(() => ({
  game: null,
  report: null,
  loadError: null,
  loadWarning: null,
  saveError: null,
  lastSavedAt: null,
  dirty: false,
  volatileStorage: false,
}));

/** Applies an immer recipe to the game state. */
export function updateGame(recipe: (d: GameState) => void): void {
  const { game } = appStore.getState();
  if (!game) return;
  const next = produce(game, (draft) => {
    recipe(draft as GameState);
  });
  if (next !== game) appStore.setState({ game: next, dirty: true });
}

export function useApp<T>(selector: (s: AppState) => T): T {
  return useStore(appStore, selector);
}

/** The current game state. Only use inside the game shell (game is loaded). */
export function useGameState(): GameState {
  return useStore(appStore, (s) => s.game as GameState);
}

/** Selects a stable part of the game state (must return an existing reference or a primitive). */
export function useGame<T>(selector: (s: GameState) => T): T {
  return useStore(appStore, (s) => selector(s.game as GameState));
}
