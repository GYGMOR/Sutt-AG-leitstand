/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dashboard/dashboard.model.test.ts          │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Tagesbild: Zahlen stimmen mit den Modul-Selektoren überein            │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { HEUTE, testState } from '../../test/testdaten';
import { zaehleRapporte } from '../dispo/store/dispo.selectors';
import { buildTagesbild } from './dashboard.model';

// ── §1 · Tagesbild ───────────────────────────────────────────────

describe('buildTagesbild', () => {
  it('zählt die heutigen Einsätze und Rapporte wie die Module', () => {
    const state = testState();
    const bild = buildTagesbild(state, HEUTE, 11 * 60, 3);
    const heutige = state.einsaetze.filter((einsatz) => einsatz.datum === HEUTE);
    expect(bild.einsaetze.total).toBe(heutige.length);
    expect(bild.einsaetze.erledigt + bild.einsaetze.laufend + bild.einsaetze.geplant).toBe(heutige.length);
    expect(bild.konflikte).toBe(3);
    const zaehler = zaehleRapporte(state.einsaetze, state.rapporte);
    expect(bild.rapporte.fehlend).toBe(zaehler.fehlend);
    expect(bild.rapporte.pruefen).toBe(zaehler.erstellt + zaehler.unterschrieben);
    expect(bild.rapporte.verrechnen).toBe(zaehler.freigegeben);
    expect(bild.rapporte.verrechnenChf.totalChf).toBeGreaterThan(0);
  });

  it('listet das Feld je Techniker und kürzt die Listen', () => {
    const state = testState();
    const bild = buildTagesbild(state, HEUTE, 11 * 60, 0);
    expect(bild.feld.map((zeile) => zeile.techniker.id).sort()).toEqual(bild.zeilen.map((zeile) => zeile.techniker.id).sort());
    expect(bild.feld.every((zeile) => zeile.erledigt <= zeile.total)).toBe(true);
    expect(bild.pendenzen.length).toBeLessThanOrEqual(6);
    expect(bild.fehlendeRapporte.length).toBeLessThanOrEqual(6);
    expect(bild.lieferungen.every((view) => view.bestellung.status === 'offen' && view.bestellung.liefertermin <= HEUTE)).toBe(true);
    expect(bild.lager.ueberfaellig).toBeGreaterThanOrEqual(1);
  });
});

/* ◆ jh · eof */
