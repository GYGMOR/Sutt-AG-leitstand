/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/dispo.reducer.ts               │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Betriebs-State: Plan, Rapport, Stammdaten, Lager, Personal, Journal   │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Benutzer } from '../../../core/auth/auth.types';
import { splitZeitpunkt } from '../../../core/datum';
import type { IsoDatum, IsoZeitpunkt, Minuten } from '../../../core/datum';
import { ueberschneidung } from '../../../core/domain/absenz';
import type { Absenz, AbsenzStatus } from '../../../core/domain/absenz';
import type { Auftrag, Ersatzteil } from '../../../core/domain/auftrag';
import { mitStatuswechsel } from '../../../core/domain/einsatz';
import type { Einsatz, EinsatzStatus, Pendenz, StatusQuelle } from '../../../core/domain/einsatz';
import { JOURNAL_MAX, bereichVonAktion } from '../../../core/domain/journal';
import type { JournalArt, JournalBereich, JournalEintrag } from '../../../core/domain/journal';
import { wendeBewegungAn } from '../../../core/domain/lager';
import type { Artikel, Bestellung, Lagerbestand, Lagerbewegung } from '../../../core/domain/lager';
import type { Nachricht } from '../../../core/domain/nachricht';
import type { Mitarbeiter } from '../../../core/domain/personal';
import { istSchreibgeschuetzt, statusNachAbschluss } from '../../../core/domain/rapport';
import type { Rapport, Unterschrift } from '../../../core/domain/rapport';
import type { Geraet, Kunde, Liegenschaft } from '../../../core/domain/stammdaten';
import { abschlussFuer, istMonatGesperrt, stempeln as stempelnRein, ueberlappt } from '../../../core/domain/zeit';
import type { Monatsabschluss, StempelArt, ZeitArt, ZeitEintrag, ZeitGeraet } from '../../../core/domain/zeit';
import type { DispoAuswahl, DispoBestand, DispoStammdaten, PlanZiel } from '../dispo.types';

// ── §1 · State ───────────────────────────────────────────────────

// jh› Alles, was ein Modul bearbeitet, liegt im Schnappschuss (ADR-003): Undo, Protokoll und
//     Fenster-Spiegelung gelten damit für Kunden, Lager und Personal genauso wie für den Plan.
export interface Schnappschuss {
  einsaetze: readonly Einsatz[];
  pendenzen: readonly Pendenz[];
  rapporte: readonly Rapport[];
  nachrichten: readonly Nachricht[];
  bestaende: readonly Lagerbestand[];
  bestellungen: readonly Bestellung[];
  bewegungen: readonly Lagerbewegung[];
  zeiteintraege: readonly ZeitEintrag[];
  monatsabschluesse: readonly Monatsabschluss[];
  /** Append-only – Undo schreibt einen neuen Eintrag statt einen zu entfernen (ADR-007). */
  journal: readonly JournalEintrag[];
  absenzen: readonly Absenz[];
  auftraege: ReadonlyMap<string, Auftrag>;
  geraete: ReadonlyMap<string, Geraet>;
  kunden: ReadonlyMap<string, Kunde>;
  liegenschaften: ReadonlyMap<string, Liegenschaft>;
  artikel: ReadonlyMap<string, Artikel>;
  mitarbeiter: ReadonlyMap<string, Mitarbeiter>;
  benutzer: ReadonlyMap<string, Benutzer>;
}

/** Herkunft einer Änderung – kommt fertig in der Aktion (Reducer bleibt rein). */
export interface AktionsMeta {
  text: string;
  zeit: IsoZeitpunkt;
  benutzer: string;
}

export interface ProtokollEintrag extends AktionsMeta {
  id: string;
  aktion: string;
  vorher: Schnappschuss;
  nachher: Schnappschuss;
}

export interface DispoState {
  stammdaten: DispoStammdaten;
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
  auswahl: DispoAuswahl;
  /** Mehrfachauswahl in der Liste (Einsatz-IDs). */
  mehrfach: readonly string[];
  /** Neueste Änderung zuerst – Grundlage für «Rückgängig». */
  protokoll: readonly ProtokollEintrag[];
  /** Rückgängig gemachte Schritte – Grundlage für «Wiederherstellen». */
  zukunft: readonly ProtokollEintrag[];
  /** Zuletzt betroffenes Element, kurz hervorgehoben. */
  markiertId: string | null;
}

const PROTOKOLL_TIEFE = 50;

export function createDispoState(stammdaten: DispoStammdaten, bestand: DispoBestand): DispoState {
  return {
    stammdaten,
    einsaetze: bestand.einsaetze,
    pendenzen: bestand.pendenzen,
    rapporte: bestand.rapporte,
    nachrichten: bestand.nachrichten,
    bestaende: bestand.bestaende,
    bestellungen: bestand.bestellungen,
    bewegungen: bestand.bewegungen,
    zeiteintraege: bestand.zeiteintraege,
    monatsabschluesse: bestand.monatsabschluesse,
    journal: bestand.journal,
    auswahl: null,
    mehrfach: [],
    protokoll: [],
    zukunft: [],
    markiertId: null,
  };
}

/** Löschgrenzen eines Löschlaufs: Datensätze vor dem Stichtag werden entfernt oder anonymisiert. */
export interface Loeschgrenzen {
  journal?: IsoDatum;
  zeiteintraege?: IsoDatum;
  absenzen?: IsoDatum;
  nachrichten?: IsoDatum;
  einsatzverlauf?: IsoDatum;
}

// ── §2 · Aktionen ────────────────────────────────────────────────

export interface EinsatzAenderung {
  einsatzId: string;
  technikerId?: string;
  datum?: IsoDatum;
  startMin?: Minuten;
  dauerMin?: Minuten;
}

// jh› IDs, Zeitstempel und Protokolltext kommen fertig in der Aktion –
//     der Reducer bleibt rein (StrictMode ruft ihn doppelt auf).
export type DispoAction =
  | { kind: 'planPendenz'; pendenzId: string; einsatzId: string; ziel: PlanZiel; meta: AktionsMeta }
  | { kind: 'moveEinsatz'; einsatzId: string; ziel: PlanZiel; meta: AktionsMeta }
  | { kind: 'unplanEinsatz'; einsatzId: string; pendenzId: string; meta: AktionsMeta }
  | { kind: 'setStatus'; einsatzId: string; status: EinsatzStatus; quelle: StatusQuelle; meta: AktionsMeta }
  | { kind: 'requestFolgetermin'; einsatzId: string; pendenz: Pendenz; meta: AktionsMeta }
  | { kind: 'createAuftrag'; auftrag: Auftrag; geraet?: Geraet; pendenz?: Pendenz; einsatz?: Einsatz; meta: AktionsMeta }
  | { kind: 'updateAuftrag'; auftrag: Auftrag; einsatz?: EinsatzAenderung; meta: AktionsMeta }
  | { kind: 'updateGeraet'; geraet: Geraet; meta: AktionsMeta }
  | { kind: 'copyAuftrag'; auftrag: Auftrag; pendenz: Pendenz; meta: AktionsMeta }
  | { kind: 'deleteAuftrag'; auftragId: string; meta: AktionsMeta }
  | { kind: 'assignTechniker'; einsatzIds: readonly string[]; technikerId: string; meta: AktionsMeta }
  | { kind: 'shiftEinsaetze'; einsatzIds: readonly string[]; datum: IsoDatum; meta: AktionsMeta }
  | { kind: 'saveRapport'; rapport: Rapport; meta: AktionsMeta }
  | { kind: 'abschliessenRapport'; rapport: Rapport; auftrag: Auftrag; pendenz?: Pendenz; bestellungen?: readonly Bestellung[]; bewegungen?: readonly Lagerbewegung[]; meta: AktionsMeta }
  | { kind: 'signRapport'; rapportId: string; unterschrift: Unterschrift; meta: AktionsMeta }
  | { kind: 'freigebenRapport'; rapportId: string; meta: AktionsMeta }
  | { kind: 'verrechnenRapport'; rapportId: string; meta: AktionsMeta }
  | { kind: 'zurueckAnTechniker'; rapportId: string; bemerkung: string; meta: AktionsMeta }
  | { kind: 'sendeNachricht'; nachricht: Nachricht; meta: AktionsMeta }
  | { kind: 'updateKunde'; kunde: Kunde; meta: AktionsMeta }
  | { kind: 'updateLiegenschaft'; liegenschaft: Liegenschaft; meta: AktionsMeta }
  | { kind: 'createLiegenschaft'; liegenschaft: Liegenschaft; meta: AktionsMeta }
  | { kind: 'updateArtikel'; artikel: Artikel; meta: AktionsMeta }
  | { kind: 'createPendenz'; pendenz: Pendenz; meta: AktionsMeta }
  | { kind: 'bestellen'; bestellung: Bestellung; meta: AktionsMeta }
  | { kind: 'wareneingang'; bestellungId: string; bewegung: Lagerbewegung; meta: AktionsMeta }
  | { kind: 'buchen'; bewegung: Lagerbewegung; meta: AktionsMeta }
  | { kind: 'stornierenBestellung'; bestellungId: string; meta: AktionsMeta }
  | { kind: 'stempeln'; mitarbeiterId: string; datum: IsoDatum; jetztMin: Minuten; art: StempelArt; geraet: ZeitGeraet; eintragId: string; meta: AktionsMeta }
  | { kind: 'zeitEintraegeAnlegen'; eintraege: readonly ZeitEintrag[]; meta: AktionsMeta }
  | { kind: 'zeitEintragKorrigieren'; eintragId: string; aenderung: { art?: ZeitArt; vonMin: Minuten; bisMin: Minuten | null }; grund: string; meta: AktionsMeta }
  | { kind: 'zeitEintragLoeschen'; eintragId: string; grund: string; meta: AktionsMeta }
  | { kind: 'zeitEintragErgaenzen'; eintragId: string; bemerkung?: string; einsatzId?: string | null; meta: AktionsMeta }
  | { kind: 'monatEinreichen'; abschluss: Monatsabschluss; meta: AktionsMeta }
  | { kind: 'monatEntscheiden'; abschlussId: string; status: 'genehmigt' | 'zurueckgewiesen'; bemerkung?: string; meta: AktionsMeta }
  | { kind: 'absenzBeantragen'; absenz: Absenz; meta: AktionsMeta }
  | { kind: 'absenzEntscheiden'; absenzId: string; status: AbsenzStatus; grund?: string; meta: AktionsMeta }
  | { kind: 'absenzAendern'; absenz: Absenz; meta: AktionsMeta }
  | { kind: 'absenzLoeschen'; absenzId: string; meta: AktionsMeta }
  | { kind: 'mitarbeiterSpeichern'; mitarbeiter: Mitarbeiter; meta: AktionsMeta }
  | { kind: 'benutzerSpeichern'; benutzer: Benutzer; meta: AktionsMeta }
  | { kind: 'loeschlauf'; vor: Loeschgrenzen; meta: AktionsMeta }
  | { kind: 'protokolliere'; eintrag: JournalEintrag }
  | { kind: 'benutzerAnmeldung'; benutzer: Benutzer; eintrag: JournalEintrag }
  | { kind: 'select'; auswahl: DispoAuswahl }
  | { kind: 'toggleMehrfach'; einsatzId: string }
  | { kind: 'setMehrfach'; einsatzIds: readonly string[] }
  | { kind: 'undo'; meta?: AktionsMeta }
  | { kind: 'redo'; meta?: AktionsMeta }
  | { kind: 'replaceStand'; stand: Schnappschuss }
  | { kind: 'resetDemo'; stammdaten: DispoStammdaten; bestand: DispoBestand };

// ── §3 · Hilfen ──────────────────────────────────────────────────

export function schnappschuss(state: DispoState): Schnappschuss {
  return {
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
    auftraege: state.stammdaten.auftraege,
    geraete: state.stammdaten.geraete,
    kunden: state.stammdaten.kunden,
    liegenschaften: state.stammdaten.liegenschaften,
    artikel: state.stammdaten.artikel,
    mitarbeiter: state.stammdaten.mitarbeiter,
    benutzer: state.stammdaten.benutzer,
  };
}

function anwenden(state: DispoState, schnapp: Schnappschuss): DispoState {
  return {
    ...state,
    einsaetze: schnapp.einsaetze,
    pendenzen: schnapp.pendenzen,
    rapporte: schnapp.rapporte,
    nachrichten: schnapp.nachrichten,
    bestaende: schnapp.bestaende,
    bestellungen: schnapp.bestellungen,
    bewegungen: schnapp.bewegungen,
    zeiteintraege: schnapp.zeiteintraege,
    monatsabschluesse: schnapp.monatsabschluesse,
    journal: schnapp.journal,
    stammdaten: {
      ...state.stammdaten,
      absenzen: schnapp.absenzen,
      auftraege: schnapp.auftraege,
      geraete: schnapp.geraete,
      kunden: schnapp.kunden,
      liegenschaften: schnapp.liegenschaften,
      artikel: schnapp.artikel,
      mitarbeiter: schnapp.mitarbeiter,
      benutzer: schnapp.benutzer,
    },
  };
}

/** Gleiche Referenzen in allen Feldern – nichts Persistentes hat sich geändert. */
export function gleicherSchnappschuss(a: Schnappschuss, b: Schnappschuss): boolean {
  return (
    a.einsaetze === b.einsaetze &&
    a.pendenzen === b.pendenzen &&
    a.rapporte === b.rapporte &&
    a.nachrichten === b.nachrichten &&
    a.bestaende === b.bestaende &&
    a.bestellungen === b.bestellungen &&
    a.bewegungen === b.bewegungen &&
    a.zeiteintraege === b.zeiteintraege &&
    a.monatsabschluesse === b.monatsabschluesse &&
    a.journal === b.journal &&
    a.absenzen === b.absenzen &&
    a.auftraege === b.auftraege &&
    a.geraete === b.geraete &&
    a.kunden === b.kunden &&
    a.liegenschaften === b.liegenschaften &&
    a.artikel === b.artikel &&
    a.mitarbeiter === b.mitarbeiter &&
    a.benutzer === b.benutzer
  );
}

function auswahlExists(auswahl: DispoAuswahl, schnapp: Schnappschuss): boolean {
  if (!auswahl) return true;
  if (auswahl.art === 'einsatz') return schnapp.einsaetze.some((einsatz) => einsatz.id === auswahl.einsatzId);
  return schnapp.pendenzen.some((pendenz) => pendenz.id === auswahl.pendenzId);
}

let protokollLauf = 0;
let journalLauf = 0;
// jh› Journal-IDs brauchen eine Fensterkennung: Zwei Fenster schreiben in denselben Stand (ADR-001).
const JOURNAL_KENNUNG = Math.random().toString(36).slice(2, 6);

/** Zusätze für den Journaleintrag einer Änderung – Bereich und Art sonst aus der Aktion abgeleitet. */
interface JournalHinweis {
  art?: JournalArt;
  bereich?: JournalBereich;
  betrifft?: string;
  mitarbeiterId?: string;
}

function journalEintragFuer(aktion: string, meta: AktionsMeta, hinweis: JournalHinweis, rueckgaengig = false): JournalEintrag {
  journalLauf += 1;
  return {
    id: `J-${JOURNAL_KENNUNG}${journalLauf}`,
    zeitpunkt: meta.zeit,
    benutzer: meta.benutzer,
    bereich: hinweis.bereich ?? bereichVonAktion(aktion),
    art: hinweis.art ?? 'aenderung',
    text: meta.text,
    aktion,
    ...(hinweis.betrifft ? { betrifft: hinweis.betrifft } : {}),
    ...(hinweis.mitarbeiterId ? { mitarbeiterId: hinweis.mitarbeiterId } : {}),
    ...(rueckgaengig ? { rueckgaengig: true } : {}),
  };
}

function mitJournal(journal: readonly JournalEintrag[], eintrag: JournalEintrag): readonly JournalEintrag[] {
  return [eintrag, ...journal].slice(0, JOURNAL_MAX);
}

/** Schreibt die Änderung ins Protokoll (Undo), ins Journal (dauerhaft) und leert die Redo-Zukunft. */
function commit(state: DispoState, action: { kind: string; meta: AktionsMeta }, neu: Partial<Schnappschuss>, extra: Partial<DispoState> = {}, hinweis: JournalHinweis = {}): DispoState {
  const vorher = schnappschuss(state);
  const journalEintrag = journalEintragFuer(action.kind, action.meta, hinweis);
  const nachher: Schnappschuss = { ...vorher, ...neu, journal: mitJournal(neu.journal ?? vorher.journal, journalEintrag) };
  protokollLauf += 1;
  const eintrag: ProtokollEintrag = { ...action.meta, id: `PR-${protokollLauf}`, aktion: action.kind, vorher, nachher };
  const basis = anwenden(state, nachher);
  return {
    ...basis,
    ...extra,
    protokoll: [eintrag, ...state.protokoll].slice(0, PROTOKOLL_TIEFE),
    zukunft: [],
  };
}

function withMap<T>(map: ReadonlyMap<string, T>, key: string, wert: T): ReadonlyMap<string, T> {
  const kopie = new Map(map);
  kopie.set(key, wert);
  return kopie;
}

function ersetzeRapport(rapporte: readonly Rapport[], rapport: Rapport): Rapport[] {
  const vorhanden = rapporte.some((kandidat) => kandidat.id === rapport.id);
  return vorhanden ? rapporte.map((kandidat) => (kandidat.id === rapport.id ? rapport : kandidat)) : [...rapporte, rapport];
}

// jh› Der Auftrag spiegelt den Rapport (Status, Fotos), damit Listen, Chips und
//     die Akte ohne Rapport-Zugriff weiterhin stimmen.
function spiegleRapport(auftraege: ReadonlyMap<string, Auftrag>, rapport: Rapport, rechnungStatus?: Auftrag['rechnungStatus']): ReadonlyMap<string, Auftrag> {
  const auftrag = auftraege.get(rapport.auftragId);
  if (!auftrag) return auftraege;
  return withMap(auftraege, auftrag.id, {
    ...auftrag,
    rapport: rapport.status,
    rapportId: rapport.id,
    fotos: rapport.fotos.length > 0 ? rapport.fotos : auftrag.fotos,
    ...(rechnungStatus ? { rechnungStatus } : {}),
  });
}

// ── §4 · Planen & Status ─────────────────────────────────────────

function planPendenz(state: DispoState, action: Extract<DispoAction, { kind: 'planPendenz' }>): DispoState {
  const pendenz = state.pendenzen.find((kandidat) => kandidat.id === action.pendenzId);
  if (!pendenz) return state;
  const einsatz: Einsatz = { id: action.einsatzId, auftragId: pendenz.auftragId, ...action.ziel, dauerMin: pendenz.dauerMin, status: 'geplant' };
  const warAusgewaehlt = state.auswahl?.art === 'pendenz' && state.auswahl.pendenzId === pendenz.id;
  return commit(state, action,
    { einsaetze: [...state.einsaetze, einsatz], pendenzen: state.pendenzen.filter((kandidat) => kandidat.id !== pendenz.id) },
    { auswahl: warAusgewaehlt ? { art: 'einsatz', einsatzId: einsatz.id } : state.auswahl, markiertId: einsatz.id },
  );
}

function moveEinsatz(state: DispoState, action: Extract<DispoAction, { kind: 'moveEinsatz' }>): DispoState {
  const vorher = state.einsaetze.find((einsatz) => einsatz.id === action.einsatzId);
  if (!vorher) return state;
  const unveraendert = vorher.technikerId === action.ziel.technikerId && vorher.datum === action.ziel.datum && vorher.startMin === action.ziel.startMin;
  if (unveraendert) return state;
  // jh› Ein verschobener Einsatz ist wieder «geplant» – der Techniker fährt neu los.
  const einsaetze = state.einsaetze.map((einsatz) =>
    einsatz.id === action.einsatzId ? { ...einsatz, ...action.ziel, status: 'geplant' as const } : einsatz,
  );
  return commit(state, action, { einsaetze }, { markiertId: action.einsatzId });
}

function unplanEinsatz(state: DispoState, action: Extract<DispoAction, { kind: 'unplanEinsatz' }>): DispoState {
  const einsatz = state.einsaetze.find((kandidat) => kandidat.id === action.einsatzId);
  if (!einsatz) return state;
  const hatWeitere = state.einsaetze.some((kandidat) => kandidat.auftragId === einsatz.auftragId && kandidat.id !== einsatz.id);
  const pendenz: Pendenz = {
    id: action.pendenzId,
    auftragId: einsatz.auftragId,
    anlass: hatWeitere ? 'folgetermin' : 'neu',
    dauerMin: einsatz.dauerMin,
    erstelltAm: action.meta.zeit,
    hinweis: 'Zurückgestellt aus dem Plan',
  };
  const warAusgewaehlt = state.auswahl?.art === 'einsatz' && state.auswahl.einsatzId === einsatz.id;
  return commit(state, action,
    { einsaetze: state.einsaetze.filter((kandidat) => kandidat.id !== einsatz.id), pendenzen: [...state.pendenzen, pendenz] },
    { auswahl: warAusgewaehlt ? { art: 'pendenz', pendenzId: pendenz.id } : state.auswahl, markiertId: pendenz.id },
  );
}

function setStatus(state: DispoState, action: Extract<DispoAction, { kind: 'setStatus' }>): DispoState {
  const einsatz = state.einsaetze.find((kandidat) => kandidat.id === action.einsatzId);
  if (!einsatz || einsatz.status === action.status) return state;
  const einsaetze = state.einsaetze.map((kandidat) =>
    kandidat.id === action.einsatzId ? mitStatuswechsel(kandidat, action.status, action.meta.zeit, action.quelle) : kandidat,
  );
  return commit(state, action, { einsaetze });
}

function requestFolgetermin(state: DispoState, action: Extract<DispoAction, { kind: 'requestFolgetermin' }>): DispoState {
  const einsaetze = state.einsaetze.map((einsatz) => {
    if (einsatz.id !== action.einsatzId || einsatz.status !== 'vor-ort') return einsatz;
    return mitStatuswechsel(einsatz, 'wartet-teil', action.meta.zeit, 'buero');
  });
  return commit(state, action, { einsaetze, pendenzen: [...state.pendenzen, action.pendenz] }, { markiertId: action.pendenz.id });
}

// ── §5 · Aufträge ────────────────────────────────────────────────

function createAuftrag(state: DispoState, action: Extract<DispoAction, { kind: 'createAuftrag' }>): DispoState {
  const auftraege = withMap(state.stammdaten.auftraege, action.auftrag.id, action.auftrag);
  const geraete = action.geraet ? withMap(state.stammdaten.geraete, action.geraet.id, action.geraet) : state.stammdaten.geraete;
  const pendenzen = action.pendenz ? [...state.pendenzen, action.pendenz] : state.pendenzen;
  const einsaetze = action.einsatz ? [...state.einsaetze, action.einsatz] : state.einsaetze;
  const auswahl: DispoAuswahl = action.einsatz
    ? { art: 'einsatz', einsatzId: action.einsatz.id }
    : action.pendenz
      ? { art: 'pendenz', pendenzId: action.pendenz.id }
      : state.auswahl;
  return commit(state, action, { auftraege, geraete, pendenzen, einsaetze }, { auswahl, markiertId: action.einsatz?.id ?? action.pendenz?.id ?? null });
}

function updateAuftrag(state: DispoState, action: Extract<DispoAction, { kind: 'updateAuftrag' }>): DispoState {
  if (!state.stammdaten.auftraege.has(action.auftrag.id)) return state;
  const auftraege = withMap(state.stammdaten.auftraege, action.auftrag.id, action.auftrag);
  const aenderung = action.einsatz;
  const einsaetze = aenderung
    ? state.einsaetze.map((einsatz) => {
        if (einsatz.id !== aenderung.einsatzId) return einsatz;
        return {
          ...einsatz,
          ...(aenderung.technikerId ? { technikerId: aenderung.technikerId } : {}),
          ...(aenderung.datum ? { datum: aenderung.datum } : {}),
          ...(aenderung.startMin !== undefined ? { startMin: aenderung.startMin } : {}),
          ...(aenderung.dauerMin !== undefined ? { dauerMin: aenderung.dauerMin } : {}),
        };
      })
    : state.einsaetze;
  return commit(state, action, { auftraege, einsaetze }, { markiertId: aenderung?.einsatzId ?? null });
}

function updateGeraet(state: DispoState, action: Extract<DispoAction, { kind: 'updateGeraet' }>): DispoState {
  if (!state.stammdaten.geraete.has(action.geraet.id)) return state;
  return commit(state, action, { geraete: withMap(state.stammdaten.geraete, action.geraet.id, action.geraet) });
}

function copyAuftrag(state: DispoState, action: Extract<DispoAction, { kind: 'copyAuftrag' }>): DispoState {
  const auftraege = withMap(state.stammdaten.auftraege, action.auftrag.id, action.auftrag);
  return commit(state, action,
    { auftraege, pendenzen: [...state.pendenzen, action.pendenz] },
    { auswahl: { art: 'pendenz', pendenzId: action.pendenz.id }, markiertId: action.pendenz.id },
  );
}

// jh› Löschen entfernt Einsätze und Pendenzen des Auftrags, der Auftrag selbst
//     bleibt im Bestand (Undo, Verrechnung) – im Produkt ein Status «storniert».
function deleteAuftrag(state: DispoState, action: Extract<DispoAction, { kind: 'deleteAuftrag' }>): DispoState {
  const einsaetze = state.einsaetze.filter((einsatz) => einsatz.auftragId !== action.auftragId);
  const pendenzen = state.pendenzen.filter((pendenz) => pendenz.auftragId !== action.auftragId);
  // jh› Rapporte und Nachrichten hängen am Auftrag – ohne ihn wären sie Waisen im Modul Rapporte.
  const rapporte = state.rapporte.filter((rapport) => rapport.auftragId !== action.auftragId);
  const nachrichten = state.nachrichten.filter((nachricht) => nachricht.auftragId !== action.auftragId);
  if (einsaetze.length === state.einsaetze.length && pendenzen.length === state.pendenzen.length && rapporte.length === state.rapporte.length) return state;
  return commit(state, action, { einsaetze, pendenzen, rapporte, nachrichten }, { auswahl: null, mehrfach: state.mehrfach.filter((id) => einsaetze.some((e) => e.id === id)) });
}

function assignTechniker(state: DispoState, action: Extract<DispoAction, { kind: 'assignTechniker' }>): DispoState {
  const ids = new Set(action.einsatzIds);
  const einsaetze = state.einsaetze.map((einsatz) =>
    ids.has(einsatz.id) && einsatz.technikerId !== action.technikerId ? { ...einsatz, technikerId: action.technikerId, status: 'geplant' as const } : einsatz,
  );
  return commit(state, action, { einsaetze });
}

function shiftEinsaetze(state: DispoState, action: Extract<DispoAction, { kind: 'shiftEinsaetze' }>): DispoState {
  const ids = new Set(action.einsatzIds);
  const einsaetze = state.einsaetze.map((einsatz) =>
    ids.has(einsatz.id) && einsatz.datum !== action.datum ? { ...einsatz, datum: action.datum, status: 'geplant' as const } : einsatz,
  );
  return commit(state, action, { einsaetze });
}

// ── §6 · Rapport & Nachrichten ───────────────────────────────────

// jh› Freigegeben oder verrechnet hat das Büro das letzte Wort – ein verspätetes «Speichern»
//     aus der App (zweites Fenster) ändert daran nichts mehr.
function istGesperrt(state: DispoState, rapportId: string): boolean {
  const vorhanden = state.rapporte.find((kandidat) => kandidat.id === rapportId);
  return vorhanden !== undefined && istSchreibgeschuetzt(vorhanden);
}

function saveRapport(state: DispoState, action: Extract<DispoAction, { kind: 'saveRapport' }>): DispoState {
  if (istGesperrt(state, action.rapport.id)) return state;
  const rapporte = ersetzeRapport(state.rapporte, action.rapport);
  return commit(state, action, { rapporte, auftraege: spiegleRapport(state.stammdaten.auftraege, action.rapport) }, { markiertId: action.rapport.einsatzId });
}

// jh› Abschluss setzt in einem Schritt: Rapport, Einsatzstatus (mit Verlauf), Auftrag
//     (Teile, Fotos) und – bei Teil/Folgetermin/nicht angetroffen – die Pendenz im Eingang.
function abschliessenRapport(state: DispoState, action: Extract<DispoAction, { kind: 'abschliessenRapport' }>): DispoState {
  const { rapport } = action;
  if (istGesperrt(state, rapport.id)) return state;
  const zielStatus = statusNachAbschluss(rapport.abschluss);
  const einsaetze = state.einsaetze.map((einsatz) => {
    if (einsatz.id !== rapport.einsatzId) return einsatz;
    return einsatz.status === zielStatus ? einsatz : mitStatuswechsel(einsatz, zielStatus, action.meta.zeit, 'app');
  });
  const auftraege = withMap(state.stammdaten.auftraege, action.auftrag.id, {
    ...action.auftrag,
    rapport: rapport.status,
    rapportId: rapport.id,
    fotos: rapport.fotos.length > 0 ? rapport.fotos : action.auftrag.fotos,
  });
  const pendenzen = action.pendenz ? [...state.pendenzen, action.pendenz] : state.pendenzen;
  // jh› Lager-Kopplung (ADR-004): Teile ab Fahrzeug/Lager sind Verbrauch, zu bestellende Teile werden Bestellungen.
  const neueBewegungen = action.bewegungen ?? [];
  const bestaende = neueBewegungen.reduce<readonly Lagerbestand[]>((stand, bewegung) => wendeBewegungAn(stand, bewegung), state.bestaende);
  const bekannt = new Set(state.bestellungen.map((bestellung) => bestellung.id));
  const bestellungen = [...state.bestellungen, ...(action.bestellungen ?? []).filter((bestellung) => !bekannt.has(bestellung.id))];
  return commit(state, action,
    { einsaetze, rapporte: ersetzeRapport(state.rapporte, rapport), auftraege, pendenzen, bestaende, bestellungen, bewegungen: [...neueBewegungen, ...state.bewegungen] },
    { markiertId: rapport.einsatzId },
  );
}

function signRapport(state: DispoState, action: Extract<DispoAction, { kind: 'signRapport' }>): DispoState {
  const rapport = state.rapporte.find((kandidat) => kandidat.id === action.rapportId);
  if (!rapport || rapport.status !== 'erstellt') return state;
  const neu: Rapport = { ...rapport, status: 'unterschrieben', unterschrift: action.unterschrift, geaendertAm: action.meta.zeit };
  return commit(state, action, { rapporte: ersetzeRapport(state.rapporte, neu), auftraege: spiegleRapport(state.stammdaten.auftraege, neu) });
}

function freigebenRapport(state: DispoState, action: Extract<DispoAction, { kind: 'freigebenRapport' }>): DispoState {
  const rapport = state.rapporte.find((kandidat) => kandidat.id === action.rapportId);
  if (!rapport || (rapport.status !== 'erstellt' && rapport.status !== 'unterschrieben')) return state;
  const neu: Rapport = { ...rapport, status: 'freigegeben', freigegebenAm: action.meta.zeit, geaendertAm: action.meta.zeit };
  return commit(state, action, { rapporte: ersetzeRapport(state.rapporte, neu), auftraege: spiegleRapport(state.stammdaten.auftraege, neu) });
}

function verrechnenRapport(state: DispoState, action: Extract<DispoAction, { kind: 'verrechnenRapport' }>): DispoState {
  const rapport = state.rapporte.find((kandidat) => kandidat.id === action.rapportId);
  if (!rapport || rapport.status !== 'freigegeben') return state;
  const neu: Rapport = { ...rapport, status: 'verrechnet', verrechnetAm: action.meta.zeit, geaendertAm: action.meta.zeit };
  return commit(state, action, { rapporte: ersetzeRapport(state.rapporte, neu), auftraege: spiegleRapport(state.stammdaten.auftraege, neu, 'gestellt') });
}

// jh› Zurück an den Techniker löscht die Unterschrift: Der Mieter hat etwas anderes unterschrieben.
function zurueckAnTechniker(state: DispoState, action: Extract<DispoAction, { kind: 'zurueckAnTechniker' }>): DispoState {
  const rapport = state.rapporte.find((kandidat) => kandidat.id === action.rapportId);
  if (!rapport || rapport.status === 'verrechnet' || rapport.status === 'offen') return state;
  const { unterschrift: _entfernt, ...ohneUnterschrift } = rapport;
  const neu: Rapport = {
    ...ohneUnterschrift,
    status: 'erstellt',
    geaendertAm: action.meta.zeit,
    rueckmeldung: { bemerkung: action.bemerkung, zeitpunkt: action.meta.zeit, von: action.meta.benutzer },
  };
  return commit(state, action, { rapporte: ersetzeRapport(state.rapporte, neu), auftraege: spiegleRapport(state.stammdaten.auftraege, neu) });
}

function sendeNachricht(state: DispoState, action: Extract<DispoAction, { kind: 'sendeNachricht' }>): DispoState {
  return commit(state, action, { nachrichten: [...state.nachrichten, action.nachricht] });
}

// ── §7 · Stammdaten ──────────────────────────────────────────────

function updateKunde(state: DispoState, action: Extract<DispoAction, { kind: 'updateKunde' }>): DispoState {
  if (!state.stammdaten.kunden.has(action.kunde.id)) return state;
  return commit(state, action, { kunden: withMap(state.stammdaten.kunden, action.kunde.id, action.kunde) });
}

function updateLiegenschaft(state: DispoState, action: Extract<DispoAction, { kind: 'updateLiegenschaft' }>): DispoState {
  if (!state.stammdaten.liegenschaften.has(action.liegenschaft.id)) return state;
  return commit(state, action, { liegenschaften: withMap(state.stammdaten.liegenschaften, action.liegenschaft.id, action.liegenschaft) });
}

function createLiegenschaft(state: DispoState, action: Extract<DispoAction, { kind: 'createLiegenschaft' }>): DispoState {
  if (state.stammdaten.liegenschaften.has(action.liegenschaft.id) || !state.stammdaten.kunden.has(action.liegenschaft.kundeId)) return state;
  return commit(state, action, { liegenschaften: withMap(state.stammdaten.liegenschaften, action.liegenschaft.id, action.liegenschaft) }, { markiertId: action.liegenschaft.id });
}

function updateArtikel(state: DispoState, action: Extract<DispoAction, { kind: 'updateArtikel' }>): DispoState {
  if (!state.stammdaten.artikel.has(action.artikel.artikelNummer)) return state;
  return commit(state, action, { artikel: withMap(state.stammdaten.artikel, action.artikel.artikelNummer, action.artikel) });
}

// jh› Ein Auftrag ohne Termin und ohne Pendenz (z. B. nach «Löschen» + Redo) kommt so zurück in den Eingang.
function createPendenz(state: DispoState, action: Extract<DispoAction, { kind: 'createPendenz' }>): DispoState {
  const { pendenz } = action;
  if (!state.stammdaten.auftraege.has(pendenz.auftragId)) return state;
  if (state.pendenzen.some((kandidat) => kandidat.auftragId === pendenz.auftragId)) return state;
  return commit(state, action, { pendenzen: [...state.pendenzen, pendenz] }, { markiertId: pendenz.id });
}

// ── §8 · Lager ───────────────────────────────────────────────────

function mitErsatzteil(auftrag: Auftrag, bestellung: Bestellung, artikel: Artikel | undefined): Auftrag {
  const vorhanden = auftrag.ersatzteile.some((teil) => teil.artikelNummer === bestellung.artikelNummer);
  const ersatzteile: Ersatzteil[] = vorhanden
    ? auftrag.ersatzteile.map((teil) => (teil.artikelNummer === bestellung.artikelNummer ? { ...teil, status: 'bestellt' as const, liefertermin: bestellung.liefertermin, lieferant: bestellung.lieferant } : teil))
    : [...auftrag.ersatzteile, { artikelNummer: bestellung.artikelNummer, bezeichnung: bestellung.bezeichnung, menge: bestellung.menge, preisChf: artikel?.preisChf ?? 0, status: 'bestellt', lieferant: bestellung.lieferant, liefertermin: bestellung.liefertermin }];
  return { ...auftrag, ersatzteile };
}

function bestellen(state: DispoState, action: Extract<DispoAction, { kind: 'bestellen' }>): DispoState {
  const { bestellung } = action;
  if (state.bestellungen.some((kandidat) => kandidat.id === bestellung.id)) return state;
  const auftrag = bestellung.auftragId ? state.stammdaten.auftraege.get(bestellung.auftragId) : undefined;
  const auftraege = auftrag ? withMap(state.stammdaten.auftraege, auftrag.id, mitErsatzteil(auftrag, bestellung, state.stammdaten.artikel.get(bestellung.artikelNummer))) : state.stammdaten.auftraege;
  return commit(state, action, { bestellungen: [bestellung, ...state.bestellungen], auftraege }, { markiertId: bestellung.id });
}

// jh› Wareneingang spiegelt an die Dispo: Teil «geliefert» am Auftrag, Folgetermin-Pendenz ab heute mit Hinweis «Teil da».
function wareneingang(state: DispoState, action: Extract<DispoAction, { kind: 'wareneingang' }>): DispoState {
  const bestellung = state.bestellungen.find((kandidat) => kandidat.id === action.bestellungId);
  if (!bestellung || bestellung.status !== 'offen') return state;
  const heute = splitZeitpunkt(action.meta.zeit).datum;
  const bestellungen = state.bestellungen.map((kandidat) => (kandidat.id === bestellung.id ? { ...kandidat, status: 'eingetroffen' as const, eingetroffenAm: action.meta.zeit } : kandidat));
  const bestaende = wendeBewegungAn(state.bestaende, action.bewegung);

  let auftraege = state.stammdaten.auftraege;
  let pendenzen = state.pendenzen;
  const auftrag = bestellung.auftragId ? state.stammdaten.auftraege.get(bestellung.auftragId) : undefined;
  if (auftrag) {
    const ersatzteile = auftrag.ersatzteile.map((teil) => (teil.artikelNummer === bestellung.artikelNummer ? { ...teil, status: 'eingetroffen' as const } : teil));
    auftraege = withMap(auftraege, auftrag.id, { ...auftrag, ersatzteile });
    pendenzen = pendenzen.map((pendenz) =>
      pendenz.auftragId === auftrag.id && pendenz.anlass === 'folgetermin' ? { ...pendenz, fruehestensAm: heute, hinweis: `${bestellung.bezeichnung} eingetroffen – Folgetermin planen` } : pendenz,
    );
  }
  return commit(state, action, { bestellungen, bestaende, bewegungen: [action.bewegung, ...state.bewegungen], auftraege, pendenzen }, { markiertId: bestellung.id });
}

function buchen(state: DispoState, action: Extract<DispoAction, { kind: 'buchen' }>): DispoState {
  if (!state.stammdaten.artikel.has(action.bewegung.artikelNummer)) return state;
  return commit(state, action, { bestaende: wendeBewegungAn(state.bestaende, action.bewegung), bewegungen: [action.bewegung, ...state.bewegungen] });
}

function stornierenBestellung(state: DispoState, action: Extract<DispoAction, { kind: 'stornierenBestellung' }>): DispoState {
  const bestellung = state.bestellungen.find((kandidat) => kandidat.id === action.bestellungId);
  if (!bestellung || bestellung.status !== 'offen') return state;
  const bestellungen = state.bestellungen.map((kandidat) => (kandidat.id === bestellung.id ? { ...kandidat, status: 'storniert' as const } : kandidat));
  const auftrag = bestellung.auftragId ? state.stammdaten.auftraege.get(bestellung.auftragId) : undefined;
  const auftraege = auftrag
    ? withMap(state.stammdaten.auftraege, auftrag.id, { ...auftrag, ersatzteile: auftrag.ersatzteile.filter((teil) => !(teil.artikelNummer === bestellung.artikelNummer && teil.status === 'bestellt')) })
    : state.stammdaten.auftraege;
  return commit(state, action, { bestellungen, auftraege });
}

// ── §9 · Personal & Zeit ─────────────────────────────────────────

function tagesEintraege(state: DispoState, mitarbeiterId: string, datum: IsoDatum): ZeitEintrag[] {
  return state.zeiteintraege.filter((eintrag) => eintrag.mitarbeiterId === mitarbeiterId && eintrag.datum === datum);
}

// jh› Der Reducer vertraut der reinen Stempelfunktion: Falsche Reihenfolge (Gehen ohne Kommen) ändert nichts.
function stempelnEintrag(state: DispoState, action: Extract<DispoAction, { kind: 'stempeln' }>): DispoState {
  const { mitarbeiterId, datum } = action;
  if (!state.stammdaten.mitarbeiter.has(mitarbeiterId) || istMonatGesperrt(state.monatsabschluesse, mitarbeiterId, datum)) return state;
  const heute = tagesEintraege(state, mitarbeiterId, datum);
  const ergebnis = stempelnRein(heute, action.art, {
    mitarbeiterId,
    datum,
    jetztMin: action.jetztMin,
    erfasstAm: action.meta.zeit,
    erfasstVon: action.meta.benutzer,
    geraet: action.geraet,
    neueId: () => action.eintragId,
  });
  if (!ergebnis.ok) return state;
  const ersetzt = new Set(heute.map((eintrag) => eintrag.id));
  const zeiteintraege = [...state.zeiteintraege.filter((eintrag) => !ersetzt.has(eintrag.id)), ...ergebnis.eintraege];
  return commit(state, action, { zeiteintraege }, {}, { mitarbeiterId, betrifft: action.eintragId });
}

function zeitEintraegeAnlegen(state: DispoState, action: Extract<DispoAction, { kind: 'zeitEintraegeAnlegen' }>): DispoState {
  const angenommen: ZeitEintrag[] = [];
  for (const eintrag of action.eintraege) {
    if (!state.stammdaten.mitarbeiter.has(eintrag.mitarbeiterId)) continue;
    if (istMonatGesperrt(state.monatsabschluesse, eintrag.mitarbeiterId, eintrag.datum)) continue;
    if (eintrag.bisMin !== null && eintrag.bisMin <= eintrag.vonMin) continue;
    if (ueberlappt([...state.zeiteintraege, ...angenommen], eintrag)) continue;
    angenommen.push(eintrag);
  }
  const erster = angenommen[0];
  if (!erster) return state;
  return commit(state, action, { zeiteintraege: [...state.zeiteintraege, ...angenommen] }, {}, { mitarbeiterId: erster.mitarbeiterId, betrifft: erster.id });
}

// jh› Korrigieren ersetzt nie: Der alte Wert wandert in die Korrekturspur (ArGV 1 Art. 73, nachvollziehbar).
function zeitEintragKorrigieren(state: DispoState, action: Extract<DispoAction, { kind: 'zeitEintragKorrigieren' }>): DispoState {
  const eintrag = state.zeiteintraege.find((kandidat) => kandidat.id === action.eintragId);
  if (!eintrag || eintrag.geloescht || istMonatGesperrt(state.monatsabschluesse, eintrag.mitarbeiterId, eintrag.datum)) return state;
  const neu: ZeitEintrag = {
    ...eintrag,
    art: action.aenderung.art ?? eintrag.art,
    vonMin: action.aenderung.vonMin,
    bisMin: action.aenderung.bisMin,
    korrekturen: [...eintrag.korrekturen, { am: action.meta.zeit, von: action.meta.benutzer, grund: action.grund, vorher: { art: eintrag.art, vonMin: eintrag.vonMin, bisMin: eintrag.bisMin } }],
  };
  if (neu.bisMin !== null && neu.bisMin <= neu.vonMin) return state;
  if (ueberlappt(state.zeiteintraege, neu, neu.id)) return state;
  return commit(state, action, { zeiteintraege: state.zeiteintraege.map((kandidat) => (kandidat.id === neu.id ? neu : kandidat)) }, {}, { mitarbeiterId: eintrag.mitarbeiterId, betrifft: eintrag.id });
}

function zeitEintragLoeschen(state: DispoState, action: Extract<DispoAction, { kind: 'zeitEintragLoeschen' }>): DispoState {
  const eintrag = state.zeiteintraege.find((kandidat) => kandidat.id === action.eintragId);
  if (!eintrag || eintrag.geloescht || istMonatGesperrt(state.monatsabschluesse, eintrag.mitarbeiterId, eintrag.datum)) return state;
  const neu: ZeitEintrag = { ...eintrag, geloescht: { am: action.meta.zeit, von: action.meta.benutzer, grund: action.grund, vorher: { art: eintrag.art, vonMin: eintrag.vonMin, bisMin: eintrag.bisMin } } };
  return commit(state, action, { zeiteintraege: state.zeiteintraege.map((kandidat) => (kandidat.id === neu.id ? neu : kandidat)) }, {}, { mitarbeiterId: eintrag.mitarbeiterId, betrifft: eintrag.id });
}

// jh› Notiz und Einsatz am Eintrag ändern keine Zeit – darum ohne Korrekturspur, aber mit Journal.
function zeitEintragErgaenzen(state: DispoState, action: Extract<DispoAction, { kind: 'zeitEintragErgaenzen' }>): DispoState {
  const eintrag = state.zeiteintraege.find((kandidat) => kandidat.id === action.eintragId);
  if (!eintrag || eintrag.geloescht || istMonatGesperrt(state.monatsabschluesse, eintrag.mitarbeiterId, eintrag.datum)) return state;
  const { bemerkung: _alteBemerkung, einsatzId: _alterEinsatz, ...rest } = eintrag;
  const bemerkung = action.bemerkung === undefined ? eintrag.bemerkung : action.bemerkung.trim() || undefined;
  const einsatzId = action.einsatzId === undefined ? eintrag.einsatzId : (action.einsatzId ?? undefined);
  const neu: ZeitEintrag = { ...rest, ...(bemerkung ? { bemerkung } : {}), ...(einsatzId ? { einsatzId } : {}) };
  return commit(state, action, { zeiteintraege: state.zeiteintraege.map((kandidat) => (kandidat.id === neu.id ? neu : kandidat)) }, {}, { mitarbeiterId: eintrag.mitarbeiterId, betrifft: eintrag.id });
}

function monatEinreichen(state: DispoState, action: Extract<DispoAction, { kind: 'monatEinreichen' }>): DispoState {
  const { abschluss } = action;
  if (!state.stammdaten.mitarbeiter.has(abschluss.mitarbeiterId)) return state;
  const bestehend = abschlussFuer(state.monatsabschluesse, abschluss.mitarbeiterId, abschluss.monat);
  if (bestehend && bestehend.status !== 'zurueckgewiesen') return state;
  const monatsabschluesse = [...state.monatsabschluesse.filter((kandidat) => kandidat.id !== bestehend?.id), abschluss];
  return commit(state, action, { monatsabschluesse }, {}, { mitarbeiterId: abschluss.mitarbeiterId, betrifft: abschluss.id });
}

function monatEntscheiden(state: DispoState, action: Extract<DispoAction, { kind: 'monatEntscheiden' }>): DispoState {
  const abschluss = state.monatsabschluesse.find((kandidat) => kandidat.id === action.abschlussId);
  if (!abschluss || abschluss.status !== 'eingereicht') return state;
  const neu: Monatsabschluss = { ...abschluss, status: action.status, entschiedenAm: action.meta.zeit, entschiedenVon: action.meta.benutzer, ...(action.bemerkung ? { bemerkung: action.bemerkung } : {}) };
  return commit(state, action, { monatsabschluesse: state.monatsabschluesse.map((kandidat) => (kandidat.id === neu.id ? neu : kandidat)) }, {}, { mitarbeiterId: abschluss.mitarbeiterId, betrifft: abschluss.id });
}

function absenzBeantragen(state: DispoState, action: Extract<DispoAction, { kind: 'absenzBeantragen' }>): DispoState {
  const { absenz } = action;
  if (!state.stammdaten.mitarbeiter.has(absenz.mitarbeiterId) || absenz.bis < absenz.von) return state;
  if (state.stammdaten.absenzen.some((kandidat) => kandidat.id === absenz.id)) return state;
  if (ueberschneidung(state.stammdaten.absenzen, absenz.mitarbeiterId, absenz.von, absenz.bis)) return state;
  return commit(state, action, { absenzen: [...state.stammdaten.absenzen, absenz] }, { markiertId: absenz.id }, { mitarbeiterId: absenz.mitarbeiterId, betrifft: absenz.id });
}

function absenzEntscheiden(state: DispoState, action: Extract<DispoAction, { kind: 'absenzEntscheiden' }>): DispoState {
  const absenz = state.stammdaten.absenzen.find((kandidat) => kandidat.id === action.absenzId);
  if (!absenz || absenz.status === action.status) return state;
  const neu: Absenz = { ...absenz, status: action.status, entschiedenAm: action.meta.zeit, entschiedenVon: action.meta.benutzer, ...(action.grund ? { entscheidGrund: action.grund } : {}) };
  return commit(state, action, { absenzen: state.stammdaten.absenzen.map((kandidat) => (kandidat.id === neu.id ? neu : kandidat)) }, { markiertId: neu.id }, { mitarbeiterId: absenz.mitarbeiterId, betrifft: absenz.id });
}

function absenzAendern(state: DispoState, action: Extract<DispoAction, { kind: 'absenzAendern' }>): DispoState {
  const { absenz } = action;
  if (!state.stammdaten.absenzen.some((kandidat) => kandidat.id === absenz.id) || absenz.bis < absenz.von) return state;
  if (ueberschneidung(state.stammdaten.absenzen, absenz.mitarbeiterId, absenz.von, absenz.bis, absenz.id)) return state;
  return commit(state, action, { absenzen: state.stammdaten.absenzen.map((kandidat) => (kandidat.id === absenz.id ? absenz : kandidat)) }, {}, { mitarbeiterId: absenz.mitarbeiterId, betrifft: absenz.id });
}

function absenzLoeschen(state: DispoState, action: Extract<DispoAction, { kind: 'absenzLoeschen' }>): DispoState {
  const absenz = state.stammdaten.absenzen.find((kandidat) => kandidat.id === action.absenzId);
  if (!absenz) return state;
  return commit(state, action, { absenzen: state.stammdaten.absenzen.filter((kandidat) => kandidat.id !== absenz.id) }, {}, { mitarbeiterId: absenz.mitarbeiterId, betrifft: absenz.id });
}

function mitarbeiterSpeichern(state: DispoState, action: Extract<DispoAction, { kind: 'mitarbeiterSpeichern' }>): DispoState {
  return commit(state, action, { mitarbeiter: withMap(state.stammdaten.mitarbeiter, action.mitarbeiter.id, action.mitarbeiter) }, {}, { mitarbeiterId: action.mitarbeiter.id, betrifft: action.mitarbeiter.id });
}

function benutzerSpeichern(state: DispoState, action: Extract<DispoAction, { kind: 'benutzerSpeichern' }>): DispoState {
  const { benutzer } = action;
  return commit(state, action, { benutzer: withMap(state.stammdaten.benutzer, benutzer.id, benutzer) }, {}, { betrifft: benutzer.id, ...(benutzer.mitarbeiterId ? { mitarbeiterId: benutzer.mitarbeiterId } : {}) });
}

// jh› Löschlauf nach Aufbewahrungsplan: Statuszeitstempel werden anonymisiert (der Einsatz bleibt), alles andere entfernt.
function loeschlauf(state: DispoState, action: Extract<DispoAction, { kind: 'loeschlauf' }>): DispoState {
  const { vor } = action;
  const journal = vor.journal ? state.journal.filter((eintrag) => eintrag.zeitpunkt.slice(0, 10) >= vor.journal!) : state.journal;
  const zeiteintraege = vor.zeiteintraege ? state.zeiteintraege.filter((eintrag) => eintrag.datum >= vor.zeiteintraege!) : state.zeiteintraege;
  const absenzen = vor.absenzen ? state.stammdaten.absenzen.filter((absenz) => absenz.bis >= vor.absenzen!) : state.stammdaten.absenzen;
  const nachrichten = vor.nachrichten ? state.nachrichten.filter((nachricht) => nachricht.zeitpunkt.slice(0, 10) >= vor.nachrichten!) : state.nachrichten;
  const einsaetze = vor.einsatzverlauf
    ? state.einsaetze.map((einsatz) => {
        if (einsatz.datum >= vor.einsatzverlauf! || !einsatz.verlauf) return einsatz;
        const { verlauf: _weg, statusSeit: _seit, ...rest } = einsatz;
        return rest;
      })
    : state.einsaetze;
  return commit(state, action, { journal, zeiteintraege, absenzen, nachrichten, einsaetze }, {}, { art: 'loeschung', bereich: 'datenschutz' });
}

/** Journal ohne Undo: Einsicht, Anmeldung, Export, Verbindungstest. */
function protokolliere(state: DispoState, action: Extract<DispoAction, { kind: 'protokolliere' }>): DispoState {
  return { ...state, journal: mitJournal(state.journal, action.eintrag) };
}

/** Anmeldung: letzte Anmeldung und Anbieter-Verknüpfung am Konto, Journaleintrag – nicht rückgängig zu machen. */
function benutzerAnmeldung(state: DispoState, action: Extract<DispoAction, { kind: 'benutzerAnmeldung' }>): DispoState {
  return {
    ...state,
    stammdaten: { ...state.stammdaten, benutzer: withMap(state.stammdaten.benutzer, action.benutzer.id, action.benutzer) },
    journal: mitJournal(state.journal, action.eintrag),
  };
}

// ── §10 · Undo/Redo & Stand ──────────────────────────────────────

// jh› Undo stellt den Stand wieder her, lässt das Journal aber wachsen: Es protokolliert das Rückgängigmachen.
function undo(state: DispoState, meta: AktionsMeta | undefined): DispoState {
  const [letzter, ...rest] = state.protokoll;
  if (!letzter) return state;
  const eintrag = journalEintragFuer(letzter.aktion, { text: `Rückgängig: ${letzter.text}`, zeit: meta?.zeit ?? letzter.zeit, benutzer: meta?.benutzer ?? letzter.benutzer }, {}, true);
  const basis = anwenden(state, { ...letzter.vorher, journal: mitJournal(state.journal, eintrag) });
  return {
    ...basis,
    protokoll: rest,
    zukunft: [letzter, ...state.zukunft],
    auswahl: auswahlExists(state.auswahl, letzter.vorher) ? state.auswahl : null,
    markiertId: null,
  };
}

function redo(state: DispoState, meta: AktionsMeta | undefined): DispoState {
  const [naechster, ...rest] = state.zukunft;
  if (!naechster) return state;
  const eintrag = journalEintragFuer(naechster.aktion, { text: `Wiederhergestellt: ${naechster.text}`, zeit: meta?.zeit ?? naechster.zeit, benutzer: meta?.benutzer ?? naechster.benutzer }, {});
  const basis = anwenden(state, { ...naechster.nachher, journal: mitJournal(state.journal, eintrag) });
  return {
    ...basis,
    protokoll: [naechster, ...state.protokoll],
    zukunft: rest,
    auswahl: auswahlExists(state.auswahl, naechster.nachher) ? state.auswahl : null,
    markiertId: null,
  };
}

// jh› Stand aus einem anderen Fenster: ohne Protokoll, denn das Undo dort gehört
//     zu einer anderen Geschichte als unseres.
function replaceStand(state: DispoState, action: Extract<DispoAction, { kind: 'replaceStand' }>): DispoState {
  const basis = anwenden(state, action.stand);
  return { ...basis, protokoll: [], zukunft: [], auswahl: auswahlExists(state.auswahl, action.stand) ? state.auswahl : null, markiertId: null };
}

// ── §11 · Reducer ────────────────────────────────────────────────

export function dispoReducer(state: DispoState, action: DispoAction): DispoState {
  switch (action.kind) {
    case 'planPendenz':
      return planPendenz(state, action);
    case 'moveEinsatz':
      return moveEinsatz(state, action);
    case 'unplanEinsatz':
      return unplanEinsatz(state, action);
    case 'setStatus':
      return setStatus(state, action);
    case 'requestFolgetermin':
      return requestFolgetermin(state, action);
    case 'createAuftrag':
      return createAuftrag(state, action);
    case 'updateAuftrag':
      return updateAuftrag(state, action);
    case 'updateGeraet':
      return updateGeraet(state, action);
    case 'copyAuftrag':
      return copyAuftrag(state, action);
    case 'deleteAuftrag':
      return deleteAuftrag(state, action);
    case 'assignTechniker':
      return assignTechniker(state, action);
    case 'shiftEinsaetze':
      return shiftEinsaetze(state, action);
    case 'saveRapport':
      return saveRapport(state, action);
    case 'abschliessenRapport':
      return abschliessenRapport(state, action);
    case 'signRapport':
      return signRapport(state, action);
    case 'freigebenRapport':
      return freigebenRapport(state, action);
    case 'verrechnenRapport':
      return verrechnenRapport(state, action);
    case 'zurueckAnTechniker':
      return zurueckAnTechniker(state, action);
    case 'sendeNachricht':
      return sendeNachricht(state, action);
    case 'updateKunde':
      return updateKunde(state, action);
    case 'updateLiegenschaft':
      return updateLiegenschaft(state, action);
    case 'createLiegenschaft':
      return createLiegenschaft(state, action);
    case 'updateArtikel':
      return updateArtikel(state, action);
    case 'createPendenz':
      return createPendenz(state, action);
    case 'bestellen':
      return bestellen(state, action);
    case 'wareneingang':
      return wareneingang(state, action);
    case 'buchen':
      return buchen(state, action);
    case 'stornierenBestellung':
      return stornierenBestellung(state, action);
    case 'stempeln':
      return stempelnEintrag(state, action);
    case 'zeitEintraegeAnlegen':
      return zeitEintraegeAnlegen(state, action);
    case 'zeitEintragKorrigieren':
      return zeitEintragKorrigieren(state, action);
    case 'zeitEintragLoeschen':
      return zeitEintragLoeschen(state, action);
    case 'zeitEintragErgaenzen':
      return zeitEintragErgaenzen(state, action);
    case 'monatEinreichen':
      return monatEinreichen(state, action);
    case 'monatEntscheiden':
      return monatEntscheiden(state, action);
    case 'absenzBeantragen':
      return absenzBeantragen(state, action);
    case 'absenzEntscheiden':
      return absenzEntscheiden(state, action);
    case 'absenzAendern':
      return absenzAendern(state, action);
    case 'absenzLoeschen':
      return absenzLoeschen(state, action);
    case 'mitarbeiterSpeichern':
      return mitarbeiterSpeichern(state, action);
    case 'benutzerSpeichern':
      return benutzerSpeichern(state, action);
    case 'loeschlauf':
      return loeschlauf(state, action);
    case 'protokolliere':
      return protokolliere(state, action);
    case 'benutzerAnmeldung':
      return benutzerAnmeldung(state, action);
    case 'select':
      return { ...state, auswahl: action.auswahl };
    case 'toggleMehrfach':
      return {
        ...state,
        mehrfach: state.mehrfach.includes(action.einsatzId)
          ? state.mehrfach.filter((id) => id !== action.einsatzId)
          : [...state.mehrfach, action.einsatzId],
      };
    case 'setMehrfach':
      return { ...state, mehrfach: action.einsatzIds };
    case 'undo':
      return undo(state, action.meta);
    case 'redo':
      return redo(state, action.meta);
    case 'replaceStand':
      return replaceStand(state, action);
    case 'resetDemo':
      return createDispoState(action.stammdaten, action.bestand);
  }
}

/* ◆ jh · eof */
