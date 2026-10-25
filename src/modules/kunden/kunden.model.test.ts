/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/kunden/kunden.model.test.ts                │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Kunden: Liegenschaften mit Geräten, Zähler je Art, Suche              │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { HEUTE, testState } from '../../test/testdaten';
import { buildAuftragViews } from '../auftraege/auftraege.model';
import { buildKundenViews, filterKunden, zaehleKunden } from './kunden.model';

function kundenViews() {
  const state = testState();
  const auftraege = buildAuftragViews(state.stammdaten, state.einsaetze, state.pendenzen, state.rapporte, HEUTE);
  return buildKundenViews(state.stammdaten, auftraege, state.nachrichten);
}

// ── §1 · Sichten ─────────────────────────────────────────────────

describe('buildKundenViews', () => {
  it('hängt Liegenschaften, Geräte und Aufträge an den Kunden', () => {
    const views = kundenViews();
    expect(views).toHaveLength(7);
    const glattal = views.find((view) => view.kunde.id === 'K1');
    expect(glattal?.liegenschaften.map((eintrag) => eintrag.liegenschaft.id).sort()).toEqual(['L01', 'L02', 'L13', 'L14']);
    expect(glattal?.auftraege.length ?? 0).toBeGreaterThan(0);
    expect(glattal?.geraete ?? 0).toBeGreaterThan(0);
    const talacker = glattal?.liegenschaften.find((eintrag) => eintrag.liegenschaft.id === 'L01');
    expect(talacker?.geraete.some((eintrag) => eintrag.wohnung?.nummer === 'W 2.03')).toBe(true);
  });

  it('zählt Arten und offene Rechnungen', () => {
    const zaehler = zaehleKunden(kundenViews());
    expect(zaehler.alle).toBe(7);
    expect(zaehler.verwaltung).toBe(4);
    expect(zaehler.privat).toBe(2);
    expect(zaehler.gewerbe).toBe(1);
    expect(zaehler['rechnung-offen']).toBeGreaterThanOrEqual(1);
  });
});

// ── §2 · Suche ───────────────────────────────────────────────────

describe('filterKunden', () => {
  it('findet Kunden über Liegenschaft und Hauswart', () => {
    const views = kundenViews();
    expect(filterKunden(views, 'alle', 'Talacker').map((view) => view.kunde.id)).toEqual(['K1']);
    expect(filterKunden(views, 'alle', 'Pellegrini').map((view) => view.kunde.id)).toEqual(['K1']);
    expect(filterKunden(views, 'privat', '').every((view) => view.kunde.art === 'privat')).toBe(true);
  });
});

/* ◆ jh · eof */
