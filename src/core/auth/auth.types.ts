/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/auth.types.ts                            │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Benutzer, Rollen, Sitzung – ohne echte Passwörter (Mock)              │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoZeitpunkt } from '../datum';

// ── §1 · Rollen ──────────────────────────────────────────────────

export type Rolle = 'buero' | 'disposition' | 'aussendienst' | 'administration';

export const ROLLEN: readonly Rolle[] = ['buero', 'disposition', 'aussendienst', 'administration'];

export const ROLLE_LABEL: Readonly<Record<Rolle, string>> = {
  buero: 'Büro',
  disposition: 'Disposition',
  aussendienst: 'Aussendienst',
  administration: 'Administration',
};

// ── §2 · Benutzer & Sitzung ──────────────────────────────────────

export interface Benutzer {
  id: string;
  benutzername: string;
  vorname: string;
  nachname: string;
  kuerzel: string;
  rolle: Rolle;
  /** Verknüpfter Techniker, wenn der Benutzer selbst fährt. */
  technikerId?: string;
}

export interface Sitzung {
  benutzer: Benutzer;
  angemeldetAm: IsoZeitpunkt;
  bleibtAngemeldet: boolean;
}

export type AnmeldeErgebnis = { ok: true; sitzung: Sitzung } | { ok: false; fehler: string };

/* ◆ jh · eof */
