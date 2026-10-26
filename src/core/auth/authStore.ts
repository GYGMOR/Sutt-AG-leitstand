/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/authStore.ts                             │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Anmeldung: lokal (Mock) oder über Anbieter, Sitzung, Verzeichnis      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { nowZeitpunkt } from '../datum';
import { createStore, useStore } from '../store';
import type { AnmeldeErgebnis, Benutzer, Rolle, Sitzung } from './auth.types';
import type { IdentitaetsAnbieter, IdentitaetsClaims } from './identitaet';

// ── §1 · State ───────────────────────────────────────────────────

interface AuthState {
  sitzung: Sitzung | null;
}

type AuthAction = { kind: 'anmelden'; sitzung: Sitzung } | { kind: 'abmelden' } | { kind: 'rolleWechseln'; rolle: Rolle };

const SPEICHER_KEY = 'sl.sitzung';

// jh› «Angemeldet bleiben» → localStorage, sonst sessionStorage (Tab zu = abgemeldet).
function speicherFuer(bleibt: boolean): Storage {
  return bleibt ? window.localStorage : window.sessionStorage;
}

function readSitzung(): Sitzung | null {
  for (const speicher of [window.sessionStorage, window.localStorage]) {
    try {
      const roh = speicher.getItem(SPEICHER_KEY);
      if (roh) return JSON.parse(roh) as Sitzung;
    } catch {
      // jh› defekter Eintrag zählt als «nicht angemeldet»
    }
  }
  return null;
}

function writeSitzung(sitzung: Sitzung | null): void {
  try {
    window.sessionStorage.removeItem(SPEICHER_KEY);
    window.localStorage.removeItem(SPEICHER_KEY);
    if (sitzung) speicherFuer(sitzung.bleibtAngemeldet).setItem(SPEICHER_KEY, JSON.stringify(sitzung));
  } catch {
    // jh› Ohne Storage bleibt die Sitzung im Speicher – reicht für die Demo.
  }
}

// ── §2 · Reducer & Store ─────────────────────────────────────────

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.kind) {
    case 'anmelden':
      return { sitzung: action.sitzung };
    case 'abmelden':
      return { sitzung: null };
    case 'rolleWechseln':
      if (!state.sitzung) return state;
      return { sitzung: { ...state.sitzung, benutzer: { ...state.sitzung.benutzer, rolle: action.rolle } } };
  }
}

export const authStore = createStore(authReducer, { sitzung: readSitzung() });
authStore.subscribe(() => writeSitzung(authStore.getState().sitzung));

// ── §3 · Verzeichnis & Anbieter (injiziert) ──────────────────────

export type IdentitaetsAnmeldung = (claims: IdentitaetsClaims, jetzt: string) => { ok: true; benutzer: Benutzer; neu: boolean } | { ok: false; fehler: string };

export interface AuthVerzeichnis {
  finden: (benutzername: string) => Benutzer | undefined;
  alle: () => readonly Benutzer[];
  /** Konten beim Mock-Identitätsanbieter («Konto wählen»). */
  identitaeten?: (anbieter: IdentitaetsAnbieter) => readonly IdentitaetsClaims[];
  /** Prüft Claims gegen Mandant und Konten – legt bei Bedarf ein Konto an (JIT). */
  mitIdentitaet?: IdentitaetsAnmeldung;
  beiAnmeldung?: (sitzung: Sitzung, neu: boolean) => void;
  beiAbmeldung?: (benutzer: Benutzer, grund: AbmeldeGrund) => void;
}

// jh› core kennt keine Mockdaten und keinen Betriebsstand: main.tsx hängt Verzeichnis, Anbieter und Journal ein.
let verzeichnis: AuthVerzeichnis = { finden: () => undefined, alle: () => [] };

export function configureAuth(neu: AuthVerzeichnis): void {
  verzeichnis = neu;
}

export function listBenutzer(): readonly Benutzer[] {
  return verzeichnis.alle().filter((benutzer) => benutzer.aktiv);
}

export function listIdentitaeten(anbieter: IdentitaetsAnbieter): readonly IdentitaetsClaims[] {
  return verzeichnis.identitaeten?.(anbieter) ?? [];
}

// ── §4 · Aktionen ────────────────────────────────────────────────

export interface AnmeldeDaten {
  benutzername: string;
  rolle?: Rolle;
  bleibtAngemeldet: boolean;
}

export type AbmeldeGrund = 'manuell' | 'inaktiv';

function sitzungStarten(benutzer: Benutzer, bleibtAngemeldet: boolean, anbieter: Sitzung['anbieter'], neu: boolean): Sitzung {
  const sitzung: Sitzung = { benutzer, angemeldetAm: nowZeitpunkt(), bleibtAngemeldet, anbieter };
  authStore.dispatch({ kind: 'anmelden', sitzung });
  verzeichnis.beiAnmeldung?.(sitzung, neu);
  return sitzung;
}

// jh! Kein Passwortvergleich: Mock. Die Funktion nimmt das Passwort gar nicht
//     entgegen, damit nie eines im State oder Storage landet.
export function anmelden(daten: AnmeldeDaten): AnmeldeErgebnis {
  const benutzer = verzeichnis.finden(daten.benutzername.trim().toLowerCase());
  if (!benutzer) return { ok: false, fehler: 'Benutzername unbekannt. Demo-Zugänge stehen unter dem Formular.' };
  if (!benutzer.aktiv) return { ok: false, fehler: 'Dieses Konto ist gesperrt. Bitte an die Administration wenden.' };
  const sitzung = sitzungStarten(daten.rolle ? { ...benutzer, rolle: daten.rolle } : benutzer, daten.bleibtAngemeldet, 'lokal', false);
  return { ok: true, sitzung };
}

/** Anmeldung mit den Claims eines Identitätsanbieters (Mock-Dialog «Konto wählen»). */
export function anmeldenMitIdentitaet(claims: IdentitaetsClaims, bleibtAngemeldet: boolean): AnmeldeErgebnis {
  if (!verzeichnis.mitIdentitaet) return { ok: false, fehler: 'Kein Identitätsanbieter eingerichtet.' };
  const ergebnis = verzeichnis.mitIdentitaet(claims, nowZeitpunkt());
  if (!ergebnis.ok) return ergebnis;
  const sitzung = sitzungStarten(ergebnis.benutzer, bleibtAngemeldet, claims.anbieter, ergebnis.neu);
  return { ok: true, sitzung };
}

export function abmelden(grund: AbmeldeGrund = 'manuell'): void {
  const benutzer = authStore.getState().sitzung?.benutzer;
  authStore.dispatch({ kind: 'abmelden' });
  if (benutzer) verzeichnis.beiAbmeldung?.(benutzer, grund);
}

export function rolleWechseln(rolle: Rolle): void {
  authStore.dispatch({ kind: 'rolleWechseln', rolle });
}

// ── §5 · Hooks ───────────────────────────────────────────────────

export function useSitzung(): Sitzung | null {
  return useStore(authStore, (state) => state.sitzung);
}

export function useBenutzer(): Benutzer | null {
  return useStore(authStore, (state) => state.sitzung?.benutzer ?? null);
}

/* ◆ jh · eof */
