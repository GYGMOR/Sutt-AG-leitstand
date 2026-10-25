/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/konflikte.test.ts                    │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Konflikt-Wächter: Überschneidung, Arbeitszeit, Rapport, Unterschrift  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { addDays } from '../../core/datum';
import type { Einsatz } from '../../core/domain/einsatz';
import { HEUTE, einsatzMitId, rapportEntwurf, testState } from '../../test/testdaten';
import { findKonflikte, findRapportKonflikte } from './konflikte';

// ── §1 · Planung ─────────────────────────────────────────────────

describe('findKonflikte', () => {
  it('meldet eine Überschneidung genau einmal pro Paar', () => {
    const state = testState();
    const vorlage = einsatzMitId(state, 'E-A01-F');
    const doppelt: Einsatz = { ...vorlage, id: 'E-DOPPELT', startMin: vorlage.startMin + 15 };
    const konflikte = findKonflikte(state.stammdaten, [...state.einsaetze, doppelt], HEUTE);
    const ueberschneidungen = konflikte.filter((konflikt) => konflikt.art === 'ueberschneidung' && [vorlage.id, doppelt.id].includes(konflikt.einsatzId));
    expect(ueberschneidungen).toHaveLength(1);
  });

  it('meldet Einsätze ausserhalb 07–18 Uhr', () => {
    const state = testState();
    const spaet: Einsatz = { ...einsatzMitId(state, 'E-A01-F'), id: 'E-SPAET', startMin: 17 * 60 + 30, dauerMin: 60 };
    const konflikte = findKonflikte(state.stammdaten, [spaet], HEUTE);
    expect(konflikte.some((konflikt) => konflikt.art === 'ausserhalb-arbeitszeit' && konflikt.einsatzId === 'E-SPAET')).toBe(true);
  });

  it('lässt erledigte Einsätze der Vergangenheit in Ruhe', () => {
    const state = testState();
    const konflikte = findKonflikte(state.stammdaten, state.einsaetze, HEUTE, state.rapporte);
    expect(konflikte.every((konflikt) => konflikt.datum >= HEUTE || konflikt.art === 'rapport-fehlt' || konflikt.art === 'unterschrift-fehlt')).toBe(true);
  });
});

// ── §2 · Rapporte ────────────────────────────────────────────────

describe('findRapportKonflikte', () => {
  it('mahnt erledigte Einsätze von gestern ohne Rapport, heutige noch nicht', () => {
    const state = testState();
    const vorlage = einsatzMitId(state, 'E-A01-F');
    const gestern: Einsatz = { ...vorlage, id: 'E-GESTERN', datum: addDays(HEUTE, -1), status: 'erledigt' };
    const heute: Einsatz = { ...vorlage, id: 'E-HEUTE', datum: HEUTE, status: 'erledigt' };
    const konflikte = findRapportKonflikte(state.stammdaten, [gestern, heute], HEUTE, []);
    expect(konflikte.map((konflikt) => konflikt.einsatzId)).toEqual(['E-GESTERN']);
    expect(konflikte[0]?.art).toBe('rapport-fehlt');
  });

  it('mahnt fehlende Unterschrift erst nach zwei Tagen', () => {
    const state = testState();
    const vorlage = einsatzMitId(state, 'E-A01-F');
    const vorDreiTagen: Einsatz = { ...vorlage, id: 'E-ALT', datum: addDays(HEUTE, -3), status: 'erledigt' };
    const gestern: Einsatz = { ...vorlage, id: 'E-NEU', datum: addDays(HEUTE, -1), status: 'erledigt' };
    const rapporte = [rapportEntwurf(vorDreiTagen, { id: 'R-ALT' }), rapportEntwurf(gestern, { id: 'R-NEU' })];
    const konflikte = findRapportKonflikte(state.stammdaten, [vorDreiTagen, gestern], HEUTE, rapporte);
    expect(konflikte).toHaveLength(1);
    expect(konflikte[0]).toMatchObject({ art: 'unterschrift-fehlt', einsatzId: 'E-ALT' });
  });

  it('ignoriert Einsätze älter als zwei Wochen', () => {
    const state = testState();
    const uralt: Einsatz = { ...einsatzMitId(state, 'E-A01-F'), id: 'E-URALT', datum: addDays(HEUTE, -20), status: 'erledigt' };
    expect(findRapportKonflikte(state.stammdaten, [uralt], HEUTE, [])).toHaveLength(0);
  });
});

/* ◆ jh · eof */
