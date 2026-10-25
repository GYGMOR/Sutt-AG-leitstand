/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/einsatz.ts                             │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Einsatz (Termin eines Technikers), Statusverlauf, Pendenz             │
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

// ── §2 · Statusverlauf ───────────────────────────────────────────

/** Wer den Status gesetzt hat: Techniker-App, Büro oder Mockdaten. */
export type StatusQuelle = 'app' | 'buero' | 'mock';

export interface StatusWechsel {
  status: EinsatzStatus;
  zeitpunkt: IsoZeitpunkt;
  quelle: StatusQuelle;
}

/** Zeitpunkt des letzten Wechsels auf `status`, oder undefined. */
export function zeitpunktVon(einsatz: Pick<Einsatz, 'verlauf'>, status: EinsatzStatus): IsoZeitpunkt | undefined {
  const treffer = [...(einsatz.verlauf ?? [])].reverse().find((wechsel) => wechsel.status === status);
  return treffer?.zeitpunkt;
}

// jh› Der Verlauf ist die Wahrheit, statusSeit nur der Spiegel des letzten Eintrags –
//     Live-Puls und Rapportzeiten rechnen mit echten Zeitstempeln statt Annahmen.
export function mitStatuswechsel(einsatz: Einsatz, status: EinsatzStatus, zeitpunkt: IsoZeitpunkt, quelle: StatusQuelle): Einsatz {
  return { ...einsatz, status, statusSeit: zeitpunkt, verlauf: [...(einsatz.verlauf ?? []), { status, zeitpunkt, quelle }] };
}

// ── §3 · Einsatz ─────────────────────────────────────────────────

/** Ein Termin eines Technikers für einen Auftrag. Ein Auftrag kann mehrere Einsätze haben. */
export interface Einsatz {
  id: string;
  auftragId: string;
  technikerId: string;
  datum: IsoDatum;
  startMin: Minuten;
  dauerMin: Minuten;
  status: EinsatzStatus;
  /** Zeitpunkt der letzten Statusmeldung. */
  statusSeit?: IsoZeitpunkt;
  /** Alle Statuswechsel in Reihenfolge – Grundlage für Zeiten im Rapport. */
  verlauf?: readonly StatusWechsel[];
}

export function einsatzEnde(einsatz: Pick<Einsatz, 'startMin' | 'dauerMin'>): Minuten {
  return einsatz.startMin + einsatz.dauerMin;
}

// ── §4 · Pendenz ─────────────────────────────────────────────────

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
