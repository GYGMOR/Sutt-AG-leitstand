/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  test/testdaten.ts                                  │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Testhelfer: Mock-Stand, Meta, Rapport-Entwurf                         │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoZeitpunkt } from '../core/datum';
import { toZeitpunkt } from '../core/datum';
import type { Einsatz } from '../core/domain/einsatz';
import type { Rapport } from '../core/domain/rapport';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '../mock';
import { createDispoState } from '../modules/dispo/store/dispo.reducer';
import type { AktionsMeta, DispoState } from '../modules/dispo/store/dispo.reducer';

// ── §1 · Helfer ──────────────────────────────────────────────────

// jh› Tests laufen auf dem echten Mock: deterministisch (Saat) und relativ zu heute –
//     A01 ist immer der Ersttermin von MB um 07:30, E-A01-F sein Folgetermin.
export function testState(): DispoState {
  return createDispoState(mockStammdaten, mockBestand);
}

export const HEUTE = MOCK_HEUTE;

export function zeit(minuten: number): IsoZeitpunkt {
  return toZeitpunkt(MOCK_HEUTE, minuten);
}

export function meta(text = 'Test', minuten = 10 * 60): AktionsMeta {
  return { text, zeit: zeit(minuten), benutzer: 'TT' };
}

export function einsatzMitId(state: DispoState, id: string): Einsatz {
  const einsatz = state.einsaetze.find((kandidat) => kandidat.id === id);
  if (!einsatz) throw new Error(`Testdaten: Einsatz ${id} fehlt`);
  return einsatz;
}

export function rapportEntwurf(einsatz: Einsatz, teil: Partial<Rapport> = {}): Rapport {
  return {
    id: `R-${einsatz.id}-T`,
    nummer: 'R-26-99901',
    auftragId: einsatz.auftragId,
    einsatzId: einsatz.id,
    technikerId: einsatz.technikerId,
    status: 'erstellt',
    zeiten: { anfahrtMin: 15, arbeitMin: 45, pauseMin: 0 },
    arbeiten: [{ id: 'AS-1', text: 'Probelauf i. O.', erledigt: true }],
    bemerkung: 'Test',
    teile: [],
    fotos: [],
    abschluss: 'erledigt',
    erstelltAm: zeit(10 * 60),
    geaendertAm: zeit(10 * 60),
    ...teil,
  };
}

/* ◆ jh · eof */
