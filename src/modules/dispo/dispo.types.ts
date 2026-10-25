/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/dispo.types.ts                       │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Dispo-Typen: Ansicht, Farbe-nach, Zoom, Filter, Auswahl, Bestand      │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum, Minuten } from '../../core/datum';
import type { Auftrag } from '../../core/domain/auftrag';
import type { Einsatz, EinsatzStatus, Pendenz } from '../../core/domain/einsatz';
import type { Kategorie } from '../../core/domain/kategorie';
import type { Artikel, Bestellung, Lagerbestand, Lagerbewegung } from '../../core/domain/lager';
import type { Nachricht } from '../../core/domain/nachricht';
import type { Rapport } from '../../core/domain/rapport';
import type { Absenz, Geraet, Kunde, Liegenschaft, Region, Techniker } from '../../core/domain/stammdaten';

export type { Einsatz, EinsatzStatus, Pendenz };

// ── §1 · Ansicht ─────────────────────────────────────────────────

export type Ansicht = 'plantafel' | 'kalender' | 'liste' | 'karte';

export const ANSICHTEN: readonly Ansicht[] = ['plantafel', 'kalender', 'liste', 'karte'];

export const ANSICHT_LABEL: Readonly<Record<Ansicht, string>> = {
  plantafel: 'Plantafel',
  kalender: 'Kalender',
  liste: 'Liste',
  karte: 'Karte',
};

export function isAnsicht(wert: string | undefined): wert is Ansicht {
  return wert !== undefined && (ANSICHTEN as readonly string[]).includes(wert);
}

export type FarbeNach = 'kategorie' | 'techniker' | 'region' | 'status';

export const FARBE_NACH_LABEL: Readonly<Record<FarbeNach, string>> = {
  kategorie: 'Kategorie',
  techniker: 'Techniker',
  region: 'Region',
  status: 'Status',
};

/** Rasterdichte der Zeitachse in Minuten. */
export type Zoom = 15 | 30 | 60;

export type PanelTab = 'eingang' | 'wartet' | 'erledigt';

// ── §2 · Datenbestand ────────────────────────────────────────────

export interface DispoStammdaten {
  techniker: readonly Techniker[];
  auftraege: ReadonlyMap<string, Auftrag>;
  kunden: ReadonlyMap<string, Kunde>;
  liegenschaften: ReadonlyMap<string, Liegenschaft>;
  geraete: ReadonlyMap<string, Geraet>;
  artikel: ReadonlyMap<string, Artikel>;
  absenzen: readonly Absenz[];
}

export interface DispoBestand {
  einsaetze: readonly Einsatz[];
  pendenzen: readonly Pendenz[];
  rapporte: readonly Rapport[];
  nachrichten: readonly Nachricht[];
  bestaende: readonly Lagerbestand[];
  bestellungen: readonly Bestellung[];
  bewegungen: readonly Lagerbewegung[];
}

// ── §3 · Filter, Auswahl, Ziel ───────────────────────────────────

export interface DispoFilter {
  /** Leer = alle Techniker sichtbar. */
  technikerIds: readonly string[];
  /** Leer = alle Status hervorgehoben. */
  status: readonly EinsatzStatus[];
  /** Leer = alle Kategorien. */
  kategorien: readonly Kategorie[];
  region: Region | 'alle';
}

export const LEERER_FILTER: DispoFilter = { technikerIds: [], status: [], kategorien: [], region: 'alle' };

export function isFilterAktiv(filter: DispoFilter): boolean {
  return filter.technikerIds.length > 0 || filter.status.length > 0 || filter.kategorien.length > 0 || filter.region !== 'alle';
}

export type DispoAuswahl = { art: 'einsatz'; einsatzId: string } | { art: 'pendenz'; pendenzId: string } | null;

export interface PlanZiel {
  technikerId: string;
  datum: IsoDatum;
  startMin: Minuten;
}

/* ◆ jh · eof */
