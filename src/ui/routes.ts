import type { ComponentType } from 'react';
import { Bell, Briefcase, Home, Package, Settings, ShoppingBag, Trophy, Wallet, type LucideIcon } from 'lucide-react';
import type { Condition } from '../game/core/types';
import type { GameState } from '../game/state';
import { unreadCount } from '../game/core/notify';
import { DashboardScreen } from './screens/dashboard/DashboardScreen';
import { JobsScreen } from './screens/jobs/JobsScreen';
import { MarketScreen } from './screens/market/MarketScreen';
import { InventoryScreen } from './screens/inventory/InventoryScreen';
import { FinanceScreen } from './screens/finance/FinanceScreen';
import { ProgressScreen } from './screens/progress/ProgressScreen';
import { FeedScreen } from './screens/feed/FeedScreen';
import { SettingsScreen } from './screens/settings/SettingsScreen';

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
  { path: '/jobs', label: 'Jobs', icon: Briefcase, component: JobsScreen, nav: 'primary', group: 'Spiel' },
  { path: '/markt', label: 'Markt', icon: ShoppingBag, component: MarketScreen, nav: 'primary', group: 'Spiel' },
  { path: '/inventar', label: 'Inventar', icon: Package, component: InventoryScreen, nav: 'primary', group: 'Spiel' },
  { path: '/finanzen', label: 'Finanzen', icon: Wallet, component: FinanceScreen, nav: 'more', group: 'Übersicht' },
  { path: '/fortschritt', label: 'Fortschritt', icon: Trophy, component: ProgressScreen, nav: 'more', group: 'Übersicht' },
  { path: '/neuigkeiten', label: 'Neuigkeiten', icon: Bell, component: FeedScreen, nav: 'more', group: 'Übersicht', badge: unreadCount },
  { path: '/einstellungen', label: 'Einstellungen', icon: Settings, component: SettingsScreen, nav: 'more', group: 'System' },
];

export function findRoute(path: string): RouteDef {
  return ROUTES.find((r) => r.path === path) ?? ROUTES[0];
}
