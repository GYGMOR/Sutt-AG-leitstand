/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/zeitzone.test.ts                              │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Zonenzeit, UTC-Abstand, Dauer über die Umstellung, Umstellungstage    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { dauerZwischen, jetztInZone, lokalZuInstant, naechsteUmstellung, offsetMinuten, tagLaengeMin, umstellungAm, umstellungenImJahr, zeitpunktInZone } from './zeitzone';

const ZH = 'Europe/Zurich';

// ── §1 · Zonenzeit ───────────────────────────────────────────────

describe('Zonenzeit', () => {
  it('kennt Normal- und Sommerzeit der Schweiz', () => {
    expect(offsetMinuten(ZH, new Date('2026-01-15T12:00:00Z'))).toBe(60);
    expect(offsetMinuten(ZH, new Date('2026-07-01T12:00:00Z'))).toBe(120);
    expect(offsetMinuten('UTC', new Date('2026-07-01T12:00:00Z'))).toBe(0);
  });

  it('liefert «jetzt» in der Zone, unabhängig vom Gerät', () => {
    const jetzt = new Date('2026-07-01T05:30:45Z');
    expect(jetztInZone(ZH, jetzt)).toMatchObject({ datum: '2026-07-01', minuten: 7 * 60 + 30, sekunden: 45, offsetMin: 120 });
    expect(jetztInZone('UTC', jetzt).minuten).toBe(5 * 60 + 30);
    expect(zeitpunktInZone(ZH, new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16T00:30');
  });

  it('wandelt Wandzeit in Zeitpunkte, auch über Mitternacht in UTC', () => {
    expect(lokalZuInstant(ZH, '2026-07-01', 0).toISOString()).toBe('2026-06-30T22:00:00.000Z');
    expect(lokalZuInstant(ZH, '2026-01-15', 8 * 60).toISOString()).toBe('2026-01-15T07:00:00.000Z');
  });
});

// ── §2 · Umstellung ──────────────────────────────────────────────

describe('Zeitumstellung', () => {
  it('findet die beiden Umstellungstage 2026', () => {
    const liste = umstellungenImJahr(ZH, 2026);
    expect(liste.map((umstellung) => [umstellung.datum, umstellung.art, umstellung.vonMin, umstellung.nachMin])).toEqual([
      ['2026-03-29', 'sommerzeit', 120, 180],
      ['2026-10-25', 'winterzeit', 180, 120],
    ]);
    expect(umstellungAm(ZH, '2026-06-01')).toBeUndefined();
    expect(umstellungenImJahr('UTC', 2026)).toEqual([]);
    expect(naechsteUmstellung(ZH, '2026-10-26')?.datum).toBe('2027-03-28');
  });

  it('rechnet Dauern über die Umstellung richtig', () => {
    expect(dauerZwischen(ZH, '2026-03-29', 60, 4 * 60)).toBe(120);
    expect(dauerZwischen(ZH, '2026-10-25', 60, 4 * 60)).toBe(240);
    expect(dauerZwischen(ZH, '2026-10-26', 7 * 60, 16 * 60)).toBe(540);
    expect(tagLaengeMin(ZH, '2026-03-29')).toBe(1380);
    expect(tagLaengeMin(ZH, '2026-10-25')).toBe(1500);
    expect(tagLaengeMin(ZH, '2026-10-26')).toBe(1440);
  });
});

/* ◆ jh · eof */
