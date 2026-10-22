# TEKK LIFE – Hinweise für die Entwicklung

- Planung und Architektur stehen in `docs/` (deutsch). Vor größeren Änderungen `docs/02-architektur.md` und `docs/04-roadmap.md` lesen; Roadmap-Status nach jeder Phase aktualisieren.
- `src/game` ist reine, deterministische Spiellogik: kein React, kein DOM, kein `Math.random()`/`Date.now()` (Zufall über `core/rng`, Zeit über `state.clock.now`).
- Zeit läuft nur über `advanceTo` (core/simulation.ts). Neue Systeme klinken sich über `GameSystem`-Hooks ein und werden in `src/game/systems.ts` registriert; neue Aktivitätsarten in `systems/activities/handlers.ts`.
- Spieler-Befehle sind `defineAction({ check, run })`; `check` liefert eine deutsche Begründung, die die UI an deaktivierten Buttons zeigt. Keine Platzhalter-Buttons.
- Inhalte (Items, Jobs, Ziele, …) sind Daten in `src/game/content`; `validateContent()` läuft in den Tests.
- State-Änderungen: Startwert in `createSlices` (state.ts); fehlende Felder in alten Saves füllt `hydrate` automatisch auf. Bedeutungsänderungen brauchen eine Migration in `save/migrations.ts` und `STATE_VERSION`++.
- Code englisch, Spieltexte deutsch.
- Vor jedem Commit: `npm run typecheck && npm test && npm run build && npm run e2e`.
