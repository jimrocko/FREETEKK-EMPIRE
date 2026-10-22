# 05 – Projektstruktur & Konventionen

```
/
├─ docs/                      Planung: Analyse, Architektur, Datenmodell, Roadmap, Struktur
├─ e2e/                       Playwright-Tests (iPhone- und Desktop-Viewport)
├─ public/                    statische Dateien (Icon, Manifest)
├─ src/
│  ├─ main.tsx                Einstiegspunkt
│  ├─ app/                    Verbindung Spiel ↔ React
│  │  ├─ store.ts             Zustand-Store mit dem GameState
│  │  ├─ runtime.ts           Spielschleife, Autosave, Sichtbarkeit, Offline-Bericht
│  │  └─ hooks.ts             useGame, useAction, useNow …
│  ├─ game/                   reine Spiellogik (kein React, kein DOM)
│  │  ├─ core/                Grundbausteine
│  │  │  ├─ types.ts          GameState, Slices, gemeinsame Typen
│  │  │  ├─ rng.ts            deterministischer Zufall
│  │  │  ├─ time.ts           Spieluhr (Tage, Wochentage, Nächte)
│  │  │  ├─ simulation.ts     advanceTo, System-Hooks
│  │  │  ├─ actions.ts        defineAction, Ausführung
│  │  │  ├─ conditions.ts     Bedingungen prüfen + beschreiben
│  │  │  ├─ effects.ts        Effekte anwenden + beschreiben
│  │  │  ├─ notify.ts         Feed
│  │  │  └─ format.ts         Geld/Zeit-Formatierung (de-DE)
│  │  ├─ content/             Daten (Items, Jobs, Ziele, Reputation-Stufen, …) + Registry + Validierung
│  │  ├─ systems/             ein Ordner pro System
│  │  │  ├─ activities/       Timer/Kanäle
│  │  │  ├─ finance/          Geld, Ledger, laufende Kosten
│  │  │  ├─ progression/      Fähigkeiten, Reputation, Statistiken, Flags
│  │  │  ├─ inventory/        Items, Stauraum, Werte
│  │  │  ├─ jobs/             Nebenjobs
│  │  │  ├─ market/           Shop, Gebrauchtmarkt, Inserate
│  │  │  ├─ goals/            Ziele
│  │  │  └─ clock/            Tageswechsel
│  │  ├─ save/                Serialisierung, Prüfsumme, Migrationen, Speicher-Adapter
│  │  ├─ state.ts             createInitialState, hydrate
│  │  ├─ systems.ts           Liste aller GameSystems
│  │  └─ index.ts             öffentliche API
│  ├─ ui/
│  │  ├─ components/          Designsystem (Button, Card, Modal, Tabs, ProgressBar, …)
│  │  ├─ layout/              AppShell, TopBar, Navigation
│  │  ├─ screens/             ein Ordner pro Screen
│  │  ├─ routes.ts            Navigation (datengetrieben, mit Freischaltbedingungen)
│  │  └─ styles/              tokens.css, base.css, components.css
│  └─ test/                   Test-Helfer
└─ …                          Konfiguration (vite, tsconfig, playwright)
```

## Konventionen

- **Code auf Englisch, Spieltexte auf Deutsch.** Spieltexte stehen in Content-Dateien oder direkt in der UI; eine spätere Übersetzung ist über die Content-Dateien möglich.
- **Ein System = ein Ordner** mit `state.ts` (Typen + Startzustand), `logic.ts` (reine Funktionen), `actions.ts` (Spieler-Befehle), `system.ts` (Simulations-Hooks), `selectors.ts` (abgeleitete Werte für UI) – nur was gebraucht wird.
- **Keine Logik in Komponenten.** Komponenten rufen Selektoren und Aktionen auf.
- **Kein `Math.random()` und kein `Date.now()` in `src/game`.** Zufall über `rng(state)`, Zeit über `state.clock.now`.
- **Dateien klein halten** (Richtwert < 400 Zeilen). Große Content-Listen werden nach Kategorie aufgeteilt.
- **Tests liegen neben dem Code** (`*.test.ts`).
- **Jede State-Änderung** braucht: Startwert in `createInitialState`, ggf. Migration in `save/migrations.ts`.

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm test` | Unit-Tests der Spiellogik |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm run build` | Produktions-Build nach `dist/` |
| `npm run e2e` | Playwright-Tests (baut vorher nicht automatisch – erst `npm run build`) |
| `npm run check` | Typecheck + Tests + Build |
