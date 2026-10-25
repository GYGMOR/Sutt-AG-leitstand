/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/dispo.reducer.test.ts          │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Reducer: planen, Status mit Verlauf, Rapportfluss, Undo/Redo, Stand   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { addDays } from '../../../core/datum';
import { HEUTE, einsatzMitId, meta, rapportEntwurf, testState } from '../../../test/testdaten';
import { dispoReducer, schnappschuss } from './dispo.reducer';

// ── §1 · Planen ──────────────────────────────────────────────────

describe('planPendenz', () => {
  it('legt den Einsatz an, entfernt die Pendenz und schreibt ins Protokoll', () => {
    const start = testState();
    const pendenz = start.pendenzen[0];
    if (!pendenz) throw new Error('Mock ohne Pendenz');
    const ziel = { technikerId: 'T-RH', datum: HEUTE, startMin: 16 * 60 };
    const state = dispoReducer(start, { kind: 'planPendenz', pendenzId: pendenz.id, einsatzId: 'E-T1', ziel, meta: meta('planen') });

    expect(state.einsaetze.find((einsatz) => einsatz.id === 'E-T1')).toMatchObject({ auftragId: pendenz.auftragId, ...ziel, status: 'geplant', dauerMin: pendenz.dauerMin });
    expect(state.pendenzen.some((kandidat) => kandidat.id === pendenz.id)).toBe(false);
    expect(state.protokoll).toHaveLength(1);
    expect(state.protokoll[0]?.text).toBe('planen');
    expect(state.markiertId).toBe('E-T1');
  });

  it('ignoriert unbekannte Pendenzen ohne Protokolleintrag', () => {
    const start = testState();
    const state = dispoReducer(start, { kind: 'planPendenz', pendenzId: 'P-gibt-es-nicht', einsatzId: 'E-T2', ziel: { technikerId: 'T-RH', datum: HEUTE, startMin: 600 }, meta: meta() });
    expect(state).toBe(start);
  });
});

describe('moveEinsatz', () => {
  it('setzt den verschobenen Einsatz zurück auf «geplant»', () => {
    const start = testState();
    const morgen = addDays(HEUTE, 1);
    const state = dispoReducer(start, { kind: 'moveEinsatz', einsatzId: 'E-A01-F', ziel: { technikerId: 'T-SK', datum: morgen, startMin: 9 * 60 }, meta: meta() });
    expect(einsatzMitId(state, 'E-A01-F')).toMatchObject({ technikerId: 'T-SK', datum: morgen, startMin: 540, status: 'geplant' });
  });

  it('ändert nichts, wenn Ziel und Herkunft gleich sind', () => {
    const start = testState();
    const einsatz = einsatzMitId(start, 'E-A01-F');
    const state = dispoReducer(start, { kind: 'moveEinsatz', einsatzId: einsatz.id, ziel: { technikerId: einsatz.technikerId, datum: einsatz.datum, startMin: einsatz.startMin }, meta: meta() });
    expect(state).toBe(start);
  });
});

// ── §2 · Status & Verlauf ────────────────────────────────────────

describe('setStatus', () => {
  it('schreibt den Wechsel mit Zeit und Quelle in den Verlauf', () => {
    const start = testState();
    const state = dispoReducer(start, { kind: 'setStatus', einsatzId: 'E-A01-F', status: 'unterwegs', quelle: 'app', meta: meta('abfahrt', 7 * 60 + 40) });
    const einsatz = einsatzMitId(state, 'E-A01-F');
    expect(einsatz.status).toBe('unterwegs');
    expect(einsatz.statusSeit).toBe(`${HEUTE}T07:40`);
    expect(einsatz.verlauf?.at(-1)).toEqual({ status: 'unterwegs', zeitpunkt: `${HEUTE}T07:40`, quelle: 'app' });
  });

  it('lehnt denselben Status ohne Änderung ab', () => {
    const start = testState();
    const einsatz = einsatzMitId(start, 'E-A01-F');
    expect(dispoReducer(start, { kind: 'setStatus', einsatzId: einsatz.id, status: einsatz.status, quelle: 'buero', meta: meta() })).toBe(start);
  });
});

// ── §3 · Rapport ─────────────────────────────────────────────────

describe('abschliessenRapport', () => {
  it('setzt «teil bestellt» auf wartet-teil und legt den Folgetermin ab Liefertermin an', () => {
    const start = testState();
    const einsatz = einsatzMitId(start, 'E-A01-F');
    const auftrag = start.stammdaten.auftraege.get(einsatz.auftragId);
    if (!auftrag) throw new Error('Auftrag fehlt');
    const liefertermin = addDays(HEUTE, 3);
    const rapport = rapportEntwurf(einsatz, { abschluss: 'teil-bestellt', teile: [{ artikelNummer: '11380960', bezeichnung: 'Laugenpumpe', menge: 1, verwendung: 'bestellen' }] });
    const pendenz = { id: 'P-T1', auftragId: auftrag.id, anlass: 'folgetermin' as const, dauerMin: 60, erstelltAm: meta().zeit, fruehestensAm: liefertermin };

    const state = dispoReducer(start, { kind: 'abschliessenRapport', rapport, auftrag, pendenz, meta: meta('abschluss', 11 * 60) });

    expect(einsatzMitId(state, einsatz.id).status).toBe('wartet-teil');
    expect(einsatzMitId(state, einsatz.id).verlauf?.at(-1)?.status).toBe('wartet-teil');
    expect(state.pendenzen.at(-1)).toMatchObject({ id: 'P-T1', anlass: 'folgetermin', fruehestensAm: liefertermin });
    expect(state.rapporte.find((kandidat) => kandidat.id === rapport.id)).toBeDefined();
    expect(state.stammdaten.auftraege.get(auftrag.id)).toMatchObject({ rapport: 'erstellt', rapportId: rapport.id });
  });

  it('setzt «erledigt» auf erledigt und übernimmt Fotos in den Auftrag', () => {
    const start = testState();
    const einsatz = einsatzMitId(start, 'E-A01-F');
    const auftrag = start.stammdaten.auftraege.get(einsatz.auftragId);
    if (!auftrag) throw new Error('Auftrag fehlt');
    const foto = { id: 'F-T', motiv: 'typenschild' as const, aufgenommenAm: meta().zeit, technikerKuerzel: 'MB' };
    const state = dispoReducer(start, { kind: 'abschliessenRapport', rapport: rapportEntwurf(einsatz, { fotos: [foto] }), auftrag, meta: meta() });
    expect(einsatzMitId(state, einsatz.id).status).toBe('erledigt');
    expect(state.stammdaten.auftraege.get(auftrag.id)?.fotos).toEqual([foto]);
    expect(state.pendenzen).toHaveLength(start.pendenzen.length);
  });
});

describe('Rapport-Übergänge im Büro', () => {
  function mitRapport() {
    const start = testState();
    const einsatz = einsatzMitId(start, 'E-A01-F');
    const rapport = rapportEntwurf(einsatz);
    return { state: dispoReducer(start, { kind: 'saveRapport', rapport, meta: meta() }), rapport };
  }

  it('gibt nur erstellte oder unterschriebene Rapporte frei', () => {
    const { state, rapport } = mitRapport();
    const frei = dispoReducer(state, { kind: 'freigebenRapport', rapportId: rapport.id, meta: meta('frei', 12 * 60) });
    expect(frei.rapporte.find((kandidat) => kandidat.id === rapport.id)).toMatchObject({ status: 'freigegeben', freigegebenAm: `${HEUTE}T12:00` });
    expect(dispoReducer(frei, { kind: 'freigebenRapport', rapportId: rapport.id, meta: meta() })).toBe(frei);
  });

  it('verrechnet nur freigegebene Rapporte und setzt die Rechnung auf «gestellt»', () => {
    const { state, rapport } = mitRapport();
    expect(dispoReducer(state, { kind: 'verrechnenRapport', rapportId: rapport.id, meta: meta() })).toBe(state);
    const frei = dispoReducer(state, { kind: 'freigebenRapport', rapportId: rapport.id, meta: meta() });
    const verrechnet = dispoReducer(frei, { kind: 'verrechnenRapport', rapportId: rapport.id, meta: meta() });
    expect(verrechnet.rapporte.find((kandidat) => kandidat.id === rapport.id)?.status).toBe('verrechnet');
    expect(verrechnet.stammdaten.auftraege.get(rapport.auftragId)).toMatchObject({ rapport: 'verrechnet', rechnungStatus: 'gestellt' });
  });

  it('nimmt beim Zurückgeben die Unterschrift weg und merkt die Bemerkung', () => {
    const { state, rapport } = mitRapport();
    const unterschrift = { name: 'Lea Hofstetter', zeitpunkt: meta().zeit, pfad: 'M0 0 L10 10' };
    const signiert = dispoReducer(state, { kind: 'signRapport', rapportId: rapport.id, unterschrift, meta: meta() });
    expect(signiert.rapporte.find((kandidat) => kandidat.id === rapport.id)?.status).toBe('unterschrieben');
    const zurueck = dispoReducer(signiert, { kind: 'zurueckAnTechniker', rapportId: rapport.id, bemerkung: 'Zeiten prüfen', meta: meta('zurück', 14 * 60) });
    const neu = zurueck.rapporte.find((kandidat) => kandidat.id === rapport.id);
    expect(neu?.status).toBe('erstellt');
    expect(neu?.unterschrift).toBeUndefined();
    expect(neu?.rueckmeldung).toMatchObject({ bemerkung: 'Zeiten prüfen', von: 'TT' });
  });
});

// ── §4 · Undo/Redo & Stand ───────────────────────────────────────

describe('undo / redo', () => {
  it('stellt den Schnappschuss vor der Planung her und wieder zurück', () => {
    const start = testState();
    const pendenz = start.pendenzen[0];
    if (!pendenz) throw new Error('Mock ohne Pendenz');
    const geplant = dispoReducer(start, { kind: 'planPendenz', pendenzId: pendenz.id, einsatzId: 'E-T3', ziel: { technikerId: 'T-RH', datum: HEUTE, startMin: 960 }, meta: meta() });
    const zurueck = dispoReducer(geplant, { kind: 'undo' });
    expect(schnappschuss(zurueck)).toEqual(schnappschuss(start));
    expect(zurueck.zukunft).toHaveLength(1);
    const wieder = dispoReducer(zurueck, { kind: 'redo' });
    expect(schnappschuss(wieder)).toEqual(schnappschuss(geplant));
  });

  it('macht auch Rapport-Aktionen rückgängig', () => {
    const start = testState();
    const rapport = rapportEntwurf(einsatzMitId(start, 'E-A01-F'));
    const gespeichert = dispoReducer(start, { kind: 'saveRapport', rapport, meta: meta() });
    expect(gespeichert.rapporte).toHaveLength(start.rapporte.length + 1);
    expect(dispoReducer(gespeichert, { kind: 'undo' }).rapporte).toHaveLength(start.rapporte.length);
  });
});

describe('replaceStand', () => {
  it('übernimmt den fremden Stand und leert das Protokoll', () => {
    const start = testState();
    const geplant = dispoReducer(start, { kind: 'planPendenz', pendenzId: start.pendenzen[0]?.id ?? '', einsatzId: 'E-T4', ziel: { technikerId: 'T-RH', datum: HEUTE, startMin: 960 }, meta: meta() });
    const ersetzt = dispoReducer(geplant, { kind: 'replaceStand', stand: schnappschuss(start) });
    expect(ersetzt.einsaetze).toBe(start.einsaetze);
    expect(ersetzt.protokoll).toHaveLength(0);
    expect(ersetzt.zukunft).toHaveLength(0);
  });
});

describe('sendeNachricht', () => {
  it('hängt die Nachricht an und protokolliert sie', () => {
    const start = testState();
    const nachricht = { id: 'M-T', art: 'unterwegs' as const, kanal: 'sms' as const, auftragId: 'A01', an: '079 381 22 64', empfaenger: 'Lea Hofstetter', text: 'Sutt AG: …', zeitpunkt: meta().zeit, von: 'MB' };
    const state = dispoReducer(start, { kind: 'sendeNachricht', nachricht, meta: meta('sms') });
    expect(state.nachrichten.at(-1)).toBe(nachricht);
    expect(state.protokoll[0]?.text).toBe('sms');
  });
});

/* ◆ jh · eof */
