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
  shops?: string[]               // Läden, die es neu verkaufen (Online-Versand + Läden auf der Karte)
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

- **Stauraum:** Zuhause hat begrenzte Liter (Zimmer: 400 L). Dazu gemietete Lagerplätze von der Karte (Kellerabteil, Proberaum, Container, Self-Storage); später Fahrzeuge.
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
interface CityDef { id; name; description; sceneSize; priceLevel; startExplored: Record<districtId, number>; water: string[] }
interface DistrictDef {
  id; cityId; name; kind: 'center'|'industrial'|'residential'|'harbor'|'university'|'forest'|'commercial'
  description; shape: [x, y][]; label: [x, y]      // SVG-Kartenkoordinaten (viewBox 0 0 360 300)
  exploreMin; exploreGain; xp; requires?: Condition[]
}

interface PoiDef {               // Orte: Läden, Treffpunkte, Clubs, Lagerplätze
  id; cityId; districtId; kind: 'shop'|'hangout'|'club'|'storage'; name; description; pos: [x, y]
  explore?: number               // ab diesem Erkundungsgrad auffindbar; sonst nur über Gerüchte/Kontakte
  shopId?: string                // Laden
  visit?: { label; durationMin; cost; xp; rep?; rumorChance }    // Treffpunkt/Club
  storage?: { capacityL; perDay; deposit }                       // Lagerplatz
}

interface SpotDef {
  id; cityId; districtId; name; type; description; pos: [x, y]
  stats: { capacity; atmosphere; access; powerKw; noise; weather; security; vehicles; infrastructure }
  legality: 'legal'|'grey'|'illegal'; rent; condition; fame; features: string[]
  explore?: number               // sonst nur über Gerüchte/Kontakte
}

interface SpotState {
  known: boolean; discoveredAt?; via?
  intel: number                  // 0–100: wie genau kennt der Spieler die Werte?
  lastCheckedAt?: number         // Spot-Check vor Events
  fame: number                   // Bekanntheit; hoch = Risiko (Polizei, Rivalen)
  condition: number
  status: 'open'|'closed'; closedUntilDay?
  mods: Partial<SpotStats>       // Veränderungen durch Welt-Ereignisse
  events: number                 // Events dort
}

interface ShopDef { id; name; description; priceFactor; poiId? }        // Laden; ohne poiId immer verfügbar (Online)
interface RumorDef { id; text; target: { kind: 'spot'|'poi'; id }; sources: ({ job } | { poi } | { district; minExplored })[]; followMin }

interface MapState {
  cityId
  districts: Record<id, { explored: number; visits: number }>
  pois: Record<id, { at; via }>                 // bekannte Orte
  rumors: Record<id, { heardAt; via; resolved? }>
  rentals: Record<poiId, { since }>              // gemietete Lagerplätze
}
```

## Phase 3 – Personen, Connections, Nachrichten

```ts
type Role = 'dj'|'producer'|'artist'|'technician'|'driver'|'organizer'|'booker'|'promoter'|'designer'|'merch'|'manager'|'supplier'|'landlord'|'shopkeeper'|'journalist'|'security'|'scout'

interface PersonDef {
  id; name; nick?; cityId; roles: Role[]
  stats: { technik; organisation; kreativ; netzwerk; business; zuverlaessigkeit; erfahrung; bekanntheit }
  price                          // Gage/Tagessatz
  traits: TraitId[]; interests: string[]
  knows: string[]                // Netzwerk-Kanten (Vorstellungen)
  knowsSpots?; knowsPois?        // was sie dir zeigen können
  introTrust: number             // Vertrauen, das der Vorstellende braucht
  meet: ({ start; trust } | { job; chance } | { poi; chance } | { district; chance; minExplored? } | { reaches: Condition[]; text })[]
  goal; bio
}

interface PersonState {
  met; metAt?; via?
  trust: number                  // 0–100
  relation: number               // −100…100
  lastContactAt?; lastMeetDay?; lastIntroDay?; lastWriteDay?
  meetings: number
  revealed: string[]             // bekannte Kontakte dieser Person
  told: string[]                 // Spots/Orte, die sie dir gezeigt hat
  favor: number                  // + schuldet dir / − du schuldest
}

interface MessageTemplateDef {
  id; from: { person } | { role: Role[] }; when?: Condition[]; minTrust?; weight; cooldownDays?; once?; followUpOnly?
  text                           // {name}, {player}
  choices?: ChoiceDef[]; onDeliver?: Effect[]; expiresHours?; onExpire?: Effect[]
}
interface ChoiceDef { id; label; requires?: Condition[]; effects?: Effect[]; outcomes?: { weight; skillBonus?; effects; reply? }[]; reply? }

interface Message { id; from; at; text; mine?; templateId?; open?; expiresAt?; resolved?; online?; read }
interface MessagesState { list: Message[]; nextId; nextRollAt; queue: { templateId; from; deliverAt }[]; sent: Record<templateId, time> }
```

Neue Effekte: `trust`, `relation`, `favor`, `meet`, `meetSomeone`, `message` (Folge-Nachricht mit Verzögerung), `task` (zeitgebundene Aufgabe als Aktivität mit Effekten bei Abschluss), `explore` (Erkundungsgrad). `'$from'` steht für den Absender.
Neue Bedingungen: `knows`, `trust`, `contacts`, `knowsRole`, `trusted`, `channelFree`.

## Phase 4 – Equipment & Musik

- `ItemInstance.broken` markiert Defekte; Verschleiß über `wearItem`, Reparatur als Aktivität `repair` (Kanal `workshop`, Item gesperrt `repair:<id>`).
- Studio-Geräte liefern Elemente über `stats`: `kick, bass, hats, perc, synth, acid, fx, melody` (+ `sound`, `monitoring`, `originality`).

```ts
interface GenreDef { id; name; description; bpm: [min, max]; required: ElementId[]; weights: Partial<Record<TrackStat, number>>; requires?: Condition[] }
type TrackStat = 'energie'|'druck'|'groove'|'haerte'|'melodie'|'atmosphaere'|'originalitaet'|'qualitaet'

interface Track {
  id; name; genreId; bpm
  elements: Partial<Record<ElementId, itemDefId>>
  arrangement: 'tool'|'banger'|'hypnotisch'|'story'; effort: 'quick'|'normal'|'careful'|'perfect'
  stats: Record<TrackStat, number>; score: number
  createdAt; status: 'producing'|'done'
  uploadedAt?; hype: number      // Stream-Multiplikator (verblasst täglich)
  givenTo: string[]; playedBy: string[]
}
interface MusicState { tracks: Track[]; nextId }
```

## Phase 5 – Crew, Soundsysteme, Fahrzeuge

```ts
// Sound-Items: type 'top'|'sub'|'amp'|'controller'|'cables'|'case'|'generator'|'light' (+ 'dj-mixer')
// stats: powerW, spl, low, active, ampW, cableSlots, kw, lightFx, setupMin, protection, setupBonus
interface SoundSystem { id; name; components: itemUid[]; createdAt }
interface SoundState { systems: SoundSystem[]; nextId }
// berechnet (systemStats): powerW, quality, reach, reliability, setupMin, volumeL, weightKg, powerKw, generatorKw, lightFx, upkeepPerDay, warnings[]

interface CrewMember { personId; role: Role; joinedAt; morale; wagePerDay }
interface CrewState { founded: boolean; name: string; foundedAt?; members: CrewMember[] }

// Fahrzeuge sind Items (category 'vehicle', stats capacityL/maxLoadKg/travel/reliability), belegen keinen Stauraum
interface VehicleRental { id; optionId; defId; until }
interface TransportState { rentals: VehicleRental[]; nextId }
```

## Phase 6 – Events & Versorgung

```ts
interface EventPlanInput {
  name; spotId; startsAt /* 22:00 Spielzeit */; durationH; entry
  lineup: (personId | 'self')[]
  sound: { kind: 'own'; systemId } | { kind: 'rental'; optionId }
  transport: 'own' | 'rent'
  promo: promoChannelId[]
  prices: Record<goodsItemId, number>       // mitgenommene Waren + Preis pro Portion
  freeWater; helpers; awareness; medics
}
interface GameEvent extends EventPlanInput {
  id; createdAt; status: 'scheduled'|'running'|'done'|'cancelled'
  tasks: Record<taskId, 'open'|'running'|'done'>
  paid: Record<label, €>                     // Vorkosten
  endsAt?; weather?; report?: EventReport; cancelReason?
}
interface EventReport {
  visitors; demand; revenue: Record<label, €>; costs: Record<label, €>; profit
  scores: { mood; sound; lineup; location; organisation; supply; safety }
  incidents: string[]; highlights: string[]; rep; xp; newPeople: string[]; played: string[]; weather; hoursPlayed
}
interface SupplierDef { id; name; priceFactor; minOrder; maxOrder; deliveryFee; personId?; requires? }
interface PromoChannel { id; label; cost; reach; heat /* Polizei */; fame; task?; requires? }
interface PaRental { id; label; cost; reach; quality; reliability; powerKw; requires? }
// Waren-Items: category 'goods', stats { servings, sellPrice }; Verbrauch pro Gast und Stunde in CONSUMPTION
```

## Phase 7 – Finanzen & Merch ✅

```ts
// finance (erweitert)
interface FinanceState { /* … */ bank: number; loans: Loan[]; nextLoanId: number }
interface Loan { id; offerId; label; amount; remaining; perDay; takenAt }
interface LoanOffer { id; label; amount; total /* inkl. Zinsen */; days; requires? }   // content/finance.ts

// merch
interface MerchState {
  designs: MerchDesign[]; orders: MerchOrder[]
  stock: Record<`${designId}|${productId}`, MerchStock>
  prices: Record<productId, number>          // fehlt → basePrice
  brand: number                              // Markenwert
  shopOpen: boolean; nextId: number
}
interface MerchDesign { id; name; motif; quality; createdAt; by: 'self' | personId }
interface MerchOrder { id; designId; productId; manufacturerId; qty; unitCost; quality; readyAt }
interface MerchStock { designId; productId; qty; unitCost /* Ø */; quality /* Ø */ }
interface MerchProductDef { id; name; volumeL; basePrice; appeal }                    // content/merch.ts
interface ManufacturerDef { id; name; description; quality; minutes; products: Record<productId, { unitCost; minQty }>; personId?; requires? }

// Handel & Lager
interface TradePartnerDef { personId; factor /* Anteil vom Marktwert */; trust; categories?; note }  // content/trade.ts
PoiDef.storage.requires?: Condition[]
EventPlanInput.merch?: boolean               // Merch-Stand
Condition += { t: 'brand'; gte } | { t: 'bank'; gte }
```

## Phase 8 – Rivalen & Zufallsereignisse ✅

```ts
// content/rivals.ts
interface RivalCrewDef {
  id; name; leaderId /* Person */; cityId; style /* Genre */; description
  aggression; cooperation; ambition; sloppiness            // 0–100
  start: { rep; money; reach; quality; members }; spots: spotId[]
  appears?: Condition[]; color; plural?
}
// state.rivals
interface RivalsState { crews: Record<id, RivalCrewState>; events: RivalEvent[]; news: SceneNews[]; nextId; seenNews; coop?: { crewId; until; share } }
interface RivalCrewState {
  active; appearedAt?; dissolved?; rep; money; reach; quality; members; knownSpots: string[]
  relation /* −100…100 */; nextActionAt; brokeDays; eventsHeld; bestVisitors; pendingGuest?; lastContactAt?; tipDay?
}
interface RivalEvent { id; crewId; spotId; startsAt; durationH; status: 'scheduled'|'done'|'cancelled'; visitors?; mood?; raided?; guest?; note? }
interface SceneNews { id; at; text; tone; crewId?; spotId? }

// content/happenings.ts
type HappeningTarget = 'gear'|'soundGear'|'eventDj'|'nextEvent'|'unknownSpot'|'knownSpot'
interface HappeningDef {
  id; title; text /* {item} {event} {person} {spot} */; tone; weight; cooldownDays?; once?; when?: Condition[]
  target?: HappeningTarget; effects?: Effect[] /* '$item' '$event' '$person' '$spot' */; choices?: ChoiceDef[]; expiresHours?; onExpire?: Effect[]
}
// state.happenings
interface HappeningsState { open: OpenHappening[]; log: HappeningLog[]; last: Record<defId, at>; nextRollAt; modifiers: Modifier[]; nextId }
interface Modifier { id; kind: 'demand'|'police'|'jobPay'|'goodsPrice'; value /* +0.2 = +20 % */; until; label }

GameEvent.boosts?: { label; value }[]               // Nachfrage-Änderungen für eine Party
MessageSender += { rival: true }; MessageTemplateDef.rival?: 'coop'|'booking'|'tip'|'hostile'   // '$rival', {crew}
Condition += rivalRelation | rivalActive | outrank
Effect += rivalRelation | coop | rivalBooking | rivalSpotTip | eventBoost | spotChange | modifier | wearItem | discoverSpot | lineupSwap | rareOffer
CatchUpReport.scene: SceneNews[]
```

## Phase 9 – Städte, Endgame, Prestige

- Weitere `CityDef` mit eigener Szene (Preisniveau, Szenegröße, Lieblingsgenres, Polizeidruck).
- Reputation pro Stadt, Reisen/Umzug, Zweigstellen.
- Endgame-Projekte (Festival, Label, eigene Location) als mehrstufige Großprojekte mit langen Timern.
- Vermächtnis: Crew „übergeben“, mit Legacy-Punkten in neuem Szenario starten (andere Stadt, anderer Startweg).
