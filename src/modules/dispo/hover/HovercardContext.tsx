/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/hover/HovercardContext.tsx           │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Hovercard-Ziel: welche Karte/Block gerade die Kurzansicht zeigt       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface HoverZiel {
  auftragId: string;
  einsatzId?: string;
  anker: DOMRect;
}

interface HovercardState {
  ziel: HoverZiel | null;
  zeigen: (ziel: HoverZiel) => void;
  verbergen: () => void;
}

const HovercardContext = createContext<HovercardState>({ ziel: null, zeigen: () => undefined, verbergen: () => undefined });

// ── §2 · Provider ────────────────────────────────────────────────

export function HovercardProvider({ children }: { children: ReactNode }) {
  const [ziel, setZiel] = useState<HoverZiel | null>(null);
  const zeigen = useCallback((neu: HoverZiel) => setZiel(neu), []);
  const verbergen = useCallback(() => setZiel(null), []);
  const wert = useMemo(() => ({ ziel, zeigen, verbergen }), [ziel, zeigen, verbergen]);
  return <HovercardContext.Provider value={wert}>{children}</HovercardContext.Provider>;
}

export function useHovercard(): HovercardState {
  return useContext(HovercardContext);
}

/* ◆ jh · eof */
