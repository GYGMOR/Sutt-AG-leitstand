/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/datenschutz/aufbewahrung.test.ts              │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Fristen: ab Erfassung, ab Jahresende, Überschreibung durch Mandant    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { DATENKATEGORIEN, aufbewahrungJahre, datenKategorie, loeschdatum, loeschfaelligVor } from './aufbewahrung';

// ── §1 · Tests ───────────────────────────────────────────────────

describe('Aufbewahrung', () => {
  it('kennt jede Kategorie genau einmal mit positiver Frist', () => {
    const ids = new Set(DATENKATEGORIEN.map((kategorie) => kategorie.id));
    expect(ids.size).toBe(DATENKATEGORIEN.length);
    for (const kategorie of DATENKATEGORIEN) expect(kategorie.aufbewahrungJahre).toBeGreaterThan(0);
  });

  it('rechnet Stichtage ab Erfassung und ab Jahresende', () => {
    expect(loeschfaelligVor(datenKategorie('journal'), 2, '2026-10-26')).toBe('2024-10-26');
    expect(loeschfaelligVor(datenKategorie('zeiterfassung'), 5, '2026-10-26')).toBe('2021-01-01');
    expect(loeschdatum(datenKategorie('zeiterfassung'), 5, '2026-03-14')).toBe('2032-01-01');
    expect(loeschdatum(datenKategorie('journal'), 2, '2026-03-14')).toBe('2028-03-14');
  });

  it('lässt den Mandanten die Frist nur verlängern oder verkürzen, nie löschen', () => {
    const zeit = datenKategorie('zeiterfassung');
    expect(aufbewahrungJahre(zeit)).toBe(5);
    expect(aufbewahrungJahre(zeit, { zeiterfassung: 7 })).toBe(7);
    expect(aufbewahrungJahre(zeit, { zeiterfassung: 0 })).toBe(5);
  });
});

/* ◆ jh · eof */
