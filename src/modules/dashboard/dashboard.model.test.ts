/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dashboard/dashboard.model.test.ts          │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Tagesbild und Auswertung: Zahlen stimmen mit den Selektoren überein   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { MANDANT_STANDARD } from '../../core/mandant/mandant.types';
import { HEUTE, testState } from '../../test/testdaten';
import { zaehleRapporte } from '../dispo/store/dispo.selectors';
import { buildAuswertung, buildTagesbild } from './dashboard.model';

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

// ── §2 · Auswertung ──────────────────────────────────────────────

describe('buildAuswertung', () => {
  it('liefert Dienststand, Auslastung, 28 Tage, 8 Wochen und höchstens fünf Kategorien', () => {
    const state = testState();
    const auswertung = buildAuswertung(state, MANDANT_STANDARD, HEUTE, 11 * 60);
    expect(auswertung.dienst.eingestempelt + auswertung.dienst.pause + auswertung.dienst.draussen).toBe(auswertung.dienst.gesamt);
    expect(auswertung.dienst.eingestempelt).toBeGreaterThan(0);
    expect(auswertung.auslastung.length).toBe(state.stammdaten.techniker.length);
    expect(auswertung.erledigt.length).toBe(28);
    expect(auswertung.erledigt[27]?.datum).toBe(HEUTE);
    expect(auswertung.rapporte.length).toBe(8);
    expect(auswertung.rapporte.every((woche) => /^KW \d+$/.test(woche.label))).toBe(true);
    expect(auswertung.kategorien.length).toBeLessThanOrEqual(5);
    const summe = auswertung.kategorien.reduce((total, eintrag) => total + eintrag.anzahl, 0);
    expect(summe).toBe(state.einsaetze.filter((einsatz) => einsatz.datum >= auswertung.von && einsatz.datum <= HEUTE && state.stammdaten.auftraege.has(einsatz.auftragId)).length);
  });
});

/* ◆ jh · eof */
