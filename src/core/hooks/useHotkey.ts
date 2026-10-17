/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/hooks/useHotkey.ts                            │
   │  ◆ JH · 2026.10 · rev 01                                               │
   │  Tastenkürzel (⌘/Strg + Taste) mit plattformgerechter Anzeige          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useRef } from 'react';

// ── §1 · Plattform ───────────────────────────────────────────────

export const IS_APPLE = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

// jh› Büro-PCs bei Sutt laufen vermutlich unter Windows – Hinweis zeigt dort «Strg».
export const MOD_LABEL = IS_APPLE ? '⌘' : 'Strg';

export function isModPressed(event: KeyboardEvent): boolean {
  return IS_APPLE ? event.metaKey : event.ctrlKey;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

// ── §2 · Hook ────────────────────────────────────────────────────

export interface Hotkey {
  key: string;
  mod?: boolean;
  /** Auch auslösen, wenn der Fokus in einem Eingabefeld liegt. */
  inInputs?: boolean;
}

export function useHotkey(hotkey: Hotkey, onTrigger: (event: KeyboardEvent) => void, enabled = true): void {
  const triggerRef = useRef(onTrigger);
  useEffect(() => {
    triggerRef.current = onTrigger;
  });

  const { key, mod = false, inInputs = false } = hotkey;

  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (isModPressed(event) !== mod) return;
      if (!inInputs && isTypingTarget(event.target)) return;
      event.preventDefault();
      triggerRef.current(event);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, mod, inInputs, enabled]);
}

/* ◆ jh · eof */
