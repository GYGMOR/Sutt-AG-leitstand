/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/personal/personal.model.ts                 │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Geteilte Sichten: Person, Zeitkonto je Monat, Stempellage, CSV        │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Benutzer } from '../../core/auth/auth.types';
import { addDays, parseIsoDate, rangeDays, toIsoDate } from '../../core/datum';
import type { IsoDatum, Minuten } from '../../core/datum';
import { absenzAm } from '../../core/domain/absenz';
import type { Absenz } from '../../core/domain/absenz';
import type { Einsatz } from '../../core/domain/einsatz';
import { feiertagAm } from '../../core/domain/feiertage';
import type { Techniker } from '../../core/domain/stammdaten';
import { istAngestellt, unterstellte } from '../../core/domain/personal';
import type { Mitarbeiter } from '../../core/domain/personal';
import { abschlussFuer, berechneTag, einsatzZeiten, istAktiv, laufenderEintrag, monatVon, periodenSaldo, ruhezeitVerletzungen, stempelStatus, tageImMonat, tagesSollMin } from '../../core/domain/zeit';
import type { EinsatzZeiten, Monatsabschluss, MonatsSchluessel, PeriodenSaldo, StempelStatus, TagesSaldo, ZeitEintrag } from '../../core/domain/zeit';
import { formatDatum, formatSaldo, formatZeit } from '../../core/format';
import type { Mandant } from '../../core/mandant/mandant.types';
import type { DispoStammdaten } from '../dispo/dispo.types';

// ── §1 · Person ──────────────────────────────────────────────────

export interface PersonView {
  mitarbeiter: Mitarbeiter;
  konto: Benutzer | undefined;
  techniker: Techniker | undefined;
  vorgesetzte: Mitarbeiter | undefined;
  team: Mitarbeiter[];
  /** Heute angestellt (Eintritt erreicht, kein Austritt). */
  aktiv: boolean;
}

export function buildPersonViews(stammdaten: DispoStammdaten, heute: IsoDatum, personen: readonly Mitarbeiter[] = [...stammdaten.mitarbeiter.values()]): PersonView[] {
  const alle = [...stammdaten.mitarbeiter.values()];
  const konten = [...stammdaten.benutzer.values()];
  return personen.map((mitarbeiter) => ({
    mitarbeiter,
    konto: konten.find((konto) => konto.mitarbeiterId === mitarbeiter.id),
    techniker: mitarbeiter.technikerId ? stammdaten.techniker.find((techniker) => techniker.id === mitarbeiter.technikerId) : undefined,
    vorgesetzte: mitarbeiter.vorgesetzterId ? stammdaten.mitarbeiter.get(mitarbeiter.vorgesetzterId) : undefined,
    team: unterstellte(alle, mitarbeiter.id, false),
    aktiv: istAngestellt(mitarbeiter, heute),
  }));
}

// ── §2 · Zeitkonto ───────────────────────────────────────────────

export interface TagMitPlan extends TagesSaldo {
  /** Zeiten aus dem Einsatzplan – nur für Techniker, nur an Tagen mit Einsätzen. */
  plan: EinsatzZeiten | null;
  /** Noch in der Zukunft – kein Soll, keine Warnung. */
  zukunft: boolean;
}

export interface ZeitkontoMonat {
  mitarbeiter: Mitarbeiter;
  monat: MonatsSchluessel;
  tage: TagMitPlan[];
  /** Soll, Ist und Saldo bis heute (zukünftige Tage zählen nicht). */
  periode: PeriodenSaldo;
  /** Soll des ganzen Monats – was am Monatsende erreicht sein muss. */
  sollGesamtMin: Minuten;
  abschluss: Monatsabschluss | undefined;
  gesperrt: boolean;
  /** Gleitzeit-Saldo per Ende dieses Monats (bzw. heute), inklusive Jahresübertrag. */
  saldoKumuliertMin: Minuten;
  ruhezeit: { datum: IsoDatum; ruheMin: Minuten }[];
}

/** Ausschnitt des Stands, den die Zeitrechnung braucht – ein DispoState erfüllt ihn direkt. */
export interface ZeitQuelle {
  zeiteintraege: readonly ZeitEintrag[];
  monatsabschluesse: readonly Monatsabschluss[];
  einsaetze: readonly Einsatz[];
  stammdaten: { absenzen: readonly Absenz[] };
}

function eintraegeNachTag(eintraege: readonly ZeitEintrag[], mitarbeiterId: string): Map<IsoDatum, ZeitEintrag[]> {
  const map = new Map<IsoDatum, ZeitEintrag[]>();
  for (const eintrag of eintraege) {
    if (eintrag.mitarbeiterId !== mitarbeiterId) continue;
    const liste = map.get(eintrag.datum) ?? [];
    liste.push(eintrag);
    map.set(eintrag.datum, liste);
  }
  return map;
}

function tagBerechnen(mitarbeiter: Mitarbeiter, datum: IsoDatum, proTag: Map<IsoDatum, ZeitEintrag[]>, quelle: ZeitQuelle, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten): TagMitPlan {
  const zukunft = datum > heute;
  const basis = berechneTag({
    datum,
    mitarbeiter,
    eintraege: proTag.get(datum) ?? [],
    modell: mandant.arbeitszeit,
    feiertag: feiertagAm(datum, mandant.kanton, mandant.betrieblicheFeiertage),
    absenz: absenzAm(quelle.stammdaten.absenzen, mitarbeiter.id, datum),
    jetztMin: datum === heute ? jetztMin : null,
    zone: mandant.zeitzone,
  });
  const eigene = mitarbeiter.technikerId ? quelle.einsaetze.filter((einsatz) => einsatz.technikerId === mitarbeiter.technikerId && einsatz.datum === datum && einsatz.status !== 'geplant') : [];
  const plan = eigene.length > 0 ? einsatzZeiten(eigene) : null;
  if (!zukunft) return { ...basis, plan, zukunft };
  return { ...basis, plan, zukunft, sollMin: 0, saldoMin: 0, warnungen: [] };
}

// jh› Der Saldo ist eine Kette: Übertrag per Stichtag plus jeder Tag danach bis heute – nicht nur der angezeigte Monat.
export function saldoKumuliert(mitarbeiter: Mitarbeiter, bis: IsoDatum, quelle: ZeitQuelle, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten): Minuten {
  const jahr = parseIsoDate(bis).getFullYear();
  const jahresanfang = toIsoDate(new Date(jahr, 0, 1));
  const nachStichtag = addDays(mitarbeiter.zeitUebertragPer, 1);
  const start = nachStichtag > jahresanfang ? nachStichtag : jahresanfang;
  const ende = bis < heute ? bis : heute;
  if (ende < start) return mitarbeiter.zeitUebertragMin;
  const proTag = eintraegeNachTag(quelle.zeiteintraege, mitarbeiter.id);
  return rangeDays(start, ende).reduce((summe, datum) => summe + tagBerechnen(mitarbeiter, datum, proTag, quelle, mandant, heute, jetztMin).saldoMin, mitarbeiter.zeitUebertragMin);
}

/** Tage eines beliebigen Zeitraums (z. B. eine Woche) für eine Person. */
export function berechneTageFuer(mitarbeiter: Mitarbeiter, tage: readonly IsoDatum[], quelle: ZeitQuelle, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten): TagMitPlan[] {
  const proTag = eintraegeNachTag(quelle.zeiteintraege, mitarbeiter.id);
  return tage.map((datum) => tagBerechnen(mitarbeiter, datum, proTag, quelle, mandant, heute, jetztMin));
}

export function berechneMonat(mitarbeiter: Mitarbeiter, monat: MonatsSchluessel, quelle: ZeitQuelle, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten): ZeitkontoMonat {
  const proTag = eintraegeNachTag(quelle.zeiteintraege, mitarbeiter.id);
  const tage = tageImMonat(monat).map((datum) => tagBerechnen(mitarbeiter, datum, proTag, quelle, mandant, heute, jetztMin));
  const bisHeute = tage.filter((tag) => !tag.zukunft);
  const letzterTag = tage[tage.length - 1]?.datum ?? heute;
  const abschluss = abschlussFuer(quelle.monatsabschluesse, mitarbeiter.id, monat);
  return {
    mitarbeiter,
    monat,
    tage,
    periode: periodenSaldo(tage[0]?.datum ?? heute, bisHeute[bisHeute.length - 1]?.datum ?? heute, bisHeute),
    sollGesamtMin: tage.reduce((summe, tag) => summe + Math.round(tagesSollMin(mandant.arbeitszeit, mitarbeiter.pensum) * tag.anteil), 0),
    abschluss,
    gesperrt: abschluss?.status === 'genehmigt',
    saldoKumuliertMin: saldoKumuliert(mitarbeiter, letzterTag, quelle, mandant, heute, jetztMin),
    ruhezeit: ruhezeitVerletzungen(bisHeute),
  };
}

// ── §3 · Stempellage heute ───────────────────────────────────────

export interface StempelLage {
  status: StempelStatus;
  laufender: ZeitEintrag | undefined;
  arbeitMin: Minuten;
  pauseMin: Minuten;
  sollMin: Minuten;
  /** Beginn des laufenden Eintrags. */
  seitMin: Minuten | null;
  kommenMin: Minuten | null;
  /** Letztes Gehen heute – null, solange gearbeitet wird oder noch nicht gestempelt wurde. */
  gehenMin: Minuten | null;
}

export function stempelLage(mitarbeiter: Mitarbeiter, quelle: ZeitQuelle, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten): StempelLage {
  const heutige = quelle.zeiteintraege.filter((eintrag) => eintrag.mitarbeiterId === mitarbeiter.id && eintrag.datum === heute && istAktiv(eintrag));
  const tag = berechneTag({
    datum: heute,
    mitarbeiter,
    eintraege: heutige,
    modell: mandant.arbeitszeit,
    feiertag: feiertagAm(heute, mandant.kanton, mandant.betrieblicheFeiertage),
    absenz: absenzAm(quelle.stammdaten.absenzen, mitarbeiter.id, heute),
    jetztMin,
    zone: mandant.zeitzone,
  });
  const laufender = laufenderEintrag(heutige);
  return { status: stempelStatus(heutige), laufender, arbeitMin: tag.arbeitMin, pauseMin: tag.pauseMin, sollMin: tag.sollMin, seitMin: laufender?.vonMin ?? null, kommenMin: tag.kommenMin, gehenMin: tag.gehenMin };
}

// ── §4 · Export ──────────────────────────────────────────────────

function csvZelle(wert: string | number): string {
  const text = String(wert);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvZeilen(zeilen: readonly (readonly (string | number)[])[]): string {
  return `﻿${zeilen.map((zeile) => zeile.map(csvZelle).join(';')).join('\r\n')}\r\n`;
}

/** Zeitkonto als CSV (Excel-tauglich, Semikolon, BOM). */
export function zeitkontoCsv(konto: ZeitkontoMonat): string {
  const kopf = ['Datum', 'Kommen', 'Gehen', 'Arbeit (min)', 'Pause (min)', 'Soll (min)', 'Saldo (min)', 'Grund', 'Warnungen'];
  const zeilen = konto.tage.filter((tag) => !tag.zukunft).map((tag) => [
    formatDatum(tag.datum),
    tag.kommenMin === null ? '' : formatZeit(tag.kommenMin),
    tag.gehenMin === null ? (tag.laeuft ? 'läuft' : '') : formatZeit(tag.gehenMin),
    tag.arbeitMin,
    tag.pauseMin,
    tag.sollMin,
    tag.saldoMin,
    tag.grund,
    tag.warnungen.join(', '),
  ]);
  const fuss = ['Total', '', '', konto.periode.arbeitMin, konto.periode.pauseMin, konto.periode.sollMin, konto.periode.saldoMin, `Saldo kumuliert ${formatSaldo(konto.saldoKumuliertMin)}`, ''];
  return csvZeilen([kopf, ...zeilen, fuss]);
}

/** Dateiname für Exporte: «zeitkonto-mb-2026-10.csv». */
export function exportName(praefix: string, teile: readonly string[], endung: string): string {
  return `${[praefix, ...teile].map((teil) => teil.toLowerCase().replace(/[^a-z0-9]+/g, '-')).join('-')}.${endung}`;
}

export function monatVonHeute(heute: IsoDatum): MonatsSchluessel {
  return monatVon(heute);
}

export function vorherigerTag(datum: IsoDatum): IsoDatum {
  return addDays(datum, -1);
}

/* ◆ jh · eof */
