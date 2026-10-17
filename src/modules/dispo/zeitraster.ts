/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/zeitraster.ts                        │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Zeitachse 06–20 Uhr, Arbeitszeit 07–18, Zoom 15/30/60, Spuren, Slots  │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Minuten } from '../../core/datum';
import type { Zoom } from './dispo.types';

// ── §1 · Achse ───────────────────────────────────────────────────

/** Sichtbare, scrollbare Achse – Randzeiten gedimmt. */
export const ACHSE_START: Minuten = 6 * 60;
export const ACHSE_ENDE: Minuten = 20 * 60;

/** Arbeitszeit – hervorgehoben, Grundlage für Zoom 60 und Konflikte. */
export const ARBEIT_START: Minuten = 7 * 60;
export const ARBEIT_ENDE: Minuten = 18 * 60;
export const ARBEIT_SPANNE: Minuten = ARBEIT_ENDE - ARBEIT_START;

/** Übliche Abfahrt ab Werkstatt – frühester Vorschlag für freie Slots. */
export const ARBEITSBEGINN: Minuten = 7 * 60 + 30;

// jh? Mittagspause fix 12:00–13:00 für alle Techniker, oder individuell?
export const MITTAG = { startMin: 12 * 60, dauerMin: 60 } as const;

export const ZOOM_STUFEN: readonly Zoom[] = [60, 30, 15];

export function isZoom(wert: unknown): wert is Zoom {
  return wert === 15 || wert === 30 || wert === 60;
}

export const STUNDEN: readonly Minuten[] = Array.from({ length: (ACHSE_ENDE - ACHSE_START) / 60 + 1 }, (_, index) => ACHSE_START + index * 60);

// ── §2 · Skala ───────────────────────────────────────────────────

export interface Skala {
  startMin: Minuten;
  endeMin: Minuten;
  pxPerMin: number;
  zoom: Zoom;
  /** Raster, auf das beim Ziehen eingerastet wird. */
  rasterMin: Minuten;
}

/** Unter 84 px pro Stunde zeigt ein 60-min-Block nur noch die Nummer – das ist die Untergrenze. */
const MIN_PX_PRO_STUNDE = 84;

// jh› Zoom 60: die Arbeitszeit füllt die Breite (mind. 84 px/h), Randzeiten scrollen.
//     Zoom 30/15: doppelt bzw. vierfach – dichtes Raster, breite Karten.
//     Geschnappt wird bei 60 trotzdem auf 30 min: kein Techniker fährt nur zur vollen Stunde.
export function createSkala(arbeitsBreitePx: number, zoom: Zoom): Skala {
  const faktor = 60 / zoom;
  const pxPerMin = Math.max(Math.max(arbeitsBreitePx, 320) / ARBEIT_SPANNE, MIN_PX_PRO_STUNDE / 60) * faktor;
  return { startMin: ACHSE_START, endeMin: ACHSE_ENDE, pxPerMin, zoom, rasterMin: zoom === 60 ? 30 : zoom };
}

export function xOf(skala: Skala, minuten: Minuten): number {
  return (minuten - skala.startMin) * skala.pxPerMin;
}

export function breiteOf(skala: Skala, dauer: Minuten): number {
  return dauer * skala.pxPerMin;
}

export function minOfX(skala: Skala, x: number): Minuten {
  return skala.startMin + x / skala.pxPerMin;
}

export function gesamtBreite(skala: Skala): number {
  return (skala.endeMin - skala.startMin) * skala.pxPerMin;
}

/** Rasterlinien: Stunden + Zwischenlinien gemäss Zoom. */
export function rasterLinien(skala: Skala): { minuten: Minuten; stunde: boolean }[] {
  const linien: { minuten: Minuten; stunde: boolean }[] = [];
  for (let minuten = skala.startMin; minuten <= skala.endeMin; minuten += skala.zoom) {
    linien.push({ minuten, stunde: minuten % 60 === 0 });
  }
  return linien;
}

// ── §3 · Einrasten ───────────────────────────────────────────────

export function floorToRaster(minuten: Minuten, raster: Minuten): Minuten {
  return Math.floor(minuten / raster) * raster;
}

export function roundToRaster(minuten: Minuten, raster: Minuten): Minuten {
  return Math.round(minuten / raster) * raster;
}

export function ceilToRaster(minuten: Minuten, raster: Minuten): Minuten {
  return Math.ceil(minuten / raster) * raster;
}

/** Hält einen Block vollständig innerhalb der Achse. */
export function clampStart(start: Minuten, dauer: Minuten): Minuten {
  return Math.min(Math.max(start, ACHSE_START), ACHSE_ENDE - dauer);
}

// ── §4 · Belegung ────────────────────────────────────────────────

export interface Zeitfenster {
  startMin: Minuten;
  dauerMin: Minuten;
}

export function overlaps(a: Zeitfenster, b: Zeitfenster): boolean {
  return a.startMin < b.startMin + b.dauerMin && b.startMin < a.startMin + a.dauerMin;
}

export function sumDauer(fenster: readonly Zeitfenster[]): Minuten {
  return fenster.reduce((summe, eintrag) => summe + eintrag.dauerMin, 0);
}

export interface SpurBelegung<T> {
  eintrag: T;
  spur: number;
}

// jh› Überschneidungen werden nicht verhindert, sondern sichtbar gemacht:
//     jede Kollision bekommt eine eigene Spur, die Zeile wächst mit.
export function assignLanes<T extends Zeitfenster>(eintraege: readonly T[]): { belegung: SpurBelegung<T>[]; spuren: number } {
  const sortiert = [...eintraege].sort((a, b) => a.startMin - b.startMin || b.dauerMin - a.dauerMin);
  const spurEnde: Minuten[] = [];
  const belegung = sortiert.map((eintrag) => {
    const frei = spurEnde.findIndex((ende) => ende <= eintrag.startMin);
    const spur = frei === -1 ? spurEnde.length : frei;
    spurEnde[spur] = eintrag.startMin + eintrag.dauerMin;
    return { eintrag, spur };
  });
  return { belegung, spuren: Math.max(1, spurEnde.length) };
}

/** Erster freier Slot ab `ab` (auf Raster aufgerundet) innerhalb der Arbeitszeit, oder null. */
export function findFreeSlot(belegt: readonly Zeitfenster[], dauer: Minuten, ab: Minuten = ARBEITSBEGINN, raster: Minuten = 30): Minuten | null {
  for (let start = ceilToRaster(Math.max(ab, ARBEIT_START), raster); start + dauer <= ARBEIT_ENDE; start += raster) {
    const kandidat = { startMin: start, dauerMin: dauer };
    if (!belegt.some((fenster) => overlaps(fenster, kandidat))) return start;
  }
  return null;
}

/** Alle freien, rastergenauen Startzeiten für `dauer` innerhalb der Arbeitszeit. */
export function findFreeStarts(belegt: readonly Zeitfenster[], dauer: Minuten, raster: Minuten, ab: Minuten = ARBEIT_START): Minuten[] {
  const starts: Minuten[] = [];
  for (let start = ceilToRaster(Math.max(ab, ARBEIT_START), raster); start + dauer <= ARBEIT_ENDE; start += raster) {
    const kandidat = { startMin: start, dauerMin: dauer };
    if (!belegt.some((fenster) => overlaps(fenster, kandidat))) starts.push(start);
  }
  return starts;
}

/* ◆ jh · eof */
