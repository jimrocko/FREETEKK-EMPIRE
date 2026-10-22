# 04 – Roadmap

Jede Phase endet erst, wenn ihre Abnahmekriterien erfüllt sind (Testregel: starten, alle neuen Funktionen testen, Save/Load, Reload, Mobile-UI, Edge Cases, Fehler beheben). Automatisierte Tests decken die Spiellogik ab; Playwright prüft die App im iPhone-Viewport.

Legende: ✅ fertig · 🔨 in Arbeit · ⏳ geplant

## Phase 1 – Grundstruktur ✅

**Inhalt**
- Projekt-Setup (Vite, React, TypeScript, Vitest, Playwright)
- Simulationskern: Echtzeit-/Spieluhr, deterministischer Zufall, ereignisgesteuertes `advanceTo`, System-Hooks
- Aktionen mit Prüfung/Begründung, Bedingungs- und Effektsprache
- Finanzen: Bargeld, Ledger mit Kategorien, Tagesverlauf, laufende Kosten, Einnahmen/Std.
- Fortschritt: 5 Fähigkeiten mit XP/Level, Reputation mit Stufen, Statistiken, Flags
- Inventar: Items mit Zustand/Gewicht/Volumen, Stauraum, Verkauf
- Aktivitäten/Timer in Kanälen, Abbrechen
- Nebenjobs als erste Einnahmequelle (geben XP und öffnen Wege)
- Markt: Neuwaren-Shop, Gebrauchtmarkt (tägliche Angebote, Verhandeln), eigene Inserate
- Ziele (klein/mittel/groß) mit Belohnungen
- Benachrichtigungen (Feed + Toasts)
- Save-System: Autosave, Backup-Slot, Prüfsumme, Migrationen, Export/Import, Reset
- Offline-Fortschritt mit Bericht („Du warst … nicht da“)
- UI: App-Shell, Bottom-Navigation, Dashboard, Jobs, Inventar, Markt, Finanzen, Fortschritt, Einstellungen

**Abnahme:** Neues Spiel → Job erledigen → Geld + XP → Gerät kaufen/verkaufen → Reload ohne Verlust → Offline-Bericht nach Abwesenheit → keine Konsolenfehler → iPhone-Viewport ohne horizontales Scrollen.

## Phase 2 – Karte, Städte, Spots ⏳

- Startstadt mit 8 Bezirken als SVG-Karte, Nebel/Erkundungsgrad
- Erkunden als Aktivität (Kanal `explore`): findet Spots, Shops, Lieferanten, Treffpunkte, Gerüchte, Gebrauchtangebote
- ≥ 12 Spots mit allen Werten, ungenaue Werte bis „Spot checken“
- Spot-Dynamik: Bekanntheit, Zustand, Schließung
- Shops auf der Karte erweitern das Sortiment

**Abnahme:** Spot nur durch Erkundung/Hinweis sichtbar; Spot-Check verbessert Informationen; alles gespeichert.

## Phase 3 – Connections, Personen, Nachrichten ⏳

- ≥ 24 Personen mit Rollen, Werten, Eigenschaften, Zielen, Kontakten
- Kennenlernen über Start, Jobs, Erkundung, Vorstellung, Events
- Vertrauen/Beziehung, Treffen, Schreiben, Gefallen, Vorstellen lassen
- Netzwerk-Graph (sichtbar: wer kennt wen, unbekannte Kontakte als „?“)
- Nachrichten mit Entscheidungen (Zusagen/Ablehnen/Gegenangebot/Später), Ablauf, Konsequenzen

## Phase 4 – Equipment & Musik ⏳

- Geräte-Katalog (Drum Machines, Sampler, Synths, Mixer, FX, Monitore, Interfaces) – neu und gebraucht
- Verschleiß, Defekte, Reparatur (Werkstatt-Kanal)
- Studio: Genre, BPM, Elemente aus eigenen Geräten, Arrangement, Mix-Aufwand → Track-Werte
- Tracks nutzen: an DJs geben, online stellen (passive Einnahmen), auf eigenen Events spielen

## Phase 5 – Crew, Soundsysteme, Fahrzeuge ⏳

- Crew gründen; Mitglieder aus Connections anwerben; Rollen, Gagen, Moral
- Crew erhöht Kanal-Kapazitäten und übernimmt Aufgaben (Delegation)
- Soundsystem-Builder mit berechneten Werten (Leistung, Qualität, Reichweite, Zuverlässigkeit, Aufbauzeit, Transport, Strom, Wartung)
- Fahrzeuge (Kauf/Miete), Kapazität und Gewicht, Fahrer

## Phase 6 – Events, Locations, Versorgung ⏳ (vertikaler Slice komplett)

- Event-Planer (Spot, Nacht, Dauer, Eintritt, Lineup, System, Crew, Transport, Versorgung, Werbung)
- Vorbereitungsaufgaben mit Timern, delegierbar
- Event-Simulation und ausführlicher Bericht (Besucher, Einnahmen, Kosten, Stimmung, Sound, Organisation, neue Connections/Möglichkeiten)
- Lieferanten, Preise, Mengen, Lagerbestand

## Phase 7 – Finanzen, Merch, Lager, Handel ⏳

- Finanzübersicht mit Verlauf, Konto/Kredite, laufende Kosten
- Merch: Designs, Hersteller, Produktion, Lager, Verkauf auf Events und online
- Lagerräume mieten, Handel zwischen Connections

## Phase 8 – Welt-Simulation ⏳

- Rivalisierende Crews (eigene Events, Spot-Entdeckung, Wachstum, Fehler, Kooperationen)
- Zufallsereignis-System mit Gewichten, Cooldowns, Bedingungen und Entscheidungen

## Phase 9 – Große Progression ⏳

- Großer Freischaltungsbaum (neue Systeme, nicht nur Prozente)
- Weitere Städte mit eigener Szene
- Endgame: Label, Festival, eigene Locations, mehrere Systeme/Crews, seltene Geräte
- Prestige/Vermächtnis mit neuen Startszenarien

## Phase 10 – Feinschliff ⏳

- Balancing über Wirtschafts-Simulationen (automatisierte Durchläufe)
- UI-Polish, Animationen, Performance, Barrierefreiheit
- Erweiterte E2E-Tests, Fehlerbehebung

## Querschnittsaufgaben (laufend)

- Content-Validierung in Tests (IDs eindeutig, Referenzen gültig)
- Save-Migrationen bei jeder State-Änderung
- Dokumentation in `docs/` aktuell halten
