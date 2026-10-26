/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/feiertage.ts                           │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Feiertage je Kanton (Osterrechnung), betriebliche Tage, Arbeitstage   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, isWeekend, parseIsoDate, rangeDays, toIsoDate } from '../datum';
import type { IsoDatum } from '../datum';

// ── §1 · Typen ───────────────────────────────────────────────────

export type Kanton = 'ZH' | 'AG' | 'BE' | 'LU' | 'SG' | 'SH' | 'SO' | 'TG' | 'ZG' | 'BS' | 'BL';

export const KANTONE: readonly { id: Kanton; label: string }[] = [
  { id: 'ZH', label: 'Zürich' },
  { id: 'AG', label: 'Aargau' },
  { id: 'BE', label: 'Bern' },
  { id: 'LU', label: 'Luzern' },
  { id: 'SG', label: 'St. Gallen' },
  { id: 'SH', label: 'Schaffhausen' },
  { id: 'SO', label: 'Solothurn' },
  { id: 'TG', label: 'Thurgau' },
  { id: 'ZG', label: 'Zug' },
  { id: 'BS', label: 'Basel-Stadt' },
  { id: 'BL', label: 'Basel-Landschaft' },
];

export type FeiertagArt = 'gesetzlich' | 'betrieblich';

export interface Feiertag {
  datum: IsoDatum;
  label: string;
  art: FeiertagArt;
  /** Halber Tag (Nachmittag frei), z. B. Heiligabend im Betrieb. */
  halb: boolean;
}

/** Betrieblich freier Tag, jedes Jahr am selben Kalendertag («12-24»). */
export interface BetrieblicherFeiertag {
  tag: string;
  label: string;
  halb: boolean;
}

export const BETRIEBLICHE_FEIERTAGE_STANDARD: readonly BetrieblicherFeiertag[] = [
  { tag: '12-24', label: 'Heiligabend', halb: true },
  { tag: '12-31', label: 'Silvester', halb: true },
];

// ── §2 · Osterrechnung ───────────────────────────────────────────

// jh› Gregorianische Osterformel nach Meeus/Jones/Butcher – gilt ohne Ausnahme für alle Jahre ab 1583.
export function ostersonntag(jahr: number): IsoDatum {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return toIsoDate(new Date(jahr, monat - 1, tag));
}

function fix(jahr: number, monat: number, tag: number): IsoDatum {
  return toIsoDate(new Date(jahr, monat - 1, tag));
}

// ── §3 · Regeln je Kanton ────────────────────────────────────────

interface Regel {
  label: string;
  wann: (jahr: number, ostern: IsoDatum) => IsoDatum;
  kantone: readonly Kanton[] | 'alle';
}

// jh? Kantonale Listen nach gängigen Übersichten (Ruhetagsgesetze); Sutt arbeitet im Kanton Zürich –
//     die übrigen Kantone sind für Mandanten vorbereitet und vor Rollout zu prüfen (AG kennt Bezirksunterschiede).
const REGELN: readonly Regel[] = [
  { label: 'Neujahr', wann: (jahr) => fix(jahr, 1, 1), kantone: 'alle' },
  { label: 'Berchtoldstag', wann: (jahr) => fix(jahr, 1, 2), kantone: ['ZH', 'BE', 'SH', 'SO', 'TG', 'ZG', 'AG'] },
  { label: 'Karfreitag', wann: (_jahr, ostern) => addDays(ostern, -2), kantone: 'alle' },
  { label: 'Ostermontag', wann: (_jahr, ostern) => addDays(ostern, 1), kantone: 'alle' },
  { label: 'Tag der Arbeit', wann: (jahr) => fix(jahr, 5, 1), kantone: ['ZH', 'SH', 'SO', 'TG', 'BS', 'BL'] },
  { label: 'Auffahrt', wann: (_jahr, ostern) => addDays(ostern, 39), kantone: 'alle' },
  { label: 'Pfingstmontag', wann: (_jahr, ostern) => addDays(ostern, 50), kantone: 'alle' },
  { label: 'Fronleichnam', wann: (_jahr, ostern) => addDays(ostern, 60), kantone: ['LU', 'SO', 'ZG', 'AG'] },
  { label: 'Bundesfeier', wann: (jahr) => fix(jahr, 8, 1), kantone: 'alle' },
  { label: 'Mariä Himmelfahrt', wann: (jahr) => fix(jahr, 8, 15), kantone: ['LU', 'SO', 'ZG', 'AG'] },
  { label: 'Allerheiligen', wann: (jahr) => fix(jahr, 11, 1), kantone: ['LU', 'SG', 'SO', 'ZG', 'AG'] },
  { label: 'Mariä Empfängnis', wann: (jahr) => fix(jahr, 12, 8), kantone: ['LU', 'ZG', 'AG'] },
  { label: 'Weihnachten', wann: (jahr) => fix(jahr, 12, 25), kantone: 'alle' },
  { label: 'Stephanstag', wann: (jahr) => fix(jahr, 12, 26), kantone: 'alle' },
];

const cache = new Map<string, readonly Feiertag[]>();

/** Alle Feiertage eines Jahres, chronologisch – gesetzliche des Kantons plus betriebliche. */
export function feiertageImJahr(jahr: number, kanton: Kanton, betrieblich: readonly BetrieblicherFeiertag[] = BETRIEBLICHE_FEIERTAGE_STANDARD): readonly Feiertag[] {
  const schluessel = `${jahr}·${kanton}·${betrieblich.map((eintrag) => `${eintrag.tag}${eintrag.halb ? 'h' : ''}`).join(',')}`;
  const bekannt = cache.get(schluessel);
  if (bekannt) return bekannt;
  const ostern = ostersonntag(jahr);
  const gesetzlich: Feiertag[] = REGELN.filter((regel) => regel.kantone === 'alle' || regel.kantone.includes(kanton)).map((regel) => ({
    datum: regel.wann(jahr, ostern),
    label: regel.label,
    art: 'gesetzlich',
    halb: false,
  }));
  const eigene: Feiertag[] = betrieblich
    .map((eintrag) => {
      const [monat, tag] = eintrag.tag.split('-').map(Number);
      return { datum: fix(jahr, monat ?? 1, tag ?? 1), label: eintrag.label, art: 'betrieblich' as const, halb: eintrag.halb };
    })
    .filter((eintrag) => !gesetzlich.some((gesetz) => gesetz.datum === eintrag.datum));
  const liste = [...gesetzlich, ...eigene].sort((a, b) => a.datum.localeCompare(b.datum));
  cache.set(schluessel, liste);
  return liste;
}

export function feiertagAm(datum: IsoDatum, kanton: Kanton, betrieblich?: readonly BetrieblicherFeiertag[]): Feiertag | undefined {
  const jahr = parseIsoDate(datum).getFullYear();
  return feiertageImJahr(jahr, kanton, betrieblich).find((feiertag) => feiertag.datum === datum);
}

// ── §4 · Arbeitstage ─────────────────────────────────────────────

/** Anteil eines Tages, der Arbeitstag ist: 1, 0.5 (halber Feiertag) oder 0 (Wochenende, Feiertag). */
export function arbeitstagAnteil(datum: IsoDatum, kanton: Kanton, betrieblich?: readonly BetrieblicherFeiertag[]): number {
  if (isWeekend(datum)) return 0;
  const feiertag = feiertagAm(datum, kanton, betrieblich);
  if (!feiertag) return 1;
  return feiertag.halb ? 0.5 : 0;
}

export function istArbeitstag(datum: IsoDatum, kanton: Kanton, betrieblich?: readonly BetrieblicherFeiertag[]): boolean {
  return arbeitstagAnteil(datum, kanton, betrieblich) > 0;
}

/** Arbeitstage von–bis (inklusive), halbe Feiertage zählen 0.5. */
export function arbeitstageZwischen(von: IsoDatum, bis: IsoDatum, kanton: Kanton, betrieblich?: readonly BetrieblicherFeiertag[]): number {
  if (bis < von) return 0;
  return rangeDays(von, bis).reduce((summe, datum) => summe + arbeitstagAnteil(datum, kanton, betrieblich), 0);
}

/* ◆ jh · eof */
