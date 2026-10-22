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

## Phase 2 – Karte, Städte, Spots ✅

- Startstadt Steinhafen mit 8 Bezirken als SVG-Karte, Nebel je nach Erkundungsgrad, gesperrte Bezirke (Fahrrad nötig) mit Begründung
- Erkunden als Aktivität (Kanal `explore`, Fahrrad macht schneller): findet Spots und Orte, Gerüchte, Pfand, Sperrmüll-Funde, Aushänge (Gebrauchtangebote)
- 17 Spots mit allen Werten (Kapazität, Atmosphäre, Zufahrt, Strom, Lärm, Wetter, Sicherheit, Fahrzeuge, Versorgung, Zustand, Bekanntheit, Legalität, Miete, Ausstattung); ungenaue Werte bis „Spot checken“
- Spot-Dynamik pro Spieltag: Bekanntheit sinkt, Zustand driftet, bekannte inoffizielle Spots werden abgesperrt, Welt-Ereignisse (Bauzaun, Sturm, Security …) verändern Werte
- 14 Orte: Läden (erweitern das Sortiment mit besseren Preisen), Treffpunkte und Clubs (Besuch kostet Geld, gibt XP, Gerüchte), Lagerplätze zum Mieten (mehr Stauraum, Kaution, Tagesmiete)
- Gerüchte aus Jobs, Besuchen und Erkundung führen zu versteckten Spots – Systeme verbinden sich
- 12 neue Ziele

**Abnahme:** Spot nur durch Erkundung/Hinweis sichtbar ✓; Spot-Check verbessert Informationen ✓; alles gespeichert ✓; jeder Ort ist auffindbar (Test) ✓; Marker liegen in ihren Bezirken (Content-Validierung) ✓.

## Phase 3 – Connections, Personen, Nachrichten ✅

- 28 Personen mit Rollen, 8 Werten, Eigenschaften (loyal, misstrauisch, herzlich …), Interessen, eigenen Zielen und eigenem Netzwerk (`knows`)
- Kennenlernen über Start (3 Kontakte), Jobs, Treffpunkte/Clubs, Erkundung, Vorstellungen, Partys und von selbst (z. B. Presse ab Reputation „Local“, Gebrauchthändler nach mehreren Gebrauchtkäufen)
- Vertrauen (0–100, abnehmender Zuwachs) und Stimmung (−100…100, verblasst ohne Kontakt); Eigenschaften verändern beides
- Interaktionen: Schreiben (1×/Tag), Treffen (Zeit + Geld; enthüllt Kontakte und Orte), Vorstellen lassen (Vertrauensschwelle der Zielperson), Gefallen einfordern
- Netzwerk-Graph: du in der Mitte, Linienstärke = Vertrauen, „?“-Knoten für Leute, von denen du gehört hast
- Nachrichten mit Entscheidungen: Zusagen, Ablehnen, Gegenangebot (Erfolg abhängig von Business), Später antworten; Ablauf mit Konsequenzen, Folge-Nachrichten (z. B. Rückzahlung), zeitgebundene Aufgaben als Aktivitäten
- Verbindungen zu anderen Systemen: Kontakte verraten Spots, öffnen Jobs (Empfehlung fürs Kesselhaus), nehmen dich in gesperrte Bezirke mit, bieten Geräte an
- 10 neue Ziele

**Abnahme:** jede Person erreichbar (Test) ✓; jede Nachricht beantwortbar ohne Fehler (Test) ✓; keine spontanen Nachrichten offline ✓; Save/Load ✓; Mobile ✓.

## Phase 4 – Equipment & Musik ✅

- Geräte-Katalog auf 36 Items erweitert: günstige Klone, Grooveboxen, Sampler, Synths, Effektgeräte, Monitore, Clubmixer und seltene Klassiker (TR-99, TB-303, Juna-60), die nur gebraucht oder über Kontakte auftauchen
- Verschleiß durch Benutzung, Defekte bei schlechtem Zustand (unbenutzbar, halber Wert)
- Reparatur selbst (Kanal Werkstatt, Teilekosten, Ergebnis abhängig von Technik, höhere Geräteklassen brauchen mehr Technik) oder bei Techniker-Kontakten (ab Vertrauen 20, Gage, 95 %)
- Studio (freigeschaltet durch Besitz eines Instruments): 7 Genres (4 per Produktion-Level), BPM, 8 Elemente aus eigenen Geräten, Arrangement, Mix-Aufwand (4–60 Min), Live-Schätzung der Wertung
- Track-Werte: Energie, Druck, Groove, Härte, Melodie, Atmosphäre, Originalität, Produktionsqualität → genre-gewichtete Wertung; Einfluss von Gerätequalität, Zustand, Abhöre, Laptop, Proberaum, Fähigkeit, Aufwand, Inspiration
- Tracks online stellen → Stream-Einnahmen pro Stunde (erste passive Einnahmequelle, Hype verblasst, gute Tracks können viral gehen)
- Tracks an DJ-Kontakte geben → Vertrauen, Antwort im Chat, bei Qualität Einsatz auf Partys mit Reputation
- 10 neue Ziele

**Abnahme:** jedes Genre produzierbar (Test) ✓; besseres Equipment/Skill/Aufwand = bessere Tracks (Test) ✓; Streams respektieren Offline-Deckel (Test) ✓; Mobile ✓.

## Phase 5 – Crew, Soundsysteme, Fahrzeuge ✅

- PA-Katalog: Aktivboxen, Selbstbau-Tops/-Subs, Hornboxen, Line-Arrays, Basshörner, Endstufen, Controller, Kabelkisten, Cases, Generatoren (3–25 kW), Licht (Strobo, UV, Laser, Moving Heads); neuer Fachhandel „Bühnentechnik West“
- Soundsystem-Builder (mehrere Systeme): berechnet Leistung, Qualität, Reichweite (Personen), Zuverlässigkeit, Aufbauzeit, Transport (L/kg), Strombedarf, Generatorleistung, Licht, Wartung; Warnungen bei zu schwachen Endstufen, fehlenden Kabeln, fehlendem Mixer, Bass/Top-Ungleichgewicht, zu kleinem Generator, defekten Teilen
- Fahrzeuge: Kombi bis LKW (Autohaus Kowalski), kein Stauraumverbrauch, Versicherung/Tag, schnellere Wege; Mietwagen für einen Spieltag
- Crew: Gründung ab „Newcomer“ und 5 Kontakten; Anwerben von Kontakten mit Vertrauen 40+ in einer ihrer Rollen; Gage pro Tag, Stimmung (sinkt ohne Geld, Mitglieder gehen); Crew-Größe wächst mit Reputation
- Delegation: Techniker (+Werkstatt-Slot, Reparatur zum Teilepreis), Fahrer (+Besorgungen), Organisatoren (+Event-Vorbereitung), Producer (+Studio-Slot)
- 10 neue Ziele

**Abnahme:** Systemwerte reagieren korrekt auf Endstufen/Kabel/Controller/Defekte (Tests) ✓; Crew-Gagen und Weggang ohne Geld (Test) ✓; Fahrzeuge und Mieten (Tests) ✓; Mobile ✓.

## Phase 6 – Events, Locations, Versorgung ✅ (vertikaler Slice komplett)

- Event-Planer: Spot, eine der nächsten sieben Nächte (Wochenende ★), Dauer 4–12 Std, Eintritt oder Spendenbasis, Line-up (eigene Sets, DJ-Kontakte mit Bekanntheit/Zuverlässigkeit/Gage; bekannte DJs erst ab Reputation), eigenes Soundsystem oder Verleih-PA, Transport (selbst/Mietwagen nach Ladung), Werbung (Mundpropaganda, Flyer, Social Media, Infoline, Stadtmagazin), Bar mit eigenen Preisen oder Wasser umsonst, Helfer, Awareness, Sanitäter
- Live-Prognose: Nachfrage vs. Kapazität, Stimmung, Einnahmen, Vorkosten, Gagen, Ergebnis, Risiken (Polizei, Technik, Wetter, DJ-Ausfall), Warnungen (Strom, Anlage zu klein, Getränke reichen nicht)
- Vorbereitungsaufgaben im Kanal „Event-Vorbereitung“: Spot checken, Flyer verteilen, Line-up bestätigen – unerledigt mit Folgen
- Die Nacht läuft als Ereignis (auch offline): Wetter, Polizei (Legalität, Bekanntheit, Werbung, Lärm, Security), Technik-Ausfall (Zuverlässigkeit), Stromprobleme, DJ-Ausfall (du springst ein, sonst Handy-Playlist), ausverkauft, Getränke alle
- Ausführlicher Bericht: Besucher/Nachfrage, Einnahmen (Eintritt/Spenden, Bar), Kosten inkl. Wareneinsatz, Gewinn, sieben Werte (Stimmung, Sound, Line-up, Location, Organisation, Versorgung, Sicherheit), Zwischenfälle, Highlights, Reputation, XP, neue Kontakte
- Folgen: Spot-Bekanntheit steigt (→ Absperrungen), Ausrüstung nutzt sich ab, Crew-Stimmung, Beziehungen zu DJs
- Versorgung: Waren (Wasser, Mate, Bier, Softdrinks, Snacks) bei Discounter, Kemals Späti (ab Vertrauen) und Großhandel Rita (Mindestmenge, Lieferung)
- 11 neue Ziele

**Abnahme:** vertikaler Slice als E2E-Test (Job → Spot → Einkauf → Planung → Nacht → Bericht → Reload) ✓; Event-Ergebnis unabhängig von Tick-Größe (Test) ✓; Absage mit Erstattung ✓; Razzien an bekannten illegalen Spots ✓; Mobile ✓.

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
