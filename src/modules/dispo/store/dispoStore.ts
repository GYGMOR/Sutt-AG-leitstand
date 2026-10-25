/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/dispoStore.ts                  │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Dispo-Store (Singleton je Fenster), Persistenz, Ansichts-Einstellung  │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum } from '../../../core/datum';
import { createStore, readPersisted, useStore, writePersisted } from '../../../core/store';
import type { Store } from '../../../core/store';
import type { DispoBestand, DispoStammdaten, FarbeNach, PanelTab, Zoom } from '../dispo.types';
import { isZoom } from '../zeitraster';
import { createDispoState, dispoReducer, gleicherSchnappschuss, schnappschuss } from './dispo.reducer';
import type { DispoAction, DispoState, Schnappschuss } from './dispo.reducer';
import { beobachteFremdeFenster, ladeStand, loescheStand, schnappschussAus, schreibeStand, serialisiere, standAus } from './persistenz';

// ── §1 · Dispo-Store ─────────────────────────────────────────────

export type DispoStore = Store<DispoState, DispoAction>;

let store: DispoStore | null = null;
let ausgang: { stammdaten: DispoStammdaten; bestand: DispoBestand; heute: IsoDatum } | null = null;
let zuletztGeschrieben: string | null = null;
let zuletztStand: Schnappschuss | null = null;

const SCHREIB_VERZOEGERUNG_MS = 300;

// jh› Die Modulwurzel hängt den Bestand ein (Mock heute, API morgen); der Store
//     selbst kennt keine Mockdaten. Ein gespeicherter Stand von heute hat Vorrang.
export function initDispoStore(stammdaten: DispoStammdaten, bestand: DispoBestand, heute: IsoDatum): DispoStore {
  if (store) return store;
  ausgang = { stammdaten, bestand, heute };

  const gespeichert = ladeStand(heute);
  const initial = createDispoState(stammdaten, bestand);
  const neu = createStore(dispoReducer, initial);
  if (gespeichert) {
    zuletztGeschrieben = gespeichert.roh;
    zuletztStand = schnappschussAus(gespeichert.stand);
    neu.dispatch({ kind: 'replaceStand', stand: zuletztStand });
  }

  // jh› Entprellt schreiben: beim Ziehen entstehen viele Aktionen, der Stand braucht nur den letzten.
  //     Geschrieben wird nur, wenn sich der Stand selbst geändert hat – eine Auswahl oder ein eben
  //     empfangener fremder Stand lösen keinen Schreibzyklus aus (sonst überschriebe das Echo eines
  //     Fensters die jüngere Änderung des anderen).
  let timer: number | null = null;
  neu.subscribe(() => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      const aktuell = schnappschuss(neu.getState());
      if (zuletztStand && gleicherSchnappschuss(zuletztStand, aktuell)) return;
      const stand = standAus(neu.getState(), heute);
      const roh = serialisiere(stand);
      if (roh !== zuletztGeschrieben && !schreibeStand(stand, roh)) return;
      zuletztGeschrieben = roh;
      zuletztStand = aktuell;
    }, SCHREIB_VERZOEGERUNG_MS);
  });

  beobachteFremdeFenster(heute, (stand, roh) => {
    if (roh === zuletztGeschrieben) return;
    zuletztGeschrieben = roh;
    zuletztStand = schnappschussAus(stand);
    neu.dispatch({ kind: 'replaceStand', stand: zuletztStand });
  });

  store = neu;
  return neu;
}

export function getDispoStore(): DispoStore {
  if (!store) throw new Error('Dispo-Store nicht initialisiert – initDispoStore() in der Modulwurzel aufrufen');
  return store;
}

/** Stellt den Ausgangsbestand her und löscht den gespeicherten Stand. */
export function resetDispoStore(): void {
  if (!store || !ausgang) return;
  loescheStand();
  zuletztGeschrieben = null;
  zuletztStand = null;
  store.dispatch({ kind: 'resetDemo', stammdaten: ausgang.stammdaten, bestand: ausgang.bestand });
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
