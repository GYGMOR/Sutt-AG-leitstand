/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/model/tour.model.test.ts                       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Tour: Reihenfolge, Summen, nächster Stopp, Pins, Linie, Maps-Link     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { tagesZeileFuer } from '@sl/modules/app/app.model';
import { HEUTE, testState } from '@sl/test/testdaten';
import { buildTour } from './tour.model';

// ── §1 · Tests ───────────────────────────────────────────────────

describe('buildTour', () => {
  it('ordnet die Einsätze des Tages und summiert Fahrt und Einsatz', () => {
    const state = testState();
    const zeile = tagesZeileFuer(state.stammdaten, state.einsaetze, 'T-MB', HEUTE, 11 * 60);
    if (!zeile) throw new Error('MB hat heute keine Zeile');
    const tour = buildTour(zeile.einsaetze, '--sl-tech-1');
    expect(tour.stopps.length).toBe(zeile.einsaetze.length);
    expect(tour.stopps.map((stopp) => stopp.nummer)).toEqual(tour.stopps.map((_, index) => index + 1));
    for (let index = 1; index < tour.stopps.length; index += 1) {
      expect(tour.stopps[index]!.view.einsatz.startMin).toBeGreaterThanOrEqual(tour.stopps[index - 1]!.view.einsatz.startMin);
    }
    expect(tour.fahrtMin).toBe(zeile.einsaetze.reduce((summe, view) => summe + view.anfahrtMin, 0));
    expect(tour.einsatzMin).toBe(zeile.einsaetze.reduce((summe, view) => summe + view.einsatz.dauerMin, 0));
    expect(tour.stopps.filter((stopp) => stopp.naechster).length).toBeLessThanOrEqual(1);
    expect(tour.pins.length).toBe(tour.stopps.length);
    expect(tour.linien[0]?.punkte.length).toBe(tour.stopps.length + 1);
    if (tour.offen > 0) expect(tour.mapsUrl).toContain('google.com/maps');
  });

  it('bleibt bei einem leeren Tag ruhig', () => {
    const tour = buildTour([], '--sl-tech-2');
    expect(tour.stopps).toEqual([]);
    expect(tour.mapsUrl).toBeNull();
    expect(tour.linien).toEqual([]);
  });
});

/* ◆ jh · eof */
