import type { ComponentType } from 'react';
import { Bell, Briefcase, Disc3, Flag, Home, Map as MapIcon, Package, PartyPopper, Users, Radio, Settings, Shirt, ShoppingBag, Trophy, Wallet, type LucideIcon } from 'lucide-react';
import type { Condition } from '../game/core/types';
import type { GameState } from '../game/state';
import { unreadCount } from '../game/core/notify';
import { openRumors } from '../game/systems/map/logic';
import { DashboardScreen } from './screens/dashboard/DashboardScreen';
import { JobsScreen } from './screens/jobs/JobsScreen';
import { MarketScreen } from './screens/market/MarketScreen';
import { InventoryScreen } from './screens/inventory/InventoryScreen';
import { FinanceScreen } from './screens/finance/FinanceScreen';
import { ProgressScreen } from './screens/progress/ProgressScreen';
import { FeedScreen } from './screens/feed/FeedScreen';
import { SettingsScreen } from './screens/settings/SettingsScreen';
import { MapScreen } from './screens/map/MapScreen';
import { NetworkScreen } from './screens/network/NetworkScreen';
import { StudioScreen } from './screens/studio/StudioScreen';
import { CrewScreen } from './screens/crew/CrewScreen';
import { EventsScreen } from './screens/events/EventsScreen';
import { MerchScreen } from './screens/merch/MerchScreen';
import { SceneScreen } from './screens/scene/SceneScreen';
import { unseenNews } from '../game/systems/rivals/logic';
import { upcomingEvents } from '../game/systems/events/plan';
import { openMessages, unreadMessages } from '../game/systems/messages/logic';

export interface RouteDef {
  path: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
  /** primary = bottom bar on mobile; more = in the "Mehr" sheet. */
  nav: 'primary' | 'more';
  group: 'Spiel' | 'Übersicht' | 'System';
  /** In-game unlock; locked routes are shown disabled with the reason. */
  requires?: Condition[];
  badge?: (s: GameState) => number;
}

/** Only implemented systems appear here – no placeholders. */
export const ROUTES: RouteDef[] = [
  { path: '/', label: 'Home', icon: Home, component: DashboardScreen, nav: 'primary', group: 'Spiel' },
  { path: '/karte', label: 'Karte', icon: MapIcon, component: MapScreen, nav: 'primary', group: 'Spiel', badge: (s) => openRumors(s).length },
  {
    path: '/netzwerk',
    label: 'Netzwerk',
    icon: Users,
    component: NetworkScreen,
    nav: 'primary',
    group: 'Spiel',
    badge: (s) => Math.max(openMessages(s).length, unreadMessages(s)),
  },
  { path: '/szene', label: 'Szene', icon: Radio, component: SceneScreen, nav: 'more', group: 'Spiel', badge: unseenNews },
  { path: '/crew', label: 'Crew & Anlage', icon: Flag, component: CrewScreen, nav: 'more', group: 'Spiel' },
  { path: '/jobs', label: 'Jobs', icon: Briefcase, component: JobsScreen, nav: 'more', group: 'Spiel' },
  {
    path: '/studio',
    label: 'Studio',
    icon: Disc3,
    component: StudioScreen,
    nav: 'more',
    group: 'Spiel',
    requires: [
      {
        t: 'any',
        of: [
          { t: 'itemTag', tag: 'drums' },
          { t: 'itemTag', tag: 'synth' },
          { t: 'itemTag', tag: 'sampler' },
        ],
      },
    ],
  },
  {
    path: '/events',
    label: 'Events',
    icon: PartyPopper,
    component: EventsScreen,
    nav: 'primary',
    group: 'Spiel',
    badge: (s) => upcomingEvents(s).filter((e) => Object.values(e.tasks).includes('open')).length,
  },
  { path: '/merch', label: 'Merch', icon: Shirt, component: MerchScreen, nav: 'more', group: 'Spiel', requires: [{ t: 'crewFounded' }] },
  { path: '/markt', label: 'Markt', icon: ShoppingBag, component: MarketScreen, nav: 'more', group: 'Spiel' },
  { path: '/inventar', label: 'Inventar', icon: Package, component: InventoryScreen, nav: 'more', group: 'Spiel' },
  { path: '/finanzen', label: 'Finanzen', icon: Wallet, component: FinanceScreen, nav: 'more', group: 'Übersicht' },
  { path: '/fortschritt', label: 'Fortschritt', icon: Trophy, component: ProgressScreen, nav: 'more', group: 'Übersicht' },
  { path: '/neuigkeiten', label: 'Neuigkeiten', icon: Bell, component: FeedScreen, nav: 'more', group: 'Übersicht', badge: unreadCount },
  { path: '/einstellungen', label: 'Einstellungen', icon: Settings, component: SettingsScreen, nav: 'more', group: 'System' },
];

/** Matches "/karte/spot/x" to the "/karte" route. */
export function findRoute(path: string): RouteDef {
  return ROUTES.find((r) => r.path === path || (r.path !== '/' && path.startsWith(`${r.path}/`))) ?? ROUTES[0];
}
