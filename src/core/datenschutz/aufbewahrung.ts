/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/datenschutz/aufbewahrung.ts                   │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Datenkategorien: Zweck, Rechtsgrundlage, Aufbewahrung, Löschregel     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, parseIsoDate, toIsoDate } from '../datum';
import type { IsoDatum } from '../datum';

// ── §1 · Typen ───────────────────────────────────────────────────

export type DatenKategorieId =
  | 'zeiterfassung'
  | 'monatsabschluss'
  | 'absenzen'
  | 'personalstamm'
  | 'benutzerkonten'
  | 'journal'
  | 'kunden'
  | 'auftraege'
  | 'rapporte'
  | 'fotos'
  | 'einsatzverlauf'
  | 'nachrichten';

export type Fristbeginn = 'erfassung' | 'jahresende' | 'austritt' | 'abschluss';

export const FRISTBEGINN_LABEL: Readonly<Record<Fristbeginn, string>> = {
  erfassung: 'ab Erfassung',
  jahresende: 'ab Ende des Kalenderjahres',
  austritt: 'ab Austritt',
  abschluss: 'ab Abschluss des Auftrags',
};

export type Loeschart = 'loeschen' | 'anonymisieren';

export interface DatenKategorie {
  id: DatenKategorieId;
  label: string;
  beispiele: string;
  zweck: string;
  rechtsgrundlage: string;
  betroffene: 'Mitarbeitende' | 'Kundinnen und Kunden' | 'Beide';
  /** Besonders schützenswerte Personendaten nach DSG Art. 5 lit. c. */
  besondersSchuetzenswert: boolean;
  aufbewahrungJahre: number;
  ab: Fristbeginn;
  loeschung: Loeschart;
}

// ── §2 · Katalog ─────────────────────────────────────────────────

// jh? Fristen mit Treuhand/Rechtsberatung von Sutt bestätigen – die Werte folgen ArGV 1 Art. 73, OR 958f,
//     DSV Art. 4 und der Praxis des EDÖB; alles Längere wäre Vorratshaltung ohne Zweck (DSG Art. 6 Abs. 4).
export const DATENKATEGORIEN: readonly DatenKategorie[] = [
  {
    id: 'zeiterfassung',
    label: 'Arbeitszeiten',
    beispiele: 'Kommen, Gehen, Pausen, Korrekturen, Gerät',
    zweck: 'Nachweis der Arbeits- und Ruhezeiten, Lohn, Gleitzeit',
    rechtsgrundlage: 'ArG Art. 46 · ArGV 1 Art. 73 (gesetzliche Pflicht, DSG Art. 31 Abs. 1)',
    betroffene: 'Mitarbeitende',
    besondersSchuetzenswert: false,
    aufbewahrungJahre: 5,
    ab: 'jahresende',
    loeschung: 'loeschen',
  },
  {
    id: 'monatsabschluss',
    label: 'Monatsabschlüsse',
    beispiele: 'Soll, Ist, Saldo je Monat, Genehmigung',
    zweck: 'Lohngrundlage, Buchführung',
    rechtsgrundlage: 'OR Art. 958f (Geschäftsbücher)',
    betroffene: 'Mitarbeitende',
    besondersSchuetzenswert: false,
    aufbewahrungJahre: 10,
    ab: 'jahresende',
    loeschung: 'loeschen',
  },
  {
    id: 'absenzen',
    label: 'Absenzen und Ferien',
    beispiele: 'Ferien, Militär, Schulung, Kompensation, Anträge',
    zweck: 'Ferienkonto, Planung, Lohnfortzahlung',
    rechtsgrundlage: 'OR Art. 329a ff. · ArGV 1 Art. 73 Abs. 1 lit. c–e',
    betroffene: 'Mitarbeitende',
    besondersSchuetzenswert: true,
    aufbewahrungJahre: 5,
    ab: 'jahresende',
    loeschung: 'anonymisieren',
  },
  {
    id: 'personalstamm',
    label: 'Personalstammdaten',
    beispiele: 'Funktion, Pensum, Eintritt, Vorgesetzte, Ferienanspruch, Kontakt',
    zweck: 'Arbeitsvertrag, Zeiterfassung, Organisation',
    rechtsgrundlage: 'OR Art. 328b (Arbeitsverhältnis) · DSG Art. 31 Abs. 2 lit. a',
    betroffene: 'Mitarbeitende',
    besondersSchuetzenswert: false,
    aufbewahrungJahre: 10,
    ab: 'austritt',
    loeschung: 'loeschen',
  },
  {
    id: 'benutzerkonten',
    label: 'Benutzerkonten',
    beispiele: 'Benutzername, Rolle, Rechte, Anbieter-Verknüpfung, letzte Anmeldung',
    zweck: 'Zugriffsschutz, Nachvollziehbarkeit',
    rechtsgrundlage: 'DSG Art. 8 (Datensicherheit) · DSV Art. 1–3',
    betroffene: 'Mitarbeitende',
    besondersSchuetzenswert: false,
    aufbewahrungJahre: 1,
    ab: 'austritt',
    loeschung: 'loeschen',
  },
  {
    id: 'journal',
    label: 'Protokoll (Journal)',
    beispiele: 'Wer hat wann was geändert oder angesehen',
    zweck: 'Protokollierung, Missbrauchserkennung, Auskunft',
    rechtsgrundlage: 'DSV Art. 4 (Protokollierung, mindestens 1 Jahr)',
    betroffene: 'Beide',
    besondersSchuetzenswert: false,
    aufbewahrungJahre: 2,
    ab: 'erfassung',
    loeschung: 'loeschen',
  },
  {
    id: 'kunden',
    label: 'Kunden und Liegenschaften',
    beispiele: 'Kontakte, Hauswarte, Zugänge, Hinweise',
    zweck: 'Auftragsabwicklung, Service-Historie',
    rechtsgrundlage: 'Vertrag (DSG Art. 31 Abs. 2 lit. a) · OR Art. 958f',
    betroffene: 'Kundinnen und Kunden',
    besondersSchuetzenswert: false,
    aufbewahrungJahre: 10,
    ab: 'abschluss',
    loeschung: 'anonymisieren',
  },
  {
    id: 'auftraege',
    label: 'Aufträge und Einsätze',
    beispiele: 'Auftrag, Termine, Techniker, Ersatzteile, Rechnungsstatus',
    zweck: 'Leistungserbringung, Verrechnung, Gewährleistung',
    rechtsgrundlage: 'Vertrag · OR Art. 958f (Belege)',
    betroffene: 'Beide',
    besondersSchuetzenswert: false,
    aufbewahrungJahre: 10,
    ab: 'abschluss',
    loeschung: 'anonymisieren',
  },
  {
    id: 'rapporte',
    label: 'Servicerapporte',
    beispiele: 'Arbeiten, Zeiten, Teile, Unterschrift',
    zweck: 'Leistungsnachweis, Verrechnung',
    rechtsgrundlage: 'OR Art. 958f (Buchungsbelege)',
    betroffene: 'Beide',
    besondersSchuetzenswert: false,
    aufbewahrungJahre: 10,
    ab: 'abschluss',
    loeschung: 'loeschen',
  },
  {
    id: 'fotos',
    label: 'Fotos',
    beispiele: 'Typenschild, Schadenbild, Einbausituation',
    zweck: 'Dokumentation der Arbeit, Gewährleistung',
    rechtsgrundlage: 'Berechtigtes Interesse (DSG Art. 31 Abs. 1) · OR Art. 371 (Mängelrechte)',
    betroffene: 'Kundinnen und Kunden',
    besondersSchuetzenswert: false,
    aufbewahrungJahre: 2,
    ab: 'abschluss',
    loeschung: 'loeschen',
  },
  {
    id: 'einsatzverlauf',
    label: 'Statuszeitstempel der Einsätze',
    beispiele: 'Abfahrt, Ankunft, Fertig je Einsatz',
    zweck: 'Live-Puls, Rapportzeiten – keine Verhaltensüberwachung (ArGV 3 Art. 26)',
    rechtsgrundlage: 'Berechtigtes Interesse, Zweckbindung (DSG Art. 6 Abs. 3)',
    betroffene: 'Mitarbeitende',
    besondersSchuetzenswert: false,
    aufbewahrungJahre: 1,
    ab: 'erfassung',
    loeschung: 'anonymisieren',
  },
  {
    id: 'nachrichten',
    label: 'Nachrichten (SMS, Mail)',
    beispiele: 'Terminbestätigung, Unterwegs-Meldung, Rapportversand',
    zweck: 'Kundenkommunikation, Nachweis',
    rechtsgrundlage: 'Vertrag · berechtigtes Interesse',
    betroffene: 'Kundinnen und Kunden',
    besondersSchuetzenswert: false,
    aufbewahrungJahre: 2,
    ab: 'erfassung',
    loeschung: 'loeschen',
  },
];

export function datenKategorie(id: DatenKategorieId): DatenKategorie {
  const kategorie = DATENKATEGORIEN.find((eintrag) => eintrag.id === id);
  if (!kategorie) throw new Error(`Datenkategorie ${id} unbekannt`);
  return kategorie;
}

// ── §3 · Fristen ─────────────────────────────────────────────────

export function aufbewahrungJahre(kategorie: DatenKategorie, ueberschrieben?: Readonly<Partial<Record<DatenKategorieId, number>>>): number {
  const wert = ueberschrieben?.[kategorie.id];
  return wert !== undefined && wert > 0 ? wert : kategorie.aufbewahrungJahre;
}

/**
 * Stichtag: Datensätze, deren Fristbeginn vor diesem Datum liegt, sind löschfällig.
 * «ab Jahresende» rechnet ab dem 1. Januar nach dem Erfassungsjahr.
 */
export function loeschfaelligVor(kategorie: DatenKategorie, jahre: number, heute: IsoDatum): IsoDatum {
  const datum = parseIsoDate(heute);
  if (kategorie.ab === 'jahresende') return toIsoDate(new Date(datum.getFullYear() - jahre, 0, 1));
  const stichtag = new Date(datum.getFullYear() - jahre, datum.getMonth(), datum.getDate());
  return toIsoDate(stichtag);
}

/** Frühestes Löschdatum eines konkreten Datensatzes. */
export function loeschdatum(kategorie: DatenKategorie, jahre: number, fristbeginn: IsoDatum): IsoDatum {
  const datum = parseIsoDate(fristbeginn);
  if (kategorie.ab === 'jahresende') return toIsoDate(new Date(datum.getFullYear() + jahre + 1, 0, 1));
  return addDays(toIsoDate(new Date(datum.getFullYear() + jahre, datum.getMonth(), datum.getDate())), 0);
}

/* ◆ jh · eof */
