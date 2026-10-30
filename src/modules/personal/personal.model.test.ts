/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/personal/personal.model.test.ts            │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Mein Jahr: Zustände der Monate, Saldo-Kette, Stand heute, Vertrag     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { addDays, addMonths } from '../../core/datum';
import type { Mitarbeiter } from '../../core/domain/personal';
import { monatVon } from '../../core/domain/zeit';
import { MANDANT_STANDARD } from '../../core/mandant/mandant.types';
import { HEUTE, testState } from '../../test/testdaten';
import type { DispoState } from '../dispo/store/dispo.reducer';
import { berechneJahr, berechneMonat, saldoKumuliert, standHeute, systembeginn, vertragLabel } from './personal.model';

// ── §1 · Helfer ──────────────────────────────────────────────────

const JETZT = 11 * 60;
const JAHR = Number(HEUTE.slice(0, 4));

function person(state: DispoState, id: string): Mitarbeiter {
  const mitarbeiter = state.stammdaten.mitarbeiter.get(id);
  if (!mitarbeiter) throw new Error(`Testdaten: ${id} fehlt`);
  return mitarbeiter;
}

// ── §2 · Mein Jahr ───────────────────────────────────────────────

describe('berechneJahr', () => {
  it('kennzeichnet laufende, vergangene und künftige Monate sowie die Zeit vor dem Systembeginn', () => {
    const state = testState();
    const mb = person(state, 'M-MB');
    const jahr = berechneJahr(mb, JAHR, state, MANDANT_STANDARD, HEUTE, JETZT);
    expect(jahr.monate).toHaveLength(12);
    expect(jahr.monate.find((monat) => monat.monat === monatVon(HEUTE))?.zustand).toBe('laufend');
    expect(jahr.monate.filter((monat) => monat.monat > monatVon(HEUTE)).every((monat) => monat.zustand === 'zukunft')).toBe(true);
    expect(jahr.monate.filter((monat) => monat.monat < monatVon(systembeginn(mb))).every((monat) => monat.zustand === 'vor-systembeginn')).toBe(true);
    const vormonat = monatVon(addMonths(HEUTE, -1));
    if (vormonat.startsWith(String(JAHR))) expect(jahr.monate.find((monat) => monat.monat === vormonat)?.zustand).toBe('vergangen');
    expect(jahr.vertrag.art).toBe('unbefristet');
    expect(jahr.ferien.jahr).toBe(JAHR);
  });

  it('zeigt die Jahre vor dem Eintritt als nicht angestellt, danach bis zum Systembeginn als Übertrag', () => {
    const state = testState();
    const mb = person(state, 'M-MB');
    expect(berechneJahr(mb, 2018, state, MANDANT_STANDARD, HEUTE, JETZT).monate.every((monat) => monat.zustand === 'nicht-angestellt')).toBe(true);
    const eintrittsjahr = berechneJahr(mb, 2019, state, MANDANT_STANDARD, HEUTE, JETZT);
    expect(eintrittsjahr.monate.slice(0, 2).every((monat) => monat.zustand === 'nicht-angestellt')).toBe(true);
    expect(eintrittsjahr.monate.slice(2).every((monat) => monat.zustand === 'vor-systembeginn')).toBe(true);
    expect(eintrittsjahr.sollMin).toBe(0);
  });

  it('rechnet den kumulierten Saldo wie das Monatskonto und summiert die Monate', () => {
    const state = testState();
    const mb = person(state, 'M-MB');
    const jahr = berechneJahr(mb, JAHR, state, MANDANT_STANDARD, HEUTE, JETZT);
    const konto = berechneMonat(mb, monatVon(HEUTE), state, MANDANT_STANDARD, HEUTE, JETZT);
    expect(jahr.kumuliertMin).toBe(konto.saldoKumuliertMin);
    expect(jahr.saldoMin).toBe(jahr.istMin - jahr.sollMin);
    expect(jahr.monate.reduce((summe, monat) => summe + monat.saldoMin, 0)).toBe(jahr.saldoMin);
    expect(jahr.kumuliertMin).toBe(mb.zeitUebertragMin + jahr.saldoMin);
  });

  it('kennt vor dem Systembeginn nur den Übertrag', () => {
    const state = testState();
    const mb = person(state, 'M-MB');
    expect(saldoKumuliert(mb, mb.zeitUebertragPer, state, MANDANT_STANDARD, HEUTE, JETZT)).toBe(mb.zeitUebertragMin);
    expect(saldoKumuliert(mb, addDays(mb.zeitUebertragPer, -400), state, MANDANT_STANDARD, HEUTE, JETZT)).toBe(mb.zeitUebertragMin);
  });

  it('lässt den Ausgetretenen nach dem Vertragsende verschwinden', () => {
    const state = testState();
    const te = person(state, 'M-TE');
    const jahr = berechneJahr(te, JAHR, state, MANDANT_STANDARD, HEUTE, JETZT);
    expect(jahr.monate.filter((monat) => monat.monat > monatVon(te.austritt ?? HEUTE)).every((monat) => monat.zustand === 'nicht-angestellt')).toBe(true);
    expect(jahr.vertrag.offen).toBe(false);
  });
});

// ── §3 · Vertrag und Stand heute ─────────────────────────────────

describe('Vertrag in der Sicht', () => {
  it('beschreibt den Vertrag in einem Satz', () => {
    expect(vertragLabel({ vertragsart: 'unbefristet', eintritt: '2019-03-01' })).toBe('Unbefristet seit 01.03.2019');
    expect(vertragLabel({ vertragsart: 'befristet', eintritt: '2025-08-01', austritt: '2029-07-31' })).toBe('Befristet 01.08.2025 – 31.07.2029');
    expect(vertragLabel({ vertragsart: 'auf-widerruf', eintritt: '2022-02-01', austritt: '2026-12-31' })).toBe('Auf Widerruf seit 01.02.2022 · widerrufen per 31.12.2026');
    expect(vertragLabel({ vertragsart: 'unbefristet', eintritt: '2017-02-01', austritt: '2026-06-30' })).toBe('Unbefristet seit 01.02.2017 · beendet per 30.06.2026');
  });

  it('fasst Gleitzeit, Ferienrest und Vertragsende für heute zusammen', () => {
    const state = testState();
    const mb = person(state, 'M-MB');
    const stand = standHeute(mb, state, MANDANT_STANDARD, HEUTE, JETZT);
    expect(stand.gleitzeitMin).toBe(berechneMonat(mb, monatVon(HEUTE), state, MANDANT_STANDARD, HEUTE, JETZT).saldoKumuliertMin);
    expect(stand.endetInTagen).toBeNull();
    expect(stand.vertragText).toBe(vertragLabel(mb));
    const fr = person(state, 'M-FR');
    expect(fr.vertragsart).toBe('befristet');
    expect(standHeute(fr, state, MANDANT_STANDARD, HEUTE, JETZT).endetInTagen).toBe(45);
  });
});

/* ◆ jh · eof */
