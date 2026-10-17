/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/hooks/useNow.ts                               │
   │  ◆ JH · 2026.10 · rev 01                                               │
   │  Laufende Uhrzeit für Jetzt-Linie und relative Angaben                 │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useState } from 'react';

// ── §1 · Hook ────────────────────────────────────────────────────

/** Liefert «jetzt» und aktualisiert im angegebenen Takt (Standard 30 s). */
export function useNow(taktMs = 30_000): Date {
  const [jetzt, setJetzt] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setJetzt(new Date()), taktMs);
    return () => window.clearInterval(timer);
  }, [taktMs]);

  return jetzt;
}

/* ◆ jh · eof */
