/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/website/website.model.test.ts              │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Website-Anfragen: Kundenerkennung, Zähler, Suche, Vorbelegung         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { MOCK_ANFRAGEN } from '../../mock';
import { HEUTE, testState } from '../../test/testdaten';
import { antwortVorlage, buildAnfrageViews, filterAnfragen, kundenTreffer, vorbelegungAus, zaehleAnfragen } from './website.model';

// ── §1 · Erkennung ───────────────────────────────────────────────

describe('kundenTreffer', () => {
  it('erkennt den Hauswart an der Telefonnummer und nimmt das Haus aus der Adresse', () => {
    const state = testState();
    const anfrage = MOCK_ANFRAGEN.find((kandidat) => kandidat.nummer === 'W-26-0101');
    if (!anfrage) throw new Error('Testdaten: W-26-0101 fehlt');
    const treffer = kundenTreffer(anfrage, state.stammdaten);
    expect(treffer?.grund).toBe('telefon');
    expect(treffer?.kunde.name).toContain('Glattal');
    // jh› Zimmermann ist Hauswart der Talackerstrasse, meldet aber die Giebeleichstrasse derselben Verwaltung.
    expect(treffer?.liegenschaft?.adresse.strasse).toBe('Giebeleichstrasse');
    const ohneAdresse = kundenTreffer({ ...anfrage, adresse: { strasse: 'Unbekannte Gasse 1', plz: '8000', ort: 'Zürich' } }, state.stammdaten);
    expect(ohneAdresse?.liegenschaft?.hauswart?.name).toBe('Rolf Zimmermann');
  });

  it('erkennt eine Mieterin über die Adresse der Liegenschaft', () => {
    const state = testState();
    const anfrage = MOCK_ANFRAGEN.find((kandidat) => kandidat.nummer === 'W-26-0100');
    if (!anfrage) throw new Error('Testdaten: W-26-0100 fehlt');
    const treffer = kundenTreffer(anfrage, state.stammdaten);
    expect(treffer?.grund).toBe('adresse');
    expect(treffer?.liegenschaft?.adresse.ort).toBe('Glattbrugg');
  });

  it('findet Privatkunden über frühere Aufträge und lässt Unbekannte unbekannt', () => {
    const state = testState();
    const weber = MOCK_ANFRAGEN.find((kandidat) => kandidat.nummer === 'W-26-0099');
    const lang = MOCK_ANFRAGEN.find((kandidat) => kandidat.nummer === 'W-26-0098');
    if (!weber || !lang) throw new Error('Testdaten fehlen');
    expect(kundenTreffer(weber, state.stammdaten)?.kunde.name).toContain('Weber');
    expect(kundenTreffer(lang, state.stammdaten)).toBeNull();
  });
});

// ── §2 · Sichten und Übergabe ────────────────────────────────────

describe('Anfragen-Sichten', () => {
  it('zählt nach Status und findet über die Suche', () => {
    const state = testState();
    const views = buildAnfrageViews(MOCK_ANFRAGEN, state.stammdaten);
    expect(views[0]?.anfrage.nummer).toBe('W-26-0101');
    expect(zaehleAnfragen(views)).toEqual({ alle: 4, neu: 2, angenommen: 1, abgelehnt: 1 });
    expect(filterAnfragen(views, 'neu', 'keller').map((view) => view.anfrage.nummer)).toEqual(['W-26-0100']);
    expect(filterAnfragen(views, 'alle', 'Steamer')).toHaveLength(1);
  });

  it('belegt die Schnellerfassung mit allem vor, was die Anfrage weiss', () => {
    const state = testState();
    const views = buildAnfrageViews(MOCK_ANFRAGEN, state.stammdaten);
    const view = views.find((kandidat) => kandidat.anfrage.nummer === 'W-26-0101');
    if (!view) throw new Error('Testdaten: W-26-0101 fehlt');
    const vorbelegung = vorbelegungAus(view);
    expect(vorbelegung.kanal).toBe('Website');
    expect(vorbelegung.kategorie).toBe('reparatur');
    expect(vorbelegung.dringlichkeit).toBe('hoch');
    expect(vorbelegung.geraeteart).toBe('Geschirrspüler');
    expect(vorbelegung.marke).toBe('V-ZUG');
    expect(vorbelegung.kundeId).toBe(view.treffer?.kunde.id);
    expect(vorbelegung.hinweis).toContain('W-26-0101');
    expect(vorbelegung.hinweis).toContain('Vormittag');
  });

  it('schreibt die Antwortvorlage mit Nummer und Frist', () => {
    const anfrage = MOCK_ANFRAGEN[0];
    if (!anfrage) throw new Error('Testdaten fehlen');
    const text = antwortVorlage(anfrage, HEUTE, {});
    expect(text).toContain(anfrage.nummer);
    expect(text).toContain(anfrage.kontakt.name);
    expect(antwortVorlage(anfrage, HEUTE, { 'anfrage-antwort': 'Hallo {kontakt}, {anfrage}' })).toBe(`Hallo ${anfrage.kontakt.name}, ${anfrage.nummer}`);
    expect(antwortVorlage(anfrage, HEUTE, {}, true)).toContain('nicht weiterhelfen');
  });
});

/* ◆ jh · eof */
