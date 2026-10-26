/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/mandant/mandantStore.ts                       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Mandanten-Einstellungen: persistiert, in andere Fenster gespiegelt    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { createStore, readPersisted, useStore, writePersisted } from '../store';
import { MANDANT_STANDARD } from './mandant.types';
import type { Mandant } from './mandant.types';

// ── §1 · Store ───────────────────────────────────────────────────

const SPEICHER_KEY = 'sl.mandant.v1';

type MandantAction = { kind: 'set'; aenderung: Partial<Mandant> } | { kind: 'replace'; mandant: Mandant } | { kind: 'reset' };

function isMandant(wert: unknown): wert is Mandant {
  if (typeof wert !== 'object' || wert === null) return false;
  const kandidat = wert as Partial<Mandant>;
  return kandidat.version === 1 && typeof kandidat.firma === 'string' && typeof kandidat.kanton === 'string' && typeof kandidat.arbeitszeit === 'object' && typeof kandidat.zeitzone === 'string';
}

function mandantReducer(state: Mandant, action: MandantAction): Mandant {
  switch (action.kind) {
    case 'set':
      return { ...state, ...action.aenderung };
    case 'replace':
      return action.mandant;
    case 'reset':
      return MANDANT_STANDARD;
  }
}

// jh› Konfiguration ist kein Betriebsstand: eigener kleiner Store wie Ansicht und Theme – aber mit
//     Spiegelung ins zweite Fenster, damit ein Rollenwechsel oder eine Modulfreigabe sofort überall gilt.
export const mandantStore = createStore(mandantReducer, { ...MANDANT_STANDARD, ...readPersisted<Partial<Mandant>>(SPEICHER_KEY, {}, isMandant) });

let zuletzt = JSON.stringify(mandantStore.getState());
mandantStore.subscribe(() => {
  const roh = JSON.stringify(mandantStore.getState());
  if (roh === zuletzt) return;
  zuletzt = roh;
  writePersisted(SPEICHER_KEY, mandantStore.getState());
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (ereignis) => {
    if (ereignis.key !== SPEICHER_KEY || ereignis.newValue === null || ereignis.newValue === zuletzt) return;
    try {
      const wert: unknown = JSON.parse(ereignis.newValue);
      if (!isMandant(wert)) return;
      zuletzt = ereignis.newValue;
      mandantStore.dispatch({ kind: 'replace', mandant: wert });
    } catch {
      // jh› fremder, defekter Eintrag – ignorieren
    }
  });
}

// ── §2 · Zugriff ─────────────────────────────────────────────────

export function getMandant(): Mandant {
  return mandantStore.getState();
}

export function setMandant(aenderung: Partial<Mandant>): void {
  mandantStore.dispatch({ kind: 'set', aenderung });
}

/** Ausgangszustand herstellen (Demo zurücksetzen). */
export function resetMandant(): void {
  mandantStore.dispatch({ kind: 'reset' });
}

export function useMandant(): Mandant {
  return useStore(mandantStore, (state) => state);
}

/* ◆ jh · eof */
