/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/dispo.reducer.ts               │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Dispo-State: planen, Status, Rapport, Nachrichten, Undo/Redo, Stand   │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum, IsoZeitpunkt, Minuten } from '../../../core/datum';
import type { Auftrag } from '../../../core/domain/auftrag';
import { mitStatuswechsel } from '../../../core/domain/einsatz';
import type { Einsatz, EinsatzStatus, Pendenz, StatusQuelle } from '../../../core/domain/einsatz';
import type { Nachricht } from '../../../core/domain/nachricht';
import { istSchreibgeschuetzt, statusNachAbschluss } from '../../../core/domain/rapport';
import type { Rapport, Unterschrift } from '../../../core/domain/rapport';
import type { Geraet } from '../../../core/domain/stammdaten';
import type { DispoAuswahl, DispoBestand, DispoStammdaten, PlanZiel } from '../dispo.types';

// ── §1 · State ───────────────────────────────────────────────────

export interface Schnappschuss {
  einsaetze: readonly Einsatz[];
  pendenzen: readonly Pendenz[];
  rapporte: readonly Rapport[];
  nachrichten: readonly Nachricht[];
  auftraege: ReadonlyMap<string, Auftrag>;
  geraete: ReadonlyMap<string, Geraet>;
}

/** Herkunft einer Änderung – kommt fertig in der Aktion (Reducer bleibt rein). */
export interface AktionsMeta {
  text: string;
  zeit: IsoZeitpunkt;
  benutzer: string;
}

export interface ProtokollEintrag extends AktionsMeta {
  id: string;
  vorher: Schnappschuss;
  nachher: Schnappschuss;
}

export interface DispoState {
  stammdaten: DispoStammdaten;
  einsaetze: readonly Einsatz[];
  pendenzen: readonly Pendenz[];
  rapporte: readonly Rapport[];
  nachrichten: readonly Nachricht[];
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
    auswahl: null,
    mehrfach: [],
    protokoll: [],
    zukunft: [],
    markiertId: null,
  };
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
  | { kind: 'abschliessenRapport'; rapport: Rapport; auftrag: Auftrag; pendenz?: Pendenz; meta: AktionsMeta }
  | { kind: 'signRapport'; rapportId: string; unterschrift: Unterschrift; meta: AktionsMeta }
  | { kind: 'freigebenRapport'; rapportId: string; meta: AktionsMeta }
  | { kind: 'verrechnenRapport'; rapportId: string; meta: AktionsMeta }
  | { kind: 'zurueckAnTechniker'; rapportId: string; bemerkung: string; meta: AktionsMeta }
  | { kind: 'sendeNachricht'; nachricht: Nachricht; meta: AktionsMeta }
  | { kind: 'select'; auswahl: DispoAuswahl }
  | { kind: 'toggleMehrfach'; einsatzId: string }
  | { kind: 'setMehrfach'; einsatzIds: readonly string[] }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'replaceStand'; stand: Schnappschuss }
  | { kind: 'resetDemo'; stammdaten: DispoStammdaten; bestand: DispoBestand };

// ── §3 · Hilfen ──────────────────────────────────────────────────

export function schnappschuss(state: DispoState): Schnappschuss {
  return {
    einsaetze: state.einsaetze,
    pendenzen: state.pendenzen,
    rapporte: state.rapporte,
    nachrichten: state.nachrichten,
    auftraege: state.stammdaten.auftraege,
    geraete: state.stammdaten.geraete,
  };
}

function anwenden(state: DispoState, schnapp: Schnappschuss): DispoState {
  return {
    ...state,
    einsaetze: schnapp.einsaetze,
    pendenzen: schnapp.pendenzen,
    rapporte: schnapp.rapporte,
    nachrichten: schnapp.nachrichten,
    stammdaten: { ...state.stammdaten, auftraege: schnapp.auftraege, geraete: schnapp.geraete },
  };
}

function auswahlExists(auswahl: DispoAuswahl, schnapp: Schnappschuss): boolean {
  if (!auswahl) return true;
  if (auswahl.art === 'einsatz') return schnapp.einsaetze.some((einsatz) => einsatz.id === auswahl.einsatzId);
  return schnapp.pendenzen.some((pendenz) => pendenz.id === auswahl.pendenzId);
}

let protokollLauf = 0;

/** Schreibt die Änderung ins Protokoll und leert die Redo-Zukunft. */
function commit(state: DispoState, meta: AktionsMeta, neu: Partial<Schnappschuss>, extra: Partial<DispoState> = {}): DispoState {
  const vorher = schnappschuss(state);
  const nachher: Schnappschuss = { ...vorher, ...neu };
  protokollLauf += 1;
  const eintrag: ProtokollEintrag = { ...meta, id: `PR-${protokollLauf}`, vorher, nachher };
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
  return commit(
    state,
    action.meta,
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
  return commit(state, action.meta, { einsaetze }, { markiertId: action.einsatzId });
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
  return commit(
    state,
    action.meta,
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
  return commit(state, action.meta, { einsaetze });
}

function requestFolgetermin(state: DispoState, action: Extract<DispoAction, { kind: 'requestFolgetermin' }>): DispoState {
  const einsaetze = state.einsaetze.map((einsatz) => {
    if (einsatz.id !== action.einsatzId || einsatz.status !== 'vor-ort') return einsatz;
    return mitStatuswechsel(einsatz, 'wartet-teil', action.meta.zeit, 'buero');
  });
  return commit(state, action.meta, { einsaetze, pendenzen: [...state.pendenzen, action.pendenz] }, { markiertId: action.pendenz.id });
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
  return commit(state, action.meta, { auftraege, geraete, pendenzen, einsaetze }, { auswahl, markiertId: action.einsatz?.id ?? action.pendenz?.id ?? null });
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
  return commit(state, action.meta, { auftraege, einsaetze }, { markiertId: aenderung?.einsatzId ?? null });
}

function updateGeraet(state: DispoState, action: Extract<DispoAction, { kind: 'updateGeraet' }>): DispoState {
  if (!state.stammdaten.geraete.has(action.geraet.id)) return state;
  return commit(state, action.meta, { geraete: withMap(state.stammdaten.geraete, action.geraet.id, action.geraet) });
}

function copyAuftrag(state: DispoState, action: Extract<DispoAction, { kind: 'copyAuftrag' }>): DispoState {
  const auftraege = withMap(state.stammdaten.auftraege, action.auftrag.id, action.auftrag);
  return commit(
    state,
    action.meta,
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
  return commit(state, action.meta, { einsaetze, pendenzen, rapporte, nachrichten }, { auswahl: null, mehrfach: state.mehrfach.filter((id) => einsaetze.some((e) => e.id === id)) });
}

function assignTechniker(state: DispoState, action: Extract<DispoAction, { kind: 'assignTechniker' }>): DispoState {
  const ids = new Set(action.einsatzIds);
  const einsaetze = state.einsaetze.map((einsatz) =>
    ids.has(einsatz.id) && einsatz.technikerId !== action.technikerId ? { ...einsatz, technikerId: action.technikerId, status: 'geplant' as const } : einsatz,
  );
  return commit(state, action.meta, { einsaetze });
}

function shiftEinsaetze(state: DispoState, action: Extract<DispoAction, { kind: 'shiftEinsaetze' }>): DispoState {
  const ids = new Set(action.einsatzIds);
  const einsaetze = state.einsaetze.map((einsatz) =>
    ids.has(einsatz.id) && einsatz.datum !== action.datum ? { ...einsatz, datum: action.datum, status: 'geplant' as const } : einsatz,
  );
  return commit(state, action.meta, { einsaetze });
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
  return commit(state, action.meta, { rapporte, auftraege: spiegleRapport(state.stammdaten.auftraege, action.rapport) }, { markiertId: action.rapport.einsatzId });
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
  return commit(state, action.meta, { einsaetze, rapporte: ersetzeRapport(state.rapporte, rapport), auftraege, pendenzen }, { markiertId: rapport.einsatzId });
}

function signRapport(state: DispoState, action: Extract<DispoAction, { kind: 'signRapport' }>): DispoState {
  const rapport = state.rapporte.find((kandidat) => kandidat.id === action.rapportId);
  if (!rapport || rapport.status !== 'erstellt') return state;
  const neu: Rapport = { ...rapport, status: 'unterschrieben', unterschrift: action.unterschrift, geaendertAm: action.meta.zeit };
  return commit(state, action.meta, { rapporte: ersetzeRapport(state.rapporte, neu), auftraege: spiegleRapport(state.stammdaten.auftraege, neu) });
}

function freigebenRapport(state: DispoState, action: Extract<DispoAction, { kind: 'freigebenRapport' }>): DispoState {
  const rapport = state.rapporte.find((kandidat) => kandidat.id === action.rapportId);
  if (!rapport || (rapport.status !== 'erstellt' && rapport.status !== 'unterschrieben')) return state;
  const neu: Rapport = { ...rapport, status: 'freigegeben', freigegebenAm: action.meta.zeit, geaendertAm: action.meta.zeit };
  return commit(state, action.meta, { rapporte: ersetzeRapport(state.rapporte, neu), auftraege: spiegleRapport(state.stammdaten.auftraege, neu) });
}

function verrechnenRapport(state: DispoState, action: Extract<DispoAction, { kind: 'verrechnenRapport' }>): DispoState {
  const rapport = state.rapporte.find((kandidat) => kandidat.id === action.rapportId);
  if (!rapport || rapport.status !== 'freigegeben') return state;
  const neu: Rapport = { ...rapport, status: 'verrechnet', verrechnetAm: action.meta.zeit, geaendertAm: action.meta.zeit };
  return commit(state, action.meta, { rapporte: ersetzeRapport(state.rapporte, neu), auftraege: spiegleRapport(state.stammdaten.auftraege, neu, 'gestellt') });
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
  return commit(state, action.meta, { rapporte: ersetzeRapport(state.rapporte, neu), auftraege: spiegleRapport(state.stammdaten.auftraege, neu) });
}

function sendeNachricht(state: DispoState, action: Extract<DispoAction, { kind: 'sendeNachricht' }>): DispoState {
  return commit(state, action.meta, { nachrichten: [...state.nachrichten, action.nachricht] });
}

// ── §7 · Undo/Redo & Stand ───────────────────────────────────────

function undo(state: DispoState): DispoState {
  const [letzter, ...rest] = state.protokoll;
  if (!letzter) return state;
  const basis = anwenden(state, letzter.vorher);
  return {
    ...basis,
    protokoll: rest,
    zukunft: [letzter, ...state.zukunft],
    auswahl: auswahlExists(state.auswahl, letzter.vorher) ? state.auswahl : null,
    markiertId: null,
  };
}

function redo(state: DispoState): DispoState {
  const [naechster, ...rest] = state.zukunft;
  if (!naechster) return state;
  const basis = anwenden(state, naechster.nachher);
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

// ── §8 · Reducer ─────────────────────────────────────────────────

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
      return undo(state);
    case 'redo':
      return redo(state);
    case 'replaceStand':
      return replaceStand(state, action);
    case 'resetDemo':
      return createDispoState(action.stammdaten, action.bestand);
  }
}

/* ◆ jh · eof */
