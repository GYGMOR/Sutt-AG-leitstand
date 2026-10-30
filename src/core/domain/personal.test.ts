/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/personal.test.ts                       │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Vertrag: Ende, Vorlauf, sichtbare Jahre, Pflichtfelder, Anstellung    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { istAngestellt, istBeendet, pruefeVertrag, vertragEndetIn, vertragVon, vertragsende, vertragsjahre, VERTRAG_OFFEN } from './personal';
import type { Mitarbeiter } from './personal';

// ── §1 · Testdaten ───────────────────────────────────────────────

const HEUTE = '2026-10-30';

const BASIS: Mitarbeiter = {
  id: 'M-TT', kuerzel: 'TT', vorname: 'Test', nachname: 'Techniker', funktion: 'techniker', pensum: 100, eintritt: '2019-03-01', vertragsart: 'unbefristet',
  ferienTageProJahr: 25, ferienUebertragTage: 0, zeitUebertragMin: 0, zeitUebertragPer: '2026-08-31', email: 't.techniker@sutt.example',
};

// ── §2 · Vertrag ─────────────────────────────────────────────────

describe('Vertrag', () => {
  it('bildet den Vertrag aus Beginn, Ende und Art', () => {
    expect(vertragVon(BASIS)).toEqual({ art: 'unbefristet', beginn: '2019-03-01', ende: null, offen: true });
    expect(vertragVon({ ...BASIS, vertragsart: 'befristet', austritt: '2027-01-31', vertragsnotiz: 'Projekt' })).toEqual({ art: 'befristet', beginn: '2019-03-01', ende: '2027-01-31', offen: false, notiz: 'Projekt' });
  });

  it('kennt ein offenes Ende als fernen Platzhalter', () => {
    expect(vertragsende(BASIS)).toBe(VERTRAG_OFFEN);
    expect(vertragsende({ austritt: '2027-01-31' })).toBe('2027-01-31');
    expect(istAngestellt(BASIS, '2099-12-31')).toBe(true);
  });

  it('meldet das Vertragsende nur im Vorlauf von 60 Tagen', () => {
    expect(vertragEndetIn({ austritt: '2026-12-15' }, HEUTE)).toBe(46);
    expect(vertragEndetIn({ austritt: HEUTE }, HEUTE)).toBe(0);
    expect(vertragEndetIn({ austritt: '2027-03-31' }, HEUTE)).toBeNull();
    expect(vertragEndetIn({ austritt: '2026-06-30' }, HEUTE)).toBeNull();
    expect(vertragEndetIn(BASIS, HEUTE)).toBeNull();
    expect(vertragEndetIn({ austritt: '2027-03-31' }, HEUTE, 200)).toBe(152);
  });

  it('unterscheidet beendet, offen und noch laufend', () => {
    expect(istBeendet({ austritt: '2026-06-30' }, HEUTE)).toBe(true);
    expect(istBeendet({ austritt: HEUTE }, HEUTE)).toBe(false);
    expect(istBeendet(BASIS, HEUTE)).toBe(false);
    expect(istAngestellt({ eintritt: '2019-03-01', austritt: '2026-06-30' }, HEUTE)).toBe(false);
  });

  it('zeigt die Jahre vom Eintritt bis zum Vertragsende, offen bis ins Folgejahr', () => {
    expect(vertragsjahre(BASIS, HEUTE)).toEqual([2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]);
    expect(vertragsjahre({ eintritt: '2025-08-01', austritt: '2029-07-31' }, HEUTE)).toEqual([2025, 2026, 2027, 2028, 2029]);
    expect(vertragsjahre({ eintritt: '2017-02-01', austritt: '2026-06-30' }, HEUTE)).toEqual([2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
    expect(vertragsjahre({ eintritt: '2026-11-01', austritt: '2026-11-30' }, HEUTE)).toEqual([2026]);
  });

  it('verlangt bei befristet und temporär ein Enddatum und lehnt ein Ende vor dem Beginn ab', () => {
    expect(pruefeVertrag('unbefristet', '2019-03-01', null)).toBeNull();
    expect(pruefeVertrag('auf-widerruf', '2019-03-01', null)).toBeNull();
    expect(pruefeVertrag('befristet', '2025-08-01', null)).toMatch(/Pflicht/);
    expect(pruefeVertrag('temporaer', '2025-08-01', null)).toMatch(/Pflicht/);
    expect(pruefeVertrag('befristet', '2025-08-01', '2029-07-31')).toBeNull();
    expect(pruefeVertrag('unbefristet', '2025-08-01', '2025-07-31')).toMatch(/vor dem Beginn/);
  });
});

/* ◆ jh · eof */
