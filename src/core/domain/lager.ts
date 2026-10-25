/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/lager.ts                               │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Lager: Orte, Artikel, Bestände, Bestellungen, Bewegungen (ADR-004)    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, isSunday } from '../datum';
import type { IsoDatum, IsoZeitpunkt } from '../datum';
import type { Marke } from './stammdaten';

// ── §1 · Orte ────────────────────────────────────────────────────

export const LAGER_GLATTBRUGG = 'glattbrugg';

/** Hauptlager Glattbrugg oder das Fahrzeug eines Technikers. */
export type LagerOrt = typeof LAGER_GLATTBRUGG | `fahrzeug:${string}`;

const FAHRZEUG_PRAEFIX = 'fahrzeug:';

export function fahrzeugOrt(technikerId: string): LagerOrt {
  return `${FAHRZEUG_PRAEFIX}${technikerId}`;
}

export function technikerIdVon(ort: LagerOrt): string | null {
  return ort === LAGER_GLATTBRUGG ? null : ort.slice(FAHRZEUG_PRAEFIX.length);
}

export function isLagerOrt(wert: unknown): wert is LagerOrt {
  return wert === LAGER_GLATTBRUGG || (typeof wert === 'string' && wert.startsWith(FAHRZEUG_PRAEFIX) && wert.length > FAHRZEUG_PRAEFIX.length);
}

// ── §2 · Artikel ─────────────────────────────────────────────────

export type ArtikelGruppe = 'ersatzteil' | 'verbrauch' | 'zubehoer';

export const ARTIKEL_GRUPPEN: readonly ArtikelGruppe[] = ['ersatzteil', 'verbrauch', 'zubehoer'];

export const ARTIKEL_GRUPPE_LABEL: Readonly<Record<ArtikelGruppe, string>> = {
  ersatzteil: 'Ersatzteil',
  verbrauch: 'Verbrauchsmaterial',
  zubehoer: 'Zubehör',
};

export type Einheit = 'Stk' | 'Paar' | 'Set' | 'm' | 'l';

export interface Artikel {
  artikelNummer: string;
  bezeichnung: string;
  gruppe: ArtikelGruppe;
  marke?: Marke;
  /** Geräteart, zu der das Teil passt – für Suche und Rapport-Vorschlag. */
  passtZu?: string;
  lieferant: string;
  preisChf: number;
  einheit: Einheit;
  /** Unterschreitet Glattbrugg diesen Bestand, gilt der Artikel als knapp. jh? Werte mit Sutt festlegen. */
  mindestbestand: number;
}

// ── §3 · Bestände ────────────────────────────────────────────────

export interface Lagerbestand {
  artikelNummer: string;
  ort: LagerOrt;
  menge: number;
}

export type BestandStufe = 'ok' | 'knapp' | 'leer';

export const BESTAND_STUFE_LABEL: Readonly<Record<BestandStufe, string>> = {
  ok: 'am Lager',
  knapp: 'knapp',
  leer: 'nicht am Lager',
};

export function bestandVon(bestaende: readonly Lagerbestand[], artikelNummer: string, ort: LagerOrt): number {
  return bestaende.find((bestand) => bestand.artikelNummer === artikelNummer && bestand.ort === ort)?.menge ?? 0;
}

export interface BestandSumme {
  glattbrugg: number;
  fahrzeuge: number;
  total: number;
}

export function bestandGesamt(bestaende: readonly Lagerbestand[], artikelNummer: string): BestandSumme {
  let glattbrugg = 0;
  let fahrzeuge = 0;
  for (const bestand of bestaende) {
    if (bestand.artikelNummer !== artikelNummer) continue;
    if (bestand.ort === LAGER_GLATTBRUGG) glattbrugg += bestand.menge;
    else fahrzeuge += bestand.menge;
  }
  return { glattbrugg, fahrzeuge, total: glattbrugg + fahrzeuge };
}

/** Stufe nach dem Bestand in Glattbrugg – Fahrzeuge zählen nicht als Lager. */
export function bestandStufe(mengeGlattbrugg: number, mindestbestand: number): BestandStufe {
  if (mengeGlattbrugg <= 0) return 'leer';
  if (mengeGlattbrugg < mindestbestand) return 'knapp';
  return 'ok';
}

// jh› Bestände werden nie negativ: Verbrauch ohne Bestand kappt auf 0 – das Journal behält die Bewegung.
export function mitBestand(bestaende: readonly Lagerbestand[], artikelNummer: string, ort: LagerOrt, delta: number): Lagerbestand[] {
  const index = bestaende.findIndex((bestand) => bestand.artikelNummer === artikelNummer && bestand.ort === ort);
  if (index < 0) return [...bestaende, { artikelNummer, ort, menge: Math.max(0, delta) }];
  return bestaende.map((bestand, position) => (position === index ? { ...bestand, menge: Math.max(0, bestand.menge + delta) } : bestand));
}

// ── §4 · Bestellungen ────────────────────────────────────────────

export type BestellStatus = 'offen' | 'eingetroffen' | 'storniert';

export const BESTELL_STATUS_LABEL: Readonly<Record<BestellStatus, string>> = {
  offen: 'offen',
  eingetroffen: 'eingetroffen',
  storniert: 'storniert',
};

export interface Bestellung {
  id: string;
  /** Nummernkreis B-26-00123 – jh? mit Sutt klären. */
  nummer: string;
  artikelNummer: string;
  bezeichnung: string;
  menge: number;
  lieferant: string;
  bestelltAm: IsoZeitpunkt;
  liefertermin: IsoDatum;
  status: BestellStatus;
  /** Für welchen Auftrag bestellt wurde – fehlt bei Lagerauffüllung. */
  auftragId?: string;
  eingetroffenAm?: IsoZeitpunkt;
  /** Kürzel, wer bestellt hat. */
  von: string;
}

// jh? Lieferfrist beim Hersteller: drei Arbeitstage angenommen – je Marke verschieden?
export const LIEFERFRIST_TAGE = 3;

export function liefertermin(ab: IsoDatum, tage: number = LIEFERFRIST_TAGE): IsoDatum {
  const termin = addDays(ab, tage);
  return isSunday(termin) ? addDays(termin, 1) : termin;
}

export function istUeberfaellig(bestellung: Pick<Bestellung, 'status' | 'liefertermin'>, heute: IsoDatum): boolean {
  return bestellung.status === 'offen' && bestellung.liefertermin < heute;
}

export function nextBestellNummer(bestellungen: readonly Pick<Bestellung, 'nummer'>[]): string {
  let hoechste = 0;
  for (const bestellung of bestellungen) {
    const treffer = /^B-26-(\d{5})$/.exec(bestellung.nummer);
    if (treffer) hoechste = Math.max(hoechste, Number(treffer[1]));
  }
  return `B-26-${String(hoechste + 1).padStart(5, '0')}`;
}

// ── §5 · Bewegungen ──────────────────────────────────────────────

export type BewegungArt = 'wareneingang' | 'umbuchung' | 'verbrauch' | 'korrektur' | 'retoure';

export const BEWEGUNG_LABEL: Readonly<Record<BewegungArt, string>> = {
  wareneingang: 'Wareneingang',
  umbuchung: 'Umbuchung',
  verbrauch: 'Verbrauch',
  korrektur: 'Korrektur',
  retoure: 'Retoure',
};

export interface Lagerbewegung {
  id: string;
  zeitpunkt: IsoZeitpunkt;
  art: BewegungArt;
  artikelNummer: string;
  /** Stückzahl; bei Korrektur die Differenz (auch negativ). */
  menge: number;
  von?: LagerOrt;
  nach?: LagerOrt;
  auftragId?: string;
  bestellungId?: string;
  text?: string;
  /** Kürzel, wer gebucht hat – «App» beim Rapport-Abschluss ist der Techniker. */
  benutzer: string;
}

/** Eine Bewegung auf die Bestände anwenden – rein, ohne Journal. */
export function wendeBewegungAn(bestaende: readonly Lagerbestand[], bewegung: Lagerbewegung): Lagerbestand[] {
  const { artikelNummer, menge, von, nach } = bewegung;
  switch (bewegung.art) {
    case 'wareneingang':
      return nach ? mitBestand(bestaende, artikelNummer, nach, menge) : [...bestaende];
    case 'umbuchung': {
      let neu: Lagerbestand[] = [...bestaende];
      if (von) neu = mitBestand(neu, artikelNummer, von, -menge);
      if (nach) neu = mitBestand(neu, artikelNummer, nach, menge);
      return neu;
    }
    case 'verbrauch':
    case 'retoure':
      return von ? mitBestand(bestaende, artikelNummer, von, -menge) : [...bestaende];
    case 'korrektur':
      return nach ? mitBestand(bestaende, artikelNummer, nach, menge) : [...bestaende];
  }
}

export function wendeBewegungenAn(bestaende: readonly Lagerbestand[], bewegungen: readonly Lagerbewegung[]): Lagerbestand[] {
  return bewegungen.reduce<Lagerbestand[]>((stand, bewegung) => wendeBewegungAn(stand, bewegung), [...bestaende]);
}

/* ◆ jh · eof */
