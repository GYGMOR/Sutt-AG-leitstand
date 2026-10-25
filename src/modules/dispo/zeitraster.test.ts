/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/zeitraster.test.ts                   │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Zeitraster: Spuren, Überlappung, freie Slots, Skala                   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { ARBEIT_ENDE, assignLanes, clampStart, createSkala, findFreeSlot, findFreeStarts, overlaps, roundToRaster } from './zeitraster';

// ── §1 · Belegung ────────────────────────────────────────────────

describe('overlaps', () => {
  it('zählt Ende = Start nicht als Überlappung', () => {
    expect(overlaps({ startMin: 480, dauerMin: 60 }, { startMin: 540, dauerMin: 60 })).toBe(false);
    expect(overlaps({ startMin: 480, dauerMin: 61 }, { startMin: 540, dauerMin: 60 })).toBe(true);
  });
});

describe('assignLanes', () => {
  it('legt aufeinanderfolgende Einsätze in eine Spur', () => {
    const { belegung, spuren } = assignLanes([
      { id: 'a', startMin: 480, dauerMin: 60 },
      { id: 'b', startMin: 540, dauerMin: 30 },
      { id: 'c', startMin: 600, dauerMin: 90 },
    ]);
    expect(spuren).toBe(1);
    expect(belegung.every((eintrag) => eintrag.spur === 0)).toBe(true);
  });

  it('öffnet bei Kollision eine zweite Spur und füllt Lücken wieder in der ersten', () => {
    const { belegung, spuren } = assignLanes([
      { id: 'a', startMin: 480, dauerMin: 120 },
      { id: 'b', startMin: 540, dauerMin: 30 },
      { id: 'c', startMin: 600, dauerMin: 30 },
    ]);
    expect(spuren).toBe(2);
    const spurVon = (id: string) => belegung.find((eintrag) => eintrag.eintrag.id === id)?.spur;
    expect(spurVon('a')).toBe(0);
    expect(spurVon('b')).toBe(1);
    expect(spurVon('c')).toBe(0);
  });

  it('liefert mindestens eine Spur für leere Listen', () => {
    expect(assignLanes([]).spuren).toBe(1);
  });
});

// ── §2 · Freie Slots ─────────────────────────────────────────────

describe('findFreeSlot', () => {
  it('findet den ersten freien Rasterschritt ab Arbeitsbeginn', () => {
    const belegt = [{ startMin: 450, dauerMin: 90 }];
    expect(findFreeSlot(belegt, 60)).toBe(540);
  });

  it('gibt null zurück, wenn nichts mehr in die Arbeitszeit passt', () => {
    expect(findFreeSlot([], 60, ARBEIT_ENDE - 30)).toBeNull();
  });

  it('listet alle freien Starts im Raster – vor und nach dem belegten Block', () => {
    const starts = findFreeStarts([{ startMin: 480, dauerMin: 540 }], 60, 30);
    expect(starts).toEqual([420, 1020]);
    expect(starts.every((start) => start % 30 === 0 && start + 60 <= ARBEIT_ENDE)).toBe(true);
  });
});

// ── §3 · Skala & Raster ──────────────────────────────────────────

describe('createSkala', () => {
  it('unterschreitet 84 px pro Stunde nie', () => {
    const skala = createSkala(320, 60);
    expect(skala.pxPerMin * 60).toBeGreaterThanOrEqual(84);
    expect(skala.rasterMin).toBe(30);
  });

  it('verdoppelt die Dichte bei Zoom 30', () => {
    expect(createSkala(1100, 30).pxPerMin).toBeCloseTo(createSkala(1100, 60).pxPerMin * 2);
  });
});

describe('Raster', () => {
  it('rundet auf den nächsten Schritt und hält Blöcke in der Achse', () => {
    expect(roundToRaster(497, 30)).toBe(510);
    expect(clampStart(30, 60)).toBe(360);
    expect(clampStart(1190, 60)).toBe(1140);
  });
});

/* ◆ jh · eof */
