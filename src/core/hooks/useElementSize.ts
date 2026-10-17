/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/hooks/useElementSize.ts                       │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Elementgrösse per ResizeObserver – für Zeitachse und Zeilenhöhen      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

// ── §1 · Hook ────────────────────────────────────────────────────

export interface Groesse {
  width: number;
  height: number;
}

export function useElementSize(ref: RefObject<HTMLElement | null>): Groesse {
  const [groesse, setGroesse] = useState<Groesse>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const knoten = ref.current;
    if (!knoten) return undefined;

    const messen = () => {
      const rect = knoten.getBoundingClientRect();
      setGroesse((alt) => {
        const breite = Math.round(rect.width);
        const hoehe = Math.round(rect.height);
        return alt.width === breite && alt.height === hoehe ? alt : { width: breite, height: hoehe };
      });
    };

    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(knoten);
    return () => beobachter.disconnect();
  }, [ref]);

  return groesse;
}

/* ◆ jh · eof */
