import { useEffect, useRef } from 'react';
import { toastStore } from '../../app/toasts';
import { sfx } from './sound';

/** Clicks on buttons and the outcome of actions make a sound. */
export function UiSounds() {
  const lastToast = useRef(toastStore.getState().nextId);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('button, .tile, [role="button"]');
      if (el && !(el as HTMLButtonElement).disabled) sfx.tap();
    };
    document.addEventListener('pointerdown', onDown, { passive: true });
    const unsub = toastStore.subscribe((s) => {
      const fresh = s.toasts.filter((t) => t.id >= lastToast.current);
      lastToast.current = s.nextId;
      const t = fresh[fresh.length - 1];
      if (!t) return;
      if (t.tone === 'warning' || t.tone === 'danger') sfx.error();
      else if (t.tone === 'success') sfx.ok();
    });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      unsub();
    };
  }, []);
  return null;
}
