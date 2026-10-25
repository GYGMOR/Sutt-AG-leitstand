/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/useDispoAktionen.ts            │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Aktionen mit Protokolltext, IDs, Zeitstempel – Klebstoff zum Store    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import { useBenutzer } from '../../../core/auth/authStore';
import { addDays, nowZeitpunkt, splitZeitpunkt } from '../../../core/datum';
import type { IsoDatum } from '../../../core/datum';
import { isTeilOffen } from '../../../core/domain/auftrag';
import type { Auftrag, Ersatzteil } from '../../../core/domain/auftrag';
import { STATUS_LABEL } from '../../../core/domain/einsatz';
import type { Einsatz, EinsatzStatus, Pendenz, StatusQuelle } from '../../../core/domain/einsatz';
import { NACHRICHT_KANAL, NACHRICHT_LABEL } from '../../../core/domain/nachricht';
import type { Nachricht, NachrichtArt } from '../../../core/domain/nachricht';
import { ABSCHLUSS_LABEL, nextRapportNummer } from '../../../core/domain/rapport';
import type { Rapport, Unterschrift } from '../../../core/domain/rapport';
import type { Geraet } from '../../../core/domain/stammdaten';
import { formatDatumKurz, formatWochentag, formatZeit } from '../../../core/format';
import type { DispoAuswahl, PlanZiel } from '../dispo.types';
import type { AktionsMeta, EinsatzAenderung } from './dispo.reducer';
import { resolveAuftrag, technikerOf } from './dispo.selectors';
import { getDispoStore, resetDispoStore } from './dispoStore';

// ── §1 · Hilfen ──────────────────────────────────────────────────

let laufnummer = 0;

// jh› Kennung je Fenster: der Stand überlebt Reload und zweites Fenster (ADR-001), ein nackter
//     Zähler würde dort wieder bei 1 beginnen und bestehende Objekte per ID überschreiben.
const FENSTER_KENNUNG = Math.random().toString(36).slice(2, 6);

export function nextId(prefix: string): string {
  laufnummer += 1;
  return `${prefix}-N${FENSTER_KENNUNG}${laufnummer.toString().padStart(3, '0')}`;
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

// jh? Lieferfrist beim Hersteller: drei Arbeitstage angenommen – mit Sutt je Marke klären.
const LIEFERFRIST_TAGE = 3;

/** Entwurf eines Rapports aus dem Formular – ID und Nummer vergibt die Aktion. */
export type RapportEntwurf = Omit<Rapport, 'id' | 'nummer' | 'status' | 'erstelltAm' | 'geaendertAm'> & { id?: string; nummer?: string };

export interface NachrichtEntwurf {
  art: NachrichtArt;
  auftragId: string;
  einsatzId?: string;
  an: string;
  empfaenger: string;
  text: string;
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

    // jh› Rapport aus dem Entwurf vervollständigen: bestehende ID/Nummer behalten, sonst neu.
    const vollstaendig = (entwurf: RapportEntwurf, status: Rapport['status']): Rapport => {
      const state = store.getState();
      const vorhanden = entwurf.id ? state.rapporte.find((kandidat) => kandidat.id === entwurf.id) : undefined;
      const zeit = nowZeitpunkt();
      return {
        ...entwurf,
        id: vorhanden?.id ?? entwurf.id ?? nextId('R'),
        nummer: vorhanden?.nummer ?? entwurf.nummer ?? nextRapportNummer(state.rapporte),
        status,
        erstelltAm: vorhanden?.erstelltAm ?? zeit,
        geaendertAm: zeit,
      };
    };

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
      setStatus(einsatzId: string, status: EinsatzStatus, quelle: StatusQuelle = 'buero') {
        const einsatz = store.getState().einsaetze.find((kandidat) => kandidat.id === einsatzId);
        if (!einsatz || einsatz.status === status) return;
        const herkunft = quelle === 'app' ? ' (App)' : '';
        store.dispatch({ kind: 'setStatus', einsatzId, status, quelle, meta: meta(`${nummerOf(einsatz.auftragId)} · Status «${STATUS_LABEL[status]}»${herkunft}`) });
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
      updateGeraet(geraet: Geraet, grund = 'Gerätedaten nachgetragen') {
        store.dispatch({ kind: 'updateGeraet', geraet, meta: meta(`${geraet.marke} ${geraet.modell} · ${grund}`) });
      },
      copyAuftrag(quelleId: string) {
        const state = store.getState();
        const quelle = state.stammdaten.auftraege.get(quelleId);
        if (!quelle) return;
        const id = nextId('A');
        const { rapportId: _alt, ...ohneRapport } = quelle;
        const kopie: Auftrag = {
          ...ohneRapport,
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

      // ·· Rapport
      /** Zwischenstand speichern – Status «erstellt» (oder «unterschrieben», wenn die Unterschrift schon da ist). */
      saveRapport(entwurf: RapportEntwurf): Rapport {
        const rapport = vollstaendig(entwurf, entwurf.unterschrift ? 'unterschrieben' : 'erstellt');
        store.dispatch({ kind: 'saveRapport', rapport, meta: meta(`${nummerOf(rapport.auftragId)} · Rapport ${rapport.nummer} gespeichert`) });
        return rapport;
      },
      /** Abschliessen: Rapport, Einsatzstatus, Teile am Auftrag und – je nach Abschluss – Pendenz im Eingang. */
      abschliessenRapport(entwurf: RapportEntwurf): { rapport: Rapport; pendenzId: string | null } {
        const state = store.getState();
        const rapport = vollstaendig(entwurf, entwurf.unterschrift ? 'unterschrieben' : 'erstellt');
        const einsatz = state.einsaetze.find((kandidat) => kandidat.id === rapport.einsatzId);
        const auftrag = state.stammdaten.auftraege.get(rapport.auftragId);
        if (!einsatz || !auftrag) throw new Error(`Rapport ${rapport.nummer}: Einsatz oder Auftrag fehlt`);
        const heute = splitZeitpunkt(nowZeitpunkt()).datum;

        // Bestellte Teile landen als «bestellt» mit Liefertermin am Auftrag.
        const bestellen = rapport.teile.filter((teil) => teil.verwendung === 'bestellen');
        const liefertermin = addDays(heute, LIEFERFRIST_TAGE);
        const ersatzteile: Ersatzteil[] = auftrag.ersatzteile.map((teil) =>
          bestellen.some((bestellt) => bestellt.artikelNummer === teil.artikelNummer) ? { ...teil, status: 'bestellt' as const, liefertermin } : teil,
        );
        for (const teil of bestellen) {
          if (ersatzteile.some((vorhanden) => vorhanden.artikelNummer === teil.artikelNummer)) continue;
          ersatzteile.push({ artikelNummer: teil.artikelNummer, bezeichnung: teil.bezeichnung, menge: teil.menge, preisChf: 0, status: 'bestellt', lieferant: 'Hersteller', liefertermin });
        }

        // jh› Pro Auftrag höchstens eine offene Pendenz – wer einen Rapport erneut abschliesst, legt keine zweite an.
        const pendenzOffen = state.pendenzen.some((kandidat) => kandidat.auftragId === auftrag.id);
        let pendenz: Pendenz | undefined;
        if (pendenzOffen) {
          pendenz = undefined;
        } else if (rapport.abschluss === 'teil-bestellt') {
          const erstes = bestellen[0];
          pendenz = { id: nextId('P'), auftragId: auftrag.id, anlass: 'folgetermin', dauerMin: Math.min(einsatz.dauerMin, 60), erstelltAm: nowZeitpunkt(), fruehestensAm: liefertermin, hinweis: erstes ? `${erstes.bezeichnung} – Liefertermin abwarten` : 'Teil bestellt – Liefertermin abwarten' };
        } else if (rapport.abschluss === 'folgetermin') {
          pendenz = { id: nextId('P'), auftragId: auftrag.id, anlass: 'folgetermin', dauerMin: einsatz.dauerMin, erstelltAm: nowZeitpunkt(), hinweis: rapport.abschlussGrund || 'Folgetermin aus Rapport' };
        } else if (rapport.abschluss === 'nicht-angetroffen') {
          pendenz = { id: nextId('P'), auftragId: auftrag.id, anlass: 'folgetermin', dauerMin: einsatz.dauerMin, erstelltAm: nowZeitpunkt(), hinweis: 'Nicht angetroffen – erneut terminieren' };
        }

        store.dispatch({
          kind: 'abschliessenRapport',
          rapport,
          auftrag: { ...auftrag, ersatzteile },
          ...(pendenz ? { pendenz } : {}),
          meta: meta(`${auftrag.nummer} · Rapport ${rapport.nummer} abgeschlossen: ${ABSCHLUSS_LABEL[rapport.abschluss]} (App)`),
        });
        return { rapport, pendenzId: pendenz?.id ?? null };
      },
      signRapport(rapportId: string, unterschrift: Unterschrift) {
        const rapport = store.getState().rapporte.find((kandidat) => kandidat.id === rapportId);
        if (!rapport) return;
        store.dispatch({ kind: 'signRapport', rapportId, unterschrift, meta: meta(`${nummerOf(rapport.auftragId)} · Rapport ${rapport.nummer} unterschrieben (${unterschrift.name})`) });
      },
      freigebenRapport(rapportId: string) {
        const rapport = store.getState().rapporte.find((kandidat) => kandidat.id === rapportId);
        if (!rapport) return;
        store.dispatch({ kind: 'freigebenRapport', rapportId, meta: meta(`${nummerOf(rapport.auftragId)} · Rapport ${rapport.nummer} freigegeben`) });
      },
      verrechnenRapport(rapportId: string) {
        const rapport = store.getState().rapporte.find((kandidat) => kandidat.id === rapportId);
        if (!rapport) return;
        store.dispatch({ kind: 'verrechnenRapport', rapportId, meta: meta(`${nummerOf(rapport.auftragId)} · Rapport ${rapport.nummer} verrechnet`) });
      },
      zurueckAnTechniker(rapportId: string, bemerkung: string) {
        const rapport = store.getState().rapporte.find((kandidat) => kandidat.id === rapportId);
        if (!rapport) return;
        store.dispatch({ kind: 'zurueckAnTechniker', rapportId, bemerkung, meta: meta(`${nummerOf(rapport.auftragId)} · Rapport ${rapport.nummer} zurück an ${kuerzelOf(rapport.technikerId)}`) });
      },

      // ·· Nachrichten (Mock-Versand)
      sendeNachricht(entwurf: NachrichtEntwurf): Nachricht {
        const nachricht: Nachricht = { ...entwurf, id: nextId('M'), kanal: NACHRICHT_KANAL[entwurf.art], zeitpunkt: nowZeitpunkt(), von: kuerzel };
        store.dispatch({ kind: 'sendeNachricht', nachricht, meta: meta(`${nummerOf(entwurf.auftragId)} · ${NACHRICHT_LABEL[entwurf.art]} an ${entwurf.empfaenger}`) });
        return nachricht;
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
      /** Ausgangsbestand des Mocks herstellen, gespeicherten Stand löschen. */
      resetDemo() {
        resetDispoStore();
      },
    };
  }, [kuerzel]);
}

export type DispoAktionen = ReturnType<typeof useDispoAktionen>;

/* ◆ jh · eof */
