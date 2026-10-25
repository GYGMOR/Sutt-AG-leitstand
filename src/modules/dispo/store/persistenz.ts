/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/persistenz.ts                  │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Stand in localStorage, Spiegelung in andere Fenster (ADR-001)         │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum } from '../../../core/datum';
import type { Auftrag } from '../../../core/domain/auftrag';
import type { Einsatz, Pendenz } from '../../../core/domain/einsatz';
import type { Artikel, Bestellung, Lagerbestand, Lagerbewegung } from '../../../core/domain/lager';
import type { Nachricht } from '../../../core/domain/nachricht';
import type { Rapport } from '../../../core/domain/rapport';
import type { Geraet, Kunde, Liegenschaft } from '../../../core/domain/stammdaten';
import type { DispoState, Schnappschuss } from './dispo.reducer';

// ── §1 · Format ──────────────────────────────────────────────────

// jh# 015 «Letzter Schreiber gewinnt» zwischen Fenstern – mit echter API Versionsnummer/ETag gegen verlorene Änderungen (ADR-001).
export const STAND_SCHLUESSEL = 'sl.dispo.stand.v1';
// jh› Version 2 (rev 04): Kunden, Liegenschaften, Artikel und Lager im Stand – ältere Stände werden verworfen.
const STAND_VERSION = 2;

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
  auftraege: readonly Auftrag[];
  geraete: readonly Geraet[];
  kunden: readonly Kunde[];
  liegenschaften: readonly Liegenschaft[];
  artikel: readonly Artikel[];
}

type StandQuelle = Pick<DispoState, 'einsaetze' | 'pendenzen' | 'rapporte' | 'nachrichten' | 'bestaende' | 'bestellungen' | 'bewegungen' | 'stammdaten'>;

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
    auftraege: [...state.stammdaten.auftraege.values()],
    geraete: [...state.stammdaten.geraete.values()],
    kunden: [...state.stammdaten.kunden.values()],
    liegenschaften: [...state.stammdaten.liegenschaften.values()],
    artikel: [...state.stammdaten.artikel.values()],
  };
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
    auftraege: new Map(stand.auftraege.map((auftrag) => [auftrag.id, auftrag])),
    geraete: new Map(stand.geraete.map((geraet) => [geraet.id, geraet])),
    kunden: new Map(stand.kunden.map((kunde) => [kunde.id, kunde])),
    liegenschaften: new Map(stand.liegenschaften.map((liegenschaft) => [liegenschaft.id, liegenschaft])),
    artikel: new Map(stand.artikel.map((artikel) => [artikel.artikelNummer, artikel])),
  };
}

const LISTEN: readonly (keyof Stand)[] = ['einsaetze', 'pendenzen', 'rapporte', 'nachrichten', 'bestaende', 'bestellungen', 'bewegungen', 'auftraege', 'geraete', 'kunden', 'liegenschaften', 'artikel'];

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
