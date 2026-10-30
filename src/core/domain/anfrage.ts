/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/anfrage.ts                             │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Website-Anfrage: Anliegen, Gerät, Adresse, Kontakt – Prüfung, Ablage  │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum, IsoZeitpunkt } from '../datum';
import type { Kategorie } from './kategorie';

// ── §1 · Typen ───────────────────────────────────────────────────

export type AnfrageAnliegen = 'reparatur' | 'installation' | 'lieferung' | 'mietgeraet' | 'garantie' | 'offerte';

export const ANFRAGE_ANLIEGEN: readonly AnfrageAnliegen[] = ['reparatur', 'installation', 'lieferung', 'mietgeraet', 'garantie', 'offerte'];

export const ANLIEGEN_LABEL: Readonly<Record<AnfrageAnliegen, string>> = {
  reparatur: 'Reparatur',
  installation: 'Installation / Montage',
  lieferung: 'Lieferung',
  mietgeraet: 'Mietgerät',
  garantie: 'Garantiefall',
  offerte: 'Offerte / Beratung',
};

/** Welche Auftragskategorie aus dem Anliegen wird, wenn das Büro die Anfrage annimmt. */
export const ANLIEGEN_KATEGORIE: Readonly<Record<AnfrageAnliegen, Kategorie>> = {
  reparatur: 'reparatur',
  installation: 'montage',
  lieferung: 'lieferung',
  mietgeraet: 'mietgeraet',
  garantie: 'garantie',
  offerte: 'offerte',
};

export type AnfrageStatus = 'neu' | 'angenommen' | 'abgelehnt';

export const ANFRAGE_STATUS_LABEL: Readonly<Record<AnfrageStatus, string>> = {
  neu: 'Neu',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
};

export type AnfrageRolle = 'Mieter' | 'Eigentümer' | 'Hauswart' | 'Verwaltung' | 'Gewerbe';

export const ANFRAGE_ROLLEN: readonly AnfrageRolle[] = ['Mieter', 'Eigentümer', 'Hauswart', 'Verwaltung', 'Gewerbe'];

export type Zeitfenster = 'vormittag' | 'nachmittag' | 'egal';

export const ZEITFENSTER_LABEL: Readonly<Record<Zeitfenster, string>> = {
  vormittag: 'Vormittag',
  nachmittag: 'Nachmittag',
  egal: 'ganzer Tag',
};

export interface AnfrageAdresse {
  strasse: string;
  plz: string;
  ort: string;
  wohnung?: string;
}

export interface AnfrageKontakt {
  name: string;
  telefon: string;
  email: string;
  rolle: AnfrageRolle;
}

export interface AnfrageAntwort {
  am: IsoZeitpunkt;
  kanal: 'mail' | 'sms';
  text: string;
  von: string;
}

// jh› Die Anfrage ist bewusst kein Auftrag: Sie kommt von aussen, ungeprüft, ohne Kunden-ID. Erst das
//     Büro macht daraus einen Auftrag (Schnellerfassung mit Vorbelegung) – oder lehnt ab, mit Antwort.
export interface Anfrage {
  id: string;
  /** Laufnummer für die Rückmeldung an den Kunden: W-26-0101. */
  nummer: string;
  eingegangenAm: IsoZeitpunkt;
  status: AnfrageStatus;
  anliegen: AnfrageAnliegen;
  dringend: boolean;
  geraeteart: string;
  marke: string;
  fehlerbild: string;
  adresse: AnfrageAdresse;
  terminwunsch?: { datum: IsoDatum; zeitfenster: Zeitfenster };
  kontakt: AnfrageKontakt;
  kundennummer?: string;
  /** Dateiname eines mitgeschickten Fotos – die Datei selbst bleibt im Browser (To-do 012). */
  fotoName?: string;
  datenschutzZugestimmtAm: IsoZeitpunkt;
  quelle: 'website';
  /** Gesetzt, sobald das Büro die Anfrage angenommen hat. */
  auftragId?: string;
  antwort?: AnfrageAntwort;
}

export type AnfrageEntwurf = Omit<Anfrage, 'id' | 'nummer' | 'eingegangenAm' | 'status' | 'quelle' | 'datenschutzZugestimmtAm' | 'auftragId' | 'antwort'>;

export interface AnfrageFehler {
  feld: string;
  text: string;
}

/** Schlüssel im Browser-Speicher – Website und Leitstand lesen und schreiben dieselbe Liste (gleiche Origin). */
export const ANFRAGEN_SCHLUESSEL = 'sl.website.anfragen.v1';

// ── §2 · Prüfung ─────────────────────────────────────────────────

export function nurZiffern(text: string): string {
  return text.replace(/\D/g, '');
}

export function istEmail(text: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text.trim());
}

/** Regeln des Formulars – Website und Leitstand prüfen gleich. */
export function pruefeAnfrage(entwurf: AnfrageEntwurf, heute: IsoDatum): AnfrageFehler[] {
  const fehler: AnfrageFehler[] = [];
  if (!ANFRAGE_ANLIEGEN.includes(entwurf.anliegen)) fehler.push({ feld: 'anliegen', text: 'Bitte ein Anliegen wählen.' });
  if (entwurf.geraeteart.trim() === '') fehler.push({ feld: 'geraeteart', text: 'Um welches Gerät geht es?' });
  if (entwurf.fehlerbild.trim().length < 10) fehler.push({ feld: 'fehlerbild', text: 'Bitte das Problem in ein, zwei Sätzen beschreiben (mindestens 10 Zeichen).' });
  if (entwurf.adresse.strasse.trim() === '') fehler.push({ feld: 'strasse', text: 'Strasse und Hausnummer fehlen.' });
  if (!/^\d{4}$/.test(entwurf.adresse.plz.trim())) fehler.push({ feld: 'plz', text: 'Postleitzahl mit vier Ziffern.' });
  if (entwurf.adresse.ort.trim() === '') fehler.push({ feld: 'ort', text: 'Ort fehlt.' });
  if (entwurf.kontakt.name.trim().length < 3) fehler.push({ feld: 'name', text: 'Bitte Vor- und Nachname angeben.' });
  const telefonOk = nurZiffern(entwurf.kontakt.telefon).length >= 7;
  const emailOk = istEmail(entwurf.kontakt.email);
  if (!telefonOk && !emailOk) fehler.push({ feld: 'kontakt', text: 'Telefonnummer oder E-Mail-Adresse – eines von beiden brauchen wir für die Rückmeldung.' });
  if (entwurf.kontakt.email.trim() !== '' && !emailOk) fehler.push({ feld: 'email', text: 'E-Mail-Adresse prüfen.' });
  if (entwurf.terminwunsch && entwurf.terminwunsch.datum < heute) fehler.push({ feld: 'terminwunsch', text: 'Der Wunschtermin liegt in der Vergangenheit.' });
  return fehler;
}

// ── §3 · Anlegen und Ablage ──────────────────────────────────────

export function anfrageNummer(jahr: number, laufnummer: number): string {
  return `W-${String(jahr).slice(-2)}-${String(laufnummer).padStart(4, '0')}`;
}

// jh› Kennung aus dem Zeitpunkt (W-261030T0805), die Nummer ist der Zähler fürs Jahr – zwei Anfragen in derselben
//     Sekunde gibt es aus einem Browser nicht; die API vergibt später beides.
export function neueAnfrage(entwurf: AnfrageEntwurf, laufnummer: number, jetzt: IsoZeitpunkt, id = `W-${jetzt.slice(2, 19).replace(/[-:]/g, '')}`): Anfrage {
  return {
    ...entwurf,
    id,
    nummer: anfrageNummer(Number(jetzt.slice(0, 4)), laufnummer),
    eingegangenAm: jetzt,
    status: 'neu',
    quelle: 'website',
    datenschutzZugestimmtAm: jetzt,
  };
}

function istAnfrage(wert: unknown): wert is Anfrage {
  if (typeof wert !== 'object' || wert === null) return false;
  const kandidat = wert as Partial<Anfrage>;
  return typeof kandidat.id === 'string' && typeof kandidat.nummer === 'string' && typeof kandidat.eingegangenAm === 'string' && typeof kandidat.anliegen === 'string' && typeof kandidat.kontakt === 'object' && kandidat.kontakt !== null;
}

export function istAnfragenListe(wert: unknown): wert is Anfrage[] {
  return Array.isArray(wert) && wert.every(istAnfrage);
}

/** Liest die Liste aus einem Speicher (localStorage oder Testattrappe); defekte Einträge zählen nicht. */
export function ladeAnfragen(speicher: Pick<Storage, 'getItem'>): Anfrage[] {
  try {
    const roh = speicher.getItem(ANFRAGEN_SCHLUESSEL);
    if (roh === null) return [];
    const wert: unknown = JSON.parse(roh);
    return Array.isArray(wert) ? wert.filter(istAnfrage) : [];
  } catch {
    return [];
  }
}

export function speichereAnfragen(speicher: Pick<Storage, 'setItem'>, anfragen: readonly Anfrage[]): boolean {
  try {
    speicher.setItem(ANFRAGEN_SCHLUESSEL, JSON.stringify(anfragen));
    return true;
  } catch {
    return false;
  }
}

/** Nächste Laufnummer: eins über der höchsten Nummer des Jahres in der Liste. */
export function naechsteLaufnummer(anfragen: readonly Anfrage[], jahr: number): number {
  const kennung = `W-${String(jahr).slice(-2)}-`;
  const hoechste = anfragen.filter((anfrage) => anfrage.nummer.startsWith(kennung)).reduce((max, anfrage) => Math.max(max, Number(anfrage.nummer.slice(kennung.length)) || 0), 0);
  return hoechste + 1;
}

/* ◆ jh · eof */
