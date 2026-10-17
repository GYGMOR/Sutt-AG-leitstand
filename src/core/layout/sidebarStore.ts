/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/sidebarStore.ts                        │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Zustand der Seitenleiste: eingeklappt, offene Gruppen – persistiert   │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { ModulGruppe } from '../modules.config';
import { createStore, readPersisted, useStore, writePersisted } from '../store';

// ── §1 · State ───────────────────────────────────────────────────

interface SidebarState {
  /** null = kein Entscheid des Benutzers → folgt der Fensterbreite. */
  eingeklapptManuell: boolean | null;
  gruppenZu: readonly ModulGruppe[];
}

type SidebarAction = { kind: 'setEingeklappt'; wert: boolean } | { kind: 'toggleGruppe'; gruppe: ModulGruppe };

const SPEICHER_KEY = 'sl.sidebar';

function isState(wert: unknown): wert is SidebarState {
  if (typeof wert !== 'object' || wert === null) return false;
  const kandidat = wert as Partial<SidebarState>;
  return (
    (kandidat.eingeklapptManuell === null || typeof kandidat.eingeklapptManuell === 'boolean') &&
    Array.isArray(kandidat.gruppenZu)
  );
}

// ── §2 · Store ───────────────────────────────────────────────────

function sidebarReducer(state: SidebarState, action: SidebarAction): SidebarState {
  if (action.kind === 'setEingeklappt') return { ...state, eingeklapptManuell: action.wert };
  const offen = state.gruppenZu.includes(action.gruppe);
  return {
    ...state,
    gruppenZu: offen ? state.gruppenZu.filter((gruppe) => gruppe !== action.gruppe) : [...state.gruppenZu, action.gruppe],
  };
}

export const sidebarStore = createStore(
  sidebarReducer,
  readPersisted<SidebarState>(SPEICHER_KEY, { eingeklapptManuell: null, gruppenZu: [] }, isState),
);
sidebarStore.subscribe(() => writePersisted(SPEICHER_KEY, sidebarStore.getState()));

// ── §3 · Hooks ───────────────────────────────────────────────────

export function useSidebarState(): SidebarState {
  return useStore(sidebarStore, (state) => state);
}

export function setSidebarEingeklappt(wert: boolean): void {
  sidebarStore.dispatch({ kind: 'setEingeklappt', wert });
}

export function toggleSidebarGruppe(gruppe: ModulGruppe): void {
  sidebarStore.dispatch({ kind: 'toggleGruppe', gruppe });
}

/* ◆ jh · eof */
