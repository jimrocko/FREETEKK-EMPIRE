import { useState } from 'react';
import { ChevronRight, Lock, Menu } from 'lucide-react';
import { useGameState } from '../../app/store';
import { checkAll, requirementReason } from '../../game/core/conditions';
import { ROUTES, findRoute, type RouteDef } from '../routes';
import { navigate, useRoute } from '../router';
import { Modal } from '../components/ui';
import { Toasts, FeedToaster } from './Toasts';
import { OfflineReportModal } from './OfflineReport';
import { Hud } from './Hud';
import { Celebration } from './Celebration';
import { Sky } from '../components/Sky';
import { UiSounds } from '../fx/UiSounds';

function routeLocked(s: ReturnType<typeof useGameState>, r: RouteDef): string | null {
  return r.requires && !checkAll(s, r.requires) ? requirementReason(s, r.requires) : null;
}

function SideNav({ path }: { path: string }) {
  const s = useGameState();
  const active = findRoute(path).path;
  let lastGroup = '';
  return (
    <nav className="sidenav" aria-label="Hauptnavigation">
      {ROUTES.map((r) => {
        const Icon = r.icon;
        const locked = routeLocked(s, r);
        const badge = r.badge?.(s) ?? 0;
        const sep = r.group !== lastGroup ? <div className="sidenav__sep">{r.group}</div> : null;
        lastGroup = r.group;
        return (
          <div key={r.path} style={{ display: 'contents' }}>
            {sep}
            <button className={['sidenav__item', active === r.path && 'is-active'].filter(Boolean).join(' ')} disabled={!!locked} title={locked ?? undefined} onClick={() => navigate(r.path)}>
              {locked ? <Lock size={18} /> : <Icon size={18} />}
              {r.label}
              {badge > 0 && <span className="navbtn__badge">{badge}</span>}
            </button>
          </div>
        );
      })}
    </nav>
  );
}

/** The big round button in the middle of the bottom bar. */
const CENTER_PATH = '/events';

function BottomNav({ path, onMore }: { path: string; onMore: () => void }) {
  const s = useGameState();
  const primary = ROUTES.filter((r) => r.nav === 'primary');
  // Events sit in the middle as the big button.
  const center = primary.find((r) => r.path === CENTER_PATH);
  const others = primary.filter((r) => r.path !== CENTER_PATH);
  const ordered = center ? [...others.slice(0, 2), center, ...others.slice(2)] : primary;
  const active = findRoute(path);
  const moreActive = active.nav === 'more';
  const moreBadge = ROUTES.filter((r) => r.nav === 'more').reduce((n, r) => n + (r.badge?.(s) ?? 0), 0);
  return (
    <nav className="bottomnav" aria-label="Hauptnavigation">
      {ordered.map((r) => {
        const Icon = r.icon;
        const badge = r.badge?.(s) ?? 0;
        if (r.path === CENTER_PATH) {
          return (
            <button key={r.path} className={['navbtn', 'navbtn--center', active.path === r.path && 'is-active'].filter(Boolean).join(' ')} onClick={() => navigate(r.path)} data-testid={`nav-${r.path}`}>
              <span className="navbtn__orb">
                <Icon size={26} />
              </span>
              <span className="navbtn__label">{r.label}</span>
              {badge > 0 && <span className="navbtn__badge">{badge}</span>}
            </button>
          );
        }
        return (
          <button key={r.path} className={['navbtn', active.path === r.path && 'is-active'].filter(Boolean).join(' ')} onClick={() => navigate(r.path)} data-testid={`nav-${r.path}`}>
            <Icon size={22} />
            {r.label}
            {badge > 0 && <span className="navbtn__badge">{badge}</span>}
          </button>
        );
      })}
      <button className={['navbtn', moreActive && 'is-active'].filter(Boolean).join(' ')} onClick={onMore} data-testid="nav-more">
        <Menu size={22} />
        Mehr
        {moreBadge > 0 && <span className="navbtn__badge">{moreBadge}</span>}
      </button>
    </nav>
  );
}

function MoreSheet({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const more = ROUTES.filter((r) => r.nav === 'more');
  return (
    <Modal title="Mehr" onClose={onClose} testId="more-sheet">
      <div className="morelist">
        {more.map((r) => {
          const Icon = r.icon;
          const locked = routeLocked(s, r);
          const badge = r.badge?.(s) ?? 0;
          return (
            <button
              key={r.path}
              className="morelist__item"
              disabled={!!locked}
              onClick={() => {
                onClose();
                navigate(r.path);
              }}
              data-testid={`more-${r.path}`}
            >
              <span className="icon-box">{locked ? <Lock size={18} /> : <Icon size={18} />}</span>
              <span className="grow">
                <strong>{r.label}</strong>
                {locked && <div className="tiny tone-warning">{locked}</div>}
              </span>
              {badge > 0 && <span className="badge badge--accent">{badge}</span>}
              <ChevronRight size={18} className="chev" />
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export function AppShell() {
  const path = useRoute();
  const s = useGameState();
  const [moreOpen, setMoreOpen] = useState(false);
  const route = findRoute(path);
  const locked = routeLocked(s, route);
  const Screen = locked ? ROUTES[0].component : route.component;

  return (
    <div className="shell">
      <Sky />
      <Hud />
      <div className="layout">
        <SideNav path={path} />
        <main className="main">
          <Screen key={route.path} />
        </main>
      </div>
      <BottomNav path={path} onMore={() => setMoreOpen(true)} />
      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
      <OfflineReportModal />
      <FeedToaster />
      <Toasts />
      <Celebration />
      <UiSounds />
    </div>
  );
}
