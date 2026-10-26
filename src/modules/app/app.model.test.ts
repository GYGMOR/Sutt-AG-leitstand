/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/app/app.model.test.ts                      │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Techniker-Sicht: Sitzung, nächster Schritt, aktiver Einsatz, Plan     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Benutzer } from '../../core/auth/auth.types';
import type { EinsatzStatus } from '../../core/domain/einsatz';
import { HEUTE, testState } from '../../test/testdaten';
import type { EinsatzView } from '../dispo/store/dispo.selectors';
import { aktiverEinsatz, naechsterSchritt, planAenderungen, planBestaetigen, sortiert, tagesZeileFuer, technikerFuer } from './app.model';

// ── §1 · Helfer ──────────────────────────────────────────────────

function speicherStub() {
  const ablage = new Map<string, string>();
  return {
    getItem: (key: string) => ablage.get(key) ?? null,
    setItem: (key: string, wert: string) => {
      ablage.set(key, wert);
    },
    removeItem: (key: string) => {
      ablage.delete(key);
    },
  };
}

function benutzer(teil: Partial<Benutzer>): Benutzer {
  return { id: 'B-T', benutzername: 'tt', vorname: 'Test', nachname: 'Tester', kuerzel: 'TT', rolle: 'disposition', aktiv: true, ...teil };
}

function heuteFuer(technikerId: string): EinsatzView[] {
  const state = testState();
  const zeile = tagesZeileFuer(state.stammdaten, state.einsaetze, technikerId, HEUTE, 11 * 60);
  return zeile ? sortiert(zeile.einsaetze) : [];
}

function mitStatus(views: readonly EinsatzView[], status: (index: number) => EinsatzStatus): EinsatzView[] {
  return views.map((view, index) => ({ ...view, einsatz: { ...view.einsatz, status: status(index) } }));
}

// ── §2 · Techniker der Sitzung ───────────────────────────────────

describe('technikerFuer', () => {
  it('nimmt den verknüpften Techniker des Aussendienst-Kontos', () => {
    const { stammdaten } = testState();
    expect(technikerFuer(benutzer({ rolle: 'aussendienst', technikerId: 'T-MB' }), stammdaten, null)?.id).toBe('T-MB');
  });

  it('lässt den Innendienst per ?als= jeden Techniker ansehen, sonst den ersten', () => {
    const { stammdaten } = testState();
    const zweiter = stammdaten.techniker[1];
    expect(zweiter).toBeDefined();
    expect(technikerFuer(benutzer({}), stammdaten, zweiter?.id ?? null)?.id).toBe(zweiter?.id);
    expect(technikerFuer(benutzer({}), stammdaten, null)?.id).toBe(stammdaten.techniker[0]?.id);
  });

  it('gibt für Aussendienst ohne passenden Techniker null zurück', () => {
    const { stammdaten } = testState();
    expect(technikerFuer(benutzer({ rolle: 'aussendienst' }), stammdaten, null)).toBeNull();
    expect(technikerFuer(benutzer({ rolle: 'aussendienst', technikerId: 'T-XX' }), stammdaten, null)).toBeNull();
  });
});

// ── §3 · Nächster Schritt ────────────────────────────────────────

describe('naechsterSchritt', () => {
  it('führt geplant → unterwegs → vor Ort → Rapport', () => {
    expect(naechsterSchritt('geplant')).toEqual({ label: 'Abfahrt', ziel: 'unterwegs' });
    expect(naechsterSchritt('unterwegs')).toEqual({ label: 'Angekommen', ziel: 'vor-ort' });
    expect(naechsterSchritt('vor-ort')?.ziel).toBe('rapport');
  });

  it('kennt nach Fertig keinen Knopf mehr', () => {
    expect(naechsterSchritt('erledigt')).toBeNull();
    expect(naechsterSchritt('wartet-teil')).toBeNull();
  });
});

// ── §4 · Aktiver Einsatz ─────────────────────────────────────────

describe('aktiverEinsatz', () => {
  it('nimmt den frühesten geplanten, wenn niemand unterwegs ist', () => {
    const views = mitStatus(heuteFuer('T-MB'), () => 'geplant');
    expect(views.length).toBeGreaterThan(1);
    expect(aktiverEinsatz(views)?.einsatz.id).toBe(views[0]?.einsatz.id);
  });

  it('bevorzugt unterwegs oder vor Ort vor allem Geplanten', () => {
    const basis = heuteFuer('T-MB');
    const letzter = basis[basis.length - 1];
    const views = mitStatus(basis, (index) => (index === basis.length - 1 ? 'unterwegs' : 'geplant'));
    expect(aktiverEinsatz(views)?.einsatz.id).toBe(letzter?.einsatz.id);
  });

  it('ist null, wenn alles erledigt ist', () => {
    expect(aktiverEinsatz(mitStatus(heuteFuer('T-MB'), () => 'erledigt'))).toBeNull();
  });
});

// ── §5 · Planänderungen ──────────────────────────────────────────

describe('planAenderungen', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: speicherStub() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('meldet nichts, solange der Techniker den Plan nie gesehen hat', () => {
    expect(planAenderungen('T-MB', HEUTE, heuteFuer('T-MB'))).toEqual([]);
  });

  it('erkennt eine verschobene Startzeit nach dem Bestätigen', () => {
    const views = heuteFuer('T-MB');
    const erster = views[0];
    expect(erster).toBeDefined();
    if (!erster) return;
    planBestaetigen('T-MB', HEUTE, views);
    expect(planAenderungen('T-MB', HEUTE, views)).toEqual([]);

    const verschoben = [{ ...erster, einsatz: { ...erster.einsatz, startMin: erster.einsatz.startMin + 30 } }, ...views.slice(1)];
    expect(planAenderungen('T-MB', HEUTE, verschoben)).toEqual([
      { einsatzId: erster.einsatz.id, kunde: erster.kunde.kurzname, vorherMin: erster.einsatz.startMin, nachherMin: erster.einsatz.startMin + 30 },
    ]);
  });

  it('meldet neu dazugekommene Einsätze ohne «vorher»', () => {
    const views = heuteFuer('T-MB');
    planBestaetigen('T-MB', HEUTE, views.slice(1));
    const neu = planAenderungen('T-MB', HEUTE, views);
    expect(neu).toHaveLength(1);
    expect(neu[0]?.einsatzId).toBe(views[0]?.einsatz.id);
    expect(neu[0]?.vorherMin).toBeNull();
  });
});

/* ◆ jh · eof */
