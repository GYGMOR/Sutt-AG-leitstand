/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/store.ts                                      │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Schlanker Store pro Modul auf useSyncExternalStore – kein Redux       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useSyncExternalStore } from 'react';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface Store<S, A> {
  getState: () => S;
  dispatch: (action: A) => void;
  subscribe: (listener: () => void) => () => void;
}

// ── §2 · Store ───────────────────────────────────────────────────

export function createStore<S, A>(reducer: (state: S, action: A) => S, initial: S): Store<S, A> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    dispatch(action) {
      const naechster = reducer(state, action);
      if (naechster === state) return;
      state = naechster;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// ── §3 · Hooks ───────────────────────────────────────────────────

// jh! getSnapshot muss bei unverändertem State denselben Wert liefern –
//     Selektoren hier nur Teilstücke oder Primitive zurückgeben, nie
//     .filter()/.map(); Ableitungen gehören in useMemo der Komponente.
export function useStore<S, A, T>(store: Store<S, A>, selector: (state: S) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

export function useStoreState<S, A>(store: Store<S, A>): S {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

// ── §4 · Persistenz ──────────────────────────────────────────────

// jh› localStorage kann fehlen oder werfen (privates Fenster, Kiosk) –
//     Lesen und Schreiben immer in try/catch, Fallback ist der Vorgabewert.
export function readPersisted<T>(key: string, fallback: T, pruefen?: (wert: unknown) => wert is T): T {
  try {
    const roh = window.localStorage.getItem(key);
    if (roh === null) return fallback;
    const wert: unknown = JSON.parse(roh);
    if (pruefen && !pruefen(wert)) return fallback;
    return wert as T;
  } catch {
    return fallback;
  }
}

export function writePersisted<T>(key: string, wert: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(wert));
  } catch {
    // jh› bewusst still: Persistenz ist Komfort, nie Voraussetzung.
  }
}

/* ◆ jh · eof */
