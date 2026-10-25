/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/lager.test.ts                          │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Lager: Orte, Bestände, Bewegungen, Liefertermin, Nummernkreis         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import type { Lagerbestand, Lagerbewegung } from './lager';
import { LAGER_GLATTBRUGG, bestandGesamt, bestandStufe, bestandVon, fahrzeugOrt, isLagerOrt, istUeberfaellig, liefertermin, mitBestand, nextBestellNummer, technikerIdVon, wendeBewegungAn, wendeBewegungenAn } from './lager';

// ── §1 · Orte ────────────────────────────────────────────────────

describe('Lagerorte', () => {
  it('kennt Glattbrugg und Fahrzeuge je Techniker', () => {
    expect(fahrzeugOrt('T-MB')).toBe('fahrzeug:T-MB');
    expect(technikerIdVon('fahrzeug:T-MB')).toBe('T-MB');
    expect(technikerIdVon(LAGER_GLATTBRUGG)).toBeNull();
    expect(isLagerOrt('fahrzeug:T-SK')).toBe(true);
    expect(isLagerOrt('fahrzeug:')).toBe(false);
    expect(isLagerOrt('keller')).toBe(false);
  });
});

// ── §2 · Bestände ────────────────────────────────────────────────

const BESTAENDE: readonly Lagerbestand[] = [
  { artikelNummer: '11380960', ort: LAGER_GLATTBRUGG, menge: 3 },
  { artikelNummer: '11380960', ort: 'fahrzeug:T-MB', menge: 1 },
  { artikelNummer: '11380960', ort: 'fahrzeug:T-SK', menge: 2 },
  { artikelNummer: '1037548', ort: LAGER_GLATTBRUGG, menge: 0 },
];

describe('Bestände', () => {
  it('summiert Glattbrugg und Fahrzeuge getrennt', () => {
    expect(bestandVon(BESTAENDE, '11380960', 'fahrzeug:T-SK')).toBe(2);
    expect(bestandVon(BESTAENDE, '11380960', 'fahrzeug:T-RH')).toBe(0);
    expect(bestandGesamt(BESTAENDE, '11380960')).toEqual({ glattbrugg: 3, fahrzeuge: 3, total: 6 });
  });

  it('stuft nach dem Lager in Glattbrugg, nie nach den Fahrzeugen', () => {
    expect(bestandStufe(3, 2)).toBe('ok');
    expect(bestandStufe(1, 2)).toBe('knapp');
    expect(bestandStufe(0, 2)).toBe('leer');
  });

  it('kappt Abbuchungen bei 0 und legt neue Orte an', () => {
    const weniger = mitBestand(BESTAENDE, '11380960', 'fahrzeug:T-MB', -5);
    expect(bestandVon(weniger, '11380960', 'fahrzeug:T-MB')).toBe(0);
    const neu = mitBestand(BESTAENDE, '1037548', 'fahrzeug:T-RH', 2);
    expect(bestandVon(neu, '1037548', 'fahrzeug:T-RH')).toBe(2);
    expect(neu).toHaveLength(BESTAENDE.length + 1);
  });
});

// ── §3 · Bewegungen ──────────────────────────────────────────────

function bewegung(teil: Partial<Lagerbewegung>): Lagerbewegung {
  return { id: 'LB-T', zeitpunkt: '2026-10-25T10:00', art: 'verbrauch', artikelNummer: '11380960', menge: 1, benutzer: 'TT', ...teil };
}

describe('wendeBewegungAn', () => {
  it('bucht Wareneingang ein, Umbuchung um und Verbrauch ab', () => {
    const eingang = wendeBewegungAn(BESTAENDE, bewegung({ art: 'wareneingang', nach: LAGER_GLATTBRUGG, menge: 4 }));
    expect(bestandVon(eingang, '11380960', LAGER_GLATTBRUGG)).toBe(7);
    const um = wendeBewegungAn(eingang, bewegung({ art: 'umbuchung', von: LAGER_GLATTBRUGG, nach: 'fahrzeug:T-MB', menge: 2 }));
    expect(bestandVon(um, '11380960', LAGER_GLATTBRUGG)).toBe(5);
    expect(bestandVon(um, '11380960', 'fahrzeug:T-MB')).toBe(3);
    const verbraucht = wendeBewegungAn(um, bewegung({ art: 'verbrauch', von: 'fahrzeug:T-MB', menge: 1 }));
    expect(bestandVon(verbraucht, '11380960', 'fahrzeug:T-MB')).toBe(2);
  });

  it('nimmt Korrekturen als Differenz, auch negativ', () => {
    const korrigiert = wendeBewegungAn(BESTAENDE, bewegung({ art: 'korrektur', nach: LAGER_GLATTBRUGG, menge: -2 }));
    expect(bestandVon(korrigiert, '11380960', LAGER_GLATTBRUGG)).toBe(1);
  });

  it('lässt die Vorlage unverändert und wendet Listen der Reihe nach an', () => {
    const ergebnis = wendeBewegungenAn(BESTAENDE, [bewegung({ art: 'verbrauch', von: LAGER_GLATTBRUGG, menge: 2 }), bewegung({ art: 'verbrauch', von: LAGER_GLATTBRUGG, menge: 5 })]);
    expect(bestandVon(ergebnis, '11380960', LAGER_GLATTBRUGG)).toBe(0);
    expect(bestandVon(BESTAENDE, '11380960', LAGER_GLATTBRUGG)).toBe(3);
  });
});

// ── §4 · Bestellungen ────────────────────────────────────────────

describe('Bestellungen', () => {
  it('legt den Liefertermin drei Tage später und nie auf einen Sonntag', () => {
    expect(liefertermin('2026-10-20')).toBe('2026-10-23');
    expect(liefertermin('2026-10-22')).toBe('2026-10-26');
  });

  it('erkennt überfällige offene Bestellungen', () => {
    expect(istUeberfaellig({ status: 'offen', liefertermin: '2026-10-24' }, '2026-10-25')).toBe(true);
    expect(istUeberfaellig({ status: 'offen', liefertermin: '2026-10-25' }, '2026-10-25')).toBe(false);
    expect(istUeberfaellig({ status: 'eingetroffen', liefertermin: '2026-10-01' }, '2026-10-25')).toBe(false);
  });

  it('zählt den Nummernkreis weiter', () => {
    expect(nextBestellNummer([])).toBe('B-26-00001');
    expect(nextBestellNummer([{ nummer: 'B-26-00120' }, { nummer: 'B-26-00007' }, { nummer: 'X-1' }])).toBe('B-26-00121');
  });
});

/* ◆ jh · eof */
