/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/hooks/useHoverIntent.ts                       │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Hover mit Verzögerung (250 ms) – Grundlage der Hovercards             │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useRef } from 'react';
import type { FocusEvent, PointerEvent } from 'react';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface HoverIntentHandlers {
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  onPointerDown: () => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: () => void;
}

export const HOVERCARD_DELAY_MS = 250;

// ── §2 · Hook ────────────────────────────────────────────────────

// jh› Zeigt erst nach 250 ms – beim Überfahren der Plantafel flackert sonst
//     bei jedem Block eine Karte auf. Pointerdown (Drag-Beginn) bricht ab.
export function useHoverIntent(
  onShow: (anchor: DOMRect) => void,
  onHide: () => void,
  delayMs = HOVERCARD_DELAY_MS,
): HoverIntentHandlers {
  const timer = useRef<number | null>(null);

  const abbrechen = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => abbrechen, [abbrechen]);

  const starten = useCallback(
    (ziel: HTMLElement) => {
      abbrechen();
      timer.current = window.setTimeout(() => onShow(ziel.getBoundingClientRect()), delayMs);
    },
    [abbrechen, onShow, delayMs],
  );

  const beenden = useCallback(() => {
    abbrechen();
    onHide();
  }, [abbrechen, onHide]);

  return {
    onPointerEnter: (event) => starten(event.currentTarget),
    onPointerLeave: beenden,
    onPointerDown: beenden,
    onFocus: (event) => starten(event.currentTarget),
    onBlur: beenden,
  };
}

/* ◆ jh · eof */
