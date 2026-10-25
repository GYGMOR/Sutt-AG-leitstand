/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/nachricht.ts                           │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Nachrichten an Mieter/Kontakt: SMS- und Mail-Vorlagen (Mock-Versand)  │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoZeitpunkt } from '../datum';

// ── §1 · Typen ───────────────────────────────────────────────────

export type NachrichtArt = 'terminbestaetigung' | 'unterwegs' | 'nicht-angetroffen' | 'rapport-mail';

export type NachrichtKanal = 'sms' | 'mail';

export const NACHRICHT_LABEL: Readonly<Record<NachrichtArt, string>> = {
  terminbestaetigung: 'Terminbestätigung',
  unterwegs: 'Techniker unterwegs',
  'nicht-angetroffen': 'Nicht angetroffen',
  'rapport-mail': 'Rapport per Mail',
};

export const NACHRICHT_KANAL: Readonly<Record<NachrichtArt, NachrichtKanal>> = {
  terminbestaetigung: 'sms',
  unterwegs: 'sms',
  'nicht-angetroffen': 'sms',
  'rapport-mail': 'mail',
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
}

// jh› Kurz, ohne Marketing, mit Rückrufnummer – so liest man es auf dem Sperrbildschirm.
export function vorlageText(art: NachrichtArt, kontext: VorlagenKontext): string {
  switch (art) {
    case 'terminbestaetigung':
      return `Sutt AG: Ihr Servicetermin ist am ${kontext.datum} um ${kontext.zeit}. Techniker: ${kontext.technikerName}. Rückfragen: ${BUERO_TELEFON}`;
    case 'unterwegs':
      return `Sutt AG: ${kontext.technikerName} ist unterwegs zu Ihnen, Ankunft ca. ${kontext.ankunft ?? kontext.zeit}.`;
    case 'nicht-angetroffen':
      return `Sutt AG: Wir haben Sie am ${kontext.datum} um ${kontext.zeit} leider nicht angetroffen. Bitte melden Sie sich für einen neuen Termin: ${BUERO_TELEFON}`;
    case 'rapport-mail':
      return `Guten Tag ${kontext.kontaktName}\n\nAnbei Ihr Servicerapport ${kontext.rapportNummer ?? ''} vom ${kontext.datum}.\n\nFreundliche Grüsse\n${kontext.technikerName}, Sutt AG`;
  }
}

/* ◆ jh · eof */
