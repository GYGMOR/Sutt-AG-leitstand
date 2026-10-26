/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/journal.ts                             │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Journal: unveränderliches Protokoll – Änderung, Einsicht, Anmeldung   │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoZeitpunkt } from '../datum';

// ── §1 · Typen ───────────────────────────────────────────────────

export type JournalBereich = 'plan' | 'auftrag' | 'rapport' | 'lager' | 'stammdaten' | 'zeit' | 'absenz' | 'personal' | 'benutzer' | 'einstellungen' | 'anmeldung' | 'datenschutz';

export const JOURNAL_BEREICH_LABEL: Readonly<Record<JournalBereich, string>> = {
  plan: 'Plan',
  auftrag: 'Auftrag',
  rapport: 'Rapport',
  lager: 'Lager',
  stammdaten: 'Stammdaten',
  zeit: 'Zeiterfassung',
  absenz: 'Absenzen',
  personal: 'Personal',
  benutzer: 'Benutzer & Rechte',
  einstellungen: 'Einstellungen',
  anmeldung: 'Anmeldung',
  datenschutz: 'Datenschutz',
};

export type JournalArt = 'aenderung' | 'einsicht' | 'anmeldung' | 'export' | 'loeschung' | 'system';

export const JOURNAL_ART_LABEL: Readonly<Record<JournalArt, string>> = {
  aenderung: 'Änderung',
  einsicht: 'Einsicht',
  anmeldung: 'Anmeldung',
  export: 'Export',
  loeschung: 'Löschung',
  system: 'System',
};

// jh› Das Journal ist append-only: «Rückgängig» löscht keinen Eintrag, sondern schreibt einen neuen.
//     Das ist die Protokollierung nach DSV Art. 4 – wer hat wann welche Personendaten verändert oder angesehen.
export interface JournalEintrag {
  id: string;
  zeitpunkt: IsoZeitpunkt;
  /** Kürzel der handelnden Person, «SYS» für automatische Läufe. */
  benutzer: string;
  bereich: JournalBereich;
  art: JournalArt;
  text: string;
  /** Technische Aktion, z. B. «stempeln», «absenzEntscheiden». */
  aktion?: string;
  /** Betroffener Datensatz. */
  betrifft?: string;
  /** Betroffene Person – für «Meine Daten» und die Einsicht-Übersicht. */
  mitarbeiterId?: string;
  rueckgaengig?: boolean;
}

/** Mehr behält der Browser-Stand nicht; das Produkt archiviert serverseitig (Aufbewahrung 1 Jahr, DSV Art. 4 Abs. 4). */
export const JOURNAL_MAX = 2000;

// ── §2 · Zuordnung ───────────────────────────────────────────────

const BEREICH_VON_AKTION: Readonly<Record<string, JournalBereich>> = {
  planPendenz: 'plan',
  moveEinsatz: 'plan',
  unplanEinsatz: 'plan',
  setStatus: 'plan',
  requestFolgetermin: 'plan',
  assignTechniker: 'plan',
  shiftEinsaetze: 'plan',
  createAuftrag: 'auftrag',
  updateAuftrag: 'auftrag',
  copyAuftrag: 'auftrag',
  deleteAuftrag: 'auftrag',
  createPendenz: 'auftrag',
  updateGeraet: 'stammdaten',
  updateKunde: 'stammdaten',
  updateLiegenschaft: 'stammdaten',
  createLiegenschaft: 'stammdaten',
  updateArtikel: 'lager',
  saveRapport: 'rapport',
  abschliessenRapport: 'rapport',
  signRapport: 'rapport',
  freigebenRapport: 'rapport',
  verrechnenRapport: 'rapport',
  zurueckAnTechniker: 'rapport',
  sendeNachricht: 'auftrag',
  bestellen: 'lager',
  wareneingang: 'lager',
  buchen: 'lager',
  stornierenBestellung: 'lager',
  stempeln: 'zeit',
  zeitEintraegeAnlegen: 'zeit',
  zeitEintragKorrigieren: 'zeit',
  zeitEintragLoeschen: 'zeit',
  zeitEintragErgaenzen: 'zeit',
  monatEinreichen: 'zeit',
  monatEntscheiden: 'zeit',
  absenzBeantragen: 'absenz',
  absenzEntscheiden: 'absenz',
  absenzAendern: 'absenz',
  absenzLoeschen: 'absenz',
  mitarbeiterSpeichern: 'personal',
  benutzerSpeichern: 'benutzer',
  loeschlauf: 'datenschutz',
};

export function bereichVonAktion(aktion: string): JournalBereich {
  return BEREICH_VON_AKTION[aktion] ?? 'stammdaten';
}

/** Bereiche, deren Einträge Personendaten von Mitarbeitenden betreffen. */
export const PERSONAL_BEREICHE: readonly JournalBereich[] = ['zeit', 'absenz', 'personal', 'benutzer'];

export function journalFuerPerson(journal: readonly JournalEintrag[], mitarbeiterId: string): JournalEintrag[] {
  return journal.filter((eintrag) => eintrag.mitarbeiterId === mitarbeiterId);
}

/* ◆ jh · eof */
