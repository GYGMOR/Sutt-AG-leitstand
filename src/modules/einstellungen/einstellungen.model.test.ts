/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/einstellungen/einstellungen.model.test.ts  │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Feiertag-Eingabe, Anbieterprüfung, Löschposten, Journal, Module       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { MANDANT_STANDARD } from '../../core/mandant/mandant.types';
import { findModul } from '../../core/modules.config';
import { HEUTE, testState } from '../../test/testdaten';
import { anbieterPruefen, betrieblicherTagGueltig, filterJournal, loeschgrenzenFuer, loeschposten, modulFreigabeSetzen, modulZustaende } from './einstellungen.model';

// ── §1 · Eingaben ────────────────────────────────────────────────

describe('Eingaben', () => {
  it('prüft betriebliche Tage und Anbieter', () => {
    expect(betrieblicherTagGueltig('12-24')).toBe(true);
    expect(betrieblicherTagGueltig('13-01')).toBe(false);
    expect(betrieblicherTagGueltig('1-1')).toBe(false);
    expect(anbieterPruefen(MANDANT_STANDARD.anbieter.microsoft)).toBeNull();
    expect(anbieterPruefen({ ...MANDANT_STANDARD.anbieter.google, clientId: 'x', mandantId: 'y' })).toBeNull();
    expect(anbieterPruefen({ ...MANDANT_STANDARD.anbieter.google, mandantId: '' })).toMatch(/Mandanten-ID/);
    expect(anbieterPruefen({ ...MANDANT_STANDARD.anbieter.microsoft, domaene: 'kein-domain' })).toMatch(/Domain/);
  });
});

// ── §2 · Datenschutz & Protokoll ─────────────────────────────────

describe('Löschlauf', () => {
  it('leitet Stichtage aus dem Katalog ab und zählt Löschfälliges', () => {
    const grenzen = loeschgrenzenFuer(MANDANT_STANDARD, HEUTE);
    const jahr = Number(HEUTE.slice(0, 4));
    expect(grenzen.zeiteintraege).toBe(`${jahr - 5}-01-01`);
    expect(grenzen.journal).toBe(`${jahr - 2}-${HEUTE.slice(5)}`);
    const posten = loeschposten(testState(), MANDANT_STANDARD, HEUTE);
    expect(posten.map((eintrag) => eintrag.kategorie.id)).toEqual(['journal', 'zeiterfassung', 'absenzen', 'nachrichten', 'einsatzverlauf']);
    expect(posten.every((eintrag) => eintrag.anzahl >= 0 && eintrag.jahre > 0)).toBe(true);
    const kurz = loeschgrenzenFuer({ ...MANDANT_STANDARD, aufbewahrung: { journal: 1 } }, HEUTE);
    expect(kurz.journal).toBe(`${jahr - 1}-${HEUTE.slice(5)}`);
  });
});

describe('Journalfilter', () => {
  it('filtert nach Bereich, Art und Text', () => {
    const journal = testState().journal;
    expect(journal.length).toBeGreaterThan(0);
    expect(filterJournal(journal, { bereich: 'alle', art: 'alle', suche: '' }).length).toBe(journal.length);
    const anmeldung = filterJournal(journal, { bereich: 'anmeldung', art: 'alle', suche: '' });
    expect(anmeldung.every((eintrag) => eintrag.bereich === 'anmeldung')).toBe(true);
    expect(filterJournal(journal, { bereich: 'alle', art: 'alle', suche: 'gibt-es-nicht-xyz' })).toEqual([]);
  });
});

// ── §3 · Module ──────────────────────────────────────────────────

describe('Module', () => {
  it('setzt Freigaben nur, wenn sie vom Register abweichen', () => {
    const dashboard = findModul('dashboard');
    expect(modulFreigabeSetzen({}, dashboard, false)).toEqual({ dashboard: false });
    expect(modulFreigabeSetzen({ dashboard: false }, dashboard, true)).toEqual({});
    expect(modulFreigabeSetzen({ dashboard: false }, dashboard, undefined)).toEqual({});
    const zustaende = modulZustaende({ ...MANDANT_STANDARD, modulFreigaben: { dashboard: false } });
    expect(zustaende.find((eintrag) => eintrag.modul.id === 'dashboard')).toMatchObject({ aktiv: false, ueberschrieben: true });
    expect(zustaende.find((eintrag) => eintrag.modul.id === 'plantafel')).toMatchObject({ aktiv: true, ueberschrieben: false });
  });
});

/* ◆ jh · eof */
