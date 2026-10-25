/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/rapport.ts                             │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Servicerapport: Zeiten, Arbeiten, Teile, Fotos, Abschluss, Signatur   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { splitZeitpunkt } from '../datum';
import type { IsoZeitpunkt, Minuten } from '../datum';
import type { Foto, RapportStatus } from './auftrag';
import { zeitpunktVon } from './einsatz';
import type { Einsatz, EinsatzStatus } from './einsatz';
import type { Geraeteart } from './stammdaten';

// ── §1 · Typen ───────────────────────────────────────────────────

export type Abschlussart = 'erledigt' | 'folgetermin' | 'teil-bestellt' | 'nicht-angetroffen';

export const ABSCHLUSSARTEN: readonly Abschlussart[] = ['erledigt', 'folgetermin', 'teil-bestellt', 'nicht-angetroffen'];

export const ABSCHLUSS_LABEL: Readonly<Record<Abschlussart, string>> = {
  erledigt: 'Erledigt',
  folgetermin: 'Folgetermin nötig',
  'teil-bestellt': 'Teil bestellt',
  'nicht-angetroffen': 'Nicht angetroffen',
};

/** Zeiten in Minuten, auf das 5-Minuten-Raster gerundet. */
export interface Zeiten {
  anfahrtMin: Minuten;
  arbeitMin: Minuten;
  pauseMin: Minuten;
}

export interface Arbeitsschritt {
  id: string;
  text: string;
  erledigt: boolean;
}

export type TeilVerwendung = 'eingebaut' | 'fahrzeuglager' | 'bestellen';

export const TEIL_VERWENDUNG_LABEL: Readonly<Record<TeilVerwendung, string>> = {
  eingebaut: 'eingebaut',
  fahrzeuglager: 'ab Fahrzeuglager eingebaut',
  bestellen: 'bestellen',
};

export interface RapportTeil {
  artikelNummer: string;
  bezeichnung: string;
  menge: number;
  verwendung: TeilVerwendung;
}

/** Unterschrift als SVG-Pfaddaten in einem 320 × 120 Rahmen – klein, skalierbar, druckbar. */
export interface Unterschrift {
  name: string;
  zeitpunkt: IsoZeitpunkt;
  pfad: string;
}

export interface Rueckmeldung {
  bemerkung: string;
  zeitpunkt: IsoZeitpunkt;
  von: string;
}

export interface Rapport {
  id: string;
  /** Nummernkreis R-26-00417 – jh? Sutt-Nummernkreis für Rapporte klären. */
  nummer: string;
  auftragId: string;
  einsatzId: string;
  technikerId: string;
  status: RapportStatus;
  zeiten: Zeiten;
  arbeiten: readonly Arbeitsschritt[];
  diagnoseCode?: string;
  bemerkung: string;
  teile: readonly RapportTeil[];
  fotos: readonly Foto[];
  abschluss: Abschlussart;
  abschlussGrund?: string;
  unterschrift?: Unterschrift;
  erstelltAm: IsoZeitpunkt;
  geaendertAm: IsoZeitpunkt;
  freigegebenAm?: IsoZeitpunkt;
  verrechnetAm?: IsoZeitpunkt;
  /** «Zurück an Techniker» mit Bemerkung des Büros. */
  rueckmeldung?: Rueckmeldung;
}

// ── §2 · Vorlagen je Geräteart ───────────────────────────────────

// jh? Checklisten mit Sutt abgleichen – heute im Kopf des Technikers oder auf dem Papierrapport?
export const ARBEITEN_VORLAGEN: Readonly<Record<Geraeteart, readonly string[]>> = {
  Waschmaschine: ['Fehlerspeicher ausgelesen', 'Laugenpumpe geprüft und gereinigt', 'Türverriegelung geprüft', 'Heizstab und NTC gemessen', 'Probelauf Kurzprogramm i. O.'],
  Wärmepumpentrockner: ['Fehlerspeicher ausgelesen', 'Flusensieb und Wärmetauscher gereinigt', 'Kondenswasserpumpe geprüft', 'Probelauf i. O.'],
  Geschirrspüler: ['Fehlerspeicher ausgelesen', 'Sprüharme und Siebe gereinigt', 'Umwälz- und Ablaufpumpe geprüft', 'Wasserschutz geprüft', 'Probelauf Kurzprogramm i. O.'],
  Backofen: ['Heizkörper gemessen', 'Gebläse geprüft', 'Türdichtung geprüft', 'Funktionstest i. O.'],
  Steamer: ['Entkalkt', 'Dampferzeuger geprüft', 'Funktionstest i. O.'],
  Kochfeld: ['Induktionsmodul geprüft', 'Anschluss und Absicherung geprüft', 'Funktionstest alle Zonen i. O.'],
  Kühlschrank: ['Kompressor und Lüfter geprüft', 'Türdichtung geprüft', 'Temperatur nach 30 min gemessen'],
  Gefrierschrank: ['Kompressor geprüft', 'Abtauung geprüft', 'Temperatur gemessen'],
};

export function arbeitenFor(art: Geraeteart): Arbeitsschritt[] {
  return ARBEITEN_VORLAGEN[art].map((text, index) => ({ id: `AS-${index + 1}`, text, erledigt: false }));
}

/** Fehlercode aus dem Fehlerbild, z. B. «Pumpt nicht ab, Fehler F18» → F18. */
export function diagnoseCodeOf(fehlerbild: string): string | undefined {
  const treffer = /\b([A-Z]\d{1,3})\b/.exec(fehlerbild);
  return treffer?.[1];
}

// ── §3 · Zeiten ──────────────────────────────────────────────────

export const ZEIT_RASTER: Minuten = 5;

export function rundeAufRaster(minuten: Minuten): Minuten {
  return Math.max(0, Math.round(minuten / ZEIT_RASTER) * ZEIT_RASTER);
}

// jh› Zeiten entstehen aus den Statusknöpfen: Anfahrt = unterwegs → vor Ort,
//     Arbeit = vor Ort → Fertig (oder jetzt). Ohne Verlauf gilt der Plan.
export function zeitenAusVerlauf(einsatz: Einsatz, jetztMin: Minuten): Zeiten {
  const minutenVon = (status: EinsatzStatus): Minuten | undefined => {
    const zeitpunkt = zeitpunktVon(einsatz, status);
    return zeitpunkt ? splitZeitpunkt(zeitpunkt).minuten : undefined;
  };
  const unterwegs = minutenVon('unterwegs');
  const vorOrt = minutenVon('vor-ort');
  const fertig = minutenVon('erledigt') ?? minutenVon('wartet-teil');
  const anfahrt = unterwegs !== undefined && vorOrt !== undefined ? vorOrt - unterwegs : 0;
  const arbeit = vorOrt !== undefined ? (fertig ?? jetztMin) - vorOrt : einsatz.dauerMin;
  return { anfahrtMin: rundeAufRaster(anfahrt), arbeitMin: rundeAufRaster(Math.max(arbeit, ZEIT_RASTER)), pauseMin: 0 };
}

export function verrechenbareMinuten(zeiten: Zeiten): Minuten {
  return Math.max(0, zeiten.anfahrtMin + zeiten.arbeitMin - zeiten.pauseMin);
}

// ── §4 · Nummernkreis & Übergänge ────────────────────────────────

export function nextRapportNummer(rapporte: readonly Pick<Rapport, 'nummer'>[]): string {
  let hoechste = 0;
  for (const rapport of rapporte) {
    const treffer = /^R-26-(\d{5})$/.exec(rapport.nummer);
    if (treffer) hoechste = Math.max(hoechste, Number(treffer[1]));
  }
  return `R-26-${String(hoechste + 1).padStart(5, '0')}`;
}

export function kannFreigeben(rapport: Pick<Rapport, 'status'>): boolean {
  return rapport.status === 'erstellt' || rapport.status === 'unterschrieben';
}

export function kannVerrechnen(rapport: Pick<Rapport, 'status'>): boolean {
  return rapport.status === 'freigegeben';
}

export function istSchreibgeschuetzt(rapport: Pick<Rapport, 'status'>): boolean {
  return rapport.status === 'freigegeben' || rapport.status === 'verrechnet';
}

/** Welchen Einsatzstatus der Abschluss setzt. */
export function statusNachAbschluss(abschluss: Abschlussart): EinsatzStatus {
  return abschluss === 'teil-bestellt' ? 'wartet-teil' : 'erledigt';
}

/* ◆ jh · eof */
