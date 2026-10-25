/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/persistenz.test.ts             │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Stand: Rundreise über JSON, Datumsschutz, kaputte Eingaben            │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { addDays } from '../../../core/datum';
import { HEUTE, testState } from '../../../test/testdaten';
import { isStand, parseStand, schnappschussAus, serialisiere, standAus } from './persistenz';

// ── §1 · Rundreise ───────────────────────────────────────────────

describe('standAus / schnappschussAus', () => {
  it('überlebt die Reise durch JSON samt Maps', () => {
    const state = testState();
    const roh = serialisiere(standAus(state, HEUTE));
    const stand = parseStand(roh, HEUTE);
    expect(stand).not.toBeNull();
    if (!stand) return;
    const schnapp = schnappschussAus(stand);
    expect(schnapp.einsaetze).toEqual(state.einsaetze);
    expect(schnapp.rapporte).toEqual(state.rapporte);
    expect(schnapp.auftraege.size).toBe(state.stammdaten.auftraege.size);
    expect(schnapp.auftraege.get('A01')?.nummer).toBe('26-04788');
    expect(schnapp.geraete.size).toBe(state.stammdaten.geraete.size);
  });

  it('serialisiert denselben Stand immer gleich (Grundlage für die Fenster-Spiegelung)', () => {
    const state = testState();
    expect(serialisiere(standAus(state, HEUTE))).toBe(serialisiere(standAus(state, HEUTE)));
  });
});

// ── §2 · Schutz ──────────────────────────────────────────────────

describe('isStand / parseStand', () => {
  it('verwirft Stände von einem anderen Tag', () => {
    const stand = standAus(testState(), HEUTE);
    expect(isStand(stand, HEUTE)).toBe(true);
    expect(isStand(stand, addDays(HEUTE, 1))).toBe(false);
  });

  it('verwirft fremde Versionen und kaputtes JSON', () => {
    expect(parseStand('{"version":99}', HEUTE)).toBeNull();
    expect(parseStand('{nicht json', HEUTE)).toBeNull();
    expect(parseStand(null, HEUTE)).toBeNull();
  });
});

/* ◆ jh · eof */
