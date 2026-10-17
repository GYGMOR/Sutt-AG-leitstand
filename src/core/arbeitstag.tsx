/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/arbeitstag.tsx                                │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Arbeitstag in der URL: ?d=2026-10-17&v=woche – teilbar, blätterbar    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { addDays, addMonths, endOfMonth, parseIsoInput, rangeDays, startOfMonth, startOfWeek, todayIso } from './datum';
import type { IsoDatum } from './datum';

// ── §1 · Typen ───────────────────────────────────────────────────

export type Zeitraum = 'tag' | '3tage' | 'arbeitswoche' | 'woche' | 'monat';

export const ZEITRAUM_LABEL: Readonly<Record<Zeitraum, string>> = {
  tag: 'Tag',
  '3tage': '3 Tage',
  arbeitswoche: 'Arbeitswoche',
  woche: 'Woche',
  monat: 'Monat',
};

export const ALLE_ZEITRAEUME: readonly Zeitraum[] = ['tag', '3tage', 'arbeitswoche', 'woche', 'monat'];

export function isZeitraum(wert: string | null): wert is Zeitraum {
  return wert !== null && (ALLE_ZEITRAEUME as readonly string[]).includes(wert);
}

export interface Arbeitstag {
  datum: IsoDatum;
  heute: IsoDatum;
  zeitraum: Zeitraum;
  /** Sichtbare Tage der aktuellen Ansicht (Tag → 1, Woche → 7, Monat → 28–31). */
  tage: readonly IsoDatum[];
  setDatum: (datum: IsoDatum) => void;
  setZeitraum: (zeitraum: Zeitraum) => void;
  stepBack: () => void;
  stepForward: () => void;
  goToday: () => void;
}

// ── §2 · Sichtbare Tage ──────────────────────────────────────────

export function visibleDays(datum: IsoDatum, zeitraum: Zeitraum): IsoDatum[] {
  switch (zeitraum) {
    case 'tag':
      return [datum];
    case '3tage':
      return [datum, addDays(datum, 1), addDays(datum, 2)];
    case 'arbeitswoche':
      return rangeDays(startOfWeek(datum), addDays(startOfWeek(datum), 4));
    case 'woche':
      return rangeDays(startOfWeek(datum), addDays(startOfWeek(datum), 6));
    case 'monat':
      return rangeDays(startOfMonth(datum), endOfMonth(datum));
  }
}

function step(datum: IsoDatum, zeitraum: Zeitraum, richtung: 1 | -1): IsoDatum {
  switch (zeitraum) {
    case 'tag':
      return addDays(datum, richtung);
    case '3tage':
      return addDays(datum, 3 * richtung);
    case 'arbeitswoche':
    case 'woche':
      return addDays(datum, 7 * richtung);
    case 'monat':
      return addMonths(datum, richtung);
  }
}

// ── §3 · Heute-Kontext ───────────────────────────────────────────

// jh# 001 Mitternachtswechsel: «heute» wird beim Start fixiert.
const HeuteContext = createContext<IsoDatum>(todayIso());

interface ArbeitstagProviderProps {
  heute?: IsoDatum;
  children: ReactNode;
}

export function ArbeitstagProvider({ heute, children }: ArbeitstagProviderProps) {
  const wert = useMemo(() => heute ?? todayIso(), [heute]);
  return <HeuteContext.Provider value={wert}>{children}</HeuteContext.Provider>;
}

export function useHeute(): IsoDatum {
  return useContext(HeuteContext);
}

// ── §4 · Hook ────────────────────────────────────────────────────

// jh› Datum und Zeitraum leben in der URL, nicht im State: Links sind
//     teilbar («schau dir Donnerstag an»), Reload hält die Stelle.
export function useArbeitstag(): Arbeitstag {
  const heute = useContext(HeuteContext);
  const [params, setParams] = useSearchParams();

  const datum = parseIsoInput(params.get('d')) ?? heute;
  const roh = params.get('v');
  const zeitraum: Zeitraum = isZeitraum(roh) ? roh : 'tag';

  const update = useCallback(
    (aenderung: { d?: IsoDatum; v?: Zeitraum }) => {
      setParams(
        (aktuell) => {
          const neu = new URLSearchParams(aktuell);
          if (aenderung.d) neu.set('d', aenderung.d);
          if (aenderung.v) neu.set('v', aenderung.v);
          return neu;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setDatum = useCallback((neu: IsoDatum) => update({ d: neu }), [update]);
  const setZeitraum = useCallback((neu: Zeitraum) => update({ v: neu }), [update]);
  const stepBack = useCallback(() => update({ d: step(datum, zeitraum, -1) }), [update, datum, zeitraum]);
  const stepForward = useCallback(() => update({ d: step(datum, zeitraum, 1) }), [update, datum, zeitraum]);
  const goToday = useCallback(() => update({ d: heute }), [update, heute]);

  const tage = useMemo(() => visibleDays(datum, zeitraum), [datum, zeitraum]);

  return useMemo(
    () => ({ datum, heute, zeitraum, tage, setDatum, setZeitraum, stepBack, stepForward, goToday }),
    [datum, heute, zeitraum, tage, setDatum, setZeitraum, stepBack, stepForward, goToday],
  );
}

/* ◆ jh · eof */
