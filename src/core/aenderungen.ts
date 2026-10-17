/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/aenderungen.ts                                │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Zähler ungespeicherter Änderungen – für Abmelden-Rückfrage            │
   └────────────────────────────────────────────────────────────────────────┘ */

import { createStore, useStore } from './store';

// ── §1 · Store ───────────────────────────────────────────────────

type AenderungenAction = { kind: 'set'; anbieter: string; anzahl: number };

// jh› Module melden ihren Stand (Dispo: Protokolllänge). Core bleibt frei von Modulwissen.
export const aenderungenStore = createStore(
  (state: Readonly<Record<string, number>>, action: AenderungenAction) => {
    if (state[action.anbieter] === action.anzahl) return state;
    return { ...state, [action.anbieter]: action.anzahl };
  },
  {} as Readonly<Record<string, number>>,
);

export function meldeAenderungen(anbieter: string, anzahl: number): void {
  aenderungenStore.dispatch({ kind: 'set', anbieter, anzahl });
}

// ── §2 · Hook ────────────────────────────────────────────────────

export function useOffeneAenderungen(): number {
  const stand = useStore(aenderungenStore, (state) => state);
  return Object.values(stand).reduce((summe, anzahl) => summe + anzahl, 0);
}

/* ◆ jh · eof */
