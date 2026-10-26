/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/zeitzone.ts                                   │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Zeitzone und Zeitumstellung: Zonenzeit, Dauer über die Umstellung     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { rangeDays, toIsoDate } from './datum';
import type { IsoDatum, IsoZeitpunkt, Minuten } from './datum';

// ── §1 · Zonen ───────────────────────────────────────────────────

export const ZEITZONE_STANDARD = 'Europe/Zurich';

export const ZEITZONEN: readonly { id: string; label: string }[] = [
  { id: 'Europe/Zurich', label: 'Schweiz · Europe/Zurich' },
  { id: 'Europe/Berlin', label: 'Deutschland · Europe/Berlin' },
  { id: 'Europe/Vienna', label: 'Österreich · Europe/Vienna' },
  { id: 'Europe/Paris', label: 'Frankreich · Europe/Paris' },
  { id: 'Europe/Rome', label: 'Italien · Europe/Rome' },
  { id: 'Europe/London', label: 'Grossbritannien · Europe/London' },
  { id: 'UTC', label: 'UTC – ohne Umstellung' },
];

interface Teile {
  jahr: number;
  monat: number;
  tag: number;
  stunde: number;
  minute: number;
  sekunde: number;
}

const formate = new Map<string, Intl.DateTimeFormat>();

// jh› Keine eigene Regeltabelle: Die Zonenregeln (inklusive Sommerzeit) liefert die ICU-Datenbank des Browsers
//     über Intl – korrekt für jede IANA-Zone, auch wenn die EU die Umstellung eines Tages abschafft.
// jh# 018 Server und Client müssen dieselbe IANA-Version (tzdata) nutzen, sonst rechnen App und API an einem
//         Umstellungstag verschieden – Version der API im Mandanten anzeigen.
function formatFuer(zone: string): Intl.DateTimeFormat {
  const bekannt = formate.get(zone);
  if (bekannt) return bekannt;
  const format = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  formate.set(zone, format);
  return format;
}

function teile(zone: string, date: Date): Teile {
  const werte: Record<string, number> = {};
  for (const teil of formatFuer(zone).formatToParts(date)) {
    if (teil.type !== 'literal') werte[teil.type] = Number(teil.value);
  }
  return { jahr: werte.year ?? 1970, monat: werte.month ?? 1, tag: werte.day ?? 1, stunde: (werte.hour ?? 0) % 24, minute: werte.minute ?? 0, sekunde: werte.second ?? 0 };
}

function pad2(wert: number): string {
  return String(wert).padStart(2, '0');
}

function isoAus(t: Teile): IsoDatum {
  return `${t.jahr}-${pad2(t.monat)}-${pad2(t.tag)}` as IsoDatum;
}

export function istGueltigeZone(zone: string): boolean {
  try {
    formatFuer(zone);
    return true;
  } catch {
    return false;
  }
}

// ── §2 · Zonenzeit ───────────────────────────────────────────────

export interface ZonenZeit {
  datum: IsoDatum;
  minuten: Minuten;
  sekunden: number;
  /** Abstand zu UTC in Minuten, z. B. 60 (MEZ) oder 120 (MESZ). */
  offsetMin: number;
  /** Kurzname der Zone zu diesem Zeitpunkt, z. B. «MEZ» oder «MESZ». */
  kurz: string;
}

/** UTC-Abstand der Zone zu einem Zeitpunkt in Minuten. */
export function offsetMinuten(zone: string, date: Date): number {
  const t = teile(zone, date);
  const alsUtc = Date.UTC(t.jahr, t.monat - 1, t.tag, t.stunde, t.minute, t.sekunde);
  return Math.round((alsUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

export function zonenKurz(zone: string, date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('de-CH', { timeZone: zone, timeZoneName: 'short' }).formatToParts(date);
    return parts.find((teil) => teil.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/** «Jetzt» in der Zone des Mandanten – unabhängig davon, wo das Gerät gerade steht. */
export function jetztInZone(zone: string, jetzt: Date = new Date()): ZonenZeit {
  const t = teile(zone, jetzt);
  return { datum: isoAus(t), minuten: t.stunde * 60 + t.minute, sekunden: t.sekunde, offsetMin: offsetMinuten(zone, jetzt), kurz: zonenKurz(zone, jetzt) };
}

export function zeitpunktInZone(zone: string, jetzt: Date = new Date()): IsoZeitpunkt {
  const t = teile(zone, jetzt);
  return `${isoAus(t)}T${pad2(t.stunde)}:${pad2(t.minute)}`;
}

// ── §3 · Lokale Zeit → Zeitpunkt ─────────────────────────────────

/**
 * Wandzeit einer Zone in einen Zeitpunkt. In der Lücke der Sommerzeit (02:00–03:00 im März) rutscht die
 * Zeit eine Stunde nach vorn; in der doppelten Stunde im Oktober gilt das zweite Vorkommen (Normalzeit).
 */
export function lokalZuInstant(zone: string, datum: IsoDatum, minuten: Minuten): Date {
  const [jahr, monat, tag] = datum.split('-').map(Number);
  const wunsch = Date.UTC(jahr ?? 1970, (monat ?? 1) - 1, tag ?? 1, Math.floor(minuten / 60), minuten % 60);
  const erste = wunsch - offsetMinuten(zone, new Date(wunsch)) * 60_000;
  const zweite = wunsch - offsetMinuten(zone, new Date(erste)) * 60_000;
  return new Date(zweite);
}

/** Echte Dauer zwischen zwei Wandzeiten desselben Tages – über die Umstellung 60 Minuten mehr oder weniger. */
export function dauerZwischen(zone: string, datum: IsoDatum, vonMin: Minuten, bisMin: Minuten): Minuten {
  const von = lokalZuInstant(zone, datum, vonMin).getTime();
  const bis = lokalZuInstant(zone, datum, bisMin).getTime();
  return Math.max(0, Math.round((bis - von) / 60_000));
}

// ── §4 · Umstellungen ────────────────────────────────────────────

export interface Umstellung {
  datum: IsoDatum;
  art: 'sommerzeit' | 'winterzeit';
  /** Wandzeit, die übersprungen (März) bzw. wiederholt (Oktober) wird. */
  vonMin: Minuten;
  nachMin: Minuten;
  offsetVorher: number;
  offsetNachher: number;
}

const umstellungen = new Map<string, Umstellung | null>();

/** Umstellung an diesem Tag, falls eine stattfindet. */
export function umstellungAm(zone: string, datum: IsoDatum): Umstellung | undefined {
  const schluessel = `${zone}·${datum}`;
  const bekannt = umstellungen.get(schluessel);
  if (bekannt !== undefined) return bekannt ?? undefined;

  const start = lokalZuInstant(zone, datum, 0);
  const ende = lokalZuInstant(zone, datum, 23 * 60 + 59);
  const offsetStart = offsetMinuten(zone, start);
  const offsetEnde = offsetMinuten(zone, ende);
  if (offsetStart === offsetEnde) {
    umstellungen.set(schluessel, null);
    return undefined;
  }
  // jh› Binäre Suche nach der Minute, in der der Abstand springt – drei Dutzend Intl-Aufrufe, einmal je Tag gecacht.
  let tief = start.getTime();
  let hoch = ende.getTime();
  while (hoch - tief > 60_000) {
    const mitte = Math.floor((tief + hoch) / 2 / 60_000) * 60_000;
    if (offsetMinuten(zone, new Date(mitte)) === offsetStart) tief = mitte;
    else hoch = mitte;
  }
  const vor = teile(zone, new Date(tief));
  const nach = teile(zone, new Date(hoch));
  const umstellung: Umstellung = {
    datum,
    art: offsetEnde > offsetStart ? 'sommerzeit' : 'winterzeit',
    vonMin: vor.stunde * 60 + vor.minute + 1,
    nachMin: nach.stunde * 60 + nach.minute,
    offsetVorher: offsetStart,
    offsetNachher: offsetEnde,
  };
  umstellungen.set(schluessel, umstellung);
  return umstellung;
}

const jahresumstellungen = new Map<string, readonly Umstellung[]>();

export function umstellungenImJahr(zone: string, jahr: number): readonly Umstellung[] {
  const schluessel = `${zone}·${jahr}`;
  const bekannt = jahresumstellungen.get(schluessel);
  if (bekannt) return bekannt;
  const liste = rangeDays(toIsoDate(new Date(jahr, 0, 1)), toIsoDate(new Date(jahr, 11, 31))).flatMap((datum) => {
    const umstellung = umstellungAm(zone, datum);
    return umstellung ? [umstellung] : [];
  });
  jahresumstellungen.set(schluessel, liste);
  return liste;
}

export function naechsteUmstellung(zone: string, ab: IsoDatum): Umstellung | undefined {
  const jahr = Number(ab.slice(0, 4));
  return [...umstellungenImJahr(zone, jahr), ...umstellungenImJahr(zone, jahr + 1)].find((umstellung) => umstellung.datum >= ab);
}

/** Länge des Tages in Minuten: 1440, am Umstellungstag 1380 oder 1500. */
export function tagLaengeMin(zone: string, datum: IsoDatum): Minuten {
  const umstellung = umstellungAm(zone, datum);
  if (!umstellung) return 1440;
  return umstellung.art === 'sommerzeit' ? 1380 : 1500;
}

export function umstellungLabel(umstellung: Umstellung): string {
  const von = `${pad2(Math.floor(umstellung.vonMin / 60))}:${pad2(umstellung.vonMin % 60)}`;
  const nach = `${pad2(Math.floor(umstellung.nachMin / 60))}:${pad2(umstellung.nachMin % 60)}`;
  return umstellung.art === 'sommerzeit' ? `Sommerzeit: ${von} → ${nach}, der Tag hat 23 Stunden` : `Normalzeit: ${von} → ${nach}, der Tag hat 25 Stunden`;
}

/* ◆ jh · eof */
