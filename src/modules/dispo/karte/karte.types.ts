/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/karte/karte.types.ts                 │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Gemeinsame Kartentypen für Google, MapLibre und Schemakarte           │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Koordinaten } from '../../../core/geo';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface KartenPin {
  id: string;
  koordinaten: Koordinaten;
  /** Beschriftung im Pin (Nummer oder Kurzform). */
  label: string;
  /** Farbklasse aus core/ui/farben – setzt --sl-edge. */
  farbeKlasse?: string;
  /** Token-Name der Farbe, z. B. `--sl-tech-1` (für Linien und Fremdkarten). */
  farbeToken?: string;
  aktiv?: boolean;
  gedimmt?: boolean;
  titel?: string;
}

export interface KartenLinie {
  id: string;
  punkte: readonly Koordinaten[];
  farbeToken: string;
  gestrichelt?: boolean;
}

export interface KartenProps {
  pins: readonly KartenPin[];
  linien?: readonly KartenLinie[];
  /** Pin, auf den zentriert/fokussiert wird. */
  fokusId?: string;
  /** Übersicht zeigt Ortsnamen, Werkhof und Massstab. */
  uebersicht?: boolean;
  onPinClick?: (id: string) => void;
}

// ── §2 · Hilfen ──────────────────────────────────────────────────

/** Liest einen Farbtoken zur Laufzeit – Fremdkarten brauchen echte Farbwerte. */
export function tokenFarbe(token: string): string {
  const wert = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return wert || '#3a3a3a';
}

/* ◆ jh · eof */
