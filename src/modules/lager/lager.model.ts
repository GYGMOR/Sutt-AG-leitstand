/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/lager/lager.model.ts                       │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Lager-Sichten: Artikel mit Stufe, Bestellungen, Fahrzeuge, Journal    │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum } from '../../core/datum';
import type { Auftrag } from '../../core/domain/auftrag';
import { ARTIKEL_GRUPPE_LABEL, LAGER_GLATTBRUGG, bestandGesamt, bestandStufe, istUeberfaellig, technikerIdVon } from '../../core/domain/lager';
import type { Artikel, ArtikelGruppe, BestandStufe, Bestellung, LagerOrt, Lagerbestand, Lagerbewegung } from '../../core/domain/lager';
import type { Kunde, Techniker } from '../../core/domain/stammdaten';
import { normalizeSuchtext } from '../../core/suche';
import type { DispoStammdaten } from '../dispo/dispo.types';
import { passtZurSuche } from '../auftraege/auftraege.model';

// ── §1 · Artikel ─────────────────────────────────────────────────

export interface ArtikelView {
  artikel: Artikel;
  glattbrugg: number;
  fahrzeuge: number;
  stufe: BestandStufe;
  offeneBestellungen: Bestellung[];
  /** Aufträge, an denen das Teil hängt (bestellt oder verbaut). */
  verwendungen: number;
}

export function buildArtikelViews(stammdaten: DispoStammdaten, bestaende: readonly Lagerbestand[], bestellungen: readonly Bestellung[]): ArtikelView[] {
  const verwendungen = new Map<string, number>();
  for (const auftrag of stammdaten.auftraege.values()) {
    for (const teil of auftrag.ersatzteile) verwendungen.set(teil.artikelNummer, (verwendungen.get(teil.artikelNummer) ?? 0) + 1);
  }
  return [...stammdaten.artikel.values()]
    .map((artikel) => {
      const summe = bestandGesamt(bestaende, artikel.artikelNummer);
      return {
        artikel,
        glattbrugg: summe.glattbrugg,
        fahrzeuge: summe.fahrzeuge,
        stufe: bestandStufe(summe.glattbrugg, artikel.mindestbestand),
        offeneBestellungen: bestellungen.filter((bestellung) => bestellung.status === 'offen' && bestellung.artikelNummer === artikel.artikelNummer),
        verwendungen: verwendungen.get(artikel.artikelNummer) ?? 0,
      };
    })
    .sort((a, b) => a.artikel.bezeichnung.localeCompare(b.artikel.bezeichnung, 'de-CH') || a.artikel.artikelNummer.localeCompare(b.artikel.artikelNummer));
}

export function suchtextVonArtikel(view: ArtikelView): string {
  const { artikel } = view;
  return normalizeSuchtext([artikel.artikelNummer, artikel.bezeichnung, artikel.marke ?? '', artikel.passtZu ?? '', artikel.lieferant, ARTIKEL_GRUPPE_LABEL[artikel.gruppe]].join(' '));
}

export type ArtikelSicht = 'alle' | 'knapp' | 'leer' | 'bestellt';

export interface ArtikelFilter {
  sicht: ArtikelSicht;
  gruppe: ArtikelGruppe | 'alle';
  suche: string;
}

export const LEERER_ARTIKEL_FILTER: ArtikelFilter = { sicht: 'alle', gruppe: 'alle', suche: '' };

export function filterArtikel(views: readonly ArtikelView[], filter: ArtikelFilter): ArtikelView[] {
  return views.filter(
    (view) =>
      (filter.sicht === 'alle' || (filter.sicht === 'bestellt' ? view.offeneBestellungen.length > 0 : view.stufe === filter.sicht)) &&
      (filter.gruppe === 'alle' || view.artikel.gruppe === filter.gruppe) &&
      (filter.suche.trim() === '' || passtZurSuche(suchtextVonArtikel(view), filter.suche)),
  );
}

// ── §2 · Bestellungen ────────────────────────────────────────────

export interface BestellungView {
  bestellung: Bestellung;
  artikel: Artikel | null;
  auftrag: Auftrag | null;
  kunde: Kunde | null;
  ueberfaellig: boolean;
  /** Liefertermin ist heute. */
  heute: boolean;
}

export type BestellSicht = 'offen' | 'ueberfaellig' | 'heute' | 'eingetroffen' | 'alle';

export const BESTELL_SICHTEN: readonly { id: BestellSicht; label: string }[] = [
  { id: 'offen', label: 'Offen' },
  { id: 'ueberfaellig', label: 'Überfällig' },
  { id: 'heute', label: 'Lieferung heute' },
  { id: 'eingetroffen', label: 'Eingetroffen' },
  { id: 'alle', label: 'Alle' },
];

export function buildBestellungViews(stammdaten: DispoStammdaten, bestellungen: readonly Bestellung[], heute: IsoDatum): BestellungView[] {
  return bestellungen
    .map((bestellung) => {
      const auftrag = bestellung.auftragId ? (stammdaten.auftraege.get(bestellung.auftragId) ?? null) : null;
      return {
        bestellung,
        artikel: stammdaten.artikel.get(bestellung.artikelNummer) ?? null,
        auftrag,
        kunde: auftrag ? (stammdaten.kunden.get(auftrag.kundeId) ?? null) : null,
        ueberfaellig: istUeberfaellig(bestellung, heute),
        heute: bestellung.status === 'offen' && bestellung.liefertermin === heute,
      };
    })
    .sort((a, b) => {
      const offenA = a.bestellung.status === 'offen' ? 0 : 1;
      const offenB = b.bestellung.status === 'offen' ? 0 : 1;
      return offenA - offenB || a.bestellung.liefertermin.localeCompare(b.bestellung.liefertermin) || b.bestellung.bestelltAm.localeCompare(a.bestellung.bestelltAm);
    });
}

export function passtZurBestellSicht(view: BestellungView, sicht: BestellSicht): boolean {
  switch (sicht) {
    case 'alle':
      return true;
    case 'offen':
      return view.bestellung.status === 'offen';
    case 'ueberfaellig':
      return view.ueberfaellig;
    case 'heute':
      return view.heute;
    case 'eingetroffen':
      return view.bestellung.status === 'eingetroffen';
  }
}

export function filterBestellungen(views: readonly BestellungView[], sicht: BestellSicht, suche: string): BestellungView[] {
  return views.filter(
    (view) =>
      passtZurBestellSicht(view, sicht) &&
      (suche.trim() === '' || passtZurSuche(normalizeSuchtext([view.bestellung.nummer, view.bestellung.bezeichnung, view.bestellung.artikelNummer, view.bestellung.lieferant, view.auftrag?.nummer ?? '', view.kunde?.name ?? ''].join(' ')), suche)),
  );
}

// ── §3 · Fahrzeuge & Journal ─────────────────────────────────────

export interface FahrzeugEintrag {
  artikel: Artikel;
  menge: number;
}

export interface FahrzeugView {
  techniker: Techniker;
  ort: LagerOrt;
  eintraege: FahrzeugEintrag[];
  stueck: number;
}

export function buildFahrzeugViews(stammdaten: DispoStammdaten, bestaende: readonly Lagerbestand[]): FahrzeugView[] {
  return stammdaten.techniker.map((techniker) => {
    const ort: LagerOrt = `fahrzeug:${techniker.id}`;
    const eintraege = bestaende
      .filter((bestand) => bestand.ort === ort && bestand.menge > 0)
      .map((bestand) => ({ artikel: stammdaten.artikel.get(bestand.artikelNummer), menge: bestand.menge }))
      .filter((eintrag): eintrag is FahrzeugEintrag => eintrag.artikel !== undefined)
      .sort((a, b) => a.artikel.bezeichnung.localeCompare(b.artikel.bezeichnung, 'de-CH'));
    return { techniker, ort, eintraege, stueck: eintraege.reduce((summe, eintrag) => summe + eintrag.menge, 0) };
  });
}

export interface BewegungView {
  bewegung: Lagerbewegung;
  artikel: Artikel | null;
  auftrag: Auftrag | null;
}

export function buildBewegungViews(stammdaten: DispoStammdaten, bewegungen: readonly Lagerbewegung[]): BewegungView[] {
  return bewegungen.map((bewegung) => ({
    bewegung,
    artikel: stammdaten.artikel.get(bewegung.artikelNummer) ?? null,
    auftrag: bewegung.auftragId ? (stammdaten.auftraege.get(bewegung.auftragId) ?? null) : null,
  }));
}

export function ortLabel(ort: LagerOrt, stammdaten: Pick<DispoStammdaten, 'techniker'>): string {
  const technikerId = technikerIdVon(ort);
  if (!technikerId) return 'Glattbrugg';
  const techniker = stammdaten.techniker.find((kandidat) => kandidat.id === technikerId);
  return techniker ? `Fahrzeug ${techniker.kuerzel}` : 'Fahrzeug';
}

export const ALLE_ORTE = (stammdaten: Pick<DispoStammdaten, 'techniker'>): readonly { ort: LagerOrt; label: string }[] => [
  { ort: LAGER_GLATTBRUGG, label: 'Glattbrugg' },
  ...stammdaten.techniker.map((techniker) => ({ ort: `fahrzeug:${techniker.id}` as LagerOrt, label: `Fahrzeug ${techniker.kuerzel} · ${techniker.fahrzeug}` })),
];

// ── §4 · Zähler ──────────────────────────────────────────────────

export interface LagerZaehler {
  artikel: number;
  knapp: number;
  leer: number;
  offen: number;
  ueberfaellig: number;
  heute: number;
  fahrzeugStueck: number;
}

export function zaehleLager(artikel: readonly ArtikelView[], bestellungen: readonly BestellungView[], fahrzeuge: readonly FahrzeugView[]): LagerZaehler {
  return {
    artikel: artikel.length,
    knapp: artikel.filter((view) => view.stufe === 'knapp').length,
    leer: artikel.filter((view) => view.stufe === 'leer').length,
    offen: bestellungen.filter((view) => view.bestellung.status === 'offen').length,
    ueberfaellig: bestellungen.filter((view) => view.ueberfaellig).length,
    heute: bestellungen.filter((view) => view.heute).length,
    fahrzeugStueck: fahrzeuge.reduce((summe, view) => summe + view.stueck, 0),
  };
}

/* ◆ jh · eof */
