# TEKK LIFE

Management-Simulation über eine fiktive Underground-Tekno-/Freetekk-Szene. Du startest mit 500 €, einem alten Handy und einem kleinen Zimmer – und baust dir über Wochen und Monate ein eigenes Netzwerk aus Leuten, Spots, Geräten, Soundsystemen, Crews und Events auf.

Mobile-first Web-App (React + TypeScript), läuft komplett im Browser, speichert lokal und rechnet Offline-Fortschritt nach.

## Stand

| Phase | Inhalt | Status |
|---|---|---|
| 1 | Grundstruktur: Simulation, Zeit, Geld, Inventar, Jobs, Markt, Ziele, Save/Load, Offline, Dashboard | ✅ |
| 2 | Karte von Steinhafen, Erkundung, 17 Spots, Läden, Treffpunkte, Lager, Gerüchte | ✅ |
| 3 | 28 Personen, Vertrauen & Stimmung, Treffen, Vorstellungen, Netzwerk-Graph, Nachrichten mit Entscheidungen | ✅ |
| 4 | Geräte-Verschleiß & Reparatur, Studio mit 7 Genres, Tracks, Streams, Tracks an DJs | ✅ |
| 5 | PA-Katalog, Soundsystem-Builder, Fahrzeuge & Mietwagen, Crew mit Gagen, Stimmung und Delegation | ✅ |
| 6 | Event-Planer mit Prognose, Vorbereitung, Simulation der Nacht, ausführlicher Bericht, Versorgung – **vertikaler Slice komplett** | ✅ |
| 7–10 | Finanzen & Merch, Rivalen & Zufallsereignisse, Städte & Endgame, Feinschliff | siehe [Roadmap](docs/04-roadmap.md) |

## Schnellstart

```bash
npm install
npm run dev        # http://localhost:5173 (mit Entwickler-Zeitsprung in den Einstellungen)
npm test           # Unit-Tests der Spiellogik
npm run build      # Produktions-Build nach dist/
npm run e2e        # Playwright-Tests (iPhone + Desktop) gegen den Build
```

Der Build ist eine statische Seite (`dist/`) und läuft auf jedem Webspace. Auf dem iPhone über „Teilen → Zum Home-Bildschirm“ als App nutzbar.

## Dokumentation

- [01 – Analyse](docs/01-analyse.md): Säulen, Spielschleifen, Wege, Abhängigkeiten, Risiken
- [02 – Architektur](docs/02-architektur.md): Schichten, Simulation, Aktionen, Save-System
- [03 – Datenmodell](docs/03-datenmodell.md): Definitionen und Laufzeit-Zustand aller Systeme
- [04 – Roadmap](docs/04-roadmap.md): Phasen mit Abnahmekriterien
- [05 – Projektstruktur](docs/05-projektstruktur.md): Ordner und Konventionen

Alle Namen, Marken, Orte und Personen im Spiel sind frei erfunden.
