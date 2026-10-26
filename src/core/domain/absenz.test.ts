/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/absenz.test.ts                         │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Absenztage, Ferienkonto (Pensum, Eintritt), maskierte Sicht           │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { absenzTage, absenzenFuerSicht, anstellungsAnteil, ferienkonto, isAbwesend, ueberschneidung } from './absenz';
import type { Absenz } from './absenz';
import type { Mitarbeiter } from './personal';

// ── §1 · Aufbau ──────────────────────────────────────────────────

const LF: Mitarbeiter = { id: 'M-LF', kuerzel: 'LF', vorname: 'Luca', nachname: 'Frei', funktion: 'techniker', technikerId: 'T-LF', pensum: 100, eintritt: '2020-01-06', ferienTageProJahr: 25, ferienUebertragTage: 0, zeitUebertragMin: 0, zeitUebertragPer: '2025-12-31', email: 'l.frei@sutt.example' };

function absenz(teil: Partial<Absenz>): Absenz {
  return { id: 'AB-T', mitarbeiterId: 'M-LF', technikerId: 'T-LF', von: '2026-07-06', bis: '2026-07-17', art: 'ferien', status: 'genehmigt', ...teil };
}

// ── §2 · Tests ───────────────────────────────────────────────────

describe('Absenztage', () => {
  it('zählt Arbeitstage ohne Wochenende und Feiertage, halbe Tage halb', () => {
    expect(absenzTage(absenz({}), 'ZH')).toBe(10);
    expect(absenzTage(absenz({ von: '2026-12-21', bis: '2026-12-31' }), 'ZH')).toBe(7);
    expect(absenzTage(absenz({ von: '2026-11-13', bis: '2026-11-13', halberTag: 'nachmittag' }), 'ZH')).toBe(0.5);
  });

  it('findet Überschneidungen ohne abgelehnte Anträge', () => {
    const liste = [absenz({ id: 'AB-1' }), absenz({ id: 'AB-2', von: '2026-08-03', bis: '2026-08-07', status: 'abgelehnt' })];
    expect(ueberschneidung(liste, 'M-LF', '2026-07-15', '2026-07-20')?.id).toBe('AB-1');
    expect(ueberschneidung(liste, 'M-LF', '2026-08-04', '2026-08-04')).toBeUndefined();
    expect(ueberschneidung(liste, 'M-LF', '2026-07-15', '2026-07-20', 'AB-1')).toBeUndefined();
  });

  it('blockiert den Plan nur mit genehmigten Absenzen', () => {
    expect(isAbwesend([absenz({})], 'T-LF', '2026-07-08')?.id).toBe('AB-T');
    expect(isAbwesend([absenz({ status: 'beantragt' })], 'T-LF', '2026-07-08')).toBeUndefined();
  });
});

describe('Ferienkonto', () => {
  const absenzen = [
    absenz({ id: 'AB-1' }),
    absenz({ id: 'AB-2', von: '2026-12-21', bis: '2026-12-24' }),
    absenz({ id: 'AB-3', von: '2026-11-16', bis: '2026-11-20', status: 'beantragt' }),
    absenz({ id: 'AB-4', von: '2026-03-02', bis: '2026-03-03', art: 'krank' }),
  ];

  it('trennt bezogen, geplant und beantragt und rechnet den Rest', () => {
    const konto = ferienkonto(LF, absenzen, 2026, '2026-10-26', 'ZH');
    expect(konto).toEqual({ jahr: 2026, anspruchTage: 25, uebertragTage: 0, bezogenTage: 10, geplantTage: 3.5, beantragtTage: 5, restTage: 11.5 });
  });

  it('kürzt den Anspruch nach Pensum und Eintritt im Jahr', () => {
    expect(anstellungsAnteil(LF, 2026)).toBe(1);
    const neu = { ...LF, eintritt: '2026-07-01' as const, pensum: 80 };
    expect(anstellungsAnteil(neu, 2026)).toBeCloseTo(184 / 365, 4);
    expect(ferienkonto(neu, [], 2026, '2026-10-26', 'ZH').anspruchTage).toBe(10);
  });

  it('teilt Ferien über den Jahreswechsel auf', () => {
    const silvester = [absenz({ id: 'AB-5', von: '2026-12-28', bis: '2027-01-05' })];
    expect(ferienkonto(LF, silvester, 2026, '2026-10-26', 'ZH').geplantTage).toBe(3.5);
    expect(ferienkonto(LF, silvester, 2027, '2026-10-26', 'ZH').geplantTage).toBe(2);
  });
});

describe('Sicht ohne Gesundheitsdaten', () => {
  it('maskiert Krankheit und Unfall als «Abwesend» und streicht Notiz und Zeugnis', () => {
    const liste = [absenz({ id: 'AB-K', art: 'krank', notiz: 'Grippe', arztzeugnis: true }), absenz({ id: 'AB-F', notiz: 'Toskana' })];
    const sicht = absenzenFuerSicht(liste, false);
    expect(sicht[0]?.art).toBe('abwesend');
    expect(sicht[0]?.notiz).toBeUndefined();
    expect(sicht[0]?.arztzeugnis).toBeUndefined();
    expect(sicht[1]?.art).toBe('ferien');
    expect(sicht[1]?.notiz).toBe('Toskana');
    expect(absenzenFuerSicht(liste, true)).toBe(liste);
  });
});

/* ◆ jh · eof */
