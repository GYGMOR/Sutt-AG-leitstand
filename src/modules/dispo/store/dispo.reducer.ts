/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/dispo.reducer.ts               │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Dispo-State: planen, verschieben, bearbeiten, löschen, Undo/Redo      │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum, IsoZeitpunkt, Minuten } from '../../../core/datum';
import type { Auftrag } from '../../../core/domain/auftrag';
import type { Einsatz, EinsatzStatus, Pendenz } from '../../../core/domain/einsatz';
import type { Geraet } from '../../../core/domain/stammdaten';
import type { DispoAuswahl, DispoBestand, DispoStammdaten, PlanZiel } from '../dispo.types';

// ── §1 · State ───────────────────────────────────────────────────

interface Schnappschuss {
  einsaetze: readonly Einsatz[];
  pendenzen: readonly Pendenz[];
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
  | { kind: 'setStatus'; einsatzId: string; status: EinsatzStatus; meta: AktionsMeta }
  | { kind: 'requestFolgetermin'; einsatzId: string; pendenz: Pendenz; meta: AktionsMeta }
  | { kind: 'createAuftrag'; auftrag: Auftrag; geraet?: Geraet; pendenz?: Pendenz; einsatz?: Einsatz; meta: AktionsMeta }
  | { kind: 'updateAuftrag'; auftrag: Auftrag; einsatz?: EinsatzAenderung; meta: AktionsMeta }
  | { kind: 'copyAuftrag'; auftrag: Auftrag; pendenz: Pendenz; meta: AktionsMeta }
  | { kind: 'deleteAuftrag'; auftragId: string; meta: AktionsMeta }
  | { kind: 'assignTechniker'; einsatzIds: readonly string[]; technikerId: string; meta: AktionsMeta }
  | { kind: 'shiftEinsaetze'; einsatzIds: readonly string[]; datum: IsoDatum; meta: AktionsMeta }
  | { kind: 'select'; auswahl: DispoAuswahl }
  | { kind: 'toggleMehrfach'; einsatzId: string }
  | { kind: 'setMehrfach'; einsatzIds: readonly string[] }
  | { kind: 'undo' }
  | { kind: 'redo' };

// ── §3 · Hilfen ──────────────────────────────────────────────────

function schnappschuss(state: DispoState): Schnappschuss {
  return { einsaetze: state.einsaetze, pendenzen: state.pendenzen, auftraege: state.stammdaten.auftraege, geraete: state.stammdaten.geraete };
}

function anwenden(state: DispoState, schnapp: Schnappschuss): DispoState {
  return {
    ...state,
    einsaetze: schnapp.einsaetze,
    pendenzen: schnapp.pendenzen,
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

// ── §4 · Einzelne Aktionen ───────────────────────────────────────

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
    kandidat.id === action.einsatzId
      ? { ...kandidat, status: action.status, ...(action.status === 'vor-ort' ? { statusSeit: action.meta.zeit } : {}) }
      : kandidat,
  );
  return commit(state, action.meta, { einsaetze });
}

function requestFolgetermin(state: DispoState, action: Extract<DispoAction, { kind: 'requestFolgetermin' }>): DispoState {
  const einsaetze = state.einsaetze.map((einsatz) => {
    if (einsatz.id !== action.einsatzId || einsatz.status !== 'vor-ort') return einsatz;
    return { ...einsatz, status: 'wartet-teil' as const };
  });
  return commit(state, action.meta, { einsaetze, pendenzen: [...state.pendenzen, action.pendenz] }, { markiertId: action.pendenz.id });
}

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
  if (einsaetze.length === state.einsaetze.length && pendenzen.length === state.pendenzen.length) return state;
  return commit(state, action.meta, { einsaetze, pendenzen }, { auswahl: null, mehrfach: state.mehrfach.filter((id) => einsaetze.some((e) => e.id === id)) });
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

// ── §5 · Reducer ─────────────────────────────────────────────────

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
    case 'copyAuftrag':
      return copyAuftrag(state, action);
    case 'deleteAuftrag':
      return deleteAuftrag(state, action);
    case 'assignTechniker':
      return assignTechniker(state, action);
    case 'shiftEinsaetze':
      return shiftEinsaetze(state, action);
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
  }
}

/* ◆ jh · eof */
