/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/dispoStore.ts                  │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Dispo-Store (Singleton je Sitzung) und Ansichts-Einstellungen         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { createStore, readPersisted, useStore, writePersisted } from '../../../core/store';
import type { Store } from '../../../core/store';
import type { DispoBestand, DispoStammdaten, FarbeNach, PanelTab, Zoom } from '../dispo.types';
import { isZoom } from '../zeitraster';
import { createDispoState, dispoReducer } from './dispo.reducer';
import type { DispoAction, DispoState } from './dispo.reducer';

// ── §1 · Dispo-Store ─────────────────────────────────────────────

export type DispoStore = Store<DispoState, DispoAction>;

let store: DispoStore | null = null;

// jh› Die Modulwurzel hängt den Bestand ein (Mock heute, API morgen); der
//     Store selbst kennt keine Mockdaten.
export function initDispoStore(stammdaten: DispoStammdaten, bestand: DispoBestand): DispoStore {
  if (!store) store = createStore(dispoReducer, createDispoState(stammdaten, bestand));
  return store;
}

export function getDispoStore(): DispoStore {
  if (!store) throw new Error('Dispo-Store nicht initialisiert – initDispoStore() in der Modulwurzel aufrufen');
  return store;
}

export function useDispoState(): DispoState {
  return useStore(getDispoStore(), (state) => state);
}

export function useDispoSelector<T>(selector: (state: DispoState) => T): T {
  return useStore(getDispoStore(), selector);
}

// ── §2 · Ansichts-Einstellungen (persistiert) ────────────────────

export interface AnsichtEinstellungen {
  zoom: Zoom;
  farbeNach: FarbeNach;
  panelBreite: number;
  panelEingeklappt: boolean;
  panelTab: PanelTab;
  kalenderNebeneinander: boolean;
  /** Sichtbare Kalender (Techniker-IDs) in der Kalenderansicht; null = alle. */
  kalenderTechnikerIds: readonly string[] | null;
}

type AnsichtAction = { kind: 'set'; aenderung: Partial<AnsichtEinstellungen> };

// jh› Schlüssel mit Versionszusatz: neue Vorgaben (Nebeneinander, Kalenderwahl) greifen auch bei bestehenden Nutzern.
const SPEICHER_KEY = 'sl.dispo.ansicht.2';

const STANDARD: AnsichtEinstellungen = {
  zoom: 60,
  farbeNach: 'kategorie',
  panelBreite: 360,
  panelEingeklappt: false,
  panelTab: 'eingang',
  kalenderNebeneinander: true,
  kalenderTechnikerIds: null,
};

function isEinstellungen(wert: unknown): wert is AnsichtEinstellungen {
  if (typeof wert !== 'object' || wert === null) return false;
  const kandidat = wert as Partial<AnsichtEinstellungen>;
  return isZoom(kandidat.zoom) && typeof kandidat.panelBreite === 'number' && typeof kandidat.farbeNach === 'string';
}

export const ansichtStore = createStore(
  (state: AnsichtEinstellungen, action: AnsichtAction) => ({ ...state, ...action.aenderung }),
  { ...STANDARD, ...readPersisted<Partial<AnsichtEinstellungen>>(SPEICHER_KEY, {}, isEinstellungen) },
);
ansichtStore.subscribe(() => writePersisted(SPEICHER_KEY, ansichtStore.getState()));

export function setAnsicht(aenderung: Partial<AnsichtEinstellungen>): void {
  ansichtStore.dispatch({ kind: 'set', aenderung });
}

export function useAnsichtEinstellungen(): AnsichtEinstellungen {
  return useStore(ansichtStore, (state) => state);
}

/* ◆ jh · eof */
