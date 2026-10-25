/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/hooks/useQrSvg.ts                             │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  QR-Code als SVG-Text, Bibliothek lädt lazy                            │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useState } from 'react';

// ── §1 · Hook ────────────────────────────────────────────────────

// jh› qrcode lädt erst, wenn eine Druckseite den Code wirklich braucht.
export function useQrSvg(text: string): string | null {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let aktiv = true;
    void import('qrcode')
      .then((modul) => modul.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }))
      .then((ergebnis) => {
        if (aktiv) setSvg(ergebnis);
      });
    return () => {
      aktiv = false;
    };
  }, [text]);
  return svg;
}

/* ◆ jh · eof */
