/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/stammdaten.ts                          │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Stammdaten: Kunde, Liegenschaft, Gerät, Techniker, Region             │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum, Minuten } from '../datum';
import type { Koordinaten } from '../geo';

// ── §1 · Geografie ───────────────────────────────────────────────

export type Ort = 'Glattbrugg' | 'Opfikon' | 'Kloten' | 'Wallisellen' | 'Dübendorf' | 'Zürich-Seebach';

export type Region = 'glattal' | 'unterland' | 'zuerich-nord';

export interface Adresse {
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: Ort;
}

// jh? Regionen-Schnitt so korrekt? Sutt teilt das Gebiet evtl. nach Tourenplan statt Gemeinde.
const REGION_VON_ORT: Readonly<Record<Ort, Region>> = {
  Glattbrugg: 'glattal',
  Opfikon: 'glattal',
  Wallisellen: 'glattal',
  Dübendorf: 'glattal',
  Kloten: 'unterland',
  'Zürich-Seebach': 'zuerich-nord',
};

export const REGIONEN: readonly Region[] = ['glattal', 'unterland', 'zuerich-nord'];

export interface OrtInfo {
  ort: Ort;
  plz: string;
  /** Ortsmitte als Näherung für neu erfasste Liegenschaften (jh! nicht geokodiert). */
  mitte: Koordinaten;
}

export const ORTE: readonly OrtInfo[] = [
  { ort: 'Glattbrugg', plz: '8152', mitte: { lat: 47.4306, lng: 8.5667 } },
  { ort: 'Opfikon', plz: '8152', mitte: { lat: 47.43, lng: 8.576 } },
  { ort: 'Kloten', plz: '8302', mitte: { lat: 47.4515, lng: 8.585 } },
  { ort: 'Wallisellen', plz: '8304', mitte: { lat: 47.414, lng: 8.593 } },
  { ort: 'Dübendorf', plz: '8600', mitte: { lat: 47.397, lng: 8.618 } },
  { ort: 'Zürich-Seebach', plz: '8052', mitte: { lat: 47.422, lng: 8.538 } },
];

export function ortInfo(ort: Ort): OrtInfo {
  return ORTE.find((info) => info.ort === ort) ?? { ort, plz: '', mitte: { lat: 47.4306, lng: 8.5667 } };
}

export const REGION_LABEL: Readonly<Record<Region, string>> = {
  glattal: 'Glattal',
  unterland: 'Unterland',
  'zuerich-nord': 'Zürich Nord',
};

export function regionOf(ort: Ort): Region {
  return REGION_VON_ORT[ort];
}

export function formatAdresse(adresse: Adresse): string {
  return `${adresse.strasse} ${adresse.hausnummer}, ${adresse.plz} ${adresse.ort}`;
}

export function formatStrasse(adresse: Adresse): string {
  return `${adresse.strasse} ${adresse.hausnummer}`;
}

/** «Talackerstrasse 41» → «Talackerstr. 41» – für enge Plan-Blöcke. */
export function formatStrasseKurz(adresse: Adresse): string {
  return `${adresse.strasse.replace(/strasse$/, 'str.')} ${adresse.hausnummer}`;
}

// ── §2 · Personen & Kunden ───────────────────────────────────────

export interface Kontakt {
  name: string;
  telefon: string;
  email?: string;
}

export type Kundenart = 'verwaltung' | 'privat' | 'gewerbe';

export const KUNDENART_LABEL: Readonly<Record<Kundenart, string>> = {
  verwaltung: 'Verwaltung',
  privat: 'Privatkunde',
  gewerbe: 'Gewerbe',
};

export type HinweisArt = 'rechnung-offen' | 'stammkunde' | 'schluessel-verwaltung' | 'hund' | 'vorsicht' | 'parkplatz';

export const HINWEIS_ARTEN: readonly HinweisArt[] = ['stammkunde', 'schluessel-verwaltung', 'hund', 'vorsicht', 'parkplatz', 'rechnung-offen'];

export const HINWEIS_LABEL: Readonly<Record<HinweisArt, string>> = {
  'rechnung-offen': 'Rechnung offen',
  stammkunde: 'Stammkunde',
  'schluessel-verwaltung': 'Schlüssel bei Verwaltung',
  hund: 'Hund im Haus',
  vorsicht: 'Vorsicht',
  parkplatz: 'Parkieren',
};

// jh› Kleine Hinweise, die der Techniker vor Ort braucht – als Chips, nie als Fliesstext.
export interface KundenHinweis {
  art: HinweisArt;
  text: string;
}

export interface Kunde {
  id: string;
  nummer: string;
  art: Kundenart;
  name: string;
  /** Kurzbezeichnung wie im ERP – passt in einen 60-min-Block. */
  kurzname: string;
  adresse: Adresse;
  kontakt: Kontakt;
  kundeSeit: IsoDatum;
  /** Älteste offene Rechnung – fehlt, wenn nichts offen ist. */
  rechnungOffenSeit?: IsoDatum;
  hinweise: readonly KundenHinweis[];
}

export interface Liegenschaft {
  id: string;
  /** Objektnummer der Verwaltung, sofern vorhanden. */
  objektNummer?: string;
  bezeichnung: string;
  adresse: Adresse;
  // jh! Koordinaten sind Näherungen auf Strassenniveau, nicht geokodiert.
  koordinaten: Koordinaten;
  /** Verwaltung bzw. Eigentümer der Liegenschaft. */
  kundeId: string;
  hauswart?: Kontakt;
  zugang?: string;
  hinweise: readonly KundenHinweis[];
}

export interface Wohnung {
  nummer: string;
  lage: string;
}

// ── §3 · Geräte ──────────────────────────────────────────────────

export type Marke = 'Miele' | 'V-ZUG' | 'Electrolux' | 'Siemens' | 'Liebherr' | 'Asko';

export const MARKEN: readonly Marke[] = ['Miele', 'V-ZUG', 'Electrolux', 'Siemens', 'Liebherr', 'Asko'];

/** Wie der Hersteller seine Gerätenummer auf dem Typenschild nennt. */
export const KENNUNG_LABEL: Readonly<Record<Marke, string>> = {
  Miele: 'Fabrik-Nr.',
  'V-ZUG': 'SN',
  Electrolux: 'PNC / SN',
  Siemens: 'E-Nr. / FD',
  Liebherr: 'Service-Nr.',
  Asko: 'SN',
};

export type Geraeteart =
  | 'Waschmaschine'
  | 'Wärmepumpentrockner'
  | 'Geschirrspüler'
  | 'Backofen'
  | 'Steamer'
  | 'Kochfeld'
  | 'Kühlschrank'
  | 'Gefrierschrank';

export const GERAETEARTEN: readonly Geraeteart[] = ['Waschmaschine', 'Wärmepumpentrockner', 'Geschirrspüler', 'Backofen', 'Steamer', 'Kochfeld', 'Kühlschrank', 'Gefrierschrank'];

export interface GeraetEreignis {
  datum: IsoDatum;
  text: string;
  technikerKuerzel: string;
}

export interface Geraet {
  id: string;
  marke: Marke;
  art: Geraeteart;
  modell: string;
  typNummer: string;
  seriennummer: string;
  baujahr: number;
  garantieBis?: IsoDatum;
  /** Frühere Einsätze an diesem Gerät, neueste zuerst. */
  historie: readonly GeraetEreignis[];
}

// ── §4 · Techniker & Absenzen ────────────────────────────────────

/** Index in die Farbtokens --sl-tech-1 … --sl-tech-9. */
export type TechnikerFarbe = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Techniker {
  id: string;
  kuerzel: string;
  vorname: string;
  nachname: string;
  region: Region;
  farbe: TechnikerFarbe;
  fahrzeug: string;
  telefon: string;
  /** Marken, die der Techniker routiniert bedient. */
  kompetenzen: readonly Marke[];
  /** Herstellerzertifikate – Teilmenge der Kompetenzen. */
  zertifiziert: readonly Marke[];
  /** Soll-Einsatzzeit pro Tag, Fahrzeit exklusive. */
  sollMinuten: Minuten;
}

export function fullName(techniker: Techniker): string {
  return `${techniker.vorname} ${techniker.nachname}`;
}

// jh› Absenzen leben seit rev 05 in core/domain/absenz.ts (Antrag, Entscheid, Ferienkonto, Gesundheitsschutz);
//     die Dispo liest sie weiterhin von hier – derselbe Typ, dieselbe Sperre im Plan.
export type { Absenz, AbsenzArt, AbsenzStatus } from './absenz';
export { ABSENZ_LABEL, isAbwesend } from './absenz';

/* ◆ jh · eof */
