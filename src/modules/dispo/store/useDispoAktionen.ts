/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/useDispoAktionen.ts            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Aktionen mit Protokolltext, IDs, Zeitstempel – Klebstoff zum Store    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import type { Benutzer } from '../../../core/auth/auth.types';
import { useBenutzer } from '../../../core/auth/authStore';
import { nowZeitpunkt, splitZeitpunkt } from '../../../core/datum';
import type { IsoDatum, Minuten } from '../../../core/datum';
import { ABSENZ_LABEL } from '../../../core/domain/absenz';
import type { Absenz, AbsenzStatus } from '../../../core/domain/absenz';
import { isTeilOffen } from '../../../core/domain/auftrag';
import type { Auftrag, Ersatzteil } from '../../../core/domain/auftrag';
import { STATUS_LABEL } from '../../../core/domain/einsatz';
import type { Einsatz, EinsatzStatus, Pendenz, StatusQuelle } from '../../../core/domain/einsatz';
import type { JournalBereich, JournalEintrag } from '../../../core/domain/journal';
import { LAGER_GLATTBRUGG, bestandVon, fahrzeugOrt, liefertermin, nextBestellNummer, technikerIdVon } from '../../../core/domain/lager';
import type { Artikel, Bestellung, LagerOrt, Lagerbewegung } from '../../../core/domain/lager';
import { NACHRICHT_KANAL, NACHRICHT_LABEL } from '../../../core/domain/nachricht';
import type { Nachricht, NachrichtArt } from '../../../core/domain/nachricht';
import { mitarbeiterName } from '../../../core/domain/personal';
import type { Mitarbeiter } from '../../../core/domain/personal';
import { ABSCHLUSS_LABEL, nextRapportNummer } from '../../../core/domain/rapport';
import type { Rapport, Unterschrift } from '../../../core/domain/rapport';
import type { Geraet, Kunde, Liegenschaft } from '../../../core/domain/stammdaten';
import { STEMPEL_LABEL } from '../../../core/domain/zeit';
import type { Monatsabschluss, StempelArt, ZeitArt, ZeitEintrag, ZeitGeraet } from '../../../core/domain/zeit';
import { formatDatumKurz, formatWochentag, formatZeit } from '../../../core/format';
import { ZEITZONE_STANDARD, jetztInZone, zeitpunktInZone } from '../../../core/zeitzone';
import type { DispoAuswahl, PlanZiel } from '../dispo.types';
import type { AktionsMeta, EinsatzAenderung, Loeschgrenzen } from './dispo.reducer';
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

/** Manuell erfasster Zeiteintrag – ID, Zeitstempel und Erfasser vergibt die Aktion. */
export interface ZeitEintragEntwurf {
  mitarbeiterId: string;
  datum: IsoDatum;
  art: ZeitArt;
  vonMin: Minuten;
  bisMin: Minuten | null;
  quelle: 'manuell' | 'einsatz';
  einsatzId?: string;
  bemerkung?: string;
}

export type AbsenzEntwurf = Omit<Absenz, 'id' | 'beantragtAm' | 'beantragtVon' | 'entschiedenAm' | 'entschiedenVon'>;

export type MonatsabschlussEntwurf = Omit<Monatsabschluss, 'id' | 'status' | 'eingereichtAm' | 'eingereichtVon' | 'entschiedenAm' | 'entschiedenVon'>;

export type JournalEntwurf = Omit<JournalEintrag, 'id' | 'zeitpunkt' | 'benutzer'> & { benutzer?: string };

// ── §2 · Hook ────────────────────────────────────────────────────

export function useDispoAktionen() {
  const benutzer = useBenutzer();
  const kuerzel = benutzer?.kuerzel ?? '??';

  return useMemo(() => {
    const store = getDispoStore();
    const meta = (text: string): AktionsMeta => ({ text, zeit: nowZeitpunkt(), benutzer: kuerzel });
    const nummerOf = (auftragId: string) => store.getState().stammdaten.auftraege.get(auftragId)?.nummer ?? auftragId;
    const kuerzelOf = (technikerId: string) => technikerOf(store.getState().stammdaten, technikerId).kuerzel;
    const ortLabel = (ort: LagerOrt) => {
      const technikerId = technikerIdVon(ort);
      return technikerId ? `Fahrzeug ${kuerzelOf(technikerId)}` : 'Glattbrugg';
    };
    const nameOf = (mitarbeiterId: string) => {
      const person = store.getState().stammdaten.mitarbeiter.get(mitarbeiterId);
      return person ? mitarbeiterName(person) : mitarbeiterId;
    };

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
        const spaetester = offeneTeile.map((teil) => teil.liefertermin).filter((termin): termin is IsoDatum => termin !== undefined).sort().pop();
        const ersterTeil = offeneTeile[0];
        const pendenz: Pendenz = {
          id: nextId('P'),
          auftragId: einsatz.auftragId,
          anlass: 'folgetermin',
          dauerMin: Math.min(einsatz.dauerMin, 60),
          erstelltAm: nowZeitpunkt(),
          ...(spaetester ? { fruehestensAm: spaetester } : {}),
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
        const termin = liefertermin(heute);

        // Bestellte Teile landen als «bestellt» mit Liefertermin am Auftrag – und als Bestellung im Lager (ADR-004).
        const bestellen = rapport.teile.filter((teil) => teil.verwendung === 'bestellen');
        const ersatzteile: Ersatzteil[] = auftrag.ersatzteile.map((teil) =>
          bestellen.some((bestellt) => bestellt.artikelNummer === teil.artikelNummer) ? { ...teil, status: 'bestellt' as const, liefertermin: termin } : teil,
        );
        const bestellungen: Bestellung[] = [];
        for (const teil of bestellen) {
          const artikel = state.stammdaten.artikel.get(teil.artikelNummer);
          const lieferant = artikel?.lieferant ?? 'Hersteller';
          if (!ersatzteile.some((vorhanden) => vorhanden.artikelNummer === teil.artikelNummer)) {
            ersatzteile.push({ artikelNummer: teil.artikelNummer, bezeichnung: teil.bezeichnung, menge: teil.menge, preisChf: artikel?.preisChf ?? 0, status: 'bestellt', lieferant, liefertermin: termin });
          }
          const offen = state.bestellungen.some((bestellung) => bestellung.status === 'offen' && bestellung.auftragId === auftrag.id && bestellung.artikelNummer === teil.artikelNummer);
          if (offen) continue;
          bestellungen.push({
            id: nextId('B'),
            nummer: nextBestellNummer([...state.bestellungen, ...bestellungen]),
            artikelNummer: teil.artikelNummer,
            bezeichnung: teil.bezeichnung,
            menge: teil.menge,
            lieferant,
            bestelltAm: nowZeitpunkt(),
            liefertermin: termin,
            status: 'offen',
            auftragId: auftrag.id,
            von: kuerzel,
          });
        }

        // Teile ab Fahrzeug und eingebaute Teile sind Verbrauch – nur für Artikel, die das Lager kennt.
        const bewegungen: Lagerbewegung[] = rapport.teile
          .filter((teil) => teil.verwendung !== 'bestellen' && state.stammdaten.artikel.has(teil.artikelNummer))
          .map((teil) => ({
            id: nextId('LB'),
            zeitpunkt: nowZeitpunkt(),
            art: 'verbrauch' as const,
            artikelNummer: teil.artikelNummer,
            menge: teil.menge,
            von: teil.verwendung === 'fahrzeuglager' ? fahrzeugOrt(rapport.technikerId) : LAGER_GLATTBRUGG,
            auftragId: auftrag.id,
            text: `Rapport ${rapport.nummer}`,
            benutzer: kuerzel,
          }));

        // jh› Pro Auftrag höchstens eine offene Pendenz – wer einen Rapport erneut abschliesst, legt keine zweite an.
        const pendenzOffen = state.pendenzen.some((kandidat) => kandidat.auftragId === auftrag.id);
        let pendenz: Pendenz | undefined;
        if (pendenzOffen) {
          pendenz = undefined;
        } else if (rapport.abschluss === 'teil-bestellt') {
          const erstes = bestellen[0];
          pendenz = { id: nextId('P'), auftragId: auftrag.id, anlass: 'folgetermin', dauerMin: Math.min(einsatz.dauerMin, 60), erstelltAm: nowZeitpunkt(), fruehestensAm: termin, hinweis: erstes ? `${erstes.bezeichnung} – Liefertermin abwarten` : 'Teil bestellt – Liefertermin abwarten' };
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
          bestellungen,
          bewegungen,
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

      // ·· Stammdaten (Module Kunden, Geräte, Lager)
      updateKunde(kunde: Kunde) {
        store.dispatch({ kind: 'updateKunde', kunde, meta: meta(`${kunde.nummer} · ${kunde.name} bearbeitet`) });
      },
      updateLiegenschaft(liegenschaft: Liegenschaft) {
        store.dispatch({ kind: 'updateLiegenschaft', liegenschaft, meta: meta(`Liegenschaft ${liegenschaft.bezeichnung} bearbeitet`) });
      },
      createLiegenschaft(entwurf: Omit<Liegenschaft, 'id'>): Liegenschaft {
        const liegenschaft: Liegenschaft = { ...entwurf, id: nextId('L') };
        store.dispatch({ kind: 'createLiegenschaft', liegenschaft, meta: meta(`Liegenschaft ${liegenschaft.bezeichnung} angelegt`) });
        return liegenschaft;
      },
      updateArtikel(artikel: Artikel) {
        store.dispatch({ kind: 'updateArtikel', artikel, meta: meta(`Artikel ${artikel.artikelNummer} · ${artikel.bezeichnung} bearbeitet`) });
      },
      /** Auftrag ohne Termin zurück in den Eingang; gibt die Pendenz-ID zurück. */
      pendenzAnlegen(auftragId: string): string | null {
        const auftrag = store.getState().stammdaten.auftraege.get(auftragId);
        if (!auftrag) return null;
        const pendenz: Pendenz = { id: nextId('P'), auftragId, anlass: 'neu', dauerMin: auftrag.dauerMin, erstelltAm: nowZeitpunkt(), hinweis: 'Aus dem Modul Aufträge in den Eingang gelegt' };
        store.dispatch({ kind: 'createPendenz', pendenz, meta: meta(`${auftrag.nummer} → Eingang`) });
        return pendenz.id;
      },

      // ·· Lager (ADR-004)
      bestellen(angaben: { artikelNummer: string; menge: number; auftragId?: string; liefertermin?: IsoDatum }): Bestellung | null {
        const state = store.getState();
        const artikel = state.stammdaten.artikel.get(angaben.artikelNummer);
        if (!artikel || angaben.menge <= 0) return null;
        const jetzt = nowZeitpunkt();
        const bestellung: Bestellung = {
          id: nextId('B'),
          nummer: nextBestellNummer(state.bestellungen),
          artikelNummer: artikel.artikelNummer,
          bezeichnung: artikel.bezeichnung,
          menge: angaben.menge,
          lieferant: artikel.lieferant,
          bestelltAm: jetzt,
          liefertermin: angaben.liefertermin ?? liefertermin(splitZeitpunkt(jetzt).datum),
          status: 'offen',
          ...(angaben.auftragId ? { auftragId: angaben.auftragId } : {}),
          von: kuerzel,
        };
        const zweck = angaben.auftragId ? ` für ${nummerOf(angaben.auftragId)}` : ' (Lager auffüllen)';
        store.dispatch({ kind: 'bestellen', bestellung, meta: meta(`${bestellung.nummer} · ${angaben.menge}× ${artikel.bezeichnung} bestellt${zweck}`) });
        return bestellung;
      },
      wareneingang(bestellungId: string) {
        const bestellung = store.getState().bestellungen.find((kandidat) => kandidat.id === bestellungId);
        if (!bestellung || bestellung.status !== 'offen') return;
        const bewegung: Lagerbewegung = {
          id: nextId('LB'),
          zeitpunkt: nowZeitpunkt(),
          art: 'wareneingang',
          artikelNummer: bestellung.artikelNummer,
          menge: bestellung.menge,
          nach: LAGER_GLATTBRUGG,
          bestellungId: bestellung.id,
          ...(bestellung.auftragId ? { auftragId: bestellung.auftragId } : {}),
          benutzer: kuerzel,
        };
        store.dispatch({ kind: 'wareneingang', bestellungId, bewegung, meta: meta(`${bestellung.nummer} · ${bestellung.menge}× ${bestellung.bezeichnung} eingetroffen`) });
      },
      umbuchen(artikelNummer: string, von: LagerOrt, nach: LagerOrt, menge: number, text?: string) {
        const artikel = store.getState().stammdaten.artikel.get(artikelNummer);
        if (!artikel || menge <= 0 || von === nach) return;
        const bewegung: Lagerbewegung = { id: nextId('LB'), zeitpunkt: nowZeitpunkt(), art: 'umbuchung', artikelNummer, menge, von, nach, ...(text ? { text } : {}), benutzer: kuerzel };
        store.dispatch({ kind: 'buchen', bewegung, meta: meta(`${menge}× ${artikel.bezeichnung} · ${ortLabel(von)} → ${ortLabel(nach)}`) });
      },
      /** Verbrauch ausserhalb des Rapports – z. B. nach dem Scan in der App; bucht vom Fahrzeug ab. */
      verbrauchMelden(artikelNummer: string, ort: LagerOrt, menge: number, text?: string, auftragId?: string) {
        const state = store.getState();
        const artikel = state.stammdaten.artikel.get(artikelNummer);
        if (!artikel || menge <= 0 || bestandVon(state.bestaende, artikelNummer, ort) < menge) return;
        const bewegung: Lagerbewegung = { id: nextId('LB'), zeitpunkt: nowZeitpunkt(), art: 'verbrauch', artikelNummer, menge, von: ort, ...(auftragId ? { auftragId } : {}), ...(text ? { text } : {}), benutzer: kuerzel };
        store.dispatch({ kind: 'buchen', bewegung, meta: meta(`${menge}× ${artikel.bezeichnung} · Verbrauch ${ortLabel(ort)}`) });
      },
      bestandKorrigieren(artikelNummer: string, ort: LagerOrt, neueMenge: number, grund: string) {
        const state = store.getState();
        const artikel = state.stammdaten.artikel.get(artikelNummer);
        if (!artikel) return;
        const delta = Math.max(0, Math.round(neueMenge)) - bestandVon(state.bestaende, artikelNummer, ort);
        if (delta === 0) return;
        const bewegung: Lagerbewegung = { id: nextId('LB'), zeitpunkt: nowZeitpunkt(), art: 'korrektur', artikelNummer, menge: delta, nach: ort, text: grund, benutzer: kuerzel };
        store.dispatch({ kind: 'buchen', bewegung, meta: meta(`${artikel.bezeichnung} · ${ortLabel(ort)} korrigiert auf ${Math.max(0, Math.round(neueMenge))}`) });
      },
      bestellungStornieren(bestellungId: string) {
        const bestellung = store.getState().bestellungen.find((kandidat) => kandidat.id === bestellungId);
        if (!bestellung || bestellung.status !== 'offen') return;
        store.dispatch({ kind: 'stornierenBestellung', bestellungId, meta: meta(`${bestellung.nummer} · ${bestellung.bezeichnung} storniert`) });
      },

      // ·· Zeiterfassung (rev 05)
      /** Kommen, Gehen, Pause, Weiter – immer für «jetzt» in der Zone des Betriebs; die Reihenfolge prüft die Domäne. */
      stempeln(mitarbeiterId: string, art: StempelArt, geraet: ZeitGeraet = 'leitstand', zone: string = ZEITZONE_STANDARD) {
        const { datum, minuten } = jetztInZone(zone);
        const zeit = zeitpunktInZone(zone);
        store.dispatch({ kind: 'stempeln', mitarbeiterId, datum, jetztMin: minuten, art, geraet, eintragId: nextId('Z'), meta: { text: `${nameOf(mitarbeiterId)} · ${STEMPEL_LABEL[art]} ${formatZeit(minuten)}`, zeit, benutzer: kuerzel } });
      },
      /** Notiz oder Einsatz am (laufenden) Eintrag – ohne Korrekturspur, mit Journal. */
      zeitEintragErgaenzen(eintragId: string, ergaenzung: { bemerkung?: string; einsatzId?: string | null }) {
        const eintrag = store.getState().zeiteintraege.find((kandidat) => kandidat.id === eintragId);
        if (!eintrag) return;
        const was = ergaenzung.einsatzId !== undefined ? (ergaenzung.einsatzId ? `Einsatz ${nummerOf(store.getState().einsaetze.find((einsatz) => einsatz.id === ergaenzung.einsatzId)?.auftragId ?? '')} zugeordnet` : 'Einsatz entfernt') : 'Notiz ergänzt';
        store.dispatch({ kind: 'zeitEintragErgaenzen', eintragId, ...ergaenzung, meta: meta(`${nameOf(eintrag.mitarbeiterId)} · Zeit ${formatDatumKurz(eintrag.datum)} ${formatZeit(eintrag.vonMin)}: ${was}`) });
      },
      zeitEintraegeAnlegen(entwuerfe: readonly ZeitEintragEntwurf[]): ZeitEintrag[] {
        const jetzt = nowZeitpunkt();
        const eintraege: ZeitEintrag[] = entwuerfe.map((entwurf) => ({ ...entwurf, id: nextId('Z'), erfasstAm: jetzt, erfasstVon: kuerzel, korrekturen: [] }));
        const erster = eintraege[0];
        if (!erster) return [];
        const was = eintraege.length === 1 ? 'Zeiteintrag' : `${eintraege.length} Zeiteinträge`;
        store.dispatch({ kind: 'zeitEintraegeAnlegen', eintraege, meta: meta(`${nameOf(erster.mitarbeiterId)} · ${was} ${formatDatumKurz(erster.datum)} ${erster.quelle === 'einsatz' ? 'aus dem Einsatzplan übernommen' : 'manuell erfasst'}`) });
        return eintraege;
      },
      zeitEintragKorrigieren(eintragId: string, aenderung: { art?: ZeitArt; vonMin: Minuten; bisMin: Minuten | null }, grund: string) {
        const eintrag = store.getState().zeiteintraege.find((kandidat) => kandidat.id === eintragId);
        if (!eintrag) return;
        store.dispatch({ kind: 'zeitEintragKorrigieren', eintragId, aenderung, grund, meta: meta(`${nameOf(eintrag.mitarbeiterId)} · Zeit ${formatDatumKurz(eintrag.datum)} korrigiert auf ${formatZeit(aenderung.vonMin)}–${aenderung.bisMin === null ? 'offen' : formatZeit(aenderung.bisMin)}: ${grund}`) });
      },
      zeitEintragLoeschen(eintragId: string, grund: string) {
        const eintrag = store.getState().zeiteintraege.find((kandidat) => kandidat.id === eintragId);
        if (!eintrag) return;
        store.dispatch({ kind: 'zeitEintragLoeschen', eintragId, grund, meta: meta(`${nameOf(eintrag.mitarbeiterId)} · Zeit ${formatDatumKurz(eintrag.datum)} ${formatZeit(eintrag.vonMin)} gelöscht: ${grund}`) });
      },
      monatEinreichen(entwurf: MonatsabschlussEntwurf): Monatsabschluss {
        const abschluss: Monatsabschluss = { ...entwurf, id: nextId('MA'), status: 'eingereicht', eingereichtAm: nowZeitpunkt(), eingereichtVon: kuerzel };
        store.dispatch({ kind: 'monatEinreichen', abschluss, meta: meta(`${nameOf(abschluss.mitarbeiterId)} · Monat ${abschluss.monat} eingereicht`) });
        return abschluss;
      },
      monatEntscheiden(abschlussId: string, status: 'genehmigt' | 'zurueckgewiesen', bemerkung?: string) {
        const abschluss = store.getState().monatsabschluesse.find((kandidat) => kandidat.id === abschlussId);
        if (!abschluss) return;
        store.dispatch({ kind: 'monatEntscheiden', abschlussId, status, ...(bemerkung ? { bemerkung } : {}), meta: meta(`${nameOf(abschluss.mitarbeiterId)} · Monat ${abschluss.monat} ${status === 'genehmigt' ? 'genehmigt' : 'zurückgewiesen'}${bemerkung ? `: ${bemerkung}` : ''}`) });
      },

      // ·· Absenzen (rev 05)
      absenzBeantragen(entwurf: AbsenzEntwurf): Absenz {
        const jetzt = nowZeitpunkt();
        const absenz: Absenz = { ...entwurf, id: nextId('AB'), beantragtAm: jetzt, beantragtVon: kuerzel, ...(entwurf.status === 'genehmigt' ? { entschiedenAm: jetzt, entschiedenVon: kuerzel } : {}) };
        const zeitraum = absenz.von === absenz.bis ? formatDatumKurz(absenz.von) : `${formatDatumKurz(absenz.von)}–${formatDatumKurz(absenz.bis)}`;
        store.dispatch({ kind: 'absenzBeantragen', absenz, meta: meta(`${nameOf(absenz.mitarbeiterId)} · ${ABSENZ_LABEL[absenz.art]} ${zeitraum} ${absenz.status === 'genehmigt' ? 'eingetragen' : 'beantragt'}`) });
        return absenz;
      },
      absenzEntscheiden(absenzId: string, status: AbsenzStatus, grund?: string) {
        const absenz = store.getState().stammdaten.absenzen.find((kandidat) => kandidat.id === absenzId);
        if (!absenz) return;
        const wort = status === 'genehmigt' ? 'genehmigt' : status === 'abgelehnt' ? 'abgelehnt' : 'zurück auf beantragt';
        store.dispatch({ kind: 'absenzEntscheiden', absenzId, status, ...(grund ? { grund } : {}), meta: meta(`${nameOf(absenz.mitarbeiterId)} · ${ABSENZ_LABEL[absenz.art]} ${formatDatumKurz(absenz.von)} ${wort}${grund ? `: ${grund}` : ''}`) });
      },
      absenzAendern(absenz: Absenz) {
        store.dispatch({ kind: 'absenzAendern', absenz, meta: meta(`${nameOf(absenz.mitarbeiterId)} · ${ABSENZ_LABEL[absenz.art]} ${formatDatumKurz(absenz.von)} geändert`) });
      },
      absenzLoeschen(absenzId: string) {
        const absenz = store.getState().stammdaten.absenzen.find((kandidat) => kandidat.id === absenzId);
        if (!absenz) return;
        store.dispatch({ kind: 'absenzLoeschen', absenzId, meta: meta(`${nameOf(absenz.mitarbeiterId)} · ${ABSENZ_LABEL[absenz.art]} ${formatDatumKurz(absenz.von)} gelöscht`) });
      },

      // ·· Personal & Konten (rev 05)
      mitarbeiterSpeichern(mitarbeiter: Mitarbeiter) {
        const neu = !store.getState().stammdaten.mitarbeiter.has(mitarbeiter.id);
        store.dispatch({ kind: 'mitarbeiterSpeichern', mitarbeiter, meta: meta(`Personalakte ${mitarbeiterName(mitarbeiter)} ${neu ? 'angelegt' : 'bearbeitet'}`) });
      },
      benutzerSpeichern(benutzer: Benutzer) {
        const neu = !store.getState().stammdaten.benutzer.has(benutzer.id);
        store.dispatch({ kind: 'benutzerSpeichern', benutzer, meta: meta(`Konto ${benutzer.benutzername} ${neu ? 'angelegt' : 'bearbeitet'}`) });
      },
      loeschlauf(vor: Loeschgrenzen, text: string) {
        store.dispatch({ kind: 'loeschlauf', vor, meta: meta(text) });
      },
      /** Journal ohne Undo – Einsicht, Export, Verbindungstest, Einstellungen. */
      protokolliere(entwurf: JournalEntwurf) {
        store.dispatch({ kind: 'protokolliere', eintrag: { ...entwurf, id: nextId('J'), zeitpunkt: nowZeitpunkt(), benutzer: entwurf.benutzer ?? kuerzel } });
      },
      einsichtProtokollieren(bereich: JournalBereich, mitarbeiterId: string, text: string) {
        store.dispatch({ kind: 'protokolliere', eintrag: { id: nextId('J'), zeitpunkt: nowZeitpunkt(), benutzer: kuerzel, bereich, art: 'einsicht', text, mitarbeiterId } });
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
        store.dispatch({ kind: 'undo', meta: meta('Rückgängig') });
      },
      redo() {
        store.dispatch({ kind: 'redo', meta: meta('Wiederherstellen') });
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
