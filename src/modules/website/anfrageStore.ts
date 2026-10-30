/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/website/anfrageStore.ts                    │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Website-Anfragen: Liste im Browser, gespiegelt, Website füllt sie     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { ANFRAGEN_SCHLUESSEL, istAnfragenListe } from '../../core/domain/anfrage';
import type { Anfrage, AnfrageAntwort } from '../../core/domain/anfrage';
import { createStore, readPersisted, useStore, writePersisted } from '../../core/store';
import { MOCK_ANFRAGEN } from '../../mock';

// ── §1 · Store ───────────────────────────────────────────────────

type AnfrageAction = { kind: 'replace'; anfragen: readonly Anfrage[] } | { kind: 'update'; id: string; aenderung: Partial<Anfrage> } | { kind: 'reset' };

function anfrageReducer(state: readonly Anfrage[], action: AnfrageAction): readonly Anfrage[] {
  switch (action.kind) {
    case 'replace':
      return action.anfragen;
    case 'update':
      return state.map((anfrage) => (anfrage.id === action.id ? { ...anfrage, ...action.aenderung } : anfrage));
    case 'reset':
      return MOCK_ANFRAGEN;
  }
}

// jh› Die Website schreibt in denselben Browser-Speicher (gleiche Origin) – der Leitstand hört auf das
//     storage-Ereignis und zeigt die Anfrage sofort. Mit der API wird daraus ein Endpunkt (ADR-001); die
//     Anfragen gehören nicht in den Dispo-Stand, weil sie von aussen kommen und erst geprüft werden.
const gespeichert = readPersisted<Anfrage[]>(ANFRAGEN_SCHLUESSEL, [], istAnfragenListe);
export const anfrageStore = createStore(anfrageReducer, gespeichert.length > 0 ? gespeichert : MOCK_ANFRAGEN);

let zuletzt = JSON.stringify(anfrageStore.getState());
if (gespeichert.length === 0) writePersisted(ANFRAGEN_SCHLUESSEL, anfrageStore.getState());
anfrageStore.subscribe(() => {
  const roh = JSON.stringify(anfrageStore.getState());
  if (roh === zuletzt) return;
  zuletzt = roh;
  writePersisted(ANFRAGEN_SCHLUESSEL, anfrageStore.getState());
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (ereignis) => {
    if (ereignis.key !== ANFRAGEN_SCHLUESSEL || ereignis.newValue === null || ereignis.newValue === zuletzt) return;
    try {
      const wert: unknown = JSON.parse(ereignis.newValue);
      if (!istAnfragenListe(wert)) return;
      zuletzt = ereignis.newValue;
      anfrageStore.dispatch({ kind: 'replace', anfragen: wert });
    } catch {
      // jh› fremder, defekter Eintrag – ignorieren
    }
  });
}

// ── §2 · Zugriff ─────────────────────────────────────────────────

export function useAnfragen(): readonly Anfrage[] {
  return useStore(anfrageStore, (state) => state);
}

export function anfrageAnnehmen(id: string, auftragId: string): void {
  anfrageStore.dispatch({ kind: 'update', id, aenderung: { status: 'angenommen', auftragId } });
}

export function anfrageAblehnen(id: string, antwort: AnfrageAntwort): void {
  anfrageStore.dispatch({ kind: 'update', id, aenderung: { status: 'abgelehnt', antwort } });
}

export function anfrageBeantworten(id: string, antwort: AnfrageAntwort): void {
  anfrageStore.dispatch({ kind: 'update', id, aenderung: { antwort } });
}

/** Ausgangszustand herstellen (Demo zurücksetzen). */
export function resetAnfragen(): void {
  anfrageStore.dispatch({ kind: 'reset' });
}

/* ◆ jh · eof */
