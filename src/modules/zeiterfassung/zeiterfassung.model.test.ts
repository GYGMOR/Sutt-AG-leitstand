/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/zeiterfassung/zeiterfassung.model.test.ts  │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Zeilen je Person, Sichten, Zähler, Abschluss-Entwurf, Zeitparser      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { addMonths } from '../../core/datum';
import { monatVon } from '../../core/domain/zeit';
import { MANDANT_STANDARD } from '../../core/mandant/mandant.types';
import { HEUTE, testState } from '../../test/testdaten';
import { buildPersonViews } from '../personal/personal.model';
import { startOfWeek } from '../../core/datum';
import { buildJahresZeilen, buildTagesZeilen, buildWochenZeilen, buildZeitZeilen, filterZeit, formatDelta, isMontag, kannEinreichen, minutenAus, monatsabschlussEntwurf, tagTon, zaehleZeit, zeitstrahl } from './zeiterfassung.model';
import type { TagMitPlan } from '../personal/personal.model';

// ── §1 · Aufbau ──────────────────────────────────────────────────

const JETZT = 11 * 60;

function zeilenFuer(monat = monatVon(HEUTE)) {
  const state = testState();
  const personen = buildPersonViews(state.stammdaten, HEUTE);
  return buildZeitZeilen(personen, monat, state, MANDANT_STANDARD, HEUTE, JETZT);
}

// ── §2 · Tests ───────────────────────────────────────────────────

describe('buildZeitZeilen', () => {
  it('liefert je Person ein Monatskonto mit allen Tagen', () => {
    const zeilen = zeilenFuer();
    expect(zeilen.length).toBe(testState().stammdaten.mitarbeiter.size);
    const mb = zeilen.find((zeile) => zeile.person.mitarbeiter.id === 'M-MB');
    expect(mb?.konto.tage.length).toBeGreaterThanOrEqual(28);
    expect(mb?.konto.periode.arbeitMin).toBeGreaterThan(0);
    expect(mb?.konto.sollGesamtMin).toBeGreaterThanOrEqual(mb?.konto.periode.sollMin ?? 0);
  });

  it('kennt den Stempelstand von heute um elf Uhr', () => {
    const zeilen = zeilenFuer();
    const eingestempelt = zeilen.filter((zeile) => zeile.lage.status !== 'draussen');
    expect(eingestempelt.length).toBeGreaterThan(0);
    expect(zaehleZeit(zeilen, HEUTE).eingestempelt).toBe(eingestempelt.length);
  });

  it('zählt Abschlüsse des Vormonats und filtert nach Namen', () => {
    const vormonat = monatVon(addMonths(HEUTE, -1));
    const zeilen = zeilenFuer(vormonat);
    const zaehler = zaehleZeit(zeilen, HEUTE);
    expect(zaehler.eingereicht).toBe(1);
    expect(filterZeit(zeilen, 'eingereicht', '', HEUTE)[0]?.person.mitarbeiter.id).toBe('M-SO');
    expect(filterZeit(zeilen, 'alle', 'brunner', HEUTE).map((zeile) => zeile.person.mitarbeiter.id)).toEqual(['M-MB']);
  });
});

describe('Abschluss', () => {
  it('erlaubt Einreichen nur ohne offenen Abschluss und nicht in der Zukunft', () => {
    const vormonat = monatVon(addMonths(HEUTE, -1));
    const zeilen = zeilenFuer(vormonat);
    const so = zeilen.find((zeile) => zeile.person.mitarbeiter.id === 'M-SO');
    const jv = zeilen.find((zeile) => zeile.person.mitarbeiter.id === 'M-JV');
    expect(so && kannEinreichen(so.konto, HEUTE)).toBe(false);
    expect(jv && kannEinreichen(jv.konto, HEUTE)).toBe(true);
    const naechster = zeilenFuer(monatVon(addMonths(HEUTE, 1)))[0];
    expect(naechster && kannEinreichen(naechster.konto, HEUTE)).toBe(false);
  });

  it('baut den Entwurf aus dem Konto', () => {
    const mb = zeilenFuer().find((zeile) => zeile.person.mitarbeiter.id === 'M-MB');
    if (!mb) throw new Error('MB fehlt');
    const entwurf = monatsabschlussEntwurf(mb.konto, 'ok');
    expect(entwurf).toMatchObject({ mitarbeiterId: 'M-MB', monat: mb.konto.monat, istMin: mb.konto.periode.arbeitMin, bemerkung: 'ok' });
  });
});

describe('minutenAus', () => {
  it('liest Uhrzeiten und weist Unsinn ab', () => {
    expect(minutenAus('07:35')).toBe(455);
    expect(minutenAus('7:05')).toBe(425);
    expect(minutenAus('24:00')).toBeNull();
    expect(minutenAus('abc')).toBeNull();
  });
});

// ── §3 · Ansichten ───────────────────────────────────────────────

function tagMit(teil: Partial<TagMitPlan>): TagMitPlan {
  return { datum: HEUTE, grund: 'arbeitstag', anteil: 1, mitarbeiterId: 'M-MB', eintraege: [], arbeitMin: 504, pauseMin: 30, sollMin: 504, saldoMin: 0, kommenMin: 420, gehenMin: 954, laeuft: false, manuell: false, warnungen: [], plan: null, zukunft: false, ...teil };
}

describe('tagTon', () => {
  it('färbt Tage nach Soll, Abweichung, Regel und Zustand', () => {
    expect(tagTon(tagMit({}))).toBe('ok');
    expect(tagTon(tagMit({ saldoMin: 45 }))).toBe('abweichung');
    expect(tagTon(tagMit({ manuell: true }))).toBe('abweichung');
    expect(tagTon(tagMit({ warnungen: ['pause-fehlt'] }))).toBe('warnung');
    expect(tagTon(tagMit({ arbeitMin: 0, sollMin: 504, saldoMin: -504, warnungen: ['ohne-stempel'] }))).toBe('fehlt');
    expect(tagTon(tagMit({ laeuft: true }))).toBe('laeuft');
    expect(tagTon(tagMit({ grund: 'wochenende', arbeitMin: 0, sollMin: 0, saldoMin: 0 }))).toBe('frei');
    expect(tagTon(tagMit({ grund: 'absenz', arbeitMin: 0, sollMin: 0, saldoMin: 0 }))).toBe('absenz');
    expect(tagTon(tagMit({ zukunft: true, arbeitMin: 0 }))).toBe('zukunft');
    expect(tagTon(tagMit({ grund: 'nicht-angestellt' }))).toBe('leer');
    expect(formatDelta(80)).toBe('+1:20');
    expect(formatDelta(-45)).toBe('−0:45');
    expect(formatDelta(0)).toBe('0');
  });
});

describe('Woche, Jahr, Tag', () => {
  it('summiert die Woche bis heute und kennt den Montag', () => {
    const state = testState();
    const personen = buildPersonViews(state.stammdaten, HEUTE);
    const montag = startOfWeek(HEUTE);
    expect(isMontag(montag)).toBe(true);
    expect(isMontag(HEUTE === montag ? '2026-01-01' : HEUTE)).toBe(false);
    const zeilen = buildWochenZeilen(personen, montag, state, MANDANT_STANDARD, HEUTE, JETZT);
    const mb = zeilen.find((zeile) => zeile.person.mitarbeiter.id === 'M-MB');
    if (!mb) throw new Error('MB fehlt');
    expect(mb.tage.length).toBe(7);
    expect(mb.tage[0]?.datum).toBe(montag);
    expect(mb.erfasstMin).toBe(mb.tage.filter((tag) => !tag.zukunft).reduce((summe, tag) => summe + tag.arbeitMin, 0));
    expect(mb.saldoMin).toBe(mb.erfasstMin - mb.erwartetMin);
  });

  it('baut zwölf Monate je Person, zukünftige leer', () => {
    const state = testState();
    const personen = buildPersonViews(state.stammdaten, HEUTE);
    const jahr = Number(HEUTE.slice(0, 4));
    const zeilen = buildJahresZeilen(personen, jahr, state, MANDANT_STANDARD, HEUTE, JETZT);
    const mb = zeilen.find((zeile) => zeile.person.mitarbeiter.id === 'M-MB');
    if (!mb) throw new Error('MB fehlt');
    expect(mb.monate.length).toBe(12);
    expect(mb.monate.filter((monat) => monat.monat > monatVon(HEUTE)).every((monat) => monat.leer)).toBe(true);
    expect(mb.monate.filter((monat) => monat.vorUebertrag).every((monat) => monat.leer && monat.monat <= monatVon(mb.uebertragPer))).toBe(true);
    expect(mb.monate.some((monat) => !monat.leer)).toBe(true);
    expect(mb.saldoMin).toBe(mb.istMin - mb.sollMin);
    expect(mb.saldoMin).toBe(mb.monate.reduce((summe, monat) => summe + monat.saldoMin, 0));
  });

  it('liefert den Tag mit Einträgen und einen Zeitstrahl ab sechs Uhr', () => {
    const state = testState();
    const personen = buildPersonViews(state.stammdaten, HEUTE);
    const zeilen = buildTagesZeilen(personen, HEUTE, state, MANDANT_STANDARD, HEUTE, JETZT);
    expect(zeilen.length).toBe(personen.length);
    expect(zeilen.some((zeile) => zeile.eintraege.length > 0)).toBe(true);
    const strahl = zeitstrahl(zeilen, JETZT);
    expect(strahl.vonMin).toBeLessThanOrEqual(6 * 60);
    expect(strahl.bisMin).toBeGreaterThanOrEqual(19 * 60);
    expect(strahl.stunden[0]).toBe(strahl.vonMin);
  });
});

/* ◆ jh · eof */
