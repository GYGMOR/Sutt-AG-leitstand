/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/zeiterfassung/zeiterfassung.model.ts       │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Zeiterfassung: Zeilen je Person, Sichten, Woche, Matrix, Jahr, Tag    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, isoWeek, parseIsoInput, rangeDays, startOfWeek } from '../../core/datum';
import type { IsoDatum, Minuten } from '../../core/datum';
import { ferienkonto } from '../../core/domain/absenz';
import type { Ferienkonto } from '../../core/domain/absenz';
import { feiertageImJahr } from '../../core/domain/feiertage';
import type { Feiertag } from '../../core/domain/feiertage';
import { jahrVon, monatVon, tageImMonat, tagesSollMin } from '../../core/domain/zeit';
import type { AbschlussStatus, MonatsSchluessel, ZeitEintrag } from '../../core/domain/zeit';
import { formatDatum, formatDatumKurz, formatMonatJahr, formatSaldo, formatWochentag, formatZeit } from '../../core/format';
import type { Mandant } from '../../core/mandant/mandant.types';
import { normalizeSuchtext } from '../../core/suche';
import type { MonatsabschlussEntwurf } from '../dispo/store/useDispoAktionen';
import { angestelltImMonat, berechneJahr, berechneMonat, berechneTageFuer, csvZeilen, saldoKumuliert, stempelLage } from '../personal/personal.model';
import type { PersonView, StempelLage, TagMitPlan, ZeitQuelle, ZeitkontoMonat } from '../personal/personal.model';

export { angestelltImMonat };

// ── §1 · Sichten ─────────────────────────────────────────────────

export type ZeitSicht = 'alle' | 'eingestempelt' | 'warnungen' | 'pruefen' | 'eingereicht' | 'ohne-abschluss';

export const ZEIT_SICHTEN: readonly { id: ZeitSicht; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'eingestempelt', label: 'Eingestempelt' },
  { id: 'warnungen', label: 'Warnungen' },
  { id: 'pruefen', label: 'Zu prüfen' },
  { id: 'eingereicht', label: 'Eingereicht' },
  { id: 'ohne-abschluss', label: 'Ohne Abschluss' },
];

export interface ZeitZeile {
  person: PersonView;
  konto: ZeitkontoMonat;
  lage: StempelLage;
  /** Ferienkonto des Jahres, in dem der Monat liegt. */
  ferien: Ferienkonto;
  suchtext: string;
}

function suchtextVon(person: PersonView): string {
  return normalizeSuchtext(`${person.mitarbeiter.vorname} ${person.mitarbeiter.nachname} ${person.mitarbeiter.kuerzel} ${person.mitarbeiter.funktion}`);
}

export function isMonat(wert: string | null | undefined): wert is MonatsSchluessel {
  return typeof wert === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(wert);
}

export function monatLabel(monat: MonatsSchluessel): string {
  return formatMonatJahr(`${monat}-01` as IsoDatum, 'lang');
}

// ── §2 · Zeilen ──────────────────────────────────────────────────

export function buildZeitZeilen(personen: readonly PersonView[], monat: MonatsSchluessel, quelle: ZeitQuelle, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten): ZeitZeile[] {
  return personen.map((person) => ({
    person,
    konto: berechneMonat(person.mitarbeiter, monat, quelle, mandant, heute, jetztMin),
    lage: stempelLage(person.mitarbeiter, quelle, mandant, heute, jetztMin),
    ferien: ferienkonto(person.mitarbeiter, quelle.stammdaten.absenzen, jahrVon(monat), heute, mandant.kanton, mandant.betrieblicheFeiertage),
    suchtext: suchtextVon(person),
  }));
}

function passtZurSicht(zeile: ZeitZeile, sicht: ZeitSicht, heute: IsoDatum): boolean {
  switch (sicht) {
    case 'alle':
      return true;
    case 'eingestempelt':
      return zeile.lage.status !== 'draussen';
    case 'warnungen':
      return zeile.konto.periode.tageMitWarnung > 0 || zeile.konto.ruhezeit.length > 0;
    case 'pruefen':
      return zeile.konto.periode.tageZuPruefen > 0;
    case 'eingereicht':
      return zeile.konto.abschluss?.status === 'eingereicht';
    case 'ohne-abschluss':
      return zeile.konto.monat < monatVon(heute) && zeile.konto.abschluss === undefined && zeile.person.aktiv;
  }
}

export function zaehleZeit(zeilen: readonly ZeitZeile[], heute: IsoDatum): Readonly<Record<ZeitSicht, number>> {
  const zaehler: Record<ZeitSicht, number> = { alle: zeilen.length, eingestempelt: 0, warnungen: 0, pruefen: 0, eingereicht: 0, 'ohne-abschluss': 0 };
  for (const zeile of zeilen) {
    for (const sicht of ZEIT_SICHTEN) {
      if (sicht.id !== 'alle' && passtZurSicht(zeile, sicht.id, heute)) zaehler[sicht.id] += 1;
    }
  }
  return zaehler;
}

export function filterZeit(zeilen: readonly ZeitZeile[], sicht: ZeitSicht, suche: string, heute: IsoDatum): ZeitZeile[] {
  const begriff = normalizeSuchtext(suche);
  return zeilen.filter((zeile) => passtZurSicht(zeile, sicht, heute) && (begriff === '' || zeile.suchtext.includes(begriff)));
}

// ── §3 · Abschluss ───────────────────────────────────────────────

/** Einreichen ist möglich für laufende und vergangene Monate ohne offenen oder genehmigten Abschluss. */
export function kannEinreichen(konto: ZeitkontoMonat, heute: IsoDatum): boolean {
  if (konto.monat > monatVon(heute)) return false;
  return konto.abschluss === undefined || konto.abschluss.status === 'zurueckgewiesen';
}

export function monatsabschlussEntwurf(konto: ZeitkontoMonat, bemerkung?: string): MonatsabschlussEntwurf {
  return {
    mitarbeiterId: konto.mitarbeiter.id,
    monat: konto.monat,
    sollMin: konto.periode.sollMin,
    istMin: konto.periode.arbeitMin,
    saldoMin: konto.periode.saldoMin,
    saldoKumuliertMin: konto.saldoKumuliertMin,
    ...(bemerkung ? { bemerkung } : {}),
  };
}

/** «07:35» → 455; ungültig → null. */
export function minutenAus(wert: string): Minuten | null {
  const treffer = /^(\d{1,2}):(\d{2})$/.exec(wert.trim());
  if (!treffer) return null;
  const stunden = Number(treffer[1]);
  const minuten = Number(treffer[2]);
  if (stunden > 23 || minuten > 59) return null;
  return stunden * 60 + minuten;
}

// ── §4 · Ansichten ───────────────────────────────────────────────

export type ZeitAnsicht = 'liste' | 'tag' | 'woche' | 'monat' | 'jahr';

export const ZEIT_ANSICHTEN: readonly { value: ZeitAnsicht; label: string; title: string }[] = [
  { value: 'liste', label: 'Liste', title: 'Zeitkonten des Monats als Tabelle' },
  { value: 'tag', label: 'Tag', title: 'Wer ist wann da – Zeitstrahl eines Tages' },
  { value: 'woche', label: 'Woche', title: 'Sieben Tage je Person als farbige Chips' },
  { value: 'monat', label: 'Monat', title: 'Personen × Tage mit Tagessaldo' },
  { value: 'jahr', label: 'Jahr', title: 'Personen × Monate mit Monatssaldo' },
];

export function isAnsicht(wert: string | null | undefined): wert is ZeitAnsicht {
  return ZEIT_ANSICHTEN.some((ansicht) => ansicht.value === wert);
}

/** Farbton eines Tages – ein Blick genügt: grün passt, gelb weicht ab oder ist nachgetragen, rot verletzt eine Regel. */
export type TagTon = 'ok' | 'abweichung' | 'warnung' | 'fehlt' | 'laeuft' | 'frei' | 'absenz' | 'zukunft' | 'leer';

export const TAG_TON_LABEL: Readonly<Record<TagTon, string>> = {
  ok: 'Soll erreicht',
  abweichung: 'Abweichung oder manuell erfasst',
  warnung: 'Regel verletzt (ArG)',
  fehlt: 'Arbeitstag ohne Zeiten',
  laeuft: 'Eingestempelt',
  frei: 'Wochenende oder Feiertag',
  absenz: 'Absenz',
  zukunft: 'Noch offen',
  leer: 'Nicht angestellt',
};

/** Mehr als eine halbe Stunde Abweichung vom Tagessoll gilt als Abweichung. */
export const TOLERANZ_MIN = 30;

const ARG_WARNUNGEN = new Set(['pause-fehlt', 'pause-zu-kurz', 'ueber-zehn-stunden', 'zeitfenster', 'sonntag', 'nachtarbeit', 'offen']);

export function tagTon(tag: TagMitPlan, toleranzMin = TOLERANZ_MIN): TagTon {
  if (tag.grund === 'nicht-angestellt') return 'leer';
  const frei = tag.grund === 'wochenende' || tag.grund === 'feiertag';
  if (tag.zukunft) return tag.absenz ? 'absenz' : frei ? 'frei' : 'zukunft';
  if (tag.laeuft) return 'laeuft';
  if (tag.warnungen.some((warnung) => ARG_WARNUNGEN.has(warnung))) return 'warnung';
  if (tag.grund === 'absenz') return tag.arbeitMin > 0 ? 'abweichung' : 'absenz';
  if (frei) return tag.arbeitMin > 0 ? 'abweichung' : 'frei';
  if (tag.warnungen.includes('ohne-stempel')) return 'fehlt';
  if (tag.manuell || Math.abs(tag.saldoMin) > toleranzMin) return 'abweichung';
  return 'ok';
}

/** Kurztext in einer Zelle: Stunden, Kürzel der Absenz oder ein Strich. */
export function tagKurz(tag: TagMitPlan): string {
  if (tag.arbeitMin > 0 || tag.laeuft) return formatStunden(tag.arbeitMin);
  if (tag.absenz) return absenzKuerzel(tag.absenz.art);
  if (tag.feiertag && !tag.feiertag.halb) return 'FT';
  return '–';
}

const ABSENZ_KUERZEL: Readonly<Record<string, string>> = { ferien: 'FE', krank: 'KR', unfall: 'UN', militaer: 'MI', schulung: 'SC', kompensation: 'KO', unbezahlt: 'UB', fahrzeugservice: 'FZ', abwesend: 'AB' };

export function absenzKuerzel(art: string): string {
  return ABSENZ_KUERZEL[art] ?? 'AB';
}

/** 492 → «8:12», 0 → «0:00» – ohne Einheit, für enge Zellen. */
export function formatStunden(minuten: Minuten): string {
  return `${Math.floor(minuten / 60)}:${String(minuten % 60).padStart(2, '0')}`;
}

/** Saldo kompakt: +1:20 / −0:45 / 0 */
export function formatDelta(minuten: Minuten): string {
  if (minuten === 0) return '0';
  const betrag = Math.abs(minuten);
  return `${minuten > 0 ? '+' : '−'}${Math.floor(betrag / 60)}:${String(betrag % 60).padStart(2, '0')}`;
}

// ── §5 · Woche ───────────────────────────────────────────────────

export interface WochenZeile {
  person: PersonView;
  tage: TagMitPlan[];
  /** Bis heute: erfasst, erwartet, Differenz. */
  erfasstMin: Minuten;
  erwartetMin: Minuten;
  saldoMin: Minuten;
  /** Gleitzeit-Saldo per Ende der Woche (bzw. heute). */
  kumuliertMin: Minuten;
  /** Kompensierte Stunden in der Woche (Absenz «Kompensation»). */
  kompensiertMin: Minuten;
  tageMitWarnung: number;
  lage: StempelLage;
  suchtext: string;
}

export function wochenTage(montag: IsoDatum): IsoDatum[] {
  return rangeDays(montag, addDays(montag, 6));
}

export function wochenLabel(montag: IsoDatum): string {
  return `KW ${isoWeek(montag)} · ${formatDatumKurz(montag)}–${formatDatum(addDays(montag, 6))}`;
}

export function isMontag(wert: string | null | undefined): wert is IsoDatum {
  const iso = parseIsoInput(wert);
  return iso !== null && startOfWeek(iso) === iso;
}

function kompensiert(tage: readonly TagMitPlan[], mandant: Mandant, pensum: number): Minuten {
  return tage.reduce((summe, tag) => (tag.absenz?.art === 'kompensation' ? summe + Math.round(tagesSollMin(mandant.arbeitszeit, pensum) * (tag.absenz.halberTag ? 0.5 : 1)) : summe), 0);
}

export function buildWochenZeilen(personen: readonly PersonView[], montag: IsoDatum, quelle: ZeitQuelle, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten): WochenZeile[] {
  const tage = wochenTage(montag);
  const letzter = tage[tage.length - 1] ?? montag;
  return personen.map((person) => {
    const berechnet = berechneTageFuer(person.mitarbeiter, tage, quelle, mandant, heute, jetztMin);
    const bisHeute = berechnet.filter((tag) => !tag.zukunft);
    const erfasstMin = bisHeute.reduce((summe, tag) => summe + tag.arbeitMin, 0);
    const erwartetMin = bisHeute.reduce((summe, tag) => summe + tag.sollMin, 0);
    return {
      person,
      tage: berechnet,
      erfasstMin,
      erwartetMin,
      saldoMin: erfasstMin - erwartetMin,
      kumuliertMin: saldoKumuliert(person.mitarbeiter, letzter, quelle, mandant, heute, jetztMin),
      kompensiertMin: kompensiert(berechnet, mandant, person.mitarbeiter.pensum),
      tageMitWarnung: bisHeute.filter((tag) => tag.warnungen.length > 0).length,
      lage: stempelLage(person.mitarbeiter, quelle, mandant, heute, jetztMin),
      suchtext: suchtextVon(person),
    };
  });
}

export function wochenCsv(zeilen: readonly WochenZeile[], tage: readonly IsoDatum[]): string {
  const kopf = ['Kürzel', 'Name', ...tage.map((datum) => `${formatWochentag(datum, 'kurz')} ${formatDatumKurz(datum)} (min)`), 'Erfasst (min)', 'Erwartet (min)', 'Saldo Woche (min)', 'Saldo total (min)', 'Kompensiert (min)'];
  const koerper = zeilen.map((zeile) => [zeile.person.mitarbeiter.kuerzel, `${zeile.person.mitarbeiter.vorname} ${zeile.person.mitarbeiter.nachname}`, ...zeile.tage.map((tag) => tag.arbeitMin), zeile.erfasstMin, zeile.erwartetMin, zeile.saldoMin, zeile.kumuliertMin, zeile.kompensiertMin]);
  return csvZeilen([kopf, ...koerper]);
}

// ── §6 · Monat (Matrix) ──────────────────────────────────────────

export interface MatrixTag {
  datum: IsoDatum;
  feiertag: Feiertag | undefined;
  wochenende: boolean;
  heute: boolean;
}

/** Spaltenköpfe der Monatsmatrix – Feiertage als eigene Zeile oben. */
export function matrixTage(monat: MonatsSchluessel, mandant: Mandant, heute: IsoDatum): MatrixTag[] {
  const feiertage = feiertageImJahr(jahrVon(monat), mandant.kanton, mandant.betrieblicheFeiertage);
  return tageImMonat(monat).map((datum) => {
    const index = (new Date(`${datum}T12:00`).getDay() + 6) % 7;
    return { datum, feiertag: feiertage.find((feiertag) => feiertag.datum === datum), wochenende: index >= 5, heute: datum === heute };
  });
}

export function matrixCsv(zeilen: readonly ZeitZeile[], tage: readonly MatrixTag[]): string {
  const kopf = ['Kürzel', 'Name', ...tage.map((tag) => formatDatumKurz(tag.datum)), 'Soll (min)', 'Ist (min)', 'Saldo Monat (min)', 'Saldo total (min)', 'Ferien Rest (Tage)'];
  const koerper = zeilen.map((zeile) => [
    zeile.person.mitarbeiter.kuerzel,
    `${zeile.person.mitarbeiter.vorname} ${zeile.person.mitarbeiter.nachname}`,
    ...zeile.konto.tage.map((tag) => (tag.zukunft || tag.grund === 'nicht-angestellt' ? '' : tag.absenz && tag.arbeitMin === 0 ? absenzKuerzel(tag.absenz.art) : tag.saldoMin)),
    zeile.konto.periode.sollMin,
    zeile.konto.periode.arbeitMin,
    zeile.konto.periode.saldoMin,
    zeile.konto.saldoKumuliertMin,
    zeile.ferien.restTage,
  ]);
  return csvZeilen([kopf, ...koerper]);
}

// ── §7 · Jahr ────────────────────────────────────────────────────

export interface JahresMonat {
  monat: MonatsSchluessel;
  sollMin: Minuten;
  istMin: Minuten;
  saldoMin: Minuten;
  abschluss: AbschlussStatus | undefined;
  /** Monat liegt in der Zukunft, vor dem Übertrag oder die Person war nicht angestellt. */
  leer: boolean;
  /** Ganz vor dem Übertrag-Stichtag – steckt im Saldo total, nicht in den Monatszahlen. */
  vorUebertrag: boolean;
}

export interface JahresZeile {
  person: PersonView;
  monate: JahresMonat[];
  sollMin: Minuten;
  istMin: Minuten;
  saldoMin: Minuten;
  kumuliertMin: Minuten;
  /** Stichtag des Übertrags – Monate davor bleiben in der Jahressicht leer. */
  uebertragPer: IsoDatum;
  ferien: Ferienkonto;
  suchtext: string;
}

export function jahresMonate(jahr: number): MonatsSchluessel[] {
  return Array.from({ length: 12 }, (_, index) => `${jahr}-${String(index + 1).padStart(2, '0')}` as MonatsSchluessel);
}

// jh› Vor dem Systembeginn zählt nur der Übertrag (so wie die Lohnbuchhaltung ein Jahr abschliesst) –
//     sonst stünden in alten Monaten lauter Minusstunden, die längst verrechnet sind. Die Rechnung selbst
//     ist berechneJahr aus personal.model – dieselbe wie in «Mein Jahr» der Person und in der App.
export function buildJahresZeilen(personen: readonly PersonView[], jahr: number, quelle: ZeitQuelle, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten): JahresZeile[] {
  return personen.map((person) => {
    const meinJahr = berechneJahr(person.mitarbeiter, jahr, quelle, mandant, heute, jetztMin);
    return {
      person,
      monate: meinJahr.monate.map<JahresMonat>((monat) => ({
        monat: monat.monat,
        sollMin: monat.sollMin,
        istMin: monat.istMin,
        saldoMin: monat.saldoMin,
        abschluss: monat.abschluss,
        leer: monat.zustand !== 'laufend' && monat.zustand !== 'vergangen',
        vorUebertrag: monat.zustand === 'vor-systembeginn',
      })),
      sollMin: meinJahr.sollMin,
      istMin: meinJahr.istMin,
      saldoMin: meinJahr.saldoMin,
      kumuliertMin: meinJahr.kumuliertMin,
      uebertragPer: person.mitarbeiter.zeitUebertragPer,
      ferien: meinJahr.ferien,
      suchtext: suchtextVon(person),
    };
  });
}

export function jahresCsv(zeilen: readonly JahresZeile[], jahr: number): string {
  const kopf = ['Kürzel', 'Name', ...jahresMonate(jahr).map((monat) => `${monat} Saldo (min)`), 'Soll (min)', 'Ist (min)', 'Saldo Jahr (min)', 'Saldo total (min)', 'Ferien Rest (Tage)'];
  const koerper = zeilen.map((zeile) => [zeile.person.mitarbeiter.kuerzel, `${zeile.person.mitarbeiter.vorname} ${zeile.person.mitarbeiter.nachname}`, ...zeile.monate.map((monat) => (monat.leer ? '' : monat.saldoMin)), zeile.sollMin, zeile.istMin, zeile.saldoMin, zeile.kumuliertMin, zeile.ferien.restTage]);
  return csvZeilen([kopf, ...koerper]);
}

// ── §8 · Tag (Zeitstrahl) ────────────────────────────────────────

export interface TagesZeile {
  person: PersonView;
  tag: TagMitPlan;
  /** Aktive Einträge des Tages, nach Beginn sortiert. */
  eintraege: ZeitEintrag[];
  lage: StempelLage;
  suchtext: string;
}

export interface Zeitstrahl {
  vonMin: Minuten;
  bisMin: Minuten;
  /** Volle Stunden als Teilstriche. */
  stunden: Minuten[];
}

export function buildTagesZeilen(personen: readonly PersonView[], datum: IsoDatum, quelle: ZeitQuelle, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten): TagesZeile[] {
  return personen.map((person) => {
    const [tag] = berechneTageFuer(person.mitarbeiter, [datum], quelle, mandant, heute, jetztMin);
    if (!tag) throw new Error('Tag fehlt');
    return {
      person,
      tag,
      eintraege: [...tag.eintraege].sort((a, b) => a.vonMin - b.vonMin),
      lage: stempelLage(person.mitarbeiter, quelle, mandant, heute, jetztMin),
      suchtext: suchtextVon(person),
    };
  });
}

/** Sichtbarer Ausschnitt: mindestens 06–19 Uhr, sonst eine Stunde um die früheste und späteste Zeit. */
export function zeitstrahl(zeilen: readonly TagesZeile[], jetztMin: Minuten | null): Zeitstrahl {
  let von = 6 * 60;
  let bis = 19 * 60;
  for (const zeile of zeilen) {
    for (const eintrag of zeile.eintraege) {
      von = Math.min(von, Math.floor((eintrag.vonMin - 60) / 60) * 60);
      bis = Math.max(bis, Math.ceil(((eintrag.bisMin ?? jetztMin ?? eintrag.vonMin) + 60) / 60) * 60);
    }
  }
  von = Math.max(0, von);
  bis = Math.min(24 * 60, bis);
  const stunden: Minuten[] = [];
  for (let stunde = von; stunde <= bis; stunde += 60) stunden.push(stunde);
  return { vonMin: von, bisMin: bis, stunden };
}

export function tagesTitel(zeile: TagesZeile): string {
  const { tag } = zeile;
  const teile = [`${formatWochentag(tag.datum)}, ${formatDatum(tag.datum)}`];
  if (tag.kommenMin !== null) teile.push(`${formatZeit(tag.kommenMin)}–${tag.laeuft ? 'läuft' : tag.gehenMin === null ? 'offen' : formatZeit(tag.gehenMin)}`);
  if (!tag.zukunft) teile.push(`Ist ${formatStunden(tag.arbeitMin)} · Soll ${formatStunden(tag.sollMin)} · ${formatSaldo(tag.saldoMin)}`);
  return teile.join(' · ');
}

/* ◆ jh · eof */
