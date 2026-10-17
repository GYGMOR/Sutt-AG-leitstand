/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/hooks/useDismiss.ts                           │
   │  ◆ JH · 2026.10 · rev 01                                               │
   │  Popover schliessen: Klick ausserhalb oder Escape                      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

// ── §1 · Hook ────────────────────────────────────────────────────

export function useDismiss(
  bereich: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  aktiv: boolean,
): void {
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!aktiv) return undefined;

    function onPointerDown(event: PointerEvent) {
      const knoten = bereich.current;
      if (!knoten || !(event.target instanceof Node)) return;
      if (!knoten.contains(event.target)) dismissRef.current();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismissRef.current();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [bereich, aktiv]);
}

/* ◆ jh · eof */
