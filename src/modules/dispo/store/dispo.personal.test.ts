/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/dispo.personal.test.ts         │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Reducer: Stempeln, Korrektur, Monatsabschluss, Absenzen, Journal      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { addDays } from '../../../core/datum';
import { isAbwesend } from '../../../core/domain/absenz';
import { istAktiv, monatVon, stempelStatus } from '../../../core/domain/zeit';
import { HEUTE, meta, testState } from '../../../test/testdaten';
import { dispoReducer } from './dispo.reducer';
import type { DispoAction, DispoState } from './dispo.reducer';

// ── §1 · Hilfen ──────────────────────────────────────────────────

const MORGEN = addDays(HEUTE, 1);

function stempel(state: DispoState, art: Extract<DispoAction, { kind: 'stempeln' }>['art'], jetztMin: number, id: string): DispoState {
  return dispoReducer(state, { kind: 'stempeln', mitarbeiterId: 'M-MB', datum: MORGEN, jetztMin, art, geraet: 'app', eintragId: id, meta: meta(`MB ${art}`) });
}

function morgenEintraege(state: DispoState) {
  return state.zeiteintraege.filter((eintrag) => eintrag.mitarbeiterId === 'M-MB' && eintrag.datum === MORGEN);
}

// ── §2 · Zeiterfassung ───────────────────────────────────────────

describe('stempeln', () => {
  it('führt durch Kommen, Pause, Weiter und Gehen und schreibt jeden Schritt ins Journal', () => {
    const start = testState();
    const kommen = stempel(start, 'kommen', 450, 'Z-T1');
    expect(stempelStatus(morgenEintraege(kommen))).toBe('arbeitet');
    expect(kommen.journal[0]).toMatchObject({ bereich: 'zeit', art: 'aenderung', mitarbeiterId: 'M-MB', betrifft: 'Z-T1', text: 'MB kommen', aktion: 'stempeln' });

    const pause = stempel(kommen, 'pause-start', 720, 'Z-T2');
    expect(stempelStatus(morgenEintraege(pause))).toBe('pause');
    const weiter = stempel(pause, 'pause-ende', 750, 'Z-T3');
    const gehen = stempel(weiter, 'gehen', 1020, 'Z-T4');
    expect(stempelStatus(morgenEintraege(gehen))).toBe('draussen');
    expect(morgenEintraege(gehen).map((eintrag) => [eintrag.art, eintrag.vonMin, eintrag.bisMin])).toEqual([['arbeit', 450, 720], ['pause', 720, 750], ['arbeit', 750, 1020]]);
    expect(gehen.journal.length).toBe(start.journal.length + 4);
  });

  it('ignoriert unpassende Stempel und unbekannte Personen', () => {
    const start = testState();
    expect(stempel(start, 'gehen', 500, 'Z-T5')).toBe(start);
    expect(dispoReducer(start, { kind: 'stempeln', mitarbeiterId: 'M-XX', datum: MORGEN, jetztMin: 450, art: 'kommen', geraet: 'app', eintragId: 'Z-T6', meta: meta() })).toBe(start);
  });
});

describe('Einträge korrigieren und löschen', () => {
  it('bewahrt den alten Wert in der Korrekturspur und löscht nur weich', () => {
    const start = testState();
    const eintrag = start.zeiteintraege.find((kandidat) => kandidat.mitarbeiterId === 'M-MB' && kandidat.art === 'arbeit' && kandidat.bisMin !== null && monatVon(kandidat.datum) === monatVon(HEUTE) && kandidat.datum < HEUTE);
    if (!eintrag || eintrag.bisMin === null) throw new Error('Mock ohne abgeschlossenen Eintrag im laufenden Monat');

    const korrigiert = dispoReducer(start, { kind: 'zeitEintragKorrigieren', eintragId: eintrag.id, aenderung: { vonMin: eintrag.vonMin + 5, bisMin: eintrag.bisMin }, grund: 'Stempel zu früh', meta: meta('korrektur') });
    const neu = korrigiert.zeiteintraege.find((kandidat) => kandidat.id === eintrag.id);
    expect(neu?.vonMin).toBe(eintrag.vonMin + 5);
    expect(neu?.korrekturen).toHaveLength(1);
    expect(neu?.korrekturen[0]).toMatchObject({ grund: 'Stempel zu früh', von: 'TT', vorher: { vonMin: eintrag.vonMin, bisMin: eintrag.bisMin, art: 'arbeit' } });

    const geloescht = dispoReducer(korrigiert, { kind: 'zeitEintragLoeschen', eintragId: eintrag.id, grund: 'Doppelt erfasst', meta: meta('löschen') });
    const weg = geloescht.zeiteintraege.find((kandidat) => kandidat.id === eintrag.id);
    expect(weg && !istAktiv(weg) && weg.geloescht?.grund === 'Doppelt erfasst').toBe(true);
    expect(geloescht.zeiteintraege).toHaveLength(start.zeiteintraege.length);
  });

  it('lässt genehmigte Monate in Ruhe', () => {
    const start = testState();
    const gesperrt = start.monatsabschluesse.find((abschluss) => abschluss.status === 'genehmigt');
    if (!gesperrt) throw new Error('Mock ohne genehmigten Monat');
    const eintrag = start.zeiteintraege.find((kandidat) => kandidat.mitarbeiterId === gesperrt.mitarbeiterId && monatVon(kandidat.datum) === gesperrt.monat && kandidat.bisMin !== null);
    if (!eintrag) throw new Error('Mock ohne Eintrag im genehmigten Monat');
    expect(dispoReducer(start, { kind: 'zeitEintragKorrigieren', eintragId: eintrag.id, aenderung: { vonMin: eintrag.vonMin + 1, bisMin: eintrag.bisMin }, grund: 'x', meta: meta() })).toBe(start);
    expect(dispoReducer(start, { kind: 'zeitEintragLoeschen', eintragId: eintrag.id, grund: 'x', meta: meta() })).toBe(start);
  });
});

describe('Monatsabschluss', () => {
  it('genehmigt nur Eingereichtes und lässt Zurückgewiesenes neu einreichen', () => {
    const start = testState();
    const eingereicht = start.monatsabschluesse.find((abschluss) => abschluss.status === 'eingereicht');
    const zurueck = start.monatsabschluesse.find((abschluss) => abschluss.status === 'zurueckgewiesen');
    if (!eingereicht || !zurueck) throw new Error('Mock ohne eingereichten/zurückgewiesenen Monat');

    const genehmigt = dispoReducer(start, { kind: 'monatEntscheiden', abschlussId: eingereicht.id, status: 'genehmigt', meta: meta('ok') });
    expect(genehmigt.monatsabschluesse.find((abschluss) => abschluss.id === eingereicht.id)).toMatchObject({ status: 'genehmigt', entschiedenVon: 'TT' });
    expect(dispoReducer(genehmigt, { kind: 'monatEntscheiden', abschlussId: eingereicht.id, status: 'zurueckgewiesen', meta: meta() })).toBe(genehmigt);

    const nochmal = dispoReducer(start, { kind: 'monatEinreichen', abschluss: { ...zurueck, id: 'MA-T1', status: 'eingereicht', eingereichtAm: meta().zeit, eingereichtVon: 'JV' }, meta: meta() });
    expect(nochmal.monatsabschluesse).toHaveLength(start.monatsabschluesse.length);
    expect(nochmal.monatsabschluesse.find((abschluss) => abschluss.id === 'MA-T1')?.status).toBe('eingereicht');
    expect(dispoReducer(start, { kind: 'monatEinreichen', abschluss: { ...eingereicht, id: 'MA-T2' }, meta: meta() })).toBe(start);
  });
});

// ── §3 · Absenzen ────────────────────────────────────────────────

describe('Absenzen', () => {
  const von = addDays(HEUTE, 40);
  const bis = addDays(HEUTE, 41);

  it('beantragen sperrt den Plan erst nach der Genehmigung', () => {
    const start = testState();
    const beantragt = dispoReducer(start, { kind: 'absenzBeantragen', absenz: { id: 'AB-T1', mitarbeiterId: 'M-SK', technikerId: 'T-SK', von, bis, art: 'ferien', status: 'beantragt' }, meta: meta('antrag') });
    expect(isAbwesend(beantragt.stammdaten.absenzen, 'T-SK', von)).toBeUndefined();
    expect(beantragt.journal[0]).toMatchObject({ bereich: 'absenz', mitarbeiterId: 'M-SK', betrifft: 'AB-T1' });

    const genehmigt = dispoReducer(beantragt, { kind: 'absenzEntscheiden', absenzId: 'AB-T1', status: 'genehmigt', meta: meta('ok') });
    expect(isAbwesend(genehmigt.stammdaten.absenzen, 'T-SK', von)?.id).toBe('AB-T1');
    expect(dispoReducer(genehmigt, { kind: 'absenzBeantragen', absenz: { id: 'AB-T2', mitarbeiterId: 'M-SK', von: bis, bis: addDays(bis, 2), art: 'ferien', status: 'beantragt' }, meta: meta() })).toBe(genehmigt);

    const abgelehnt = dispoReducer(genehmigt, { kind: 'absenzEntscheiden', absenzId: 'AB-T1', status: 'abgelehnt', grund: 'Engpass', meta: meta() });
    expect(abgelehnt.stammdaten.absenzen.find((absenz) => absenz.id === 'AB-T1')).toMatchObject({ status: 'abgelehnt', entscheidGrund: 'Engpass' });
    const geloescht = dispoReducer(abgelehnt, { kind: 'absenzLoeschen', absenzId: 'AB-T1', meta: meta() });
    expect(geloescht.stammdaten.absenzen.some((absenz) => absenz.id === 'AB-T1')).toBe(false);
  });
});

// ── §4 · Journal, Konten, Personal ───────────────────────────────

describe('Journal', () => {
  it('wächst bei Undo weiter und nimmt Einsichten ohne Undo-Protokoll auf', () => {
    const start = testState();
    const pendenz = start.pendenzen[0];
    if (!pendenz) throw new Error('Mock ohne Pendenz');
    const geplant = dispoReducer(start, { kind: 'planPendenz', pendenzId: pendenz.id, einsatzId: 'E-T9', ziel: { technikerId: 'T-RH', datum: HEUTE, startMin: 960 }, meta: meta('planen') });
    const zurueck = dispoReducer(geplant, { kind: 'undo', meta: meta('rückgängig') });
    expect(zurueck.journal.length).toBe(start.journal.length + 2);
    expect(zurueck.journal[0]).toMatchObject({ rueckgaengig: true, text: 'Rückgängig: planen', bereich: 'plan' });

    const einsicht = dispoReducer(zurueck, { kind: 'protokolliere', eintrag: { id: 'J-T1', zeitpunkt: meta().zeit, benutzer: 'RW', bereich: 'zeit', art: 'einsicht', text: 'Zeitkonto angesehen', mitarbeiterId: 'M-MB' } });
    expect(einsicht.journal[0]?.id).toBe('J-T1');
    expect(einsicht.protokoll).toHaveLength(zurueck.protokoll.length);
  });

  it('verbucht Anmeldungen am Konto ohne Undo', () => {
    const start = testState();
    const konto = start.stammdaten.benutzer.get('U-SK');
    if (!konto) throw new Error('Mock ohne Konto U-SK');
    const state = dispoReducer(start, { kind: 'benutzerAnmeldung', benutzer: { ...konto, letzteAnmeldung: meta().zeit }, eintrag: { id: 'J-T2', zeitpunkt: meta().zeit, benutzer: 'SK', bereich: 'anmeldung', art: 'anmeldung', text: 'Anmeldung lokal' } });
    expect(state.stammdaten.benutzer.get('U-SK')?.letzteAnmeldung).toBe(meta().zeit);
    expect(state.protokoll).toHaveLength(0);
    expect(state.journal[0]?.art).toBe('anmeldung');
  });
});

describe('Konten und Personal', () => {
  it('speichert Konten und Personalakten mit Journaleintrag', () => {
    const start = testState();
    const konto = start.stammdaten.benutzer.get('U-SK');
    const person = start.stammdaten.mitarbeiter.get('M-SK');
    if (!konto || !person) throw new Error('Mock ohne SK');
    const gesperrt = dispoReducer(start, { kind: 'benutzerSpeichern', benutzer: { ...konto, aktiv: false, zusatzRechte: ['zeit:genehmigen'] }, meta: meta('sperren') });
    expect(gesperrt.stammdaten.benutzer.get('U-SK')).toMatchObject({ aktiv: false, zusatzRechte: ['zeit:genehmigen'] });
    expect(gesperrt.journal[0]).toMatchObject({ bereich: 'benutzer', betrifft: 'U-SK', mitarbeiterId: 'M-SK' });

    const neu = dispoReducer(gesperrt, { kind: 'mitarbeiterSpeichern', mitarbeiter: { ...person, id: 'M-PM', kuerzel: 'PM', vorname: 'Petra', nachname: 'Meier', technikerId: undefined, pensum: 60 }, meta: meta('neu') });
    expect(neu.stammdaten.mitarbeiter.get('M-PM')?.pensum).toBe(60);
    expect(neu.journal[0]).toMatchObject({ bereich: 'personal', mitarbeiterId: 'M-PM' });
  });
});

/* ◆ jh · eof */
