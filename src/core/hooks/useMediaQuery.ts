/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/hooks/useMediaQuery.ts                        │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Media Query als Hook – Seitenleiste klappt unter 1280 px ein          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useSyncExternalStore } from 'react';

// ── §1 · Hook ────────────────────────────────────────────────────

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      const liste = window.matchMedia(query);
      liste.addEventListener('change', listener);
      return () => liste.removeEventListener('change', listener);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/* ◆ jh · eof */
