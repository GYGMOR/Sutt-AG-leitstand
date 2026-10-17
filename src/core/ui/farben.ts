/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/farben.ts                                  │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Zugriff auf die Farbklassen: Kategorie · Techniker · Region · Status  │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { EinsatzStatus } from '../domain/einsatz';
import type { Kategorie } from '../domain/kategorie';
import type { Region, TechnikerFarbe } from '../domain/stammdaten';
import farben from './farben.module.css';

// ── §1 · Zuordnung ───────────────────────────────────────────────

export function kategorieKlasse(kategorie: Kategorie): string | undefined {
  return farben[`kat-${kategorie}`];
}

export function technikerKlasse(farbe: TechnikerFarbe): string | undefined {
  return farben[`tech-${farbe}`];
}

export function regionKlasse(region: Region): string | undefined {
  return farben[`region-${region}`];
}

export function statusKlasse(status: EinsatzStatus): string | undefined {
  return farben[`status-${status}`];
}

export const DRINGEND_KLASSE = farben['status-dringend'];

/* ◆ jh · eof */
