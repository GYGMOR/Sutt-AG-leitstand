/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/kommando.ts                                   │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Registry für Kommandopalette: Befehle und Suchquellen pro Modul       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { createStore, useStore } from './store';
import type { SuchEintrag } from './suche';

// ── §1 · Typen ───────────────────────────────────────────────────

export type KommandoGruppe = 'navigation' | 'ansicht' | 'aktion' | 'modul' | 'system';

export const KOMMANDO_GRUPPE_LABEL: Readonly<Record<KommandoGruppe, string>> = {
  aktion: 'Aktionen',
  navigation: 'Gehe zu',
  ansicht: 'Ansicht',
  modul: 'Module',
  system: 'System',
};

export interface Kommando {
  id: string;
  label: string;
  gruppe: KommandoGruppe;
  icon?: LucideIcon;
  /** Tastenkürzel nur zur Anzeige, z. B. «N» oder «Strg Z». */
  kuerzel?: string;
  /** Gesetzt = Befehl ist gesperrt; der Text erklärt warum. */
  gesperrt?: string;
  /** Zusätzliche Suchbegriffe (Synonyme). */
  stichworte?: string;
  run: () => void;
}

export interface SuchQuelle {
  id: string;
  label: string;
  eintraege: readonly SuchEintrag[];
  onSelect: (eintragId: string) => void;
}

interface KommandoState {
  kommandos: Readonly<Record<string, readonly Kommando[]>>;
  quellen: Readonly<Record<string, SuchQuelle>>;
}

type KommandoAction =
  | { kind: 'setKommandos'; anbieter: string; kommandos: readonly Kommando[] }
  | { kind: 'removeKommandos'; anbieter: string }
  | { kind: 'setQuelle'; quelle: SuchQuelle }
  | { kind: 'removeQuelle'; id: string };

// ── §2 · Store ───────────────────────────────────────────────────

function ohne<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  const { [key]: _entfernt, ...rest } = record;
  return rest;
}

function kommandoReducer(state: KommandoState, action: KommandoAction): KommandoState {
  switch (action.kind) {
    case 'setKommandos':
      return { ...state, kommandos: { ...state.kommandos, [action.anbieter]: action.kommandos } };
    case 'removeKommandos':
      return { ...state, kommandos: ohne(state.kommandos, action.anbieter) };
    case 'setQuelle':
      return { ...state, quellen: { ...state.quellen, [action.quelle.id]: action.quelle } };
    case 'removeQuelle':
      return { ...state, quellen: ohne(state.quellen, action.id) };
  }
}

export const kommandoStore = createStore(kommandoReducer, { kommandos: {}, quellen: {} });

// ── §3 · Hooks ───────────────────────────────────────────────────

// jh› Module melden ihre Befehle an, solange sie gemountet sind – die Palette
//     kennt so immer nur, was gerade sinnvoll ist (Dispo-Befehle nur in der Dispo).
export function useRegisterKommandos(anbieter: string, kommandos: readonly Kommando[]): void {
  useEffect(() => {
    kommandoStore.dispatch({ kind: 'setKommandos', anbieter, kommandos });
    return () => kommandoStore.dispatch({ kind: 'removeKommandos', anbieter });
  }, [anbieter, kommandos]);
}

export function useRegisterSuchQuelle(quelle: SuchQuelle): void {
  useEffect(() => {
    kommandoStore.dispatch({ kind: 'setQuelle', quelle });
    return () => kommandoStore.dispatch({ kind: 'removeQuelle', id: quelle.id });
  }, [quelle]);
}

export function useKommandoRegistry(): KommandoState {
  return useStore(kommandoStore, (state) => state);
}

/* ◆ jh · eof */
