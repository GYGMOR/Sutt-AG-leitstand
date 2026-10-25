/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/geraete/geraete.model.test.ts              │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Geräte: Garantiestand, Standort, Einsätze, Teile-Historie, Sichten    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { addDays } from '../../core/datum';
import { HEUTE, testState } from '../../test/testdaten';
import { buildAuftragViews } from '../auftraege/auftraege.model';
import { LEERER_GERAETE_FILTER, buildGeraeteViews, filterGeraete, garantieStand, zaehleGeraete } from './geraete.model';

function geraeteViews() {
  const state = testState();
  const auftraege = buildAuftragViews(state.stammdaten, state.einsaetze, state.pendenzen, state.rapporte, HEUTE);
  return { state, views: buildGeraeteViews(state.stammdaten, auftraege, state.rapporte, HEUTE) };
}

// ── §1 · Garantie ────────────────────────────────────────────────

describe('garantieStand', () => {
  it('unterscheidet laufend, abgelaufen und keine', () => {
    expect(garantieStand({ garantieBis: addDays(HEUTE, 10) }, HEUTE)).toBe('laeuft');
    expect(garantieStand({ garantieBis: HEUTE }, HEUTE)).toBe('laeuft');
    expect(garantieStand({ garantieBis: addDays(HEUTE, -1) }, HEUTE)).toBe('abgelaufen');
    expect(garantieStand({}, HEUTE)).toBe('keine');
  });
});

// ── §2 · Sichten ─────────────────────────────────────────────────

describe('buildGeraeteViews', () => {
  it('kennt Standort, Einsätze und Teile des Geräts von A01', () => {
    const { state, views } = geraeteViews();
    expect(views).toHaveLength(state.stammdaten.geraete.size);
    const a01 = state.stammdaten.auftraege.get('A01');
    const geraet = views.find((view) => view.geraet.id === a01?.geraetId);
    expect(geraet?.standort?.kunde.id).toBe('K1');
    expect(geraet?.standort?.wohnung?.nummer).toBe('W 2.03');
    expect(geraet?.einsaetze.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(geraet?.teile.some((teil) => teil.bezeichnung === 'Laugenpumpe')).toBe(true);
  });

  it('zählt Sichten und filtert nach Marke', () => {
    const { views } = geraeteViews();
    const zaehler = zaehleGeraete(views);
    expect(zaehler.alle).toBe(views.length);
    expect(zaehler.garantie + zaehler.abgelaufen).toBeLessThanOrEqual(views.length);
    const miele = filterGeraete(views, { ...LEERER_GERAETE_FILTER, marke: 'Miele' });
    expect(miele.length).toBeGreaterThan(0);
    expect(miele.every((view) => view.geraet.marke === 'Miele')).toBe(true);
    const unvollstaendig = filterGeraete(views, { ...LEERER_GERAETE_FILTER, sicht: 'unvollstaendig' });
    expect(unvollstaendig.every((view) => view.unvollstaendig)).toBe(true);
  });
});

/* ◆ jh · eof */
