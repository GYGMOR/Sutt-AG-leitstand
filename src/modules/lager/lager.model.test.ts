/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/lager/lager.model.test.ts                  │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Lager-Sichten: Artikelstufen, Bestellungen, Fahrzeuge, Zähler         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { bestandStufe } from '../../core/domain/lager';
import { HEUTE, testState } from '../../test/testdaten';
import { LEERER_ARTIKEL_FILTER, buildArtikelViews, buildBestellungViews, buildFahrzeugViews, filterArtikel, filterBestellungen, ortLabel, zaehleLager } from './lager.model';

// ── §1 · Artikel ─────────────────────────────────────────────────

describe('buildArtikelViews', () => {
  it('führt jeden Artikel mit Stufe nach Glattbrugg', () => {
    const state = testState();
    const views = buildArtikelViews(state.stammdaten, state.bestaende, state.bestellungen);
    expect(views).toHaveLength(state.stammdaten.artikel.size);
    expect(views.every((view) => view.stufe === bestandStufe(view.glattbrugg, view.artikel.mindestbestand))).toBe(true);
    const knapp = filterArtikel(views, { ...LEERER_ARTIKEL_FILTER, sicht: 'knapp' });
    expect(knapp.every((view) => view.stufe === 'knapp')).toBe(true);
    expect(filterArtikel(views, { ...LEERER_ARTIKEL_FILTER, suche: 'laugenpumpe miele' }).length).toBeGreaterThan(0);
  });
});

// ── §2 · Bestellungen & Fahrzeuge ────────────────────────────────

describe('buildBestellungViews', () => {
  it('kennt Auftrag, Kunde und Überfälligkeit', () => {
    const state = testState();
    const views = buildBestellungViews(state.stammdaten, state.bestellungen, HEUTE);
    expect(views).toHaveLength(state.bestellungen.length);
    expect(views.some((view) => view.ueberfaellig)).toBe(true);
    expect(views.filter((view) => view.auftrag).every((view) => view.kunde !== null)).toBe(true);
    const offen = filterBestellungen(views, 'offen', '');
    expect(offen.every((view) => view.bestellung.status === 'offen')).toBe(true);
    expect(offen[0]?.bestellung.liefertermin ?? '').toBeTruthy();
  });
});

describe('buildFahrzeugViews', () => {
  it('liefert ein Fahrzeug je Techniker mit Beständen', () => {
    const state = testState();
    const views = buildFahrzeugViews(state.stammdaten, state.bestaende);
    expect(views).toHaveLength(state.stammdaten.techniker.length);
    expect(views.some((view) => view.stueck > 0)).toBe(true);
    expect(ortLabel('glattbrugg', state.stammdaten)).toBe('Glattbrugg');
    expect(ortLabel('fahrzeug:T-MB', state.stammdaten)).toBe('Fahrzeug MB');
  });
});

// ── §3 · Zähler ──────────────────────────────────────────────────

describe('zaehleLager', () => {
  it('zählt knapp, leer, offen und überfällig konsistent', () => {
    const state = testState();
    const artikel = buildArtikelViews(state.stammdaten, state.bestaende, state.bestellungen);
    const bestellungen = buildBestellungViews(state.stammdaten, state.bestellungen, HEUTE);
    const fahrzeuge = buildFahrzeugViews(state.stammdaten, state.bestaende);
    const zaehler = zaehleLager(artikel, bestellungen, fahrzeuge);
    expect(zaehler.artikel).toBe(artikel.length);
    expect(zaehler.knapp + zaehler.leer).toBeLessThanOrEqual(zaehler.artikel);
    expect(zaehler.ueberfaellig).toBeLessThanOrEqual(zaehler.offen);
    expect(zaehler.fahrzeugStueck).toBe(fahrzeuge.reduce((summe, view) => summe + view.stueck, 0));
  });
});

/* ◆ jh · eof */
