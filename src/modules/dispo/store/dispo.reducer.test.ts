/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/dispo.reducer.test.ts          │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Reducer: planen, Status, Rapport, Stammdaten, Lager, Undo, Stand      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { addDays } from '../../../core/datum';
import { LAGER_GLATTBRUGG, bestandVon, fahrzeugOrt } from '../../../core/domain/lager';
import type { Bestellung, Lagerbewegung } from '../../../core/domain/lager';
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

// ── §4 · Stammdaten ──────────────────────────────────────────────

describe('Stammdaten', () => {
  it('bearbeitet Kunden und Liegenschaften im Schnappschuss', () => {
    const start = testState();
    const kunde = start.stammdaten.kunden.get('K5');
    if (!kunde) throw new Error('Kunde fehlt');
    const state = dispoReducer(start, { kind: 'updateKunde', kunde: { ...kunde, kontakt: { ...kunde.kontakt, telefon: '079 000 00 00' } }, meta: meta('kunde') });
    expect(state.stammdaten.kunden.get('K5')?.kontakt.telefon).toBe('079 000 00 00');
    expect(dispoReducer(state, { kind: 'undo' }).stammdaten.kunden.get('K5')?.kontakt.telefon).toBe(kunde.kontakt.telefon);
    expect(dispoReducer(start, { kind: 'updateKunde', kunde: { ...kunde, id: 'K-unbekannt' }, meta: meta() })).toBe(start);
  });

  it('legt neue Liegenschaften nur für bekannte Kunden an', () => {
    const start = testState();
    const vorlage = start.stammdaten.liegenschaften.get('L01');
    if (!vorlage) throw new Error('Liegenschaft fehlt');
    const neu = { ...vorlage, id: 'L-T1', bezeichnung: 'MFH Test', kundeId: 'K1' };
    const state = dispoReducer(start, { kind: 'createLiegenschaft', liegenschaft: neu, meta: meta() });
    expect(state.stammdaten.liegenschaften.get('L-T1')?.bezeichnung).toBe('MFH Test');
    expect(dispoReducer(start, { kind: 'createLiegenschaft', liegenschaft: { ...neu, kundeId: 'K-nein' }, meta: meta() })).toBe(start);
  });

  it('legt pro Auftrag höchstens eine Pendenz an', () => {
    const start = testState();
    const einsatz = einsatzMitId(start, 'E-A02');
    const pendenz = { id: 'P-T9', auftragId: einsatz.auftragId, anlass: 'neu' as const, dauerMin: 60, erstelltAm: meta().zeit };
    const state = dispoReducer(start, { kind: 'createPendenz', pendenz, meta: meta() });
    expect(state.pendenzen.some((kandidat) => kandidat.id === 'P-T9')).toBe(true);
    expect(dispoReducer(state, { kind: 'createPendenz', pendenz: { ...pendenz, id: 'P-T10' }, meta: meta() })).toBe(state);
  });
});

// ── §5 · Lager ───────────────────────────────────────────────────

function bestellungFuer(auftragId: string | undefined, teil: Partial<Bestellung> = {}): Bestellung {
  return {
    id: 'B-T1',
    nummer: 'B-26-99901',
    artikelNummer: '11380960',
    bezeichnung: 'Laugenpumpe',
    menge: 2,
    lieferant: 'Miele Ersatzteile',
    bestelltAm: meta().zeit,
    liefertermin: addDays(HEUTE, 3),
    status: 'offen',
    ...(auftragId ? { auftragId } : {}),
    von: 'TT',
    ...teil,
  };
}

function wareneingangFuer(bestellung: Bestellung): Lagerbewegung {
  return { id: 'LB-T1', zeitpunkt: meta().zeit, art: 'wareneingang', artikelNummer: bestellung.artikelNummer, menge: bestellung.menge, nach: LAGER_GLATTBRUGG, bestellungId: bestellung.id, benutzer: 'TT' };
}

describe('Lager', () => {
  it('bestellt für einen Auftrag und spiegelt das Teil als «bestellt» an den Auftrag', () => {
    const start = testState();
    const einsatz = einsatzMitId(start, 'E-A02');
    const bestellung = bestellungFuer(einsatz.auftragId);
    const state = dispoReducer(start, { kind: 'bestellen', bestellung, meta: meta('bestellt') });
    expect(state.bestellungen[0]).toBe(bestellung);
    const teil = state.stammdaten.auftraege.get(einsatz.auftragId)?.ersatzteile.find((kandidat) => kandidat.artikelNummer === '11380960');
    expect(teil).toMatchObject({ status: 'bestellt', liefertermin: bestellung.liefertermin, menge: 2 });
    expect(teil?.preisChf).toBeGreaterThan(0);
  });

  it('bucht den Wareneingang ein, setzt das Teil auf geliefert und zieht die Pendenz auf heute', () => {
    const start = testState();
    const einsatz = einsatzMitId(start, 'E-A01');
    const bestellung = bestellungFuer(einsatz.auftragId);
    const pendenz = { id: 'P-T5', auftragId: einsatz.auftragId, anlass: 'folgetermin' as const, dauerMin: 60, erstelltAm: meta().zeit, fruehestensAm: addDays(HEUTE, 3), hinweis: 'warten' };
    const mitPendenz = dispoReducer(start, { kind: 'createPendenz', pendenz, meta: meta() });
    const bestellt = dispoReducer(mitPendenz, { kind: 'bestellen', bestellung, meta: meta() });
    const vorher = bestandVon(bestellt.bestaende, '11380960', LAGER_GLATTBRUGG);

    const state = dispoReducer(bestellt, { kind: 'wareneingang', bestellungId: bestellung.id, bewegung: wareneingangFuer(bestellung), meta: meta('eingang', 9 * 60) });
    expect(state.bestellungen.find((kandidat) => kandidat.id === bestellung.id)).toMatchObject({ status: 'eingetroffen', eingetroffenAm: `${HEUTE}T09:00` });
    expect(bestandVon(state.bestaende, '11380960', LAGER_GLATTBRUGG)).toBe(vorher + 2);
    expect(state.bewegungen[0]?.art).toBe('wareneingang');
    expect(state.stammdaten.auftraege.get(einsatz.auftragId)?.ersatzteile.find((teil) => teil.artikelNummer === '11380960')?.status).toBe('eingetroffen');
    expect(state.pendenzen.find((kandidat) => kandidat.id === 'P-T5')).toMatchObject({ fruehestensAm: HEUTE, hinweis: 'Laugenpumpe eingetroffen – Folgetermin planen' });
    expect(dispoReducer(state, { kind: 'wareneingang', bestellungId: bestellung.id, bewegung: wareneingangFuer(bestellung), meta: meta() })).toBe(state);
  });

  it('bucht Umbuchungen auf beide Orte und lehnt unbekannte Artikel ab', () => {
    const start = testState();
    const bewegung: Lagerbewegung = { id: 'LB-T2', zeitpunkt: meta().zeit, art: 'umbuchung', artikelNummer: '11380960', menge: 1, von: LAGER_GLATTBRUGG, nach: fahrzeugOrt('T-MB'), benutzer: 'TT' };
    const vorherLager = bestandVon(start.bestaende, '11380960', LAGER_GLATTBRUGG);
    const vorherAuto = bestandVon(start.bestaende, '11380960', fahrzeugOrt('T-MB'));
    const state = dispoReducer(start, { kind: 'buchen', bewegung, meta: meta() });
    expect(bestandVon(state.bestaende, '11380960', LAGER_GLATTBRUGG)).toBe(Math.max(0, vorherLager - 1));
    expect(bestandVon(state.bestaende, '11380960', fahrzeugOrt('T-MB'))).toBe(vorherAuto + 1);
    expect(dispoReducer(start, { kind: 'buchen', bewegung: { ...bewegung, artikelNummer: 'gibt-es-nicht' }, meta: meta() })).toBe(start);
  });

  it('storniert offene Bestellungen und nimmt das bestellte Teil vom Auftrag', () => {
    const start = testState();
    const einsatz = einsatzMitId(start, 'E-A02');
    const bestellung = bestellungFuer(einsatz.auftragId);
    const bestellt = dispoReducer(start, { kind: 'bestellen', bestellung, meta: meta() });
    const state = dispoReducer(bestellt, { kind: 'stornierenBestellung', bestellungId: bestellung.id, meta: meta() });
    expect(state.bestellungen.find((kandidat) => kandidat.id === bestellung.id)?.status).toBe('storniert');
    expect(state.stammdaten.auftraege.get(einsatz.auftragId)?.ersatzteile.some((teil) => teil.artikelNummer === '11380960')).toBe(false);
  });

  it('verbucht beim Rapport-Abschluss Verbrauch ab Fahrzeug und neue Bestellungen', () => {
    const start = testState();
    const einsatz = einsatzMitId(start, 'E-A01-F');
    const auftrag = start.stammdaten.auftraege.get(einsatz.auftragId);
    if (!auftrag) throw new Error('Auftrag fehlt');
    const rapport = rapportEntwurf(einsatz, { teile: [{ artikelNummer: '10780350', bezeichnung: 'Türverriegelung', menge: 1, verwendung: 'fahrzeuglager' }] });
    const verbrauch: Lagerbewegung = { id: 'LB-T3', zeitpunkt: meta().zeit, art: 'verbrauch', artikelNummer: '10780350', menge: 1, von: fahrzeugOrt(einsatz.technikerId), auftragId: auftrag.id, benutzer: 'MB' };
    const vorher = bestandVon(start.bestaende, '10780350', fahrzeugOrt(einsatz.technikerId));
    const bestellung = bestellungFuer(auftrag.id, { id: 'B-T7', artikelNummer: '11380960' });

    const state = dispoReducer(start, { kind: 'abschliessenRapport', rapport, auftrag, bestellungen: [bestellung], bewegungen: [verbrauch], meta: meta() });
    expect(bestandVon(state.bestaende, '10780350', fahrzeugOrt(einsatz.technikerId))).toBe(Math.max(0, vorher - 1));
    expect(state.bewegungen[0]).toBe(verbrauch);
    expect(state.bestellungen.some((kandidat) => kandidat.id === 'B-T7')).toBe(true);
    expect(schnappschuss(dispoReducer(state, { kind: 'undo' }))).toEqual(schnappschuss(start));
  });
});

// ── §6 · Undo/Redo & Stand ───────────────────────────────────────

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
