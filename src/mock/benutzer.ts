/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/benutzer.ts                                   │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Demo-Zugänge für die Mock-Anmeldung – ohne Passwörter                 │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Benutzer } from '../core/auth/auth.types';

// ── §1 · Benutzer ────────────────────────────────────────────────

// jh! Reine Demo-Konten. Es gibt keine Passwörter – jede Eingabe meldet an.
export const BENUTZER: readonly Benutzer[] = [
  { id: 'U-JH', benutzername: 'jh', vorname: 'Joel', nachname: 'Hediger', kuerzel: 'JH', rolle: 'disposition' },
  { id: 'U-RW', benutzername: 'rw', vorname: 'Regula', nachname: 'Wild', kuerzel: 'RW', rolle: 'buero' },
  { id: 'U-MB', benutzername: 'mb', vorname: 'Marco', nachname: 'Brunner', kuerzel: 'MB', rolle: 'aussendienst', technikerId: 'T-MB' },
  { id: 'U-SK', benutzername: 'sk', vorname: 'Sandra', nachname: 'Keller', kuerzel: 'SK', rolle: 'aussendienst', technikerId: 'T-SK' },
  { id: 'U-AD', benutzername: 'admin', vorname: 'Leitstand', nachname: 'Administration', kuerzel: 'AD', rolle: 'administration' },
];

export function findBenutzer(benutzername: string): Benutzer | undefined {
  return BENUTZER.find((benutzer) => benutzer.benutzername === benutzername);
}

/* ◆ jh · eof */
