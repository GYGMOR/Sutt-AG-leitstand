/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/benutzer/benutzer.model.test.ts            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Konten-Sichten, Rechte-Matrix und Umschalten, Hierarchie, Auskunft    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { HEUTE, testState } from '../../test/testdaten';
import { buildPersonViews } from '../personal/personal.model';
import { anpassungenBereinigen, auskunftFuer, benutzernameFrei, buildHierarchie, buildKontoViews, filterKonten, rechtUmschalten, rechteMatrix, zaehleKonten } from './benutzer.model';

// ── §1 · Konten ──────────────────────────────────────────────────

describe('Konten', () => {
  it('zählt Sichten und findet Konten', () => {
    const views = buildKontoViews(testState().stammdaten);
    const zaehler = zaehleKonten(views);
    expect(zaehler.alle).toBe(7);
    expect(zaehler.gesperrt).toBe(1);
    expect(zaehler.anbieter).toBe(4);
    expect(zaehler.angepasst).toBe(1);
    expect(filterKonten(views, 'alle', 'wild').map((view) => view.benutzer.id)).toEqual(['U-RW']);
    expect(filterKonten(views, 'gesperrt', '')[0]?.benutzer.benutzername).toBe('te');
  });

  it('prüft freie Benutzernamen', () => {
    const konten = testState().stammdaten.benutzer;
    expect(benutzernameFrei(konten, 'jh')).toBe(false);
    expect(benutzernameFrei(konten, 'jh', 'U-JH')).toBe(true);
    expect(benutzernameFrei(konten, 'pm')).toBe(true);
    expect(benutzernameFrei(konten, ' ')).toBe(false);
  });
});

// ── §2 · Rechte-Matrix ───────────────────────────────────────────

describe('Rechte-Matrix', () => {
  it('kennt Herkunft und schaltet im Kreis', () => {
    const matrix = rechteMatrix({ rolle: 'administration' });
    const personal = matrix.find((bereich) => bereich.bereich === 'personal');
    expect(personal?.rechte.find((eintrag) => eintrag.info.recht === 'personal:gesundheit')?.herkunft).toBe('keine');

    const zusatz = rechtUmschalten({ rolle: 'administration' }, 'personal:gesundheit');
    expect(zusatz.zusatzRechte).toEqual(['personal:gesundheit']);
    const wiederWeg = rechtUmschalten({ rolle: 'administration', ...zusatz }, 'personal:gesundheit');
    expect(wiederWeg.zusatzRechte).toEqual([]);

    const entzogen = rechtUmschalten({ rolle: 'buero' }, 'personal:gesundheit');
    expect(entzogen.entzogeneRechte).toEqual(['personal:gesundheit']);
    expect(rechtUmschalten({ rolle: 'buero', ...entzogen }, 'personal:gesundheit').entzogeneRechte).toEqual([]);
  });

  it('bereinigt Anpassungen beim Rollenwechsel', () => {
    const bereinigt = anpassungenBereinigen('buero', ['personal:gesundheit', 'benutzer:verwalten'], ['zeit:lesen', 'einstellungen:verwalten']);
    expect(bereinigt.zusatzRechte).toEqual(['benutzer:verwalten']);
    expect(bereinigt.entzogeneRechte).toEqual(['zeit:lesen']);
  });
});

// ── §3 · Hierarchie & Auskunft ───────────────────────────────────

describe('Hierarchie', () => {
  it('baut das Organigramm von der Leitung abwärts', () => {
    const state = testState();
    const baum = buildHierarchie(buildPersonViews(state.stammdaten, HEUTE));
    expect(baum.map((knoten) => knoten.person.mitarbeiter.id)).toEqual(['M-AD']);
    const leitung = baum[0];
    expect(leitung?.kinder.map((knoten) => knoten.person.mitarbeiter.id)).toEqual(['M-JH', 'M-RW']);
    const dispo = leitung?.kinder.find((knoten) => knoten.person.mitarbeiter.id === 'M-JH');
    expect(dispo?.kinder.length).toBe(10);
  });
});

describe('Auskunft', () => {
  it('sammelt alles zur Person und nichts zu anderen', () => {
    const state = testState();
    const person = state.stammdaten.mitarbeiter.get('M-MB');
    if (!person) throw new Error('M-MB fehlt');
    const auskunft = auskunftFuer(person, state, HEUTE);
    expect((auskunft.konto as { benutzername: string }).benutzername).toBe('mb');
    const absenzen = auskunft.absenzen as { mitarbeiterId: string }[];
    expect(absenzen.length).toBeGreaterThan(0);
    expect(absenzen.every((absenz) => absenz.mitarbeiterId === 'M-MB')).toBe(true);
    const zeiten = auskunft.zeiteintraege as { mitarbeiterId: string }[];
    expect(zeiten.every((eintrag) => eintrag.mitarbeiterId === 'M-MB')).toBe(true);
  });
});

/* ◆ jh · eof */
