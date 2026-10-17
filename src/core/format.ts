/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/format.ts                                     │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Anzeigeformate CH: 17.10.2026 · 08:30 · CHF 1’240.50 · Oktober 2026   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { daysBetween, parseIsoDate, splitZeitpunkt, weekdayIndex } from './datum';
import type { IsoDatum, IsoZeitpunkt, Minuten } from './datum';

// ── §1 · Kalendernamen ───────────────────────────────────────────

const WOCHENTAG_LANG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const;
const WOCHENTAG_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
const MONAT_LANG = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;
const MONAT_KURZ = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sept', 'Okt', 'Nov', 'Dez'] as const;

function pad2(wert: number): string {
  return String(wert).padStart(2, '0');
}

// ── §2 · Datum & Zeit ────────────────────────────────────────────

export function formatDatum(iso: IsoDatum): string {
  const date = parseIsoDate(iso);
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export function formatDatumKurz(iso: IsoDatum): string {
  const date = parseIsoDate(iso);
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.`;
}

/** «Samstag, 17. Oktober 2026» */
export function formatDatumLang(iso: IsoDatum): string {
  const date = parseIsoDate(iso);
  return `${formatWochentag(iso)}, ${date.getDate()}. ${MONAT_LANG[date.getMonth()] ?? ''} ${date.getFullYear()}`;
}

export function formatWochentag(iso: IsoDatum, laenge: 'lang' | 'kurz' = 'lang'): string {
  const index = weekdayIndex(iso);
  const namen = laenge === 'lang' ? WOCHENTAG_LANG : WOCHENTAG_KURZ;
  return namen[index] ?? '';
}

export function formatMonatJahr(iso: IsoDatum, laenge: 'lang' | 'kurz' = 'lang'): string {
  const date = parseIsoDate(iso);
  const namen = laenge === 'lang' ? MONAT_LANG : MONAT_KURZ;
  return `${namen[date.getMonth()] ?? ''} ${date.getFullYear()}`;
}

export function formatZeit(minuten: Minuten): string {
  return `${pad2(Math.floor(minuten / 60))}:${pad2(minuten % 60)}`;
}

export function formatZeitspanne(start: Minuten, dauer: Minuten): string {
  return `${formatZeit(start)}–${formatZeit(start + dauer)}`;
}

export function formatZeitpunkt(zeitpunkt: IsoZeitpunkt): string {
  const { datum, minuten } = splitZeitpunkt(zeitpunkt);
  return `${formatDatum(datum)} · ${formatZeit(minuten)}`;
}

export function formatZeitpunktKurz(zeitpunkt: IsoZeitpunkt): string {
  const { datum, minuten } = splitZeitpunkt(zeitpunkt);
  return `${formatDatumKurz(datum)} ${formatZeit(minuten)}`;
}

// ── §3 · Dauer & Abstand ─────────────────────────────────────────

/** 45 → «45 min», 90 → «1:30 h» – wie auf dem Rapportzettel. */
export function formatDauer(minuten: Minuten): string {
  if (minuten < 60) return `${minuten} min`;
  return `${Math.floor(minuten / 60)}:${pad2(minuten % 60)} h`;
}

/** «seit 34 Tagen», «seit gestern», «seit heute» */
export function formatSeit(von: IsoDatum, heute: IsoDatum): string {
  const tage = daysBetween(von, heute);
  if (tage <= 0) return 'seit heute';
  if (tage === 1) return 'seit gestern';
  return `seit ${tage} Tagen`;
}

export function formatKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function formatProzent(anteil: number): string {
  return `${Math.round(anteil * 100)} %`;
}

// ── §4 · Geld ────────────────────────────────────────────────────

const CHF = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1240.5 → «CHF 1’240.50» (Schweizer Tausender-Apostroph). */
export function formatChf(betrag: number): string {
  return `CHF ${CHF.format(betrag)}`;
}

/* ◆ jh · eof */
