/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/authStore.ts                             │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Mock-Anmeldung: Benutzerliste wird injiziert, Sitzung persistiert     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { nowZeitpunkt } from '../datum';
import { createStore, useStore } from '../store';
import type { AnmeldeErgebnis, Benutzer, Rolle, Sitzung } from './auth.types';

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

// ── §3 · Benutzerverzeichnis (injiziert) ─────────────────────────

// jh› core kennt keine Mockdaten: App.tsx hängt das Verzeichnis ein.
let findeBenutzer: (benutzername: string) => Benutzer | undefined = () => undefined;
let alleBenutzer: () => readonly Benutzer[] = () => [];

export function configureAuth(verzeichnis: { finden: typeof findeBenutzer; alle: typeof alleBenutzer }): void {
  findeBenutzer = verzeichnis.finden;
  alleBenutzer = verzeichnis.alle;
}

export function listBenutzer(): readonly Benutzer[] {
  return alleBenutzer();
}

// ── §4 · Aktionen ────────────────────────────────────────────────

export interface AnmeldeDaten {
  benutzername: string;
  rolle?: Rolle;
  bleibtAngemeldet: boolean;
}

// jh! Kein Passwortvergleich: Mock. Die Funktion nimmt das Passwort gar nicht
//     entgegen, damit nie eines im State oder Storage landet.
export function anmelden(daten: AnmeldeDaten): AnmeldeErgebnis {
  const benutzer = findeBenutzer(daten.benutzername.trim().toLowerCase());
  if (!benutzer) return { ok: false, fehler: 'Benutzername unbekannt. Demo-Zugänge stehen unter dem Formular.' };
  const sitzung: Sitzung = {
    benutzer: daten.rolle ? { ...benutzer, rolle: daten.rolle } : benutzer,
    angemeldetAm: nowZeitpunkt(),
    bleibtAngemeldet: daten.bleibtAngemeldet,
  };
  authStore.dispatch({ kind: 'anmelden', sitzung });
  return { ok: true, sitzung };
}

export function abmelden(): void {
  authStore.dispatch({ kind: 'abmelden' });
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
