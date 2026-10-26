/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/model/scan.model.test.ts                       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Scan deuten: Artikel, Auftrag, Rapport-QR, Seriennummer, Link         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { fahrzeugOrt } from '@sl/core/domain/lager';
import { testState } from '@sl/test/testdaten';
import { interpretiereScan } from './scan.model';

// ── §1 · Tests ───────────────────────────────────────────────────

describe('interpretiereScan', () => {
  it('erkennt Artikel mit Bestand an Bord', () => {
    const state = testState();
    const bord = state.bestaende.find((bestand) => bestand.ort === fahrzeugOrt('T-MB') && bestand.menge > 0);
    if (!bord) throw new Error('kein Bestand an Bord');
    const ergebnis = interpretiereScan(` ${bord.artikelNummer.toLowerCase()} `, state, 'T-MB');
    expect(ergebnis.art).toBe('artikel');
    if (ergebnis.art === 'artikel') expect(ergebnis.anBord).toBe(bord.menge);
  });

  it('erkennt Auftragsnummer, Rapport-QR, Seriennummer und Links', () => {
    const state = testState();
    const auftrag = [...state.stammdaten.auftraege.values()][0];
    if (!auftrag) throw new Error('kein Auftrag');
    expect(interpretiereScan(auftrag.nummer, state, null)).toMatchObject({ art: 'auftrag', auftrag });

    const rapport = state.rapporte[0];
    if (!rapport) throw new Error('kein Rapport');
    expect(interpretiereScan(`http://localhost:5173/rapporte/${rapport.id}/druck`, state, null)).toMatchObject({ art: 'rapport', rapport });
    expect(interpretiereScan(rapport.nummer, state, null)).toMatchObject({ art: 'rapport' });

    const geraet = [...state.stammdaten.geraete.values()].find((kandidat) => kandidat.seriennummer !== '');
    if (!geraet) throw new Error('kein Gerät mit Seriennummer');
    expect(interpretiereScan(geraet.seriennummer, state, null)).toMatchObject({ art: 'geraet', geraet });

    expect(interpretiereScan('https://sutt.example/info', state, null)).toEqual({ art: 'link', url: 'https://sutt.example/info' });
    expect(interpretiereScan('gibt-es-nicht', state, null)).toEqual({ art: 'unbekannt', text: 'gibt-es-nicht' });
    expect(interpretiereScan('   ', state, null).art).toBe('unbekannt');
  });
});

/* ◆ jh · eof */
