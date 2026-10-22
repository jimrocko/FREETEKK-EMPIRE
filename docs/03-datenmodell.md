# 03 – Datenmodell

Zwei Arten von Daten:

- **Definitionen (Content):** statisch, im Code unter `src/game/content`, nie im Spielstand. Suffix `Def`.
- **Laufzeit-Zustand (State):** im Spielstand, referenziert Definitionen per `id`. Suffix `State` bzw. `Instance`.

Alle IDs sind sprechende Strings in kebab-case (`item.drum-tr4`, `job.flyer`, `spot.industrial-north`). Instanzen haben zusätzlich eine `uid` (fortlaufend, `i42`).

Geldbeträge sind Euro als Zahl (Cent-genau gerundet). Zeitpunkte sind Echtzeit-Millisekunden; Dauern in Echtzeit-Millisekunden. Spielzeit wird daraus abgeleitet (1 echte Minute = 1 Spielstunde).

---

## Querschnitt

### Bedingungen und Effekte

```ts
type SkillId = 'produktion' | 'technik' | 'organisation' | 'netzwerk' | 'business'

type Condition =
  | { t: 'money'; gte: number }
  | { t: 'rep'; gte: number }
  | { t: 'skill'; skill: SkillId; gte: number }          // Level
  | { t: 'item'; item: string; count?: number }          // besitzt Item(s)
  | { t: 'itemTag'; tag: string; count?: number }        // besitzt Item mit Tag
  | { t: 'stat'; stat: string; gte: number }             // Lebenszeit-Statistik
  | { t: 'flag'; flag: string }
  | { t: 'unlocked'; id: string }
  | { t: 'goal'; id: string }                            // Ziel erledigt
  | { t: 'day'; gte: number }                            // Spieltag
  | { t: 'all' | 'any'; of: Condition[] }
  | { t: 'not'; c: Condition }
  // Phase 2+: spotKnown, districtExplored, knows, trust, crewSize, eventsHeld, cityUnlocked …

type Effect =
  | { t: 'money'; amount: number; category: LedgerCategory; label?: string }
  | { t: 'xp'; skill: SkillId; amount: number }
  | { t: 'rep'; amount: number }
  | { t: 'item'; item: string; qty?: number; condition?: number }
  | { t: 'flag'; flag: string; value?: number }
  | { t: 'unlock'; id: string }
  | { t: 'notify'; tone: Tone; title: string; text?: string }
  // Phase 2+: revealSpot, revealPoi, meetPerson, trust, sendMessage, spotFame …
```

### Benachrichtigung

```ts
interface FeedEntry { id: number; at: number; tone: 'info'|'success'|'warning'|'danger'|'discovery'; title: string; text?: string; link?: string }
```

---

## Phase 1

### Spieler & Fortschritt

```ts
interface PlayerState { name: string; crewName: string; cityId: string; homeId: string }

interface ProgressionState {
  skills: Record<SkillId, number>        // XP
  reputation: number                     // Szene-Reputation (global)
  unlocks: Record<string, number>        // id → Zeitpunkt
  flags: Record<string, number>          // Story-/Zustandsflags
  stats: Record<string, number>          // Lebenszeit-Zähler (jobsDone, moneyEarned, itemsBought …)
}
```

- **Fähigkeits-Level:** XP-Kurve `xpForLevel(L) = round(40 · (L-1)^1.75)` kumulativ, ohne Obergrenze.
- **Reputation-Stufen** (Content `REP_TIERS`): Unbekannt 0 · Newcomer 40 · Local 150 · Bekannt 500 · Etabliert 1.500 · Große Crew 4.000 · Netzwerk 10.000 · Überregional 25.000 · Organisation 60.000 · Legende 150.000 · Mythos 400.000.

### Finanzen

```ts
type LedgerCategory = 'job' | 'market' | 'equipment' | 'upkeep' | 'goal' | 'event' | 'merch' | 'crew'
                    | 'vehicle' | 'supply' | 'property' | 'music' | 'network' | 'other'

interface LedgerEntry { at: number; amount: number; category: LedgerCategory; label: string }

interface FinanceState {
  cash: number
  ledger: LedgerEntry[]                       // Ringpuffer (letzte 300)
  totals: Record<LedgerCategory, { in: number; out: number }>
  days: { day: number; income: number; expense: number }[]  // Tagesverlauf (letzte 60 Tage)
  pendingPassive: number                      // noch nicht verbuchte passive Einnahmen
}

interface RecurringCostDef { id; label; perDay: number; category; condition?: Condition }
```

- Käufe brauchen genug Bargeld. Laufende Kosten dürfen ins Minus führen (Dispo); im Minus sind Käufe gesperrt und es gibt eine Warnung.
- **Einnahmen pro Stunde** = passive Raten (`GameSystem.rates`) + Durchschnitt der letzten echten Stunde aus dem Ledger.

### Items & Inventar

```ts
type ItemCategory = 'gadget' | 'music' | 'sound' | 'light' | 'power' | 'vehicle' | 'goods' | 'merch' | 'media' | 'misc'

interface ItemDef {
  id: string
  name: string
  brand?: string                 // fiktive Marken
  category: ItemCategory
  type: string                   // 'phone','headphones','laptop','drum-machine','sampler','synth','mixer','sub','top','amp', …
  tier: number                   // 1–6, grobe Leistungsklasse
  price: number                  // Neupreis
  quality: number                // 0–100 Grundqualität
  weightKg: number
  volumeL: number                // Stauraum-Bedarf
  stackable?: boolean            // Waren, Merch
  rarity?: 'common'|'uncommon'|'rare'|'legendary'
  stats?: Record<string, number> // typ-spezifisch (z. B. powerW, acid, groove, capacityL)
  upkeepPerDay?: number          // Wartung/Versicherung
  tags?: string[]                // 'mobility','computer','studio', …
  shop?: boolean                 // im Neuwaren-Shop erhältlich
  usedMarket?: boolean           // kann auf dem Gebrauchtmarkt auftauchen
  description: string
}

interface ItemInstance {
  uid: string
  defId: string
  qty: number                    // 1 bei Geräten
  condition: number              // 0–100
  acquiredAt: number
  paid: number                   // Einkaufspreis gesamt
  locked?: string                // z. B. 'listing:…', 'soundsystem:…' (nicht verkaufbar/benutzbar)
}

interface InventoryState { items: Record<string, ItemInstance>; nextUid: number }
```

- **Stauraum:** Zuhause hat begrenzte Liter (Zimmer: 400 L). Später: Proberaum, Lager, Fahrzeuge.
- **Wiederverkaufswert:** `price · 0.6 · (0.25 + 0.75 · condition/100) · Seltenheitsfaktor`. Sofort-Ankauf zahlt 70 % davon, ein Inserat 90–115 % nach Wartezeit. Es gibt keinen Weg, dasselbe Item mit Gewinn sofort zurückzuverkaufen.

### Aktivitäten

```ts
type ActivityChannel = 'job' | 'explore' | 'studio' | 'workshop' | 'errand' | 'event' | 'market'

interface Activity {
  id: string
  kind: string                   // Handler-Schlüssel
  channel: ActivityChannel
  label: string
  startedAt: number
  endsAt: number
  payload: Record<string, unknown>
}

interface ActivitiesState { running: Activity[]; capacityBonus: Partial<Record<ActivityChannel, number>>; nextId: number }
```

### Jobs

```ts
interface JobDef {
  id: string; name: string; description: string
  durationMin: number            // Echtzeit-Minuten
  pay: number
  xp: Partial<Record<SkillId, number>>
  rep?: number
  requires?: Condition[]
  tags?: string[]
}
```

### Markt

```ts
interface MarketOffer {          // Gebrauchtangebot
  id: string; defId: string; condition: number; price: number
  seller: string; note: string; createdAt: number; expiresAt: number
  negotiated?: boolean           // schon verhandelt
}

interface MarketListing {        // eigenes Inserat
  id: string; itemUid: string; price: number; createdAt: number; sellsAt: number
}

interface MarketState { offers: MarketOffer[]; listings: MarketListing[]; lastRefreshDay: number; nextId: number }
```

### Ziele

```ts
interface GoalDef {
  id: string; title: string; description: string
  size: 'small' | 'medium' | 'large' | 'long'
  requires?: Condition[]         // Sichtbarkeit (Ziel erscheint erst, wenn erfüllt)
  complete: Condition[]          // Abschlussbedingung
  rewards: Effect[]
  path?: SkillId | 'mixed'
}

interface GoalsState { done: Record<string, number> }
```

### Meta / Uhr / Zufall

```ts
interface MetaState { version: number; createdAt: number; lastSavedAt: number; playTimeMs: number; seed: number }
interface ClockState { now: number; origin: number; lastDay: number }   // origin = Echtzeit von Spieltag 1, 10:00
interface RngState { s: number }                                        // mulberry32
```

---

## Phase 2 – Karte, Städte, Spots

```ts
interface CityDef { id; name; description; districts: DistrictDef[]; priceLevel: number; sceneSize: number; requires?: Condition[] }
interface DistrictDef { id; cityId; name; kind: 'center'|'industrial'|'residential'|'harbor'|'outskirts'|'forest'|'university'; shape: Polygon; exploreMin: number; danger: number }

interface PoiDef {               // Shops, Lieferanten, Clubs, Treffpunkte …
  id; cityId; districtId; kind: 'shop'|'supplier'|'club'|'hangout'|'storage'|'rehearsal'|'workshop'|'rival-base'
  name; description; discovery: { explore?: number; via?: 'connection'|'rumor'|'event' }
  effects?: Effect[]             // z. B. Shop-Sortiment freischalten
}

interface SpotDef {
  id; cityId; districtId; name; type: 'industrial'|'warehouse'|'bunker'|'forest'|'field'|'quarry'|'lakeside'|'club'|'hall'|'tunnel'|'rooftop'
  capacity; atmosphere; access; powerKw; noiseTolerance; weatherExposure; security; vehicleSpace; infrastructure
  legality: 'legal'|'grey'|'illegal'; rentPerEvent; condition
  discovery: { explore?: number; via?: ('connection'|'rumor'|'event'|'rival')[] }
  description; tags
}

interface SpotState {
  known: boolean; discoveredAt?; via?
  intel: number                  // 0–100: wie genau kennt der Spieler die Werte?
  lastCheckedAt?: number         // Spot-Check vor Events
  fame: number                   // Bekanntheit; hoch = Risiko (Polizei, Rivalen)
  condition: number
  status: 'open'|'closed'|'burned'|'taken'
  takenBy?: string               // Rivalen-Crew
  events: number                 // Events dort
}

interface MapState { cityId; districts: Record<id, { explored: number; visits: number }>; pois: Record<id, { known: boolean; at? }> }
```

## Phase 3 – Personen, Connections, Nachrichten

```ts
type Role = 'dj'|'producer'|'technician'|'driver'|'organizer'|'booker'|'designer'|'merch'|'manager'|'promoter'|'supplier'|'landlord'|'shopkeeper'|'journalist'|'scout'

interface PersonDef {
  id; name; nickname?; cityId; roles: Role[]
  stats: { technik; organisation; kreativ; netzwerk; business; zuverlaessigkeit; erfahrung; bekanntheit }
  price: number                  // Gage/Tagessatz
  traits: string[]               // 'loyal','gierig','chaotisch','perfektionist', …
  interests: string[]            // Genres, Themen
  knows: string[]                // Personen-IDs → Netzwerk-Kanten
  knowsSpots?: string[]; knowsPois?: string[]
  introTrust: number             // nötiges Vertrauen für Vorstellungen
  meet: { via: 'start'|'explore'|'job'|'event'|'intro'|'message'; district?; job? }
  goal?: string                  // eigenes Ziel (z. B. „will eigenen Floor“)
  bio: string
}

interface PersonState {
  met: boolean; metAt?; via?
  trust: number                  // 0–100
  relation: number               // -100…100
  lastContactAt?: number
  busyUntil?: number
  revealed: string[]             // bekannte Kontakte dieser Person
  favors: number                 // Gefallen (+ schuldet dir / − du schuldest)
  status: 'contact'|'crew'|'blocked'
}

interface MessageTemplateDef {
  id; from: string | { role: Role }; when?: Condition[]; weight?: number; cooldownDays?: number
  text: string; choices: ChoiceDef[]; expiresHours?: number; onExpire?: Effect[]
}
interface ChoiceDef { id; label; requires?: Condition[]; effects?: Effect[]; outcomes?: { weight; effects; text }[] }

interface MessageState { id; threadId; from; at; text; choices?: ChoiceDef[]; expiresAt?; resolved?: string; read: boolean }
```

## Phase 4 – Equipment & Musik

- Items erhalten Verschleiß (`condition` sinkt durch Nutzung), Ausfallrisiko bei niedrigem Zustand, Reparatur als Aktivität (Kanal `workshop`) oder über Techniker-Connections.
- Studio-Geräte liefern **Elemente** mit Bewertungen: `stats: { kick, bass, hats, perc, synth, acid, fx, melody, sound }`.

```ts
interface GenreDef { id; name; bpm: [min, max]; weights: Partial<Record<TrackStat, number>>; requires?: Condition[] }
type TrackStat = 'energie'|'druck'|'groove'|'haerte'|'melodie'|'atmosphaere'|'originalitaet'|'qualitaet'

interface Track {
  id; name; genreId; bpm; elements: Record<ElementId, string /* itemUid */>
  arrangement: 'tool'|'banger'|'hypnotisch'|'story'
  stats: Record<TrackStat, number>; score: number; hype: number
  createdAt; status: 'producing'|'done'|'released'
}
```

## Phase 5 – Crew, Soundsysteme, Fahrzeuge

```ts
interface CrewMember { personId; roles: Role[]; wagePerDay; morale; joinedAt; assignment?: string }
interface SoundSystem { id; name; components: string[] /* itemUids */; createdAt }
// berechnet: powerW, quality, reach (Personen), reliability, setupMin, volumeL, weightKg, powerKw, upkeepPerDay
// Fahrzeuge sind Items (category 'vehicle') mit stats { capacityL, maxLoadKg, speed, reliability }
```

## Phase 6 – Events & Versorgung

```ts
interface EventPlan {
  id; name; spotId; startsAt; durationH; entry: number
  lineup: { personId | 'self'; slot }[]; soundSystemId | rentalId
  crew: string[]; vehicles: string[]
  supply: Record<goodsId, { qty; price }>
  promo: Record<promoId, number>; merch: Record<itemUid, price>
  tasks: Record<taskId, 'open'|'running'|'done'>
  status: 'planning'|'scheduled'|'running'|'done'|'cancelled'
}

interface EventReport {
  eventId; visitors; revenue: { entry; bar; merch }; costs: Record<string, number>; profit
  mood; sound; organisation; supply; safety; incidents: string[]
  rep; xp: Partial<Record<SkillId, number>>; newPeople: string[]; unlocks: string[]
}

interface SupplierDef { id; name; goods: Record<goodsId, price>; minOrder; delivery?: number; requires?: Condition[] }
```

## Phase 7 – Finanzen & Merch

```ts
interface Loan { id; principal; ratePerDay; remaining; takenAt }
interface MerchDesign { id; name; style: string[]; quality; createdAt }
interface MerchProductDef { id; name; type: 'shirt'|'hoodie'|'cap'|'sticker'|'patch'|'poster'; baseCost; volumeL }
interface ManufacturerDef { id; name; products: Record<productId, { unitCost; minQty; days; quality }>; requires? }
interface MerchOrder { id; designId; productId; manufacturerId; qty; readyAt }
interface BrandState { value: number; affinity: number }
```

## Phase 8 – Rivalen & Zufallsereignisse

```ts
interface RivalCrewDef { id; name; cityId; style; aggression; cooperation; growth; description }
interface RivalState { money; rep; power; knownSpots: string[]; nextEventAt?; relation; history: string[] }
interface RandomEventDef { id; weight; cooldownDays; requires?: Condition[]; kind: 'notice'|'message'|'offer'; text; effects?; choices? }
```

## Phase 9 – Städte, Endgame, Prestige

- Weitere `CityDef` mit eigener Szene (Preisniveau, Szenegröße, Lieblingsgenres, Polizeidruck).
- Reputation pro Stadt, Reisen/Umzug, Zweigstellen.
- Endgame-Projekte (Festival, Label, eigene Location) als mehrstufige Großprojekte mit langen Timern.
- Vermächtnis: Crew „übergeben“, mit Legacy-Punkten in neuem Szenario starten (andere Stadt, anderer Startweg).
