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

## Phase 7 – Finanzen, Merch, Lager, Handel ✅

- Konto neben dem Bargeld: Ein-/Auszahlen, 0,05 % Zinsen pro Spieltag, deckt Fixkosten automatisch, wenn das Bargeld nicht reicht
- Kredite (Klein-, Investitions-, Geschäftskredit) mit Reputations-/Business-Anforderungen, tägliche Raten als Fixkosten, Sondertilgung, höchstens zwei gleichzeitig; Auszahlung zählt nicht als „verdient“
- Merch (ab gegründeter Crew, eigener Screen `/merch`): Designs selbst zeichnen (Studio-Kanal, Qualität aus Business, Logo und Designer in der Crew) oder bei Design-Kontakten kaufen; drei Hersteller (Online-Druckerei, Fynns Siebdruck ab Vertrauen, Textilfabrik ab Reputation/Business) mit Stückpreisen, Mindestmengen, Qualität und Lieferzeit
- Lager: Merch belegt Stauraum (Volumen pro Stück), Durchschnittskosten und -qualität je Design/Produkt
- Verkauf: Merch-Stand auf Events (Nachfrage aus Gästen, Stimmung, Markenwert, Qualität und Preis; Prognose im Planer; „Merch“ und „Merch-Wareneinsatz“ im Bericht), Großhandel an Läden (ab Business 2), Onlineshop (ab Business 3 und 25 verkauften Teilen) mit täglichen Verkäufen auch offline (12-Std-Grenze)
- Markenwert: wächst mit Events und Verkäufen, verblasst langsam; neue Bedingungen `brand` und `bank`
- Handel über Kontakte: Lukas (fast alles, 85 %), Marek (Ton/Licht/Strom, 92 %), Kemal (Studio/Gadgets, 88 %) – ab Vertrauen, statt 70 % beim Ankauf
- Lagerhalle Nordring (20.000 L, ab Reputation 500); Speicher-Anforderungen datengetrieben
- 8 neue Ziele

**Abnahme:** Unit-Tests für Konto, Zinsen, Kredite (Raten, Tilgung, Limits), Merch (Freischaltung, Designs, Aufträge, Lagerplatz, Preise, Großhandel, Onlineshop), Merch-Stand im Event, Handel, Lagerhalle und alte Spielstände ✓; E2E (iPhone + Desktop): Konto → Kredit → Design → Auftrag → Lieferung → Preis → Handel → Reload ✓.

## Phase 8 – Welt-Simulation ✅

- Fünf KI-Crews in Steinhafen (Bunkerkinder, Acid Kollektiv Ostend, Hafenlärm, Waldfrequenz, Nordlicht Events) mit Persönlichkeit (Aggression, Kooperation, Ehrgeiz, Schlampigkeit), Stil, Startwerten und eigenen Spots; drei tauchen erst später auf („neue Crew in der Stadt“)
- Crews entscheiden mehrmals pro Spieltag – online und offline: Partys planen (Nacht nach Wochentag, passender Spot), Spots entdecken (bekannte Spots zuerst), aufrüsten, Leute holen, dich kontaktieren
- Ihre Partys werden simuliert: Nachfrage, Kapazität, Stimmung, Geld, Reputation, Technik-Ausfall, Streit, Razzien – auf denselben Spots wie deine (Bekanntheit steigt, Zustand sinkt, Absperrung trifft auch dich); Pleite → Boxen verkaufen → Auflösung → späteres Comeback
- Konkurrenz: Partys in derselben Nacht teilen das Publikum (Prognose-Warnung, Zeile im Bericht), ein von einer Crew belegter Spot ist in der Nacht tabu, feindselige Crews setzen sich absichtlich gegen dich, „ihre“ Spots zu bespielen kostet Sympathie
- Kooperation: gemeinsame Party (deren Publikum kommt mit, Anteil an Eintritt und Bar), Gastsets bei anderen Crews (Gage, Reputation), Spot-Tipps; alles auch als Nachrichten der Crew-Köpfe mit Entscheidungen (Zusagen, Gegenangebot, Ablehnen) – oder Konflikte (Plakate überklebt, Drohungen, Polizei-Tipps)
- Party anderer Crews besuchen: Kontakte, Verhältnis, Spot entdecken
- Szene-Screen `/szene` mit Crews, angekündigten Partys, Ticker; Crew-Detail mit Werten, Verhältnis, Spots, Historie; Offline-Bericht zeigt, was in der Szene passiert ist
- Zufallsereignisse: 30 datengetriebene Ereignisse mit Gewicht, Cooldown, „einmalig“, Bedingungen und Ziel (eigenes Gerät, nächstes Event, DJ im Line-up, unbekannter/bekannter Spot) – als Hinweis oder Entscheidung mit Ablaufzeit und Folgen beim Ignorieren (Geräte-Schäden, Spot-Tipps, unerwartete Nachfrage, DJ fällt aus, Lieferanten-Angebote, seltene Geräte auf dem Gebrauchtmarkt, neue Kontakte, Anwohner, Interview …)
- Temporäre Stadt-Modifikatoren (Nachfrage, Polizei-Risiko, Job-Lohn, Getränkepreise) wirken in alle Systeme
- 7 neue Ziele, u. a. „Platzhirsch“ (mehr Reputation als die Bunkerkinder)

**Abnahme:** Unit-Tests für Crew-Simulation (inkl. offline), Auftauchen, Konkurrenz, belegte Spots, Razzien an geteilten Spots, Besuch, Kooperation, Spot-Tipps, Crew-Nachrichten, Gastsets, alle Ereignisse und jede Antwort, Cooldowns/Ziele, Ignorieren, Modifikatoren, seltene Angebote, alte Spielstände ✓; Balance-Lauf (30 Spieltage: ~25–30 Partys der Crews, 1–3 Razzien, langsames Wachstum) ✓; E2E (iPhone + Desktop): Ereignis entscheiden → Szene → Party besuchen → Crew-Detail → Offline-Bericht mit Szene → Neuigkeiten ✓.

## Phase 9 – Große Progression ✅

- **Szenepunkte** für erreichte Ziele (1–4 nach Größe) und jede neue Reputations-Stufe (2); alte Spielstände bekommen sie per Migration (v1 → v2) rückwirkend
- **Freischaltungsbaum** mit 21 Knoten in fünf Ästen (Sound & Technik, Events, Musik, Netzwerk & Städte, Business) – jeder öffnet etwas Neues:
  neue Gerätetypen (Laser/Moving Heads, Line-Array, großer und Flüster-Generator mit weniger Polizei-Risiko, Modular-Systeme), Eigenbau (Custom-Stack in der Werkstatt), neue Event-Formate (Open-Air, Teknival), Lkw-Führerschein, Festival-Projekt, Remix-Aufträge, Live-Act als Line-up-Slot, Label-Projekt, neue Crew-Rollen (Manager +2 Plätze, Booker: bekannte DJs früher/günstiger), zwei neue Städte, internationale DJs als neue Kontakt-Kategorie, Anlagenverleih, Merch-Kollektion (Jutebeutel, Fahnen), Großmarkt als Lieferant, Vinyl über ein Presswerk, eigene Location
- **Event-Formate:** Open-Air (draußen, 6–16 Std, mehr Publikum und Ruf, mehr Polizei) und Teknival (24–48 Std, ab 600 Plätzen, Publikum wechselt durch, doppelter Ruf); Infrastrukturkosten je Format
- **Städte:** Bergheim (kleine Szene, günstige Preise, entspannte Polizei, Waldspots, Crew „Bergfeuer“) und Nordhafen (große Szene, hohe Preise, harte Polizei, Hallen bis 5.000 Leute, „Kranich Kollektiv“), je 4 Bezirke, 5 Spots, 3 Orte, eigene Leute; Reisen kostet Zeit und Geld (mit eigenem Fahrzeug günstiger); Publikum = Szenengröße × lokale Bekanntheit (wächst mit jeder Party dort), Eintritt und Getränke skalieren mit dem Preisniveau
- **Großprojekte** mit Etappen über Stunden im Hintergrund: eigene Location (legaler Spot ohne Miete, 150 €/Tag Unterhalt), Label (EPs aus drei Tracks: Verkäufe, Ruf, Streams, Katalog-Einnahmen), Festival (bis 20.000 Leute, wiederholbar mit steigenden Kosten)
- **Vermächtnis:** ab 10.000 Reputation oder nach einem Festival die Crew übergeben – neues Kapitel mit Vermächtnis-Punkten, sechs Startszenarien (Producer, Soundsystem-Erbe, Netzwerker:in, Startkapital, Bergheim …) und dauerhaften Perks; Historie früherer Kapitel
- 13 neue Ziele

**Abnahme:** Unit-Tests für Punkte und Migration, Freischaltungen und Gating (Shop, Gebrauchtmarkt, Lieferant, Crew-Rollen), Formate, Live-Act, Remix, Verleih, Eigenbau, Reisen und Stadtfaktoren, Projekte (Location, Festival, Label), Vermächtnis mit Szenario und Perks ✓; E2E (iPhone + Desktop): Freischalten → Format im Planer → Projekt → Reise nach Bergheim → Vermächtnis ✓.

## Phase 10 – Spiel-Look ✅

Ziel: TEKK LIFE soll sich wie ein Spiel anfühlen, nicht wie eine Verwaltungs-App.

- **Eigene Optik:** gebündelte Schriften (Anton für Titel, Chakra Petch für HUD/Zahlen, Space Grotesk für Text), neue Palette (Acid-Grün, Magenta, UV, Laser-Cyan), Karten mit HUD-Ecken, LED-Fortschrittsbalken, Glitch-Überschriften (`ui/styles/game.css`)
- **Lebendiger Hintergrund:** Himmel wechselt mit der Spieluhr (Nacht, Morgengrauen, Tag, Dämmerung), Laser, Sterne, Körnung und Scanlines
- **HUD statt Kopfleiste:** prozedurales Crew-Wappen (aus dem Crew-Namen erzeugt), Name und Stufe, Uhr, Szenepunkte, Geld mit schwebenden +/−-Beträgen
- **Hauptquartier:** Startseite mit Wappen-Hero (Tag, nächste Party, Stadt, Crew-Größe) und großen Aktionskacheln (Arbeiten, Erkunden, Szene, Party)
- **Navigation:** Events als leuchtender Mittelknopf der Bottom-Navigation
- **Partys als Flyer:** Event-Karten im Rave-Flyer-Stil mit Stempel (ANGESAGT/LIVE); laufende Partys mit Equalizer, Fortschritt und Besucher-Schätzung
- **Nachtergebnis:** 1–5 Sterne mit Wertung (Desaster … Legendär), hochzählende Besucher/Gewinn/Reputation
- **Feiern:** große Momente (Stufenaufstieg, Fähigkeits-Level, große Ziele, Crew-Gründung, Freischaltung, fertige Projekte) erscheinen als Vollbild-Feier mit Konfetti und Fanfare
- **Missionen:** Ziele mit Symbol nach Größe und Belohnungs-Chips (inkl. Szenepunkte)
- **Neon-Stadtkarte** mit leuchtenden Bezirken und pulsierenden Spot-Markern; Titelbildschirm mit Glitch-Logo
- **Sound:** synthetisierte Effekte (Tippen, Erfolg, Münzen, Fehler, Fanfare) per WebAudio, in den Einstellungen abschaltbar (`ui/fx`)
- Bewegungen respektieren „Bewegung reduzieren“ des Systems

**Abnahme:** E2E (iPhone + Desktop): Titelbildschirm → neues Spiel mit Hero und Kacheln, HUD-Geld mit Abzug-Animation, Feier bei Freischaltung, Mittelknopf, Sound-Schalter bleibt nach Reload, kein horizontales Scrollen auf Start, Karte, Events, Fortschritt ✓.

## Phase 11 – Lifestyle & Hack-Menü ✅

Ziel: Wofür man das ganze Geld verdient – und ein Admin-Zugang für den eigenen Spielstand.

- **Lifestyle-Shop** (`/lifestyle`, Kachel im HQ) mit 50 Spaß-Käufen in sechs Kategorien: Style (Bucket Hat bis Diamant-Grill), Bude (Lavalampe, Arcade-Automat, Whirlpool, goldene Turntables …), Tiere (Goldfisch „Subwoofer“, Hund „Bass“, Lama „Lars“, Rennpferd), Fahrspaß (Skateboard bis Privatjet), Erlebnisse und Luxus & Wahnsinn (Mondgrundstück, Hüpfburg, Eiswagen, Statue, eigene Insel)
- **Seltenheit nach Preis** wie Loot: Gewöhnlich, Selten, Episch, Legendär (Farben, Glanz, Vollbild-Feier bei legendären Käufen)
- **Style-Punkte und Style-Ränge** (Abgerockt → Mythos): jeder Rang bringt +2 % Gäste bei deinen Partys (bis +10 %), Rang-Aufstiege werden einmal gefeiert
- **Benutzen mit Abklingzeit:** Gassi gehen (erkundet nebenbei), Zocken und Platten hören (XP), Kicker-Turnier und Whirlpool (Crew-Motivation), Pferderennen mit Preisgeld-Chance, Bootsparty, Inselparty …
- **Erlebnisse** laufen als Freizeit-Aktivität im Hintergrund (Kino bis Weltreise und Flug ins All) und geben Boni, z. B. Urlaub: +15 % Job-Lohn für zwei Tage, Goa: +10 % Gäste
- **Wohnen:** sieben Zuhause vom WG-Zimmer bis zur Villa – mehr Lagerplatz und Style, dafür Miete; Umzug nur, wenn dein Zeug reinpasst
- Unterhalt (Futter, Versicherung, Liegeplatz) und Miete laufen über die Tageskosten; Verkaufen bringt 40 % zurück, Kauf-Effekte gibt es nur beim ersten Mal
- Neue Effekte (`crewMorale`, `exploreSomewhere`, `chance`) und Bedingungen (`flair`, `collection`), sechs neue Ziele
- **Hack-Menü** im Terminal-Look (Einstellungen → Admin, oder fünfmal schnell aufs Wappen tippen): Knöpfe und getippte Befehle (`geld 50k`, `rep 500`, `zeit 2d`, `help` …) für Geld, Reputation, Szenepunkte, Fähigkeiten, Zeitsprung, Karte aufdecken, alle Kontakte, Reparieren, Crew-Laune, „Turbo“ (alles sofort fertig), Freischaltungen, Schulden löschen, Nachrichten und Ereignisse. Cheat-Geld zählt nicht als verdient; jede Nutzung wird gezählt. Ersetzt das alte Entwickler-Panel.

- **Spielbar auf claude.ai:** Ein-Datei-Build (`npm run build:single`) als private Seite, Spielstand zusätzlich im Cloud-Speicher des Claude-Kontos, Datei-Sicherung über den Speichern-Dialog der Seite

**Abnahme:** Unit-Tests für Kaufen/Verkaufen, Style-Ränge und Partybonus, Benutzen mit Abklingzeit, Erlebnisse, Unterhalt und Miete, Umzug mit Platzprüfung, alle Cheats und das Befehls-Parsing, Cloud-Speicher (Hin und zurück, neues Gerät lädt den Cloud-Stand, Neuanfang löscht ihn) ✓; E2E (iPhone + Desktop): Lifestyle von der HQ-Kachel bis zum Umzug, Hack-Menü über die Geheimtür, Knöpfe, getippte Befehle und Zeitsprung ✓.

## Phase 12 – Balancing & Feinschliff ⏳

- Balancing über Wirtschafts-Simulationen (automatisierte Durchläufe)
- Barrierefreiheit (Kontraste, Screenreader-Texte, Tastatur), Performance
- Erweiterte E2E-Tests, Fehlerbehebung

## Querschnittsaufgaben (laufend)

- Content-Validierung in Tests (IDs eindeutig, Referenzen gültig)
- Save-Migrationen bei jeder State-Änderung
- Dokumentation in `docs/` aktuell halten
