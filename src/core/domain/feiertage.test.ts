/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/feiertage.test.ts                      │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Osterrechnung, Kantonslisten, halbe Tage, Arbeitstage                 │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { arbeitstageZwischen, feiertagAm, feiertageImJahr, istArbeitstag, ostersonntag } from './feiertage';

// ── §1 · Ostern ──────────────────────────────────────────────────

describe('Osterrechnung', () => {
  it('trifft bekannte Ostersonntage', () => {
    expect(ostersonntag(2024)).toBe('2024-03-31');
    expect(ostersonntag(2025)).toBe('2025-04-20');
    expect(ostersonntag(2026)).toBe('2026-04-05');
    expect(ostersonntag(2027)).toBe('2027-03-28');
    expect(ostersonntag(2030)).toBe('2030-04-21');
  });
});

// ── §2 · Kantone ─────────────────────────────────────────────────

describe('Feiertage Kanton Zürich 2026', () => {
  const liste = feiertageImJahr(2026, 'ZH');
  const labels = liste.map((feiertag) => feiertag.label);

  it('kennt die zehn gesetzlichen Feiertage plus die betrieblichen Halbtage', () => {
    expect(labels).toEqual(['Neujahr', 'Berchtoldstag', 'Karfreitag', 'Ostermontag', 'Tag der Arbeit', 'Auffahrt', 'Pfingstmontag', 'Bundesfeier', 'Heiligabend', 'Weihnachten', 'Stephanstag', 'Silvester']);
  });

  it('legt die beweglichen Feiertage richtig', () => {
    expect(feiertagAm('2026-04-03', 'ZH')?.label).toBe('Karfreitag');
    expect(feiertagAm('2026-05-14', 'ZH')?.label).toBe('Auffahrt');
    expect(feiertagAm('2026-05-25', 'ZH')?.label).toBe('Pfingstmontag');
    expect(feiertagAm('2026-06-04', 'ZH')).toBeUndefined();
  });

  it('unterscheidet Kantone', () => {
    expect(feiertagAm('2026-06-04', 'LU')?.label).toBe('Fronleichnam');
    expect(feiertagAm('2026-05-01', 'BE')).toBeUndefined();
    expect(feiertagAm('2026-01-02', 'SG')).toBeUndefined();
  });
});

// ── §3 · Arbeitstage ─────────────────────────────────────────────

describe('Arbeitstage', () => {
  it('zählt Wochenenden und Feiertage nicht, halbe Tage zur Hälfte', () => {
    expect(istArbeitstag('2026-10-26', 'ZH')).toBe(true);
    expect(istArbeitstag('2026-10-25', 'ZH')).toBe(false);
    expect(istArbeitstag('2026-12-25', 'ZH')).toBe(false);
    expect(arbeitstageZwischen('2026-12-21', '2026-12-31', 'ZH')).toBe(7);
    expect(arbeitstageZwischen('2026-04-01', '2026-04-07', 'ZH')).toBe(3);
    expect(arbeitstageZwischen('2026-10-30', '2026-10-26', 'ZH')).toBe(0);
  });

  it('lässt betriebliche Tage weg, wenn der Mandant keine führt', () => {
    expect(feiertagAm('2026-12-24', 'ZH', [])).toBeUndefined();
    expect(arbeitstageZwischen('2026-12-21', '2026-12-31', 'ZH', [])).toBe(8);
  });
});

/* ◆ jh · eof */
