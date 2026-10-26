/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/dispo.selectors.test.ts        │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Selektoren: Verknüpfungen, Wartet-Views, Rapport-Zähler, Live-Puls    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { HEUTE, testState, zeit } from '../../../test/testdaten';
import { buildFehlendeRapporte, buildRapportViews, buildVerknuepfungsIndex, buildWartetViews, pulsFor, rapportFuerEinsatz, zaehleRapporte } from './dispo.selectors';

// ── §1 · Verknüpfungen ───────────────────────────────────────────

describe('buildVerknuepfungsIndex', () => {
  it('kennt Folgetermin, Ersttermin und Bezugsauftrag', () => {
    const state = testState();
    const index = buildVerknuepfungsIndex(state.stammdaten, state.einsaetze);
    const erst = index.get('E-A01') ?? [];
    expect(erst.some((eintrag) => eintrag.art === 'folgetermin' && eintrag.einsatzId === 'E-A01-F')).toBe(true);
    expect(erst.some((eintrag) => eintrag.art === 'bezogen' && eintrag.einsatzId === 'E-A39')).toBe(true);
    const folge = index.get('E-A01-F') ?? [];
    expect(folge.some((eintrag) => eintrag.art === 'ersttermin' && eintrag.einsatzId === 'E-A01')).toBe(true);
    const mietgeraet = index.get('E-A39') ?? [];
    expect(mietgeraet.filter((eintrag) => eintrag.art === 'bezug')).toHaveLength(2);
  });

  it('lässt Einsätze ohne Zusammenhang weg', () => {
    const state = testState();
    const index = buildVerknuepfungsIndex(state.stammdaten, state.einsaetze);
    expect(index.has('E-A03')).toBe(false);
  });
});

// ── §2 · Wartet auf Teil ─────────────────────────────────────────

describe('buildWartetViews', () => {
  it('findet den geplanten Folgetermin desselben Auftrags', () => {
    const state = testState();
    const views = buildWartetViews(state.stammdaten, state.einsaetze, state.pendenzen);
    const a01 = views.find((view) => view.einsatz.id === 'E-A01');
    expect(a01?.folgeGeplant?.id).toBe('E-A01-F');
    const a30 = views.find((view) => view.einsatz.id === 'E-A30');
    expect(a30?.folgeGeplant).toBeUndefined();
    expect(a30?.folgeOffen).toBe(true);
  });
});

// ── §3 · Rapporte ────────────────────────────────────────────────

describe('zaehleRapporte', () => {
  it('zählt fehlende Rapporte und Stufen', () => {
    const state = testState();
    const zaehler = zaehleRapporte(state.einsaetze, state.rapporte);
    const erledigt = state.einsaetze.filter((einsatz) => einsatz.status === 'erledigt').length;
    const mitRapport = state.rapporte.filter((rapport) => state.einsaetze.some((einsatz) => einsatz.id === rapport.einsatzId && einsatz.status === 'erledigt')).length;
    expect(zaehler.fehlend).toBe(erledigt - mitRapport);
    expect(zaehler.erstellt + zaehler.unterschrieben + zaehler.freigegeben + zaehler.verrechnet).toBe(state.rapporte.length);
    expect(zaehler.faelligeRechnungen).toBe(zaehler.freigegeben);
  });
});

describe('buildRapportViews / buildFehlendeRapporte', () => {
  it('trennt Rapporte von erledigten Einsätzen ohne Rapport', () => {
    const state = testState();
    const views = buildRapportViews(state.stammdaten, state.einsaetze, state.rapporte);
    const fehlend = buildFehlendeRapporte(state.stammdaten, state.einsaetze, state.rapporte);
    expect(views).toHaveLength(state.rapporte.length);
    expect(fehlend).toHaveLength(zaehleRapporte(state.einsaetze, state.rapporte).fehlend);
    const mitRapport = new Set(views.map((view) => view.rapport.einsatzId));
    expect(fehlend.every((view) => !mitRapport.has(view.einsatz.id) && view.einsatz.status === 'erledigt' && view.rapport === undefined)).toBe(true);
  });

  it('sortiert Rapporte neueste zuerst, fehlende älteste zuerst', () => {
    const state = testState();
    const views = buildRapportViews(state.stammdaten, state.einsaetze, state.rapporte);
    for (let index = 1; index < views.length; index += 1) {
      expect(views[index - 1]!.rapport.geaendertAm >= views[index]!.rapport.geaendertAm).toBe(true);
    }
    const fehlend = buildFehlendeRapporte(state.stammdaten, state.einsaetze, state.rapporte);
    for (let index = 1; index < fehlend.length; index += 1) {
      expect(fehlend[index - 1]!.einsatz.datum <= fehlend[index]!.einsatz.datum).toBe(true);
    }
  });

  it('hängt jeden Rapport an seinen Einsatz und Techniker', () => {
    const state = testState();
    const views = buildRapportViews(state.stammdaten, state.einsaetze, state.rapporte);
    const a02 = views.find((view) => view.rapport.einsatzId === 'E-A02');
    expect(a02?.einsatz?.id).toBe('E-A02');
    expect(a02?.techniker.id).toBe(a02?.rapport.technikerId);
    expect(rapportFuerEinsatz(state.rapporte, 'E-A02')?.id).toBe(a02?.rapport.id);
    expect(rapportFuerEinsatz(state.rapporte, 'gibt-es-nicht')).toBeUndefined();
  });
});

// ── §4 · Live-Puls ───────────────────────────────────────────────

describe('pulsFor', () => {
  const basis = { id: 'E-X', auftragId: 'A01', technikerId: 'T-MB', datum: HEUTE, startMin: 9 * 60, dauerMin: 60 } as const;

  it('rechnet «vor Ort seit» ab dem Verlaufseintrag', () => {
    const puls = pulsFor([{ ...basis, status: 'vor-ort', statusSeit: zeit(9 * 60 + 5) }], 9 * 60 + 30, undefined);
    expect(puls).toEqual({ art: 'vor-ort', text: 'vor Ort seit 25 min' });
  });

  it('meldet Überziehen nach dem geplanten Ende', () => {
    const puls = pulsFor([{ ...basis, status: 'vor-ort', statusSeit: zeit(9 * 60) }], 10 * 60 + 10, undefined);
    expect(puls).toEqual({ art: 'ueberzieht', text: 'überzieht 10 min' });
  });

  it('zeigt die Absenz vor allem anderen', () => {
    const absenz = { id: 'AB-T', mitarbeiterId: 'M-MB', technikerId: 'T-MB', art: 'krank' as const, status: 'genehmigt' as const, von: HEUTE, bis: HEUTE };
    expect(pulsFor([{ ...basis, status: 'vor-ort' }], 9 * 60, absenz).art).toBe('abwesend');
  });
});

/* ◆ jh · eof */
