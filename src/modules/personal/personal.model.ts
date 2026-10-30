/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/personal/personal.model.ts                 │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Geteilte Sichten: Person, Zeitkonto je Monat, Jahr, Stempellage, CSV  │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Benutzer } from '../../core/auth/auth.types';
import { addDays, rangeDays } from '../../core/datum';
import type { IsoDatum, Minuten } from '../../core/datum';
import { absenzAm, ferienkonto } from '../../core/domain/absenz';
import type { Absenz, Ferienkonto } from '../../core/domain/absenz';
import type { Einsatz } from '../../core/domain/einsatz';
import { feiertagAm } from '../../core/domain/feiertage';
import type { Techniker } from '../../core/domain/stammdaten';
import { VERTRAGSART_LABEL, istAngestellt, unterstellte, vertragEndetIn, vertragVon } from '../../core/domain/personal';
import type { Mitarbeiter, Vertrag } from '../../core/domain/personal';
import { abschlussFuer, berechneTag, einsatzZeiten, istAktiv, laufenderEintrag, monatVon, periodenSaldo, ruhezeitVerletzungen, stempelStatus, tageImMonat, tagesSollMin } from '../../core/domain/zeit';
import type { AbschlussStatus, EinsatzZeiten, Monatsabschluss, MonatsSchluessel, PeriodenSaldo, StempelStatus, TagesSaldo, ZeitEintrag } from '../../core/domain/zeit';
import { formatDatum, formatMonatJahr, formatSaldo, formatZeit } from '../../core/format';
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
  /** Gleitzeit-Saldo per Ende dieses Monats (bzw. heute), inklusive Übertrag. */
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

/** Erster Tag, der in den Saldo zählt – der Tag nach dem Übertrags-Stichtag. */
export function systembeginn(mitarbeiter: Pick<Mitarbeiter, 'zeitUebertragPer'>): IsoDatum {
  return addDays(mitarbeiter.zeitUebertragPer, 1);
}

// jh› Der Saldo ist eine Kette ab dem Systembeginn: Übertrag plus jeder Tag bis zum gefragten Datum – über
//     Jahresgrenzen hinweg, damit «Mein Jahr», Monat und App denselben Wert zeigen. Vor dem Systembeginn
//     gibt es keine Tage, nur den Übertrag.
export function saldoKumuliert(mitarbeiter: Mitarbeiter, bis: IsoDatum, quelle: ZeitQuelle, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten): Minuten {
  const start = systembeginn(mitarbeiter);
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

// ── §3 · Jahr ────────────────────────────────────────────────────

export function monateImJahr(jahr: number): MonatsSchluessel[] {
  return Array.from({ length: 12 }, (_, index) => `${jahr}-${String(index + 1).padStart(2, '0')}` as MonatsSchluessel);
}

/** Im Monat (zumindest teilweise) angestellt – Ausgetretene verschwinden aus späteren Monaten. */
export function angestelltImMonat(mitarbeiter: Pick<Mitarbeiter, 'eintritt' | 'austritt'>, monat: MonatsSchluessel): boolean {
  const tage = tageImMonat(monat);
  const erster = tage[0];
  const letzter = tage[tage.length - 1];
  if (!erster || !letzter) return false;
  return mitarbeiter.eintritt <= letzter && (mitarbeiter.austritt === undefined || mitarbeiter.austritt >= erster);
}

/**
 * vor-systembeginn: ganz vor dem Übertrag (steckt im Startwert) · nicht-angestellt: vor Eintritt oder nach
 * Vertragsende · zukunft: noch nicht begonnen · laufend: der aktuelle Monat · vergangen: abgeschlossen oder offen.
 */
export type JahrMonatZustand = 'vor-systembeginn' | 'nicht-angestellt' | 'zukunft' | 'laufend' | 'vergangen';

export const JAHR_ZUSTAND_LABEL: Readonly<Record<JahrMonatZustand, string>> = {
  'vor-systembeginn': 'vor Systembeginn',
  'nicht-angestellt': 'nicht angestellt',
  zukunft: 'noch offen',
  laufend: 'läuft',
  vergangen: 'offen',
};

export interface JahrMonat {
  monat: MonatsSchluessel;
  zustand: JahrMonatZustand;
  sollMin: Minuten;
  istMin: Minuten;
  saldoMin: Minuten;
  abschluss: AbschlussStatus | undefined;
  tageMitWarnung: number;
}

export interface MeinJahr {
  mitarbeiter: Mitarbeiter;
  jahr: number;
  monate: JahrMonat[];
  sollMin: Minuten;
  istMin: Minuten;
  saldoMin: Minuten;
  /** Gleitzeit per Jahresende bzw. heute – die Kette ab Systembeginn. */
  kumuliertMin: Minuten;
  systembeginn: IsoDatum;
  vertrag: Vertrag;
  ferien: Ferienkonto;
}

// jh› Ein Jahr der Person, Monat für Monat – dieselbe Rechnung wie das Monatskonto, nur zusammengefasst.
//     Monate vor dem Systembeginn bleiben leer: Ihre Minuten stecken im Übertrag, nicht in der Saat.
export function berechneJahr(mitarbeiter: Mitarbeiter, jahr: number, quelle: ZeitQuelle, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten): MeinJahr {
  const aktuell = monatVon(heute);
  const stichtag = mitarbeiter.zeitUebertragPer;
  const monate = monateImJahr(jahr).map<JahrMonat>((monat) => {
    const tage = tageImMonat(monat);
    const letzter = tage[tage.length - 1] ?? (`${monat}-28` as IsoDatum);
    const abschluss = abschlussFuer(quelle.monatsabschluesse, mitarbeiter.id, monat)?.status;
    const leer = (zustand: JahrMonatZustand): JahrMonat => ({ monat, zustand, sollMin: 0, istMin: 0, saldoMin: 0, abschluss, tageMitWarnung: 0 });
    if (!angestelltImMonat(mitarbeiter, monat)) return leer('nicht-angestellt');
    if (letzter <= stichtag) return leer('vor-systembeginn');
    if (monat > aktuell) return leer('zukunft');
    const konto = berechneMonat(mitarbeiter, monat, quelle, mandant, heute, jetztMin);
    const relevante = konto.tage.filter((tag) => !tag.zukunft && tag.datum > stichtag);
    const sollMin = relevante.reduce((summe, tag) => summe + tag.sollMin, 0);
    const istMin = relevante.reduce((summe, tag) => summe + tag.arbeitMin, 0);
    return { monat, zustand: monat === aktuell ? 'laufend' : 'vergangen', sollMin, istMin, saldoMin: istMin - sollMin, abschluss, tageMitWarnung: relevante.filter((tag) => tag.warnungen.length > 0).length };
  });
  const sollMin = monate.reduce((summe, monat) => summe + monat.sollMin, 0);
  const istMin = monate.reduce((summe, monat) => summe + monat.istMin, 0);
  const bis = jahr < Number(heute.slice(0, 4)) ? (`${jahr}-12-31` as IsoDatum) : heute;
  return {
    mitarbeiter,
    jahr,
    monate,
    sollMin,
    istMin,
    saldoMin: istMin - sollMin,
    kumuliertMin: saldoKumuliert(mitarbeiter, bis, quelle, mandant, heute, jetztMin),
    systembeginn: systembeginn(mitarbeiter),
    vertrag: vertragVon(mitarbeiter),
    ferien: ferienkonto(mitarbeiter, quelle.stammdaten.absenzen, jahr, heute, mandant.kanton, mandant.betrieblicheFeiertage),
  };
}

export function monatLabelKurz(monat: MonatsSchluessel): string {
  return formatMonatJahr(`${monat}-01` as IsoDatum, 'kurz');
}

// ── §4 · Vertrag und Stand heute ─────────────────────────────────

/** «Unbefristet seit 01.03.2019», «Befristet 01.08.2025 – 31.07.2029», «Auf Widerruf seit … · widerrufen per …». */
export function vertragLabel(mitarbeiter: Pick<Mitarbeiter, 'vertragsart' | 'eintritt' | 'austritt'>): string {
  const art = VERTRAGSART_LABEL[mitarbeiter.vertragsart];
  const beginn = formatDatum(mitarbeiter.eintritt);
  if (mitarbeiter.austritt === undefined) return `${art} seit ${beginn}`;
  const ende = formatDatum(mitarbeiter.austritt);
  if (mitarbeiter.vertragsart === 'befristet' || mitarbeiter.vertragsart === 'temporaer') return `${art} ${beginn} – ${ende}`;
  return `${art} seit ${beginn} · ${mitarbeiter.vertragsart === 'auf-widerruf' ? 'widerrufen' : 'beendet'} per ${ende}`;
}

export interface StandHeute {
  gleitzeitMin: Minuten;
  ferienRestTage: number;
  vertrag: Vertrag;
  vertragText: string;
  /** Tage bis zum Vertragsende, wenn es im Vorlauf liegt. */
  endetInTagen: number | null;
}

export function standHeute(mitarbeiter: Mitarbeiter, quelle: ZeitQuelle, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten): StandHeute {
  const jahr = Number(heute.slice(0, 4));
  return {
    gleitzeitMin: saldoKumuliert(mitarbeiter, heute, quelle, mandant, heute, jetztMin),
    ferienRestTage: ferienkonto(mitarbeiter, quelle.stammdaten.absenzen, jahr, heute, mandant.kanton, mandant.betrieblicheFeiertage).restTage,
    vertrag: vertragVon(mitarbeiter),
    vertragText: vertragLabel(mitarbeiter),
    endetInTagen: vertragEndetIn(mitarbeiter, heute),
  };
}

// ── §5 · Stempellage heute ───────────────────────────────────────

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

// ── §6 · Export ──────────────────────────────────────────────────

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

/** Ein Jahr der Person als CSV – Monatszeilen, Total und Gleitzeit. */
export function jahresCsvFuer(jahr: MeinJahr): string {
  const kopf = ['Monat', 'Zustand', 'Soll (min)', 'Ist (min)', 'Saldo (min)', 'Tage mit Warnung', 'Abschluss'];
  const zeilen = jahr.monate.map((monat) => [monatLabelKurz(monat.monat), JAHR_ZUSTAND_LABEL[monat.zustand], monat.sollMin, monat.istMin, monat.saldoMin, monat.tageMitWarnung, monat.abschluss ?? '']);
  const fuss = [`Total ${jahr.jahr}`, vertragLabel(jahr.mitarbeiter), jahr.sollMin, jahr.istMin, jahr.saldoMin, '', `Gleitzeit kumuliert ${formatSaldo(jahr.kumuliertMin)} · Ferien Rest ${jahr.ferien.restTage} Tage`];
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
