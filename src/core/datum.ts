/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/datum.ts                                      │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Kalender-Arithmetik auf ISO-Datum, Minuten ab Mitternacht, Monate     │
   └────────────────────────────────────────────────────────────────────────┘ */

// ── §1 · Typen ───────────────────────────────────────────────────

/** Kalendertag ohne Zeitzone, z. B. `2026-10-17`. */
export type IsoDatum = `${number}-${number}-${number}`;

/** Lokaler Zeitpunkt auf Minute genau, z. B. `2026-10-17T08:30`. */
export type IsoZeitpunkt = `${IsoDatum}T${string}`;

/** Minuten ab 00:00 – 510 entspricht 08:30. */
export type Minuten = number;

// jh› Bewusst keine Date-Objekte im State: ein Kalendertag hat keine
//     Zeitzone, und Strings lassen sich direkt vergleichen und sortieren.

const ISO_MUSTER = /^\d{4}-\d{2}-\d{2}$/;

// ── §2 · Umwandlung ──────────────────────────────────────────────

function pad2(wert: number): string {
  return String(wert).padStart(2, '0');
}

export function toIsoDate(date: Date): IsoDatum {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` as IsoDatum;
}

export function parseIsoDate(iso: IsoDatum): Date {
  const [jahr = 1970, monat = 1, tag = 1] = iso.split('-').map(Number);
  return new Date(jahr, monat - 1, tag);
}

/** Prüft fremde Eingaben (URL, localStorage) – gibt nur gültige Kalendertage zurück. */
export function parseIsoInput(wert: string | null | undefined): IsoDatum | null {
  if (!wert || !ISO_MUSTER.test(wert)) return null;
  const date = parseIsoDate(wert as IsoDatum);
  return toIsoDate(date) === wert ? (wert as IsoDatum) : null;
}

export function todayIso(): IsoDatum {
  return toIsoDate(new Date());
}

export function minutesOfDay(date: Date): Minuten {
  return date.getHours() * 60 + date.getMinutes();
}

export function toZeitpunkt(datum: IsoDatum, minuten: Minuten): IsoZeitpunkt {
  return `${datum}T${pad2(Math.floor(minuten / 60))}:${pad2(minuten % 60)}`;
}

export function splitZeitpunkt(zeitpunkt: IsoZeitpunkt): { datum: IsoDatum; minuten: Minuten } {
  const [datum, zeit = '00:00'] = zeitpunkt.split('T');
  const [stunden = 0, minuten = 0] = zeit.split(':').map(Number);
  return { datum: datum as IsoDatum, minuten: stunden * 60 + minuten };
}

export function nowZeitpunkt(): IsoZeitpunkt {
  const jetzt = new Date();
  return toZeitpunkt(toIsoDate(jetzt), minutesOfDay(jetzt));
}

// ── §3 · Tage & Wochen ───────────────────────────────────────────

export function addDays(iso: IsoDatum, tage: number): IsoDatum {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + tage);
  return toIsoDate(date);
}

/** 0 = Montag … 6 = Sonntag (Schweizer Woche). */
export function weekdayIndex(iso: IsoDatum): number {
  return (parseIsoDate(iso).getDay() + 6) % 7;
}

export function startOfWeek(iso: IsoDatum): IsoDatum {
  return addDays(iso, -weekdayIndex(iso));
}

export function isSunday(iso: IsoDatum): boolean {
  return weekdayIndex(iso) === 6;
}

export function isWeekend(iso: IsoDatum): boolean {
  return weekdayIndex(iso) >= 5;
}

/** Kalenderwoche nach ISO 8601 – die Woche mit dem ersten Donnerstag ist KW 1. */
export function isoWeek(iso: IsoDatum): number {
  const date = parseIsoDate(iso);
  const donnerstag = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 3 - weekdayIndex(iso));
  const neujahr = new Date(donnerstag.getFullYear(), 0, 1);
  // jh! Math.round statt floor – Sommerzeit verschiebt die Differenz um eine Stunde.
  const tagImJahr = Math.round((donnerstag.getTime() - neujahr.getTime()) / 86_400_000);
  return 1 + Math.floor(tagImJahr / 7);
}

export function daysBetween(von: IsoDatum, bis: IsoDatum): number {
  return Math.round((parseIsoDate(bis).getTime() - parseIsoDate(von).getTime()) / 86_400_000);
}

/** Alle Tage von `von` bis `bis` (beide inklusive). */
export function rangeDays(von: IsoDatum, bis: IsoDatum): IsoDatum[] {
  const anzahl = Math.max(0, daysBetween(von, bis));
  return Array.from({ length: anzahl + 1 }, (_, index) => addDays(von, index));
}

export function clampIso(iso: IsoDatum, von: IsoDatum, bis: IsoDatum): IsoDatum {
  if (iso < von) return von;
  if (iso > bis) return bis;
  return iso;
}

// ── §4 · Monate ──────────────────────────────────────────────────

export function startOfMonth(iso: IsoDatum): IsoDatum {
  const date = parseIsoDate(iso);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(iso: IsoDatum): IsoDatum {
  const date = parseIsoDate(iso);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function addMonths(iso: IsoDatum, monate: number): IsoDatum {
  const date = parseIsoDate(iso);
  // jh! Monatsende klemmen: 31.10. + 1 Monat ist der 30.11., nicht der 1.12.
  const ziel = new Date(date.getFullYear(), date.getMonth() + monate, 1);
  const letzterTag = new Date(ziel.getFullYear(), ziel.getMonth() + 1, 0).getDate();
  ziel.setDate(Math.min(date.getDate(), letzterTag));
  return toIsoDate(ziel);
}

export function isSameMonth(a: IsoDatum, b: IsoDatum): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Monatsraster Mo–So, immer 6 Wochen – ruhiges Layout ohne Höhensprünge. */
export function monthGrid(iso: IsoDatum): IsoDatum[][] {
  const erster = startOfWeek(startOfMonth(iso));
  return Array.from({ length: 6 }, (_, woche) =>
    Array.from({ length: 7 }, (_, tag) => addDays(erster, woche * 7 + tag)),
  );
}

/* ◆ jh · eof */
