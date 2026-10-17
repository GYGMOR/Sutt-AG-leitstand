/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/useDispoAktionen.ts            │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Aktionen mit Protokolltext, IDs, Zeitstempel – Klebstoff zum Store    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import { useBenutzer } from '../../../core/auth/authStore';
import { nowZeitpunkt } from '../../../core/datum';
import type { IsoDatum } from '../../../core/datum';
import { isTeilOffen } from '../../../core/domain/auftrag';
import type { Auftrag } from '../../../core/domain/auftrag';
import { STATUS_LABEL } from '../../../core/domain/einsatz';
import type { Einsatz, EinsatzStatus, Pendenz } from '../../../core/domain/einsatz';
import type { Geraet } from '../../../core/domain/stammdaten';
import { formatDatumKurz, formatWochentag, formatZeit } from '../../../core/format';
import type { DispoAuswahl, PlanZiel } from '../dispo.types';
import type { AktionsMeta, EinsatzAenderung } from './dispo.reducer';
import { resolveAuftrag, technikerOf } from './dispo.selectors';
import { getDispoStore } from './dispoStore';

// ── §1 · Hilfen ──────────────────────────────────────────────────

let laufnummer = 0;

export function nextId(prefix: string): string {
  laufnummer += 1;
  return `${prefix}-N${laufnummer.toString().padStart(3, '0')}`;
}

/** Nächste freie Auftragsnummer im Jahreskreis «26-0xxxx». */
export function nextAuftragsnummer(auftraege: ReadonlyMap<string, Auftrag>): string {
  let hoechste = 0;
  for (const auftrag of auftraege.values()) {
    const treffer = /^26-0(\d{4})$/.exec(auftrag.nummer);
    if (treffer) hoechste = Math.max(hoechste, Number(treffer[1]));
  }
  return `26-0${String(hoechste + 1).padStart(4, '0')}`;
}

function describeZiel(ziel: PlanZiel, kuerzel: string): string {
  return `${kuerzel} · ${formatWochentag(ziel.datum, 'kurz')} ${formatDatumKurz(ziel.datum)} ${formatZeit(ziel.startMin)}`;
}

// ── §2 · Hook ────────────────────────────────────────────────────

export function useDispoAktionen() {
  const benutzer = useBenutzer();
  const kuerzel = benutzer?.kuerzel ?? '??';

  return useMemo(() => {
    const store = getDispoStore();
    const meta = (text: string): AktionsMeta => ({ text, zeit: nowZeitpunkt(), benutzer: kuerzel });
    const nummerOf = (auftragId: string) => store.getState().stammdaten.auftraege.get(auftragId)?.nummer ?? auftragId;
    const kuerzelOf = (technikerId: string) => technikerOf(store.getState().stammdaten, technikerId).kuerzel;

    return {
      planPendenz(pendenzId: string, ziel: PlanZiel) {
        const pendenz = store.getState().pendenzen.find((kandidat) => kandidat.id === pendenzId);
        if (!pendenz) return;
        store.dispatch({ kind: 'planPendenz', pendenzId, einsatzId: nextId('E'), ziel, meta: meta(`${nummerOf(pendenz.auftragId)} → ${describeZiel(ziel, kuerzelOf(ziel.technikerId))}`) });
      },
      moveEinsatz(einsatzId: string, ziel: PlanZiel) {
        const einsatz = store.getState().einsaetze.find((kandidat) => kandidat.id === einsatzId);
        if (!einsatz) return;
        store.dispatch({ kind: 'moveEinsatz', einsatzId, ziel, meta: meta(`${nummerOf(einsatz.auftragId)} verschoben → ${describeZiel(ziel, kuerzelOf(ziel.technikerId))}`) });
      },
      unplanEinsatz(einsatzId: string) {
        const einsatz = store.getState().einsaetze.find((kandidat) => kandidat.id === einsatzId);
        if (!einsatz) return;
        store.dispatch({ kind: 'unplanEinsatz', einsatzId, pendenzId: nextId('P'), meta: meta(`${nummerOf(einsatz.auftragId)} zurück in den Eingang`) });
      },
      setStatus(einsatzId: string, status: EinsatzStatus) {
        const einsatz = store.getState().einsaetze.find((kandidat) => kandidat.id === einsatzId);
        if (!einsatz || einsatz.status === status) return;
        store.dispatch({ kind: 'setStatus', einsatzId, status, meta: meta(`${nummerOf(einsatz.auftragId)} · Status «${STATUS_LABEL[status]}»`) });
      },
      /** Legt den Folgetermin in den Eingang; gibt die Pendenz-ID zurück. */
      requestFolgetermin(einsatzId: string): string | null {
        const state = store.getState();
        const einsatz = state.einsaetze.find((kandidat) => kandidat.id === einsatzId);
        if (!einsatz) return null;
        const { auftrag } = resolveAuftrag(state.stammdaten, einsatz.auftragId);
        const offeneTeile = auftrag.ersatzteile.filter(isTeilOffen);
        const liefertermin = offeneTeile.map((teil) => teil.liefertermin).filter((termin): termin is IsoDatum => termin !== undefined).sort().pop();
        const ersterTeil = offeneTeile[0];
        const pendenz: Pendenz = {
          id: nextId('P'),
          auftragId: einsatz.auftragId,
          anlass: 'folgetermin',
          dauerMin: Math.min(einsatz.dauerMin, 60),
          erstelltAm: nowZeitpunkt(),
          ...(liefertermin ? { fruehestensAm: liefertermin } : {}),
          hinweis: ersterTeil ? `${ersterTeil.bezeichnung} – Liefertermin abwarten` : 'Folgetermin aus Einsatz',
        };
        store.dispatch({ kind: 'requestFolgetermin', einsatzId, pendenz, meta: meta(`${auftrag.nummer} · Folgetermin im Eingang`) });
        return pendenz.id;
      },
      /** Ersatzteil-Kopplung: Folgetermin anlegen und sofort auf den gewählten Slot planen. */
      planFolgetermin(einsatzId: string, ziel: PlanZiel) {
        const vorhandene = store.getState().pendenzen.find((pendenz) => {
          const einsatz = store.getState().einsaetze.find((kandidat) => kandidat.id === einsatzId);
          return einsatz && pendenz.auftragId === einsatz.auftragId;
        });
        const pendenzId = vorhandene?.id ?? this.requestFolgetermin(einsatzId);
        if (!pendenzId) return;
        const pendenz = store.getState().pendenzen.find((kandidat) => kandidat.id === pendenzId);
        if (!pendenz) return;
        store.dispatch({
          kind: 'planPendenz',
          pendenzId,
          einsatzId: nextId('E'),
          ziel,
          meta: meta(`${nummerOf(pendenz.auftragId)} Folgetermin → ${describeZiel(ziel, kuerzelOf(ziel.technikerId))}`),
        });
      },
      createAuftrag(auftrag: Auftrag, optionen: { geraet?: Geraet; pendenz?: Pendenz; einsatz?: Einsatz }) {
        const ziel = optionen.einsatz
          ? ` → ${describeZiel({ technikerId: optionen.einsatz.technikerId, datum: optionen.einsatz.datum, startMin: optionen.einsatz.startMin }, kuerzelOf(optionen.einsatz.technikerId))}`
          : ' → Eingang';
        store.dispatch({ kind: 'createAuftrag', auftrag, ...optionen, meta: meta(`${auftrag.nummer} erfasst${ziel}`) });
      },
      updateAuftrag(auftrag: Auftrag, einsatz?: EinsatzAenderung) {
        store.dispatch({ kind: 'updateAuftrag', auftrag, ...(einsatz ? { einsatz } : {}), meta: meta(`${auftrag.nummer} bearbeitet`) });
      },
      copyAuftrag(quelleId: string) {
        const state = store.getState();
        const quelle = state.stammdaten.auftraege.get(quelleId);
        if (!quelle) return;
        const id = nextId('A');
        const kopie: Auftrag = {
          ...quelle,
          id,
          nummer: nextAuftragsnummer(state.stammdaten.auftraege),
          kanal: 'Schnellerfassung',
          angefragtAm: nowZeitpunkt(),
          bestelltAm: nowZeitpunkt(),
          ersatzteile: [],
          fotos: [],
          rapport: 'offen',
          rechnungStatus: 'offen',
          notiz: `Kopie von ${quelle.nummer}`,
        };
        const pendenz: Pendenz = { id: nextId('P'), auftragId: id, anlass: 'neu', dauerMin: quelle.dauerMin, erstelltAm: nowZeitpunkt(), hinweis: `Kopie von ${quelle.nummer}` };
        store.dispatch({ kind: 'copyAuftrag', auftrag: kopie, pendenz, meta: meta(`${quelle.nummer} kopiert → ${kopie.nummer}`) });
      },
      deleteAuftrag(auftragId: string) {
        store.dispatch({ kind: 'deleteAuftrag', auftragId, meta: meta(`${nummerOf(auftragId)} gelöscht`) });
      },
      assignTechniker(einsatzIds: readonly string[], technikerId: string) {
        store.dispatch({ kind: 'assignTechniker', einsatzIds, technikerId, meta: meta(`${einsatzIds.length} Einsätze → ${kuerzelOf(technikerId)}`) });
      },
      shiftEinsaetze(einsatzIds: readonly string[], datum: IsoDatum) {
        store.dispatch({ kind: 'shiftEinsaetze', einsatzIds, datum, meta: meta(`${einsatzIds.length} Einsätze → ${formatDatumKurz(datum)}`) });
      },
      select(auswahl: DispoAuswahl) {
        store.dispatch({ kind: 'select', auswahl });
      },
      toggleMehrfach(einsatzId: string) {
        store.dispatch({ kind: 'toggleMehrfach', einsatzId });
      },
      setMehrfach(einsatzIds: readonly string[]) {
        store.dispatch({ kind: 'setMehrfach', einsatzIds });
      },
      undo() {
        store.dispatch({ kind: 'undo' });
      },
      redo() {
        store.dispatch({ kind: 'redo' });
      },
    };
  }, [kuerzel]);
}

export type DispoAktionen = ReturnType<typeof useDispoAktionen>;

/* ◆ jh · eof */
