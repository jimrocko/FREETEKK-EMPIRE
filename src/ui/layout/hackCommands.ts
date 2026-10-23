import type { ActionDef } from '../../game/core/actions';
import { GAME_DAY_MS } from '../../game/core/time';
import { parseAmount, parseDuration } from './hackParse';
import { fmtNumber } from '../../game/core/format';
import {
  cheatClearDebts,
  cheatCooldowns,
  cheatCrew,
  cheatFinish,
  cheatMeetAll,
  cheatMoney,
  cheatPoints,
  cheatRep,
  cheatRepair,
  cheatRevealMap,
  cheatSkills,
  cheatUnlockAll,
} from '../../game/systems/admin/actions';
import { debugNextMessage } from '../../game/systems/messages/actions';
import { debugHappening } from '../../game/systems/happenings/actions';
import { dispatch, skipTime } from '../../app/runtime';

export type HackLineKind = 'in' | 'ok' | 'err' | 'sys';

export interface HackLine {
  kind: HackLineKind;
  text: string;
}

interface CommandDef {
  names: string[];
  usage: string;
  help: string;
  run: (args: string[]) => HackLine[];
}

const ok = (text: string): HackLine[] => [{ kind: 'ok', text }];
const err = (text: string): HackLine[] => [{ kind: 'err', text }];

function run<P>(action: ActionDef<P>, payload: P): HackLine[] {
  const r = dispatch(action, payload, { silent: true });
  return r.ok ? ok(r.message ?? 'OK.') : err(r.reason);
}

const MAX_AMOUNT = 1_000_000_000;

const COMMANDS: CommandDef[] = [
  {
    names: ['geld', 'money', 'cash'],
    usage: 'geld [betrag]',
    help: 'Geld aufs Konto, z. B. geld 50k',
    run: ([a]) => {
      const amount = parseAmount(a, 10000);
      if (!(amount > 0) || amount > MAX_AMOUNT) return err(`Betrag zwischen 1 und ${fmtNumber(MAX_AMOUNT)} €.`);
      return run(cheatMoney, { amount });
    },
  },
  {
    names: ['rep', 'ruf'],
    usage: 'rep [menge]',
    help: 'Reputation dazu',
    run: ([a]) => {
      const amount = Math.round(parseAmount(a, 100));
      if (!(amount > 0) || amount > 1_000_000) return err('Menge zwischen 1 und 1.000.000.');
      return run(cheatRep, { amount });
    },
  },
  {
    names: ['sp', 'punkte'],
    usage: 'sp [menge]',
    help: 'Szenepunkte für Freischaltungen',
    run: ([a]) => {
      const amount = Math.round(parseAmount(a, 10));
      if (!(amount > 0) || amount > 10000) return err('Menge zwischen 1 und 10.000.');
      return run(cheatPoints, { amount });
    },
  },
  {
    names: ['skills', 'level'],
    usage: 'skills [level]',
    help: 'Alle Fähigkeiten aufleveln',
    run: ([a]) => {
      const levels = Math.round(parseAmount(a, 1));
      if (!(levels > 0) || levels > 20) return err('1 bis 20 Level.');
      return run(cheatSkills, { levels });
    },
  },
  {
    names: ['zeit', 'time', 'skip'],
    usage: 'zeit [8h|2d|1w]',
    help: 'Spielzeit vorspulen',
    run: ([a]) => {
      const ms = parseDuration(a);
      if (!(ms > 0) || ms > 30 * GAME_DAY_MS) return err('Dauer wie 30min, 8h, 2d oder 1w – höchstens 30 Tage.');
      skipTime(ms);
      return ok(`Zeitsprung: ${a ?? '1h'} vorgespult.`);
    },
  },
  { names: ['karte', 'map'], usage: 'karte', help: 'Ganze Stadt aufdecken', run: () => run(cheatRevealMap, {}) },
  { names: ['kontakte', 'people'], usage: 'kontakte', help: 'Alle Leute kennen und Vertrauen', run: () => run(cheatMeetAll, {}) },
  { names: ['reparieren', 'repair'], usage: 'reparieren', help: 'Alles Equipment wie neu', run: () => run(cheatRepair, {}) },
  { names: ['crew'], usage: 'crew', help: 'Crew-Motivation auf 100', run: () => run(cheatCrew, {}) },
  { names: ['turbo', 'fertig'], usage: 'turbo', help: 'Alles Laufende sofort fertig', run: () => run(cheatFinish, {}) },
  { names: ['cooldowns', 'cd'], usage: 'cooldowns', help: 'Lifestyle-Abklingzeiten weg', run: () => run(cheatCooldowns, {}) },
  { names: ['freischalten', 'unlock'], usage: 'freischalten', help: 'Ganzen Freischaltungsbaum öffnen', run: () => run(cheatUnlockAll, {}) },
  { names: ['schulden', 'debts'], usage: 'schulden', help: 'Kredite und Minus löschen', run: () => run(cheatClearDebts, {}) },
  { names: ['nachricht', 'msg'], usage: 'nachricht', help: 'Nächste Nachricht sofort', run: () => run(debugNextMessage, {}) },
  { names: ['ereignis', 'event'], usage: 'ereignis', help: 'Zufallsereignis auslösen', run: () => run(debugHappening, {}) },
];

export const HELP_LINES: HackLine[] = [
  { kind: 'sys', text: 'Befehle:' },
  ...COMMANDS.map((c) => ({ kind: 'sys' as const, text: `  ${c.usage} – ${c.help}` })),
  { kind: 'sys', text: '  clear – Bildschirm leeren' },
  { kind: 'sys', text: '  exit – Menü schließen' },
];

export type HackResult = { lines: HackLine[]; clear?: boolean; exit?: boolean };

/** Runs one command line. */
export function runHackCommand(input: string): HackResult {
  const [name, ...args] = input.trim().split(/\s+/);
  const key = (name ?? '').toLowerCase();
  if (!key) return { lines: [] };
  if (key === 'help' || key === 'hilfe' || key === '?') return { lines: HELP_LINES };
  if (key === 'clear' || key === 'cls') return { lines: [], clear: true };
  if (key === 'exit' || key === 'quit') return { lines: [], exit: true };
  const cmd = COMMANDS.find((c) => c.names.includes(key));
  if (!cmd) return { lines: err(`Unbekannter Befehl: ${name}. Tippe help.`) };
  return { lines: cmd.run(args) };
}
