/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/zeit.ts                                │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Zeiterfassung: Stempel, Einträge, Tagessaldo, ArG-Regeln, Abschluss   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, isSunday, isWeekend, parseIsoDate, rangeDays, splitZeitpunkt, toIsoDate } from '../datum';
import type { IsoDatum, IsoZeitpunkt, Minuten } from '../datum';
import { dauerZwischen, umstellungAm } from '../zeitzone';
import type { Umstellung } from '../zeitzone';
import { zeitpunktVon } from './einsatz';
import type { Einsatz } from './einsatz';
import type { Absenz } from './absenz';
import type { Feiertag } from './feiertage';
import { istAngestellt } from './personal';
import type { Mitarbeiter } from './personal';

// ── §1 · Einträge ────────────────────────────────────────────────

export type ZeitArt = 'arbeit' | 'pause';

export type ZeitQuelle = 'stempel' | 'manuell' | 'einsatz';

export type ZeitGeraet = 'app' | 'leitstand';

export const ZEIT_QUELLE_LABEL: Readonly<Record<ZeitQuelle, string>> = {
  stempel: 'Gestempelt',
  manuell: 'Manuell erfasst',
  einsatz: 'Aus dem Einsatzplan',
};

/** Jede Korrektur bleibt nachvollziehbar: wer, wann, warum, was vorher galt (ArGV 1 Art. 73). */
export interface ZeitKorrektur {
  am: IsoZeitpunkt;
  von: string;
  grund: string;
  vorher: { art: ZeitArt; vonMin: Minuten; bisMin: Minuten | null };
}

export interface ZeitEintrag {
  id: string;
  mitarbeiterId: string;
  datum: IsoDatum;
  art: ZeitArt;
  vonMin: Minuten;
  /** null = läuft noch (eingestempelt). */
  bisMin: Minuten | null;
  quelle: ZeitQuelle;
  geraet?: ZeitGeraet;
  einsatzId?: string;
  bemerkung?: string;
  erfasstAm: IsoZeitpunkt;
  erfasstVon: string;
  korrekturen: readonly ZeitKorrektur[];
  /** Gelöscht statt entfernt – der Eintrag bleibt im Protokoll sichtbar. */
  geloescht?: ZeitKorrektur;
}

export function istAktiv(eintrag: Pick<ZeitEintrag, 'geloescht'>): boolean {
  return eintrag.geloescht === undefined;
}

// jh› Mit Zone gerechnet ist die Dauer am Umstellungstag echt: 01:00–04:00 sind im März 120, im Oktober 240 Minuten.
export function dauerMin(eintrag: Pick<ZeitEintrag, 'vonMin' | 'bisMin' | 'datum'>, jetztMin: Minuten | null, zone?: string): Minuten {
  const bis = eintrag.bisMin ?? jetztMin;
  if (bis === null) return 0;
  if (zone) return dauerZwischen(zone, eintrag.datum, eintrag.vonMin, bis);
  return Math.max(0, bis - eintrag.vonMin);
}

export function ueberlappt(eintraege: readonly ZeitEintrag[], neu: Pick<ZeitEintrag, 'datum' | 'vonMin' | 'bisMin' | 'mitarbeiterId'>, ausserId?: string): ZeitEintrag | undefined {
  const neuBis = neu.bisMin ?? 24 * 60;
  return eintraege.find((eintrag) => {
    if (eintrag.id === ausserId || !istAktiv(eintrag) || eintrag.mitarbeiterId !== neu.mitarbeiterId || eintrag.datum !== neu.datum) return false;
    const bis = eintrag.bisMin ?? 24 * 60;
    return eintrag.vonMin < neuBis && neu.vonMin < bis;
  });
}

// ── §2 · Stempeln ────────────────────────────────────────────────

export type StempelArt = 'kommen' | 'gehen' | 'pause-start' | 'pause-ende';

export type StempelStatus = 'draussen' | 'arbeitet' | 'pause';

export const STEMPEL_LABEL: Readonly<Record<StempelArt, string>> = {
  kommen: 'Kommen',
  gehen: 'Gehen',
  'pause-start': 'Pause',
  'pause-ende': 'Weiter',
};

export const STEMPEL_STATUS_LABEL: Readonly<Record<StempelStatus, string>> = {
  draussen: 'Nicht eingestempelt',
  arbeitet: 'Eingestempelt',
  pause: 'In der Pause',
};

export function laufenderEintrag(eintraege: readonly ZeitEintrag[]): ZeitEintrag | undefined {
  return [...eintraege].filter((eintrag) => istAktiv(eintrag) && eintrag.bisMin === null).sort((a, b) => b.vonMin - a.vonMin)[0];
}

export function stempelStatus(eintraegeHeute: readonly ZeitEintrag[]): StempelStatus {
  const laufend = laufenderEintrag(eintraegeHeute);
  if (!laufend) return 'draussen';
  return laufend.art === 'pause' ? 'pause' : 'arbeitet';
}

/** Welche Stempel im aktuellen Zustand sinnvoll sind – der erste ist der Hauptknopf. */
export function moeglicheStempel(status: StempelStatus): readonly StempelArt[] {
  if (status === 'draussen') return ['kommen'];
  if (status === 'arbeitet') return ['pause-start', 'gehen'];
  return ['pause-ende', 'gehen'];
}

export interface StempelKontext {
  mitarbeiterId: string;
  datum: IsoDatum;
  jetztMin: Minuten;
  erfasstAm: IsoZeitpunkt;
  erfasstVon: string;
  geraet: ZeitGeraet;
  neueId: () => string;
}

export type StempelErgebnis = { ok: true; eintraege: ZeitEintrag[] } | { ok: false; fehler: string };

// jh› Der Stempel ist eine reine Funktion über die Einträge des Tages: Kommen öffnet Arbeit, Pause schliesst
//     Arbeit und öffnet Pause, Weiter umgekehrt, Gehen schliesst, was offen ist. Kein zweiter Zustand nötig.
export function stempeln(eintraegeHeute: readonly ZeitEintrag[], art: StempelArt, kontext: StempelKontext): StempelErgebnis {
  const status = stempelStatus(eintraegeHeute);
  if (!moeglicheStempel(status).includes(art)) return { ok: false, fehler: `«${STEMPEL_LABEL[art]}» ist im Zustand «${STEMPEL_STATUS_LABEL[status]}» nicht möglich.` };
  const laufend = laufenderEintrag(eintraegeHeute);
  if (laufend && kontext.jetztMin <= laufend.vonMin) return { ok: false, fehler: 'Der laufende Eintrag hat in derselben Minute begonnen – bitte eine Minute warten.' };

  const neu = (zeitArt: ZeitArt): ZeitEintrag => ({
    id: kontext.neueId(),
    mitarbeiterId: kontext.mitarbeiterId,
    datum: kontext.datum,
    art: zeitArt,
    vonMin: kontext.jetztMin,
    bisMin: null,
    quelle: 'stempel',
    geraet: kontext.geraet,
    erfasstAm: kontext.erfasstAm,
    erfasstVon: kontext.erfasstVon,
    korrekturen: [],
  });
  const geschlossen = eintraegeHeute.map((eintrag) => (laufend && eintrag.id === laufend.id ? { ...eintrag, bisMin: kontext.jetztMin } : eintrag));

  switch (art) {
    case 'kommen':
      return { ok: true, eintraege: [...eintraegeHeute, neu('arbeit')] };
    case 'pause-start':
      return { ok: true, eintraege: [...geschlossen, neu('pause')] };
    case 'pause-ende':
      return { ok: true, eintraege: [...geschlossen, neu('arbeit')] };
    case 'gehen':
      return { ok: true, eintraege: geschlossen };
  }
}

// ── §3 · Arbeitszeitmodell & Soll ────────────────────────────────

export interface Arbeitszeitmodell {
  /** Wochenarbeitszeit bei 100 % in Stunden, z. B. 42. */
  wochenStunden: number;
  /** Arbeitstage pro Woche, in der Regel 5. */
  tageProWoche: number;
  gleitzeit: boolean;
  /** Kernzeit, in der Anwesenheit erwartet wird (nur bei Gleitzeit). */
  kernzeit?: { vonMin: Minuten; bisMin: Minuten };
  /** Höchstarbeitszeit pro Woche nach ArG Art. 9 (45 oder 50 Stunden). */
  hoechstWochenStunden: 45 | 50;
}

export const ARBEITSZEIT_STANDARD: Arbeitszeitmodell = {
  wochenStunden: 42,
  tageProWoche: 5,
  gleitzeit: true,
  kernzeit: { vonMin: 9 * 60, bisMin: 16 * 60 },
  hoechstWochenStunden: 45,
};

export function tagesSollMin(modell: Arbeitszeitmodell, pensum: number): Minuten {
  return Math.round(((modell.wochenStunden * 60) / modell.tageProWoche) * (pensum / 100));
}

export type TagGrund = 'arbeitstag' | 'wochenende' | 'feiertag' | 'absenz' | 'nicht-angestellt';

export interface TagesRahmen {
  datum: IsoDatum;
  grund: TagGrund;
  /** Anteil des Solls, 0–1 (halber Feiertag, halbe Absenz = 0.5). */
  anteil: number;
  feiertag?: Feiertag;
  absenz?: Absenz;
}

// jh› Soll am Tag: nur an Arbeitstagen; eine bezahlte Absenz erfüllt ihr Soll (Saldo unverändert),
//     eine unbezahlte setzt es auf null – so wie es die Lohnbuchhaltung auch rechnet.
export function tagesRahmen(datum: IsoDatum, mitarbeiter: Mitarbeiter, feiertag: Feiertag | undefined, absenz: Absenz | undefined): TagesRahmen {
  if (!istAngestellt(mitarbeiter, datum)) return { datum, grund: 'nicht-angestellt', anteil: 0 };
  if (isWeekend(datum)) return { datum, grund: 'wochenende', anteil: 0 };
  if (feiertag && !feiertag.halb) return { datum, grund: 'feiertag', anteil: 0, feiertag };
  const feiertagAnteil = feiertag?.halb ? 0.5 : 1;
  if (absenz) {
    const absenzAnteil = absenz.halberTag && absenz.von === absenz.bis ? 0.5 : 1;
    const rest = Math.max(0, feiertagAnteil - absenzAnteil);
    return { datum, grund: rest > 0 ? 'arbeitstag' : 'absenz', anteil: rest, absenz, ...(feiertag ? { feiertag } : {}) };
  }
  return { datum, grund: 'arbeitstag', anteil: feiertagAnteil, ...(feiertag ? { feiertag } : {}) };
}

// ── §4 · Tagessaldo & Regeln (ArG) ───────────────────────────────

export type ZeitWarnung = 'pause-fehlt' | 'pause-zu-kurz' | 'ueber-zehn-stunden' | 'zeitfenster' | 'sonntag' | 'nachtarbeit' | 'offen' | 'ohne-stempel';

export const ZEIT_WARNUNG_LABEL: Readonly<Record<ZeitWarnung, string>> = {
  'pause-fehlt': 'Pause fehlt (ArG 15)',
  'pause-zu-kurz': 'Pause zu kurz (ArG 15)',
  'ueber-zehn-stunden': 'Über 10 Stunden',
  zeitfenster: 'Mehr als 14 Stunden Spanne (ArG 10)',
  sonntag: 'Sonntagsarbeit (ArG 18)',
  nachtarbeit: 'Nachtarbeit 23–06 Uhr (ArG 16)',
  offen: 'Nicht ausgestempelt',
  'ohne-stempel': 'Arbeitstag ohne Zeiten',
};

/** Pflichtpause nach ArG Art. 15 für die Arbeitszeit eines Tages. */
export function pausenPflichtMin(arbeitMin: Minuten): Minuten {
  if (arbeitMin > 9 * 60) return 60;
  if (arbeitMin > 7 * 60) return 30;
  if (arbeitMin > 5.5 * 60) return 15;
  return 0;
}

export interface TagesSaldo extends TagesRahmen {
  mitarbeiterId: string;
  eintraege: readonly ZeitEintrag[];
  arbeitMin: Minuten;
  pauseMin: Minuten;
  sollMin: Minuten;
  saldoMin: Minuten;
  kommenMin: Minuten | null;
  gehenMin: Minuten | null;
  laeuft: boolean;
  /** Manuell erfasst oder korrigiert – für die Prüfung durch Vorgesetzte. */
  manuell: boolean;
  warnungen: readonly ZeitWarnung[];
  /** Zeitumstellung an diesem Tag (23 oder 25 Stunden). */
  umstellung?: Umstellung;
}

export interface TagesBerechnung {
  datum: IsoDatum;
  mitarbeiter: Mitarbeiter;
  eintraege: readonly ZeitEintrag[];
  modell: Arbeitszeitmodell;
  feiertag: Feiertag | undefined;
  absenz: Absenz | undefined;
  /** Laufende Minute, wenn der Tag heute ist – sonst null (vergangene Tage sind abgeschlossen). */
  jetztMin: Minuten | null;
  /** IANA-Zone des Mandanten; ohne Zone gilt die Wanduhr (kein Umstellungstag). */
  zone?: string;
}

export function berechneTag(args: TagesBerechnung): TagesSaldo {
  const rahmen = tagesRahmen(args.datum, args.mitarbeiter, args.feiertag, args.absenz);
  const eintraege = [...args.eintraege].filter((eintrag) => istAktiv(eintrag) && eintrag.datum === args.datum && eintrag.mitarbeiterId === args.mitarbeiter.id).sort((a, b) => a.vonMin - b.vonMin);
  const istHeute = args.jetztMin !== null;
  const umstellung = args.zone ? umstellungAm(args.zone, args.datum) : undefined;
  let arbeitMin = 0;
  let pauseMin = 0;
  for (const eintrag of eintraege) {
    const dauer = dauerMin(eintrag, istHeute ? args.jetztMin : null, umstellung ? args.zone : undefined);
    if (eintrag.art === 'arbeit') arbeitMin += dauer;
    else pauseMin += dauer;
  }
  // jh› Das Soll kennt nur Arbeitstage: Feiertag, bezahlte wie unbezahlte Absenz senken es – der Saldo
  //     bleibt davon unberührt, genau wie in der Lohnbuchhaltung. ABSENZ_INFO.bezahlt steuert nur den Lohn.
  const sollMin = Math.round(tagesSollMin(args.modell, args.mitarbeiter.pensum) * rahmen.anteil);
  const erster = eintraege[0];
  const letzter = eintraege[eintraege.length - 1];
  const laeuft = istHeute && eintraege.some((eintrag) => eintrag.bisMin === null);

  const warnungen: ZeitWarnung[] = [];
  const pflicht = pausenPflichtMin(arbeitMin);
  if (pflicht > 0 && pauseMin === 0 && !laeuft) warnungen.push('pause-fehlt');
  else if (pflicht > 0 && pauseMin > 0 && pauseMin < pflicht && !laeuft) warnungen.push('pause-zu-kurz');
  if (arbeitMin > 10 * 60) warnungen.push('ueber-zehn-stunden');
  if (erster && letzter) {
    const gehen = letzter.bisMin ?? (istHeute ? args.jetztMin : null);
    if (gehen !== null && gehen - erster.vonMin > 14 * 60) warnungen.push('zeitfenster');
    const nachts = eintraege.some((eintrag) => eintrag.art === 'arbeit' && (eintrag.vonMin < 6 * 60 || (eintrag.bisMin ?? eintrag.vonMin) > 23 * 60));
    if (nachts) warnungen.push('nachtarbeit');
  }
  if (eintraege.length > 0 && isSunday(args.datum)) warnungen.push('sonntag');
  if (!istHeute && eintraege.some((eintrag) => eintrag.bisMin === null)) warnungen.push('offen');
  if (!istHeute && rahmen.grund === 'arbeitstag' && eintraege.length === 0) warnungen.push('ohne-stempel');

  return {
    ...rahmen,
    mitarbeiterId: args.mitarbeiter.id,
    eintraege,
    arbeitMin,
    pauseMin,
    sollMin,
    saldoMin: arbeitMin - sollMin,
    kommenMin: erster?.vonMin ?? null,
    gehenMin: letzter ? letzter.bisMin : null,
    laeuft,
    manuell: eintraege.some((eintrag) => eintrag.quelle === 'manuell' || eintrag.korrekturen.length > 0),
    warnungen,
    ...(umstellung ? { umstellung } : {}),
  };
}

export interface PeriodenSaldo {
  von: IsoDatum;
  bis: IsoDatum;
  tage: readonly TagesSaldo[];
  arbeitMin: Minuten;
  pauseMin: Minuten;
  sollMin: Minuten;
  saldoMin: Minuten;
  arbeitstage: number;
  tageMitWarnung: number;
  tageZuPruefen: number;
  warnungen: readonly { datum: IsoDatum; warnung: ZeitWarnung }[];
}

export function periodenSaldo(von: IsoDatum, bis: IsoDatum, tage: readonly TagesSaldo[]): PeriodenSaldo {
  const warnungen = tage.flatMap((tag) => tag.warnungen.map((warnung) => ({ datum: tag.datum, warnung })));
  return {
    von,
    bis,
    tage,
    arbeitMin: tage.reduce((summe, tag) => summe + tag.arbeitMin, 0),
    pauseMin: tage.reduce((summe, tag) => summe + tag.pauseMin, 0),
    sollMin: tage.reduce((summe, tag) => summe + tag.sollMin, 0),
    saldoMin: tage.reduce((summe, tag) => summe + tag.saldoMin, 0),
    arbeitstage: tage.reduce((summe, tag) => summe + tag.anteil, 0),
    tageMitWarnung: tage.filter((tag) => tag.warnungen.length > 0).length,
    tageZuPruefen: tage.filter((tag) => tag.manuell).length,
    warnungen,
  };
}

/** Ruhezeit unter elf Stunden zwischen Gehen und nächstem Kommen (ArG Art. 15a). */
export function ruhezeitVerletzungen(tage: readonly TagesSaldo[]): { datum: IsoDatum; ruheMin: Minuten }[] {
  const sortiert = [...tage].sort((a, b) => a.datum.localeCompare(b.datum));
  const treffer: { datum: IsoDatum; ruheMin: Minuten }[] = [];
  for (let index = 1; index < sortiert.length; index += 1) {
    const vortag = sortiert[index - 1];
    const tag = sortiert[index];
    if (!vortag || !tag || vortag.gehenMin === null || tag.kommenMin === null) continue;
    if (addDays(vortag.datum, 1) !== tag.datum) continue;
    const ruheMin = 24 * 60 - vortag.gehenMin + tag.kommenMin;
    if (ruheMin < 11 * 60) treffer.push({ datum: tag.datum, ruheMin });
  }
  return treffer;
}

// ── §5 · Monate ──────────────────────────────────────────────────

/** «2026-10» */
export type MonatsSchluessel = `${number}-${number}`;

export function monatVon(datum: IsoDatum): MonatsSchluessel {
  return datum.slice(0, 7) as MonatsSchluessel;
}

export function tageImMonat(monat: MonatsSchluessel): IsoDatum[] {
  const [jahr, monatIndex] = monat.split('-').map(Number);
  const erster = toIsoDate(new Date(jahr ?? 2026, (monatIndex ?? 1) - 1, 1));
  const letzter = toIsoDate(new Date(jahr ?? 2026, monatIndex ?? 1, 0));
  return rangeDays(erster, letzter);
}

export function monatVerschieben(monat: MonatsSchluessel, schritte: number): MonatsSchluessel {
  const [jahr, monatIndex] = monat.split('-').map(Number);
  return monatVon(toIsoDate(new Date(jahr ?? 2026, (monatIndex ?? 1) - 1 + schritte, 1)));
}

export function jahrVon(monat: MonatsSchluessel): number {
  return Number(monat.slice(0, 4));
}

export type AbschlussStatus = 'eingereicht' | 'genehmigt' | 'zurueckgewiesen';

export const ABSCHLUSS_STATUS_LABEL: Readonly<Record<AbschlussStatus, string>> = {
  eingereicht: 'Eingereicht',
  genehmigt: 'Genehmigt',
  zurueckgewiesen: 'Zurückgewiesen',
};

/** Monatsabschluss: friert Soll, Ist und Saldo ein; genehmigt = Einträge gesperrt. */
export interface Monatsabschluss {
  id: string;
  mitarbeiterId: string;
  monat: MonatsSchluessel;
  status: AbschlussStatus;
  sollMin: Minuten;
  istMin: Minuten;
  saldoMin: Minuten;
  /** Gleitzeit-Saldo per Monatsende, inklusive Übertrag. */
  saldoKumuliertMin: Minuten;
  eingereichtAm: IsoZeitpunkt;
  eingereichtVon: string;
  entschiedenAm?: IsoZeitpunkt;
  entschiedenVon?: string;
  bemerkung?: string;
}

export function abschlussFuer(abschluesse: readonly Monatsabschluss[], mitarbeiterId: string, monat: MonatsSchluessel): Monatsabschluss | undefined {
  return abschluesse.find((abschluss) => abschluss.mitarbeiterId === mitarbeiterId && abschluss.monat === monat);
}

export function istMonatGesperrt(abschluesse: readonly Monatsabschluss[], mitarbeiterId: string, datum: IsoDatum): boolean {
  return abschlussFuer(abschluesse, mitarbeiterId, monatVon(datum))?.status === 'genehmigt';
}

// ── §6 · Zeiten aus dem Einsatzplan ──────────────────────────────

export interface EinsatzZeiten {
  fahrtMin: Minuten;
  arbeitMin: Minuten;
  /** Erste Abfahrt und letztes «Fertig» des Tages – mit echten Zeitstempeln, sonst aus dem Plan. */
  ersteAbfahrtMin: Minuten | null;
  letztesEndeMin: Minuten | null;
  einsaetze: number;
}

const ANFAHRT_ANNAHME_MIN = 30;

function minuteVon(zeitpunkt: IsoZeitpunkt | undefined): Minuten | null {
  return zeitpunkt ? splitZeitpunkt(zeitpunkt).minuten : null;
}

// jh› Kundenwunsch «Arbeits- und Fahrzeiten aus dem Einsatzplan»: Abfahrt→Ankunft ist Fahrt,
//     Ankunft→Fertig ist Arbeit. Fehlt der Verlauf (alte Einsätze), gilt der Plan mit 30 min Anfahrt.
export function einsatzZeiten(einsaetze: readonly Einsatz[]): EinsatzZeiten {
  let fahrtMin = 0;
  let arbeitMin = 0;
  let ersteAbfahrt: Minuten | null = null;
  let letztesEnde: Minuten | null = null;
  const relevante = einsaetze.filter((einsatz) => einsatz.status !== 'geplant');
  for (const einsatz of relevante) {
    const abfahrt = minuteVon(zeitpunktVon(einsatz, 'unterwegs')) ?? einsatz.startMin - ANFAHRT_ANNAHME_MIN;
    const ankunft = minuteVon(zeitpunktVon(einsatz, 'vor-ort')) ?? einsatz.startMin;
    const ende = minuteVon(zeitpunktVon(einsatz, 'erledigt') ?? zeitpunktVon(einsatz, 'wartet-teil')) ?? (einsatz.status === 'erledigt' || einsatz.status === 'wartet-teil' ? einsatz.startMin + einsatz.dauerMin : null);
    fahrtMin += Math.max(0, ankunft - abfahrt);
    if (ende !== null) arbeitMin += Math.max(0, ende - ankunft);
    ersteAbfahrt = ersteAbfahrt === null ? abfahrt : Math.min(ersteAbfahrt, abfahrt);
    if (ende !== null) letztesEnde = letztesEnde === null ? ende : Math.max(letztesEnde, ende);
  }
  return { fahrtMin, arbeitMin, ersteAbfahrtMin: ersteAbfahrt, letztesEndeMin: letztesEnde, einsaetze: relevante.length };
}

/** Vorschlag für einen Tag ohne Stempel: Arbeit ab erster Abfahrt bis letztem Ende, Pause um die Mitte. */
export function eintraegeAusEinsatzplan(zeiten: EinsatzZeiten, kontext: Omit<StempelKontext, 'jetztMin' | 'geraet'>): ZeitEintrag[] {
  if (zeiten.ersteAbfahrtMin === null || zeiten.letztesEndeMin === null) return [];
  const von = Math.max(0, zeiten.ersteAbfahrtMin - 10);
  const bis = Math.min(24 * 60 - 1, zeiten.letztesEndeMin + 15);
  const basis = { mitarbeiterId: kontext.mitarbeiterId, datum: kontext.datum, quelle: 'einsatz' as const, erfasstAm: kontext.erfasstAm, erfasstVon: kontext.erfasstVon, korrekturen: [] as ZeitKorrektur[] };
  if (bis - von <= 5.5 * 60) return [{ ...basis, id: kontext.neueId(), art: 'arbeit', vonMin: von, bisMin: bis }];
  const mitte = Math.round((von + bis) / 2 / 5) * 5;
  const pause = pausenPflichtMin(bis - von);
  return [
    { ...basis, id: kontext.neueId(), art: 'arbeit', vonMin: von, bisMin: mitte },
    { ...basis, id: kontext.neueId(), art: 'pause', vonMin: mitte, bisMin: mitte + pause },
    { ...basis, id: kontext.neueId(), art: 'arbeit', vonMin: mitte + pause, bisMin: bis },
  ];
}

// ── §7 · Format ──────────────────────────────────────────────────

/** Jahr eines Datums als Zahl. */
export function jahrVonDatum(datum: IsoDatum): number {
  return parseIsoDate(datum).getFullYear();
}

/* ◆ jh · eof */
