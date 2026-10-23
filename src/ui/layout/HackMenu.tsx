import { useEffect, useRef, useState, type FormEvent } from 'react';
import { appStore, useGameState } from '../../app/store';
import { stat } from '../../game/systems/progression/logic';
import { fmtMoney, fmtNumber } from '../../game/core/format';
import { sfx } from '../fx/sound';
import { closeHack, useHackOpen } from './hackState';
import { runHackCommand, type HackLine } from './hackCommands';

const BOOT: HackLine[] = [
  { kind: 'sys', text: 'TEKK-OS 6.6.6 // root-zugang' },
  { kind: 'sys', text: '> verbinde mit szene-mainframe …' },
  { kind: 'sys', text: '> umgehe firewall vom ordnungsamt … ok' },
  { kind: 'sys', text: '> lade cheat-module … ok' },
  { kind: 'ok', text: 'ACCESS GRANTED. Tippe help oder nimm die Knöpfe.' },
];

/** Quick commands for thumbs – each one runs a terminal command. */
const GROUPS: { title: string; items: [label: string, cmd: string][] }[] = [
  {
    title: 'Geld',
    items: [
      ['+1.000 €', 'geld 1000'],
      ['+10.000 €', 'geld 10k'],
      ['+100.000 €', 'geld 100k'],
      ['+1 Mio €', 'geld 1m'],
    ],
  },
  {
    title: 'Ruf & Können',
    items: [
      ['+100 Rep', 'rep 100'],
      ['+1.000 Rep', 'rep 1000'],
      ['+10 Szenepunkte', 'sp 10'],
      ['Skills +1', 'skills 1'],
      ['Skills +5', 'skills 5'],
    ],
  },
  {
    title: 'Zeit',
    items: [
      ['+1 Std', 'zeit 1h'],
      ['+10 Std', 'zeit 10h'],
      ['+1 Tag', 'zeit 1d'],
      ['+1 Woche', 'zeit 1w'],
      ['Turbo: alles fertig', 'turbo'],
    ],
  },
  {
    title: 'Welt',
    items: [
      ['Karte aufdecken', 'karte'],
      ['Alle Kontakte', 'kontakte'],
      ['Alles reparieren', 'reparieren'],
      ['Crew glücklich', 'crew'],
      ['Alle Freischaltungen', 'freischalten'],
      ['Schulden weg', 'schulden'],
      ['Cooldowns weg', 'cooldowns'],
      ['Nachricht', 'nachricht'],
      ['Ereignis', 'ereignis'],
    ],
  },
];

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function HackMenu() {
  const open = useHackOpen();
  return open ? <HackTerminal /> : null;
}

function HackTerminal() {
  const s = useGameState();
  const [lines, setLines] = useState<HackLine[]>(() => (reducedMotion() ? BOOT : []));
  const [input, setInput] = useState('');
  const screen = useRef<HTMLDivElement>(null);
  const history = useRef<string[]>([]);
  const histPos = useRef(0);

  // Boot sequence, typed line by line.
  useEffect(() => {
    if (reducedMotion()) return;
    sfx.hack();
    const timers = BOOT.map((line, i) => setTimeout(() => setLines((l) => [...l, line]), 90 + i * 140));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    screen.current?.scrollTo({ top: screen.current.scrollHeight });
  }, [lines]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeHack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const exec = (cmd: string) => {
    const res = runHackCommand(cmd);
    history.current = [...history.current, cmd].slice(-30);
    histPos.current = history.current.length;
    if (res.exit) {
      closeHack();
      return;
    }
    const echo: HackLine = { kind: 'in', text: cmd };
    setLines((l) => [...(res.clear ? [] : l), echo, ...res.lines].slice(-80));
    if (res.lines.some((x) => x.kind === 'err')) sfx.error();
    else if (res.lines.length) sfx.ok();
    // A long time jump brings up the offline report – step aside for it.
    if (appStore.getState().report) closeHack();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    exec(input.trim());
    setInput('');
  };

  return (
    <div className="hack" role="dialog" aria-modal="true" aria-label="Hack-Menü" data-testid="hack-menu">
      <div className="hack__bar">
        <span className="hack__title">root@tekk-mainframe:~#</span>
        <button className="hack__close" onClick={closeHack} aria-label="Hack-Menü schließen" data-testid="hack-close">
          [x]
        </button>
      </div>
      <div className="hack__status">
        <span>KONTO {fmtMoney(s.finance.cash)}</span>
        <span>REP {fmtNumber(s.progression.reputation)}</span>
        <span>SP {s.progression.points}</span>
        <span>CHEATS {stat(s, 'cheatsUsed')}</span>
      </div>
      <div className="hack__screen" ref={screen} data-testid="hack-log" aria-live="polite">
        {lines.map((l, i) => (
          <div key={i} className={`hack__line hack__line--${l.kind}`}>
            {l.kind === 'in' ? `> ${l.text}` : l.text}
          </div>
        ))}
        <span className="hack__cursor" aria-hidden="true" />
      </div>
      <div className="hack__groups">
        {GROUPS.map((g) => (
          <section key={g.title} className="hack__group">
            <div className="hack__group-title">// {g.title}</div>
            <div className="hack__buttons">
              {g.items.map(([label, cmd]) => (
                <button key={cmd} className="hack__btn" onClick={() => exec(cmd)} data-testid={`hack-${cmd.replace(/\s+/g, '-')}`}>
                  {label}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <form className="hack__prompt" onSubmit={submit}>
        <span aria-hidden="true">&gt;</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && history.current.length) {
              histPos.current = Math.max(0, histPos.current - 1);
              setInput(history.current[histPos.current] ?? '');
            } else if (e.key === 'ArrowDown') {
              histPos.current = Math.min(history.current.length, histPos.current + 1);
              setInput(history.current[histPos.current] ?? '');
            }
          }}
          placeholder="befehl eingeben … (help)"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-label="Befehl"
          data-testid="hack-input"
        />
        <button type="submit" className="hack__btn" data-testid="hack-run">
          RUN
        </button>
      </form>
    </div>
  );
}
