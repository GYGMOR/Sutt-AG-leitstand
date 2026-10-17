/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/auftrag.ts                             │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Auftrag: Kategorie, Dringlichkeit, Parteien, Teile, Fotos, Rapport    │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum, IsoZeitpunkt, Minuten } from '../datum';
import type { Kategorie } from './kategorie';
import type { Kontakt, Marke, Wohnung } from './stammdaten';

// ── §1 · Klassifikation ──────────────────────────────────────────

export type Auftragsart =
  | 'Reparatur'
  | 'Service'
  | 'Montage'
  | 'Lieferung'
  | 'Garantie'
  | 'Mietgerät'
  | 'Malerarbeiten'
  | 'Abklärung';

export type Dringlichkeit = 'notfall' | 'hoch' | 'normal' | 'tief';

export const DRINGLICHKEIT_RANG: Readonly<Record<Dringlichkeit, number>> = {
  notfall: 0,
  hoch: 1,
  normal: 2,
  tief: 3,
};

export const DRINGLICHKEIT_LABEL: Readonly<Record<Dringlichkeit, string>> = {
  notfall: 'Notfall',
  hoch: 'Hoch',
  normal: 'Normal',
  tief: 'Tief',
};

// jh› «Dringend» im Plan = Notfall oder Hoch. Normal/Tief bleiben ohne Signal,
//     sonst verliert Orange seine Wirkung.
export function isDringend(dringlichkeit: Dringlichkeit): boolean {
  return dringlichkeit === 'notfall' || dringlichkeit === 'hoch';
}

export type Eingangskanal = 'Telefon' | 'E-Mail' | 'Portal' | 'Schnellerfassung';

// ── §2 · Parteien ────────────────────────────────────────────────

export type VorOrtRolle = 'Mieter' | 'Eigentümer' | 'Hauswart' | 'Betrieb';

export interface KontaktVorOrt extends Kontakt {
  rolle: VorOrtRolle;
}

// jh› Rechnungsempfänger als Union: wer zahlt, ist fachlich eine Entscheidung
//     (Verwaltung, Mieter-Verschulden, Herstellergarantie) – kein Freitext.
export type Rechnungsempfaenger =
  | { art: 'auftraggeber'; referenz?: string }
  | { art: 'mieter'; grund: string }
  | { art: 'garantie'; marke: Marke; fallNummer: string };

// ── §3 · Ersatzteile ─────────────────────────────────────────────

export type TeilStatus = 'ab-lager' | 'bestellt' | 'unterwegs' | 'eingetroffen';

export const TEIL_STATUS_LABEL: Readonly<Record<TeilStatus, string>> = {
  'ab-lager': 'ab Lager',
  bestellt: 'bestellt',
  unterwegs: 'unterwegs',
  eingetroffen: 'geliefert',
};

export interface Ersatzteil {
  artikelNummer: string;
  bezeichnung: string;
  menge: number;
  preisChf: number;
  status: TeilStatus;
  lieferant: string;
  liefertermin?: IsoDatum;
}

export function isTeilOffen(teil: Ersatzteil): boolean {
  return teil.status === 'bestellt' || teil.status === 'unterwegs';
}

// ── §4 · Fotos, Rapport, Verrechnung ─────────────────────────────

export type FotoMotiv = 'typenschild' | 'schaden' | 'anschluss' | 'einbau' | 'uebersicht';

export const FOTO_MOTIV_LABEL: Readonly<Record<FotoMotiv, string>> = {
  typenschild: 'Typenschild',
  schaden: 'Schadenbild',
  anschluss: 'Anschluss',
  einbau: 'Einbausituation',
  uebersicht: 'Übersicht',
};

export interface Foto {
  id: string;
  motiv: FotoMotiv;
  aufgenommenAm: IsoZeitpunkt;
  technikerKuerzel: string;
}

export type RapportStatus = 'offen' | 'erstellt' | 'unterschrieben';

export const RAPPORT_LABEL: Readonly<Record<RapportStatus, string>> = {
  offen: 'Rapport offen',
  erstellt: 'Rapport erstellt',
  unterschrieben: 'Rapport unterschrieben',
};

export type RechnungStatus = 'offen' | 'gestellt' | 'bezahlt';

export const RECHNUNG_LABEL: Readonly<Record<RechnungStatus, string>> = {
  offen: 'nicht verrechnet',
  gestellt: 'Rechnung offen',
  bezahlt: 'bezahlt',
};

// ── §5 · Auftrag ─────────────────────────────────────────────────

export interface Auftrag {
  id: string;
  nummer: string;
  art: Auftragsart;
  kategorie: Kategorie;
  dringlichkeit: Dringlichkeit;
  fehlerbild: string;
  kanal: Eingangskanal;
  angefragtAm: IsoZeitpunkt;
  /** Fehlt, solange die Verwaltung den Auftrag nicht erteilt hat. */
  bestelltAm?: IsoZeitpunkt;
  kundeId: string;
  liegenschaftId: string;
  wohnung?: Wohnung;
  kontaktVorOrt: KontaktVorOrt;
  rechnung: Rechnungsempfaenger;
  geraetId: string;
  ersatzteile: readonly Ersatzteil[];
  fotos: readonly Foto[];
  rapport: RapportStatus;
  rechnungStatus: RechnungStatus;
  /** Geschätzte Einsatzdauer vor Ort. */
  dauerMin: Minuten;
  notiz?: string;
  /** Zusammenhang mit einem anderen Auftrag: Mietgerät zur Reparatur, Lieferung als Ersatz, Malerarbeiten nach dem Schaden. */
  bezugAuftragId?: string;
}

/* ◆ jh · eof */
