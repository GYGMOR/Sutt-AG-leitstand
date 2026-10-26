/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/persistenz.ts                  │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Stand in localStorage, Spiegelung in andere Fenster (ADR-001)         │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Benutzer } from '../../../core/auth/auth.types';
import type { IsoDatum } from '../../../core/datum';
import type { Absenz } from '../../../core/domain/absenz';
import type { Auftrag } from '../../../core/domain/auftrag';
import type { Einsatz, Pendenz } from '../../../core/domain/einsatz';
import type { JournalEintrag } from '../../../core/domain/journal';
import type { Artikel, Bestellung, Lagerbestand, Lagerbewegung } from '../../../core/domain/lager';
import type { Nachricht } from '../../../core/domain/nachricht';
import type { Mitarbeiter } from '../../../core/domain/personal';
import type { Rapport } from '../../../core/domain/rapport';
import type { Geraet, Kunde, Liegenschaft } from '../../../core/domain/stammdaten';
import type { Monatsabschluss, ZeitEintrag } from '../../../core/domain/zeit';
import type { DispoState, Schnappschuss } from './dispo.reducer';

// ── §1 · Format ──────────────────────────────────────────────────

// jh# 015 «Letzter Schreiber gewinnt» zwischen Fenstern – mit echter API Versionsnummer/ETag gegen verlorene Änderungen (ADR-001).
export const STAND_SCHLUESSEL = 'sl.dispo.stand.v1';
// jh› Version 4 (rev 05): Absenzen, Mitarbeitende (mit Übertrags-Stichtag), Konten, Zeiteinträge,
//     Monatsabschlüsse und Journal im Stand – ältere Stände werden verworfen.
const STAND_VERSION = 4;

/** Serialisierbarer Stand – Maps als Listen, kein Protokoll, keine Auswahl. */
export interface Stand {
  version: typeof STAND_VERSION;
  heute: IsoDatum;
  einsaetze: readonly Einsatz[];
  pendenzen: readonly Pendenz[];
  rapporte: readonly Rapport[];
  nachrichten: readonly Nachricht[];
  bestaende: readonly Lagerbestand[];
  bestellungen: readonly Bestellung[];
  bewegungen: readonly Lagerbewegung[];
  zeiteintraege: readonly ZeitEintrag[];
  monatsabschluesse: readonly Monatsabschluss[];
  journal: readonly JournalEintrag[];
  absenzen: readonly Absenz[];
  auftraege: readonly Auftrag[];
  geraete: readonly Geraet[];
  kunden: readonly Kunde[];
  liegenschaften: readonly Liegenschaft[];
  artikel: readonly Artikel[];
  mitarbeiter: readonly Mitarbeiter[];
  benutzer: readonly Benutzer[];
}

type StandQuelle = Pick<DispoState, 'einsaetze' | 'pendenzen' | 'rapporte' | 'nachrichten' | 'bestaende' | 'bestellungen' | 'bewegungen' | 'zeiteintraege' | 'monatsabschluesse' | 'journal' | 'stammdaten'>;

export function standAus(state: StandQuelle, heute: IsoDatum): Stand {
  return {
    version: STAND_VERSION,
    heute,
    einsaetze: state.einsaetze,
    pendenzen: state.pendenzen,
    rapporte: state.rapporte,
    nachrichten: state.nachrichten,
    bestaende: state.bestaende,
    bestellungen: state.bestellungen,
    bewegungen: state.bewegungen,
    zeiteintraege: state.zeiteintraege,
    monatsabschluesse: state.monatsabschluesse,
    journal: state.journal,
    absenzen: state.stammdaten.absenzen,
    auftraege: [...state.stammdaten.auftraege.values()],
    geraete: [...state.stammdaten.geraete.values()],
    kunden: [...state.stammdaten.kunden.values()],
    liegenschaften: [...state.stammdaten.liegenschaften.values()],
    artikel: [...state.stammdaten.artikel.values()],
    mitarbeiter: [...state.stammdaten.mitarbeiter.values()],
    benutzer: [...state.stammdaten.benutzer.values()],
  };
}

function byId<T extends { id: string }>(liste: readonly T[]): ReadonlyMap<string, T> {
  return new Map(liste.map((eintrag) => [eintrag.id, eintrag]));
}

export function schnappschussAus(stand: Stand): Schnappschuss {
  return {
    einsaetze: stand.einsaetze,
    pendenzen: stand.pendenzen,
    rapporte: stand.rapporte,
    nachrichten: stand.nachrichten,
    bestaende: stand.bestaende,
    bestellungen: stand.bestellungen,
    bewegungen: stand.bewegungen,
    zeiteintraege: stand.zeiteintraege,
    monatsabschluesse: stand.monatsabschluesse,
    journal: stand.journal,
    absenzen: stand.absenzen,
    auftraege: byId(stand.auftraege),
    geraete: byId(stand.geraete),
    kunden: byId(stand.kunden),
    liegenschaften: byId(stand.liegenschaften),
    artikel: new Map(stand.artikel.map((artikel) => [artikel.artikelNummer, artikel])),
    mitarbeiter: byId(stand.mitarbeiter),
    benutzer: byId(stand.benutzer),
  };
}

const LISTEN: readonly (keyof Stand)[] = [
  'einsaetze', 'pendenzen', 'rapporte', 'nachrichten', 'bestaende', 'bestellungen', 'bewegungen',
  'zeiteintraege', 'monatsabschluesse', 'journal', 'absenzen',
  'auftraege', 'geraete', 'kunden', 'liegenschaften', 'artikel', 'mitarbeiter', 'benutzer',
];

// jh› Mockdaten hängen am Datum: ein Stand von gestern passt nicht zu den Einsätzen von heute.
export function isStand(wert: unknown, heute: IsoDatum): wert is Stand {
  if (typeof wert !== 'object' || wert === null) return false;
  const kandidat = wert as Partial<Stand>;
  return kandidat.version === STAND_VERSION && kandidat.heute === heute && LISTEN.every((feld) => Array.isArray(kandidat[feld]));
}

export function serialisiere(stand: Stand): string {
  return JSON.stringify(stand);
}

export function parseStand(roh: string | null, heute: IsoDatum): Stand | null {
  if (!roh) return null;
  try {
    const wert: unknown = JSON.parse(roh);
    return isStand(wert, heute) ? wert : null;
  } catch {
    return null;
  }
}

// ── §2 · Lesen & Schreiben ───────────────────────────────────────

function speicher(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ladeStand(heute: IsoDatum): { stand: Stand; roh: string } | null {
  const roh = speicher()?.getItem(STAND_SCHLUESSEL) ?? null;
  const stand = parseStand(roh, heute);
  return stand && roh ? { stand, roh } : null;
}

/** Schreibt den Stand; gibt den geschriebenen Text zurück (oder null, wenn der Speicher fehlt). */
export function schreibeStand(stand: Stand, roh: string = serialisiere(stand)): string | null {
  try {
    speicher()?.setItem(STAND_SCHLUESSEL, roh);
    return roh;
  } catch {
    // jh› Speicher voll oder gesperrt: Stand bleibt im Fenster – Persistenz ist Komfort.
    return null;
  }
}

export function loescheStand(): void {
  try {
    speicher()?.removeItem(STAND_SCHLUESSEL);
  } catch {
    // bewusst still
  }
}

// ── §3 · Andere Fenster ──────────────────────────────────────────

// jh› «storage» feuert nur in fremden Fenstern – genau das, was die Zwei-Fenster-Demo braucht.
export function beobachteFremdeFenster(heute: IsoDatum, onStand: (stand: Stand, roh: string) => void): () => void {
  const listener = (ereignis: StorageEvent) => {
    if (ereignis.key !== STAND_SCHLUESSEL || ereignis.newValue === null) return;
    const stand = parseStand(ereignis.newValue, heute);
    if (stand) onStand(stand, ereignis.newValue);
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

/* ◆ jh · eof */
