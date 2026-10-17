/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/einsatz.ts                             │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Einsatz (Termin eines Technikers) und Pendenz (zu planen)             │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum, IsoZeitpunkt, Minuten } from '../datum';

// ── §1 · Status ──────────────────────────────────────────────────

export type EinsatzStatus = 'geplant' | 'unterwegs' | 'vor-ort' | 'wartet-teil' | 'erledigt';

export interface StatusMeta {
  status: EinsatzStatus;
  label: string;
}

// jh? Bedeutung der Dispo-Farben mit Sutt abgleichen – heute auf Papier/Excel anders belegt?
export const EINSATZ_STATUS: readonly StatusMeta[] = [
  { status: 'geplant', label: 'Geplant' },
  { status: 'unterwegs', label: 'Unterwegs' },
  { status: 'vor-ort', label: 'Vor Ort' },
  { status: 'wartet-teil', label: 'Wartet auf Teil' },
  { status: 'erledigt', label: 'Erledigt' },
];

export const STATUS_LABEL: Readonly<Record<EinsatzStatus, string>> = {
  geplant: 'Geplant',
  unterwegs: 'Unterwegs',
  'vor-ort': 'Vor Ort',
  'wartet-teil': 'Wartet auf Teil',
  erledigt: 'Erledigt',
};

/** Nur noch nicht begonnene Einsätze dürfen verschoben werden. */
export function isMovable(status: EinsatzStatus): boolean {
  return status === 'geplant' || status === 'unterwegs';
}

export function isAbgeschlossen(status: EinsatzStatus): boolean {
  return status === 'erledigt' || status === 'wartet-teil';
}

// ── §2 · Einsatz ─────────────────────────────────────────────────

/** Ein Termin eines Technikers für einen Auftrag. Ein Auftrag kann mehrere Einsätze haben. */
export interface Einsatz {
  id: string;
  auftragId: string;
  technikerId: string;
  datum: IsoDatum;
  startMin: Minuten;
  dauerMin: Minuten;
  status: EinsatzStatus;
  /** Zeitpunkt der letzten Statusmeldung (Mock: Ankunft vor Ort). */
  statusSeit?: IsoZeitpunkt;
}

export function einsatzEnde(einsatz: Pick<Einsatz, 'startMin' | 'dauerMin'>): Minuten {
  return einsatz.startMin + einsatz.dauerMin;
}

// ── §3 · Pendenz ─────────────────────────────────────────────────

export type PendenzAnlass = 'neu' | 'folgetermin';

// jh› «Pendenz» statt «offener Auftrag»: auch ein Folgetermin eines bereits
//     disponierten Auftrags landet im Eingang – fachlich ist beides «zu planen».
export interface Pendenz {
  id: string;
  auftragId: string;
  anlass: PendenzAnlass;
  dauerMin: Minuten;
  erstelltAm: IsoZeitpunkt;
  /** Frühester sinnvoller Termin, z. B. Liefertermin des Ersatzteils. */
  fruehestensAm?: IsoDatum;
  hinweis?: string;
}

/* ◆ jh · eof */
