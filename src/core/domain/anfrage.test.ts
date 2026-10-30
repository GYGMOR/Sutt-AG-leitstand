/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/anfrage.test.ts                        │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Website-Anfrage: Prüfung, Nummernkreis, Ablage im Speicher            │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { ANFRAGEN_SCHLUESSEL, anfrageNummer, ladeAnfragen, naechsteLaufnummer, neueAnfrage, pruefeAnfrage, speichereAnfragen } from './anfrage';
import type { AnfrageEntwurf } from './anfrage';

// ── §1 · Testdaten ───────────────────────────────────────────────

const HEUTE = '2026-10-30';

const GUELTIG: AnfrageEntwurf = {
  anliegen: 'reparatur',
  dringend: false,
  geraeteart: 'Waschmaschine',
  marke: 'Miele',
  fehlerbild: 'Schleudert nicht mehr, Fehler F53, Wasser bleibt in der Trommel.',
  adresse: { strasse: 'Talackerstrasse 41', plz: '8152', ort: 'Glattbrugg', wohnung: 'W 1.05' },
  terminwunsch: { datum: '2026-11-02', zeitfenster: 'vormittag' },
  kontakt: { name: 'Nadia Keller', telefon: '079 655 21 44', email: 'nadia.keller@mail.example', rolle: 'Mieter' },
};

function speicherAttrappe(): Pick<Storage, 'getItem' | 'setItem'> & { ablage: Map<string, string> } {
  const ablage = new Map<string, string>();
  return { ablage, getItem: (key) => ablage.get(key) ?? null, setItem: (key, wert) => void ablage.set(key, wert) };
}

// ── §2 · Prüfung ─────────────────────────────────────────────────

describe('pruefeAnfrage', () => {
  it('akzeptiert eine vollständige Anfrage', () => {
    expect(pruefeAnfrage(GUELTIG, HEUTE)).toEqual([]);
  });

  it('verlangt Gerät, Beschreibung, Adresse und einen Rückweg', () => {
    const fehler = pruefeAnfrage({ ...GUELTIG, geraeteart: '', fehlerbild: 'kaputt', adresse: { strasse: '', plz: '81', ort: '' }, kontakt: { name: 'N', telefon: '', email: 'keine', rolle: 'Mieter' } }, HEUTE);
    expect(fehler.map((eintrag) => eintrag.feld)).toEqual(['geraeteart', 'fehlerbild', 'strasse', 'plz', 'ort', 'name', 'kontakt', 'email']);
  });

  it('lässt Telefon oder E-Mail allein genügen', () => {
    expect(pruefeAnfrage({ ...GUELTIG, kontakt: { ...GUELTIG.kontakt, email: '' } }, HEUTE)).toEqual([]);
    expect(pruefeAnfrage({ ...GUELTIG, kontakt: { ...GUELTIG.kontakt, telefon: '' } }, HEUTE)).toEqual([]);
  });

  it('weist Wunschtermine in der Vergangenheit ab', () => {
    expect(pruefeAnfrage({ ...GUELTIG, terminwunsch: { datum: '2026-10-29', zeitfenster: 'egal' } }, HEUTE).map((eintrag) => eintrag.feld)).toEqual(['terminwunsch']);
  });
});

// ── §3 · Nummern und Ablage ──────────────────────────────────────

describe('Anfrage anlegen und ablegen', () => {
  it('nummeriert je Jahr fortlaufend', () => {
    expect(anfrageNummer(2026, 7)).toBe('W-26-0007');
    const anfrage = neueAnfrage(GUELTIG, 101, '2026-10-30T08:05');
    expect(anfrage.nummer).toBe('W-26-0101');
    expect(anfrage.status).toBe('neu');
    expect(anfrage.quelle).toBe('website');
    expect(anfrage.id).toBe('W-261030T0805');
    expect(naechsteLaufnummer([anfrage, { ...anfrage, nummer: 'W-25-0300' }], 2026)).toBe(102);
    expect(naechsteLaufnummer([], 2026)).toBe(1);
  });

  it('liest aus dem Speicher nur gültige Einträge', () => {
    const speicher = speicherAttrappe();
    expect(ladeAnfragen(speicher)).toEqual([]);
    const anfrage = neueAnfrage(GUELTIG, 1, '2026-10-30T08:05');
    expect(speichereAnfragen(speicher, [anfrage])).toBe(true);
    expect(ladeAnfragen(speicher)).toEqual([anfrage]);
    speicher.setItem(ANFRAGEN_SCHLUESSEL, JSON.stringify([anfrage, { kaputt: true }, 'text']));
    expect(ladeAnfragen(speicher)).toHaveLength(1);
    speicher.setItem(ANFRAGEN_SCHLUESSEL, '{ kein json');
    expect(ladeAnfragen(speicher)).toEqual([]);
  });
});

/* ◆ jh · eof */
