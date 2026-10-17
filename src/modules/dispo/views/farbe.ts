/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/farbe.ts                       │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  «Farbe nach»: Kategorie · Techniker · Region · Status → Farbklasse    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { kategorieKlasse, regionKlasse, statusKlasse, technikerKlasse } from '../../../core/ui/farben';
import type { FarbeNach } from '../dispo.types';
import type { EinsatzView } from '../store/dispo.selectors';

// ── §1 · Zuordnung ───────────────────────────────────────────────

export function farbKlasse(view: EinsatzView, farbeNach: FarbeNach): string | undefined {
  switch (farbeNach) {
    case 'kategorie':
      return kategorieKlasse(view.auftrag.kategorie);
    case 'techniker':
      return technikerKlasse(view.techniker.farbe);
    case 'region':
      return regionKlasse(view.region);
    case 'status':
      return statusKlasse(view.einsatz.status);
  }
}

/* ◆ jh · eof */
