/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/absenzen/absenzen.model.test.ts            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Sichten, Zähler, Filter, Planer-Raster, Überschneidungen              │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { addDays } from '../../core/datum';
import { BETRIEBLICHE_FEIERTAGE_STANDARD } from '../../core/domain/feiertage';
import { tageImMonat, monatVon } from '../../core/domain/zeit';
import { HEUTE, testState } from '../../test/testdaten';
import { buildPersonViews } from '../personal/personal.model';
import { LEERER_ABSENZ_FILTER, buildAbsenzViews, buildPlaner, filterAbsenzen, jahreVon, ueberlappende, zaehleAbsenzen } from './absenzen.model';

// ── §1 · Aufbau ──────────────────────────────────────────────────

function views() {
  const state = testState();
  const personen = buildPersonViews(state.stammdaten, HEUTE);
  return { state, personen, views: buildAbsenzViews(state.stammdaten.absenzen, personen, state.einsaetze, HEUTE, 'ZH', BETRIEBLICHE_FEIERTAGE_STANDARD) };
}

// ── §2 · Tests ───────────────────────────────────────────────────

describe('buildAbsenzViews', () => {
  it('löst Personen auf, zählt Tage und ordnet nach Beginn absteigend', () => {
    const { state, views: liste } = views();
    expect(liste.length).toBe(state.stammdaten.absenzen.length);
    const lf = liste.find((view) => view.absenz.id === 'AB-14');
    expect(lf?.tage).toBe(10);
    expect(lf?.person.mitarbeiter.id).toBe('M-LF');
    expect(liste[0] && liste[1] ? liste[0].absenz.von >= liste[1].absenz.von : true).toBe(true);
  });

  it('zählt offene Anträge und Gesundheitsfälle', () => {
    const { views: liste } = views();
    const zaehler = zaehleAbsenzen(liste, HEUTE);
    expect(zaehler.beantragt).toBe(4);
    expect(zaehler.gesundheit).toBe(5);
    expect(zaehler.alle).toBe(liste.length);
  });

  it('filtert nach Person, Art, Jahr und Suche', () => {
    const { views: liste } = views();
    expect(filterAbsenzen(liste, 'alle', { ...LEERER_ABSENZ_FILTER, mitarbeiterId: 'M-MB' }, HEUTE).every((view) => view.absenz.mitarbeiterId === 'M-MB')).toBe(true);
    expect(filterAbsenzen(liste, 'alle', { ...LEERER_ABSENZ_FILTER, art: 'militaer' }, HEUTE).map((view) => view.absenz.id).sort()).toEqual(['AB-33', 'AB-5']);
    expect(filterAbsenzen(liste, 'alle', { ...LEERER_ABSENZ_FILTER, suche: 'toskana' }, HEUTE)).toHaveLength(0);
    expect(filterAbsenzen(liste, 'beantragt', { ...LEERER_ABSENZ_FILTER, jahr: 2027 }, HEUTE).map((view) => view.absenz.id)).toEqual(['AB-42']);
    expect(jahreVon(liste, HEUTE)).toContain(2026);
  });

  it('findet überschneidende Absenzen anderer Personen', () => {
    const { views: liste } = views();
    const lf = liste.find((view) => view.absenz.id === 'AB-14');
    if (!lf) throw new Error('AB-14 fehlt');
    const andere = ueberlappende(liste, lf.absenz).map((view) => view.absenz.id);
    expect(andere).toContain('AB-11');
    expect(andere).toContain('AB-22');
    expect(andere).not.toContain('AB-14');
    expect(andere).not.toContain('AB-15');
  });
});

describe('buildPlaner', () => {
  it('baut je Person eine Zeile mit allen Tagen des Monats', () => {
    const { state, personen } = views();
    const tage = tageImMonat(monatVon(HEUTE));
    const zeilen = buildPlaner(personen, state.stammdaten.absenzen, tage, HEUTE, 'ZH', BETRIEBLICHE_FEIERTAGE_STANDARD);
    expect(zeilen.length).toBe(personen.length);
    expect(zeilen[0]?.tage.length).toBe(tage.length);
    expect(zeilen[0]?.tage.find((tag) => tag.datum === HEUTE)?.heute).toBe(true);
    const so = zeilen.find((zeile) => zeile.person.mitarbeiter.id === 'M-SO');
    const naechsterMontag = addDays(HEUTE, (8 - new Date(HEUTE).getDay()) % 7 || 7);
    const treffer = so?.tage.find((tag) => tag.datum === naechsterMontag);
    if (treffer) expect(treffer.absenz?.id).toBe('AB-1');
  });
});

/* ◆ jh · eof */
