/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/nachricht.ts                           │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Nachrichten an Mieter/Kontakt: SMS- und Mail-Vorlagen (Mock-Versand)  │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoZeitpunkt } from '../datum';

// ── §1 · Typen ───────────────────────────────────────────────────

export type NachrichtArt = 'terminbestaetigung' | 'unterwegs' | 'nicht-angetroffen' | 'rapport-mail' | 'anfrage-antwort';

export const NACHRICHT_ARTEN: readonly NachrichtArt[] = ['terminbestaetigung', 'unterwegs', 'nicht-angetroffen', 'rapport-mail', 'anfrage-antwort'];

export type NachrichtKanal = 'sms' | 'mail';

export const NACHRICHT_LABEL: Readonly<Record<NachrichtArt, string>> = {
  terminbestaetigung: 'Terminbestätigung',
  unterwegs: 'Techniker unterwegs',
  'nicht-angetroffen': 'Nicht angetroffen',
  'rapport-mail': 'Rapport per Mail',
  'anfrage-antwort': 'Antwort auf Website-Anfrage',
};

export const NACHRICHT_KANAL: Readonly<Record<NachrichtArt, NachrichtKanal>> = {
  terminbestaetigung: 'sms',
  unterwegs: 'sms',
  'nicht-angetroffen': 'sms',
  'rapport-mail': 'mail',
  'anfrage-antwort': 'mail',
};

export interface Nachricht {
  id: string;
  art: NachrichtArt;
  kanal: NachrichtKanal;
  auftragId: string;
  einsatzId?: string;
  /** Nummer oder Adresse, an die gesendet wurde. */
  an: string;
  empfaenger: string;
  text: string;
  zeitpunkt: IsoZeitpunkt;
  /** Kürzel des Absenders (Techniker oder Büro). */
  von: string;
}

// ── §2 · Vorlagen ────────────────────────────────────────────────

// jh? Büronummer und Absendername mit Sutt festlegen – hier Platzhalter.
export const BUERO_TELEFON = '044 123 45 67';

export interface VorlagenKontext {
  technikerName: string;
  kontaktName: string;
  datum: string;
  zeit: string;
  ankunft?: string;
  rapportNummer?: string;
  anfrageNummer?: string;
}

/** Platzhalter, die der Betrieb in seinen Vorlagen (Modul SMS & Website) verwenden darf. */
export const VORLAGE_PLATZHALTER: readonly { schluessel: string; bedeutung: string }[] = [
  { schluessel: '{techniker}', bedeutung: 'Name des Technikers' },
  { schluessel: '{kontakt}', bedeutung: 'Name der Kontaktperson' },
  { schluessel: '{datum}', bedeutung: 'Datum des Termins' },
  { schluessel: '{zeit}', bedeutung: 'Uhrzeit des Termins' },
  { schluessel: '{ankunft}', bedeutung: 'Voraussichtliche Ankunft («unterwegs»)' },
  { schluessel: '{rapport}', bedeutung: 'Nummer des Servicerapports' },
  { schluessel: '{anfrage}', bedeutung: 'Nummer der Website-Anfrage' },
  { schluessel: '{telefon}', bedeutung: 'Telefonnummer des Büros' },
];

// jh› Kurz, ohne Marketing, mit Rückrufnummer – so liest man es auf dem Sperrbildschirm.
const STANDARD_VORLAGEN: Readonly<Record<NachrichtArt, string>> = {
  terminbestaetigung: 'Sutt AG: Ihr Servicetermin ist am {datum} um {zeit}. Techniker: {techniker}. Rückfragen: {telefon}',
  unterwegs: 'Sutt AG: {techniker} ist unterwegs zu Ihnen, Ankunft ca. {ankunft}.',
  'nicht-angetroffen': 'Sutt AG: Wir haben Sie am {datum} um {zeit} leider nicht angetroffen. Bitte melden Sie sich für einen neuen Termin: {telefon}',
  'rapport-mail': 'Guten Tag {kontakt}\n\nAnbei Ihr Servicerapport {rapport} vom {datum}.\n\nFreundliche Grüsse\n{techniker}, Sutt AG',
  'anfrage-antwort': 'Guten Tag {kontakt}\n\nVielen Dank für Ihre Anfrage {anfrage}. Wir haben sie erhalten und melden uns bis {datum} mit einem Terminvorschlag.\n\nFreundliche Grüsse\nSutt AG · {telefon}',
};

export function standardVorlage(art: NachrichtArt): string {
  return STANDARD_VORLAGEN[art];
}

export function fuelleVorlage(vorlage: string, kontext: VorlagenKontext): string {
  const werte: Readonly<Record<string, string>> = {
    '{techniker}': kontext.technikerName,
    '{kontakt}': kontext.kontaktName,
    '{datum}': kontext.datum,
    '{zeit}': kontext.zeit,
    '{ankunft}': kontext.ankunft ?? kontext.zeit,
    '{rapport}': kontext.rapportNummer ?? '',
    '{anfrage}': kontext.anfrageNummer ?? '',
    '{telefon}': BUERO_TELEFON,
  };
  return vorlage.replace(/\{[a-z]+\}/g, (platzhalter) => werte[platzhalter] ?? platzhalter);
}

/** Text einer Nachricht – mit der Vorlage des Betriebs, sonst mit dem Standard. */
export function vorlageText(art: NachrichtArt, kontext: VorlagenKontext, vorlagen?: Readonly<Partial<Record<NachrichtArt, string>>>): string {
  return fuelleVorlage(vorlagen?.[art] ?? STANDARD_VORLAGEN[art], kontext);
}

/* ◆ jh · eof */
