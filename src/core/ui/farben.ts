/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/farben.ts                                  │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Zugriff auf die Farbklassen: Kategorie · Techniker · Region · Status  │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { EinsatzStatus } from '../domain/einsatz';
import type { Kategorie } from '../domain/kategorie';
import type { Region, TechnikerFarbe } from '../domain/stammdaten';
import { modulKlasse } from './cx';
import farben from './farben.module.css';

// ── §1 · Zuordnung ───────────────────────────────────────────────

export function kategorieKlasse(kategorie: Kategorie): string | undefined {
  return modulKlasse(farben, `kat-${kategorie}`);
}

export function technikerKlasse(farbe: TechnikerFarbe): string | undefined {
  return modulKlasse(farben, `tech-${farbe}`);
}

/** Nur der Balken links trägt die Technikerfarbe – die Fläche bleibt, was «Farbe nach» sagt. */
export function balkenKlasse(farbe: TechnikerFarbe): string | undefined {
  return modulKlasse(farben, `balken-${farbe}`);
}

export function regionKlasse(region: Region): string | undefined {
  return modulKlasse(farben, `region-${region}`);
}

export function statusKlasse(status: EinsatzStatus): string | undefined {
  return modulKlasse(farben, `status-${status}`);
}

export const DRINGEND_KLASSE = modulKlasse(farben, 'status-dringend');

/* ◆ jh · eof */
