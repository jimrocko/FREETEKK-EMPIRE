import { produce } from 'immer';
import { appStore, updateGame } from './store';
import { now } from './clock';
import { pushToast } from './toasts';
import { createInitialState, type GameState } from '../game/state';
import { OFFLINE_REPORT_THRESHOLD, catchUp, performAction, tick, type CatchUpReport } from '../game/engine';
import type { ActionDef, ActionResult } from '../game/core/actions';
import { createLocalStorage, createMemoryStorage, type SaveStorage } from '../game/save/storage';
import { deleteSave, importSave, loadSave, writeSave } from '../game/save/saveManager';

const TICK_MS = 1000;
const AUTOSAVE_MS = 10_000;
/** Gaps longer than this are treated as "away" (tab in background, device asleep). */
const AWAY_GAP_MS = OFFLINE_REPORT_THRESHOLD;
/** Play time counts at most this much per tick (protects against sleep gaps). */
const MAX_PLAYTIME_STEP = 5000;

let storage: SaveStorage = createMemoryStorage();
let tickTimer: ReturnType<typeof setInterval> | null = null;
let saveTimer: ReturnType<typeof setInterval> | null = null;
let listenersAttached = false;

function randomSeed(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto?.getRandomValues?.(buf);
  return buf[0] || Math.floor(Math.random() * 2 ** 32);
}

function applyCatchUp(game: GameState, at: number): { game: GameState; report: CatchUpReport | null } {
  let report: CatchUpReport | null = null;
  const next = produce(game, (d) => {
    report = catchUp(d as GameState, at);
  });
  return { game: next, report };
}

export function saveNow(): boolean {
  const { game } = appStore.getState();
  if (!game) return false;
  const t = now();
  try {
    writeSave(storage, { ...game, meta: { ...game.meta, lastSavedAt: t } }, t);
    appStore.setState({ lastSavedAt: t, dirty: false, saveError: null });
    return true;
  } catch (err) {
    appStore.setState({ saveError: `Speichern fehlgeschlagen: ${(err as Error).message}` });
    return false;
  }
}

function step(): void {
  const { game } = appStore.getState();
  if (!game) return;
  const t = now();
  const gap = t - game.clock.now;
  if (gap >= AWAY_GAP_MS) {
    const { game: next, report } = applyCatchUp(game, t);
    appStore.setState((s) => ({ game: next, dirty: true, report: report ?? s.report }));
    return;
  }
  updateGame((d) => {
    tick(d, t);
    if (gap > 0) d.meta.playTimeMs += Math.min(gap, MAX_PLAYTIME_STEP);
  });
}

function startLoop(): void {
  if (!tickTimer) tickTimer = setInterval(step, TICK_MS);
  if (!saveTimer)
    saveTimer = setInterval(() => {
      if (appStore.getState().dirty) saveNow();
    }, AUTOSAVE_MS);
  if (!listenersAttached && typeof document !== 'undefined') {
    listenersAttached = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveNow();
      else step();
    });
    window.addEventListener('pagehide', () => saveNow());
    window.addEventListener('beforeunload', () => saveNow());
  }
}

/** Loads the saved game (or prepares the start screen) and starts the loop. */
export function boot(): void {
  const local = createLocalStorage();
  storage = local ?? createMemoryStorage();
  appStore.setState({ volatileStorage: !local });
  const loaded = loadSave(storage);
  if (loaded.state) {
    const { game, report } = applyCatchUp(loaded.state, now());
    appStore.setState({
      game,
      report,
      loadWarning: 'warning' in loaded ? (loaded.warning ?? null) : null,
      loadError: null,
      dirty: true,
    });
    saveNow();
  } else {
    appStore.setState({ game: null, loadError: 'error' in loaded ? (loaded.error ?? null) : null });
  }
  startLoop();
}

export function startNewGame(playerName: string): void {
  const game = createInitialState({ now: now(), seed: randomSeed(), playerName });
  appStore.setState({ game, report: null, loadError: null, loadWarning: null, dirty: true });
  saveNow();
}

export function importGame(text: string): ActionResult {
  const parsed = importSave(text);
  if (!parsed.ok) return { ok: false, reason: parsed.error };
  const { game, report } = applyCatchUp(parsed.state, now());
  appStore.setState({ game, report, loadError: null, loadWarning: null, dirty: true });
  saveNow();
  return { ok: true, message: 'Spielstand importiert.' };
}

export function resetGame(): void {
  deleteSave(storage);
  appStore.setState({ game: null, report: null, dirty: false, lastSavedAt: null, loadError: null, loadWarning: null });
}

export function dismissReport(): void {
  appStore.setState({ report: null });
}

/** Runs a player action against the live game and shows the result as a toast. */
export function dispatch<P>(action: ActionDef<P>, payload: P, opts: { silent?: boolean } = {}): ActionResult {
  let result = { ok: false, reason: 'Kein Spiel geladen.' } as ActionResult;
  const current = appStore.getState().game;
  // Catch up first after a long pause, so the offline cap and report apply.
  if (current && now() - current.clock.now >= AWAY_GAP_MS) step();
  updateGame((d) => {
    result = performAction(d, action, payload, now());
  });
  if (!opts.silent) {
    if (result.ok && result.message) pushToast({ tone: 'success', title: result.message });
    else if (!result.ok) pushToast({ tone: 'warning', title: result.reason });
  }
  return result;
}

/** Debug: jump forward in time (dev builds only). */
export function debugAdvance(ms: number, addOffset: (ms: number) => void): void {
  addOffset(ms);
  step();
}
