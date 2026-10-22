import { useEffect, useRef } from 'react';
import { appStore } from '../../app/store';
import { dismissToast, pushToast, useToasts } from '../../app/toasts';
import { navigate } from '../router';

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          className={`toast toast--${t.tone}`}
          onClick={() => {
            dismissToast(t.id);
            if (t.link) navigate(t.link);
          }}
        >
          <div className="grow">
            <div className="toast__title">{t.title}</div>
            {t.text && <div className="toast__text">{t.text}</div>}
          </div>
        </button>
      ))}
    </div>
  );
}

/** Shows new feed entries as toasts while playing (not those created during offline catch-up). */
export function FeedToaster() {
  const lastSeen = useRef<number>(appStore.getState().game?.notifications.nextId ?? 1);
  useEffect(() => {
    return appStore.subscribe((state) => {
      const game = state.game;
      if (!game) return;
      const next = game.notifications.nextId;
      if (next <= lastSeen.current) {
        lastSeen.current = next;
        return;
      }
      if (!state.report) {
        for (const e of game.notifications.feed) {
          if (e.id >= lastSeen.current) pushToast({ tone: e.tone, title: e.title, text: e.text, link: e.link });
        }
      }
      lastSeen.current = next;
    });
  }, []);
  return null;
}
