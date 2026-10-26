/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/auth.types.ts                            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Benutzer, Rollen, Rechte, Anbieter-Verknüpfung, Sitzung (Mock)        │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Bereich, Recht, Umfang } from '../berechtigung/rechte';
import type { IsoZeitpunkt } from '../datum';
import type { IdentitaetsAnbieter } from './identitaet';

// ── §1 · Rollen ──────────────────────────────────────────────────

export type Rolle = 'buero' | 'disposition' | 'aussendienst' | 'administration';

export const ROLLEN: readonly Rolle[] = ['buero', 'disposition', 'aussendienst', 'administration'];

export const ROLLE_LABEL: Readonly<Record<Rolle, string>> = {
  buero: 'Büro',
  disposition: 'Disposition',
  aussendienst: 'Aussendienst',
  administration: 'Administration',
};

/** Rang für Konflikte, z. B. mehrere Gruppen aus dem Identitätsanbieter: die höchste Rolle gewinnt. */
export const ROLLE_RANG: Readonly<Record<Rolle, number>> = {
  aussendienst: 1,
  disposition: 2,
  buero: 3,
  administration: 4,
};

// ── §2 · Benutzer & Sitzung ──────────────────────────────────────

/** Verknüpfung mit dem Konto beim Identitätsanbieter (OIDC-Subject). */
export interface SsoVerknuepfung {
  anbieter: IdentitaetsAnbieter;
  externeId: string;
  email: string;
  verknuepftAm: IsoZeitpunkt;
}

export interface Benutzer {
  id: string;
  benutzername: string;
  vorname: string;
  nachname: string;
  kuerzel: string;
  rolle: Rolle;
  /** Verknüpfter Techniker, wenn der Benutzer selbst fährt. */
  technikerId?: string;
  /** Verknüpfte Personalakte (Zeit, Absenzen, Vorgesetzte). */
  mitarbeiterId?: string;
  email?: string;
  aktiv: boolean;
  zusatzRechte?: readonly Recht[];
  entzogeneRechte?: readonly Recht[];
  umfang?: Readonly<Partial<Record<Bereich, Umfang>>>;
  sso?: SsoVerknuepfung;
  /** Zweiter Faktor wird vom Anbieter erzwungen (Conditional Access / 2-Step). */
  mfa?: boolean;
  letzteAnmeldung?: IsoZeitpunkt;
  erstelltAm?: IsoZeitpunkt;
}

export interface Sitzung {
  benutzer: Benutzer;
  angemeldetAm: IsoZeitpunkt;
  bleibtAngemeldet: boolean;
  /** Wie die Anmeldung zustande kam – lokal (Mock-Passwort) oder über einen Anbieter. */
  anbieter?: IdentitaetsAnbieter | 'lokal';
}

export type AnmeldeErgebnis = { ok: true; sitzung: Sitzung } | { ok: false; fehler: string };

/* ◆ jh · eof */
