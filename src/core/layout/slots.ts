/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/slots.ts                               │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Einhängepunkte der Shell: Module liefern Bausteine, core kennt sie    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';

// ── §1 · Topbar ──────────────────────────────────────────────────

// jh› core importiert nie aus modules – die Stempeluhr hängt sich in main.tsx ein, wie das Benutzerverzeichnis.
let topbarExtra: ComponentType | null = null;
const listeners = new Set<() => void>();

export function registerTopbarExtra(component: ComponentType | null): void {
  topbarExtra = component;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTopbarExtra(): ComponentType | null {
  return useSyncExternalStore(subscribe, () => topbarExtra, () => topbarExtra);
}

/* ◆ jh · eof */
