# 02 – Systemarchitektur

## Technologie

| Bereich | Wahl | Grund |
|---|---|---|
| Sprache | TypeScript (strict) | Typsichere Daten für hunderte Items/Personen; Refactoring-Sicherheit |
| UI | React 19 | Komponenten, große Ökosystem-Basis; später mit Capacitor als native App verpackbar |
| Build | Vite | Schnell, statisch deploybar (GitHub Pages, Netlify, beliebiger Webspace) |
| State | Zustand (Store) + Immer (unveränderliche Updates) | Kleiner, vorhersehbarer Store; Selektoren verhindern unnötige Re-Renders |
| Tests | Vitest (Spiellogik), Playwright (E2E, iPhone-Viewport) | Spiellogik ist reines TypeScript ohne DOM und damit direkt testbar |
| Speicher | `localStorage` mit Backup-Slot, Export/Import | Einfach, synchron, robust; Adapter-Schnittstelle erlaubt später IndexedDB/Cloud |

Es gibt keine 3D-Welt. Das Spiel ist UI-getrieben (Karten, Listen, Tabs, Modals) und mobile-first.

## Schichten

```
┌──────────────────────────────────────────────────────────────┐
│ UI (src/ui)            Screens, Komponenten, Layout, Styles   │
│   liest State über Selektoren, löst Aktionen aus              │
├──────────────────────────────────────────────────────────────┤
│ App-Runtime (src/app)  Store, Spielschleife, Autosave,        │
│                        Offline-Bericht, React-Hooks           │
├──────────────────────────────────────────────────────────────┤
│ Spiellogik (src/game)  rein, deterministisch, ohne DOM/React  │
│   core/     Zeit, Zufall, Simulation, Aktionen, Bedingungen,  │
│             Effekte, Benachrichtigungen, Formatierung         │
│   systems/  ein Ordner pro System (State, Logik, Aktionen)    │
│   content/  Daten: Items, Jobs, Ziele, Spots, Personen, …     │
│   save/     Serialisierung, Migrationen, Speicher-Adapter     │
└──────────────────────────────────────────────────────────────┘
```

Regel: `src/game` importiert niemals aus `src/app` oder `src/ui`. Damit läuft die komplette Spiellogik in Tests und könnte später auch auf einem Server oder in einem Worker laufen.

## Der Spielzustand

Der gesamte Spielstand ist **ein serialisierbares JSON-Objekt** (`GameState`). Jedes System besitzt einen eigenen Bereich (Slice):

```ts
interface GameState {
  meta        // Version, Zeitstempel, Spielzeit, Seed
  clock       // simulierte Echtzeit (ms) + Ursprung der Spieluhr
  rng         // Zustand des deterministischen Zufallsgenerators
  player      // Name, Crew-Name, Stadt
  finance     // Bargeld, Ledger, Kategorien-Summen, Tagesverlauf
  progression // Fähigkeiten-XP, Reputation, Freischaltungen, Flags, Statistiken
  inventory   // Item-Instanzen (eindeutige uid), Stauraum
  activities  // laufende Timer in Kanälen
  market      // Gebrauchtangebote, eigene Inserate
  goals       // erledigte/aktive Ziele
  notifications // Feed (Ringpuffer), ungelesen
  // ab Phase 2+: map, spots, people, messages, tracks, crew, soundsystems, events, merch, rivals …
}
```

Neue Phasen fügen neue Slices hinzu. Beim Laden eines alten Spielstands werden fehlende Slices automatisch mit ihrem Startzustand aufgefüllt (siehe Save-System).

## Inhalt vs. Laufzeit

- **Content (Definitionen)** liegt in `src/game/content` als typisierte Daten: `ItemDef`, `JobDef`, `GoalDef`, `SpotDef`, `PersonDef`, … Diese Daten werden **nicht** gespeichert.
- **Laufzeit-Zustand** speichert nur IDs und veränderliche Werte: `ItemInstance { uid, defId, condition }`, `PersonState { trust, relationship }`.
- Ein **Registry** baut beim Start Lookup-Maps (`content.items.get(id)`), ein **Validator** prüft Referenzen und Eindeutigkeit (läuft in den Tests).

So können hunderte neue Items, Personen oder Spots hinzugefügt werden, ohne Logik anzufassen.

## Zeit und Simulation

### Zwei Uhren

- **Echtzeit** (`clock.now`, Millisekunden): Grundlage aller Timer. Timer laufen in Sekunden bis Stunden.
- **Spielzeit** (abgeleitet): `1 echte Minute = 1 Spielstunde`. Ein Spieltag dauert 24 echte Minuten, eine Spielwoche 2,8 Stunden. Die Spielzeit bestimmt Wochentage und Nächte (Events, Tagesabrechnung, Marktangebote).

### Ereignisgesteuerte Simulation

Es gibt genau **eine** Funktion, die Zeit voranschreiten lässt:

```ts
advanceTo(state, targetTime, report?)
```

Sie springt von Ereignis zu Ereignis (nächstes Timer-Ende, nächster Tageswechsel, nächster Systemtermin), verarbeitet es und integriert dazwischen passive Einnahmen. Jedes System kann sich einklinken:

```ts
interface GameSystem {
  id: string
  nextDue?(s): number | null   // wann braucht das System als Nächstes Rechenzeit?
  process?(d): void            // fällige Arbeit erledigen
  onNewDay?(d, day): void      // Tageswechsel (Spielzeit)
  rates?(s): Rate[]            // passive Einnahmen/Ausgaben pro Stunde
}
```

Daraus folgt:

- **Online-Tick** (jede Sekunde) und **Offline-Aufholen** (beim Öffnen) benutzen denselben Code. Ergebnis ist identisch, egal ob in 1 oder 10.000 Schritten simuliert wird (wird getestet).
- **Offline-Deckel:** Passive Einnahmen zählen offline nur bis zu einer Obergrenze (Start: 12 h, später erweiterbar). Timer werden immer fertig.
- **Uhr-Manipulation:** Springt die Systemuhr zurück, passiert nichts (Simulation läuft nie rückwärts).
- Die Spielschleife läuft unabhängig von React. React liest nur das Ergebnis.

## Aktivitäten (Timer)

Jede zeitbasierte Tätigkeit ist eine **Aktivität**:

```ts
interface Activity { id, kind, channel, label, startedAt, endsAt, payload }
```

- `kind` bestimmt den Abschluss-Handler (`job`, `market-listing`, später `explore`, `produce-track`, `repair`, `event-task`, …). Handler sind in einem Registry pro Kind registriert.
- `channel` begrenzt Parallelität (`job`, `explore`, `studio`, `workshop`, `errand`, `event`). Start-Kapazität je Kanal: 1. Crew-Mitglieder und Freischaltungen erhöhen sie. So kann man immer mehrere Dinge gleichzeitig tun, aber nicht unbegrenzt.
- Abbrechen ist möglich (ohne Belohnung, Kosten werden je nach Aktivität teilweise erstattet).

## Aktionen (Spieler-Befehle)

Spieler-Aktionen sind kleine Objekte mit **Prüfung** und **Ausführung**:

```ts
const startJob = defineAction<{ jobId: string }>({
  check: (s, p) => null | "Begründung, warum nicht möglich",
  run:   (d, p) => { /* verändert den Draft */ },
})
```

- Die UI ruft `check` auf, um Buttons zu deaktivieren **und die Begründung anzuzeigen** (Regel: kein Button ohne Funktion oder Erklärung).
- Vor jeder Aktion wird die Simulation auf „jetzt“ vorgespult, damit Aktionen immer auf aktuellem Stand laufen.
- Aktionen geben `{ ok: true }` oder `{ ok: false, reason }` zurück.

## Bedingungen und Effekte (datengetriebene Spielregeln)

Ziele, Freischaltungen, Nachrichten-Antworten, Zufallsereignisse und Job-Voraussetzungen benutzen dieselbe kleine Sprache:

```ts
type Condition =
  | { t: 'money', gte } | { t: 'rep', gte } | { t: 'skill', skill, gte }
  | { t: 'item', item, count? } | { t: 'stat', stat, gte } | { t: 'flag', flag }
  | { t: 'unlocked', id } | { t: 'goal', id }
  | { t: 'all', of } | { t: 'any', of } | { t: 'not', c }
  // erweitert pro Phase: knows(person), spotKnown, trust, crewSize, eventsHeld …

type Effect =
  | { t: 'money', amount, category } | { t: 'xp', skill, amount } | { t: 'rep', amount }
  | { t: 'item', item, condition? } | { t: 'flag', flag, value? } | { t: 'unlock', id }
  | { t: 'notify', … }
  // erweitert pro Phase: revealSpot, meetPerson, trust, message, …
```

Jede Bedingung kann sich selbst als Text beschreiben („Benötigt Technik Lv. 3“). Damit erklärt die UI automatisch, warum etwas gesperrt ist.

## Benachrichtigungen

`notify(d, { tone, title, text, link })` schreibt in den Feed (Ringpuffer, 200 Einträge). Die UI zeigt neue Einträge als Toasts. Während Offline-Aufholen werden Einträge zusätzlich im Offline-Bericht gesammelt.

## Save-System

- **Format:** `{ v, savedAt, checksum, data }` als JSON. Prüfsumme erkennt beschädigte Daten.
- **Zwei Slots:** `main` und `backup`. Beim Speichern wird zuerst der alte Hauptstand ins Backup geschrieben. Ist `main` kaputt, wird `backup` geladen.
- **Autosave:** alle 10 s (wenn sich etwas geändert hat), beim Verlassen/Verstecken der Seite (`visibilitychange`, `pagehide`) und nach wichtigen Aktionen.
- **Migrationen:** `migrations[v]` hebt alte Stände Schritt für Schritt an. Zusätzlich füllt `hydrate()` fehlende Slices/Felder mit Startwerten auf.
- **Export/Import:** Spielstand als Text (Base64) kopieren/einfügen oder als Datei herunterladen/hochladen.
- **Gespeichert wird alles** – inkl. laufender Timer und Zufallszustand –, deshalb geht durch Reload nichts verloren.
- **Cloud-Speicher (nur auf claude.ai):** `app/cloudSave.ts` spiegelt den Spielstand gzip-komprimiert in das private Dokument `data/users/<id>/save` der Artifact-Datenbank – nach Spieler-Aktionen höchstens einmal pro Minute und beim Verlassen der Seite. Beim Start gewinnt der neuere Stand; ein gerade erst begonnenes Spiel verliert gegen einen Cloud-Stand mit mehr Spielzeit. „Neu anfangen“ löscht auch die Cloud-Kopie. Außerhalb von claude.ai (Dev-Server, eigener Webspace, Tests) ist das Modul wirkungslos.

## Spielschleife (App-Runtime)

```
Start → Spielstand laden (oder neu) → advanceTo(jetzt) mit Bericht
      → „Du warst 7 Std. nicht da“-Dialog (wenn > 1 Min. weg)
      → Intervall 1 s: advanceTo(jetzt)
      → Intervall 10 s: Autosave wenn geändert
      → Seite versteckt: speichern; Seite sichtbar: aufholen (+ Bericht bei langer Abwesenheit)
```

## UI-Architektur

- **Layout:** HUD (Crew-Wappen, Stufe, Spieluhr, Szenepunkte, Geld), Inhalt, Bottom-Navigation mit Events als Mittelknopf auf dem Handy, Seitenleiste auf dem Desktop. Dahinter ein Himmel, der der Spieluhr folgt (`components/Sky.tsx`).
- **Navigation datengetrieben:** Jeder Screen hat eine Freischaltbedingung. Noch nicht freigeschaltete Systeme stehen deaktiviert im „Mehr“-Menü mit Bedingung („Ab Reputation ‚Local‘“). Es gibt keine „Coming soon“-Buttons.
- **Routing:** Hash-Routing (`#/inventar`), funktioniert auf jedem statischen Hosting und überlebt Reloads.
- **Designsystem:** CSS-Variablen in `styles/tokens.css` (dunkel, Acid-Grün/Magenta/UV), Basis-Komponenten in `components.css`, die Spiel-Optik (Schriften, HUD-Ecken, Flyer, Feiern, Neon-Karte) als eigene Schicht in `styles/game.css`. Komponenten `Card`, `Button`, `Tabs`, `Modal`, `ProgressBar`, `Stat`, `Badge`, `Toast`, dazu `CrewEmblem`, `Equalizer`, `CountUp`.
- **Hack-Menü:** `layout/HackMenu.tsx` ist ein Terminal über dem Spiel. Befehle (`layout/hackCommands.ts`) rufen normale Aktionen aus `systems/admin` auf; Zeitsprünge verschieben die App-Uhr (`app/clock.ts`), damit die Simulation wie beim Wegsein aufholt.
- **Feiern & Sound:** Feed-Einträge mit `big: true` (aus `notify`) zeigt `layout/Celebration.tsx` als Vollbild-Moment (nicht während des Offline-Aufholens). `ui/fx` erzeugt Sound-Effekte per WebAudio, abschaltbar in den Einstellungen; die Spiellogik weiß davon nichts.
- **Komponenten lesen State nur über Selektoren** und lösen Änderungen nur über Aktionen aus.

## Erweiterbarkeit

| Neuer Inhalt | Was muss man tun? |
|---|---|
| Neues Item | Eintrag in `content/items/*.ts` |
| Neuer Job | Eintrag in `content/jobs.ts` |
| Neues Ziel / Freischaltung | Eintrag mit Bedingungen + Effekten |
| Neuer Bedingungs-/Effekttyp | Typ ergänzen + eine Funktion in `core/conditions.ts` / `core/effects.ts` |
| Neues System | Ordner in `systems/`, Slice im State, `GameSystem` registrieren, ggf. Screen + Navigationseintrag |
| Neue Stadt / Spots / Personen (ab Phase 2/3) | Daten in `content/` |
| Neuer Spaß-Kauf / neue Wohnung | Eintrag in `content/lifestyle.ts` / `content/homes.ts` (Icon-Name ggf. in `ui/components/LifeIcon.tsx` ergänzen) |
| Neuer Cheat | Aktion in `systems/admin/actions.ts` + Befehl in `ui/layout/hackCommands.ts` |
