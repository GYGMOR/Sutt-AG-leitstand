/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/rapport.test.ts                        │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Rapport-Regeln: Zeiten aus Verlauf, Nummernkreis, Übergänge, Codes    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import type { Einsatz } from './einsatz';
import { mitStatuswechsel, zeitpunktVon } from './einsatz';
import { arbeitenFor, diagnoseCodeOf, istSchreibgeschuetzt, kannFreigeben, kannVerrechnen, nextRapportNummer, rundeAufRaster, statusNachAbschluss, zeitenAusVerlauf } from './rapport';

const DATUM = '2026-10-22' as const;

function einsatz(): Einsatz {
  return { id: 'E-T', auftragId: 'A-T', technikerId: 'T-MB', datum: DATUM, startMin: 9 * 60, dauerMin: 60, status: 'geplant' };
}

// ── §1 · Verlauf & Zeiten ────────────────────────────────────────

describe('mitStatuswechsel', () => {
  it('hängt den Wechsel an und spiegelt ihn in statusSeit', () => {
    const unterwegs = mitStatuswechsel(einsatz(), 'unterwegs', `${DATUM}T08:40`, 'app');
    const vorOrt = mitStatuswechsel(unterwegs, 'vor-ort', `${DATUM}T09:05`, 'app');
    expect(vorOrt.status).toBe('vor-ort');
    expect(vorOrt.statusSeit).toBe(`${DATUM}T09:05`);
    expect(vorOrt.verlauf).toHaveLength(2);
    expect(zeitpunktVon(vorOrt, 'unterwegs')).toBe(`${DATUM}T08:40`);
  });
});

describe('zeitenAusVerlauf', () => {
  it('rechnet Anfahrt und Arbeit aus den Statuszeiten, gerundet auf 5 min', () => {
    let e = mitStatuswechsel(einsatz(), 'unterwegs', `${DATUM}T08:37`, 'app');
    e = mitStatuswechsel(e, 'vor-ort', `${DATUM}T09:04`, 'app');
    e = mitStatuswechsel(e, 'erledigt', `${DATUM}T10:11`, 'app');
    expect(zeitenAusVerlauf(e, 0)).toEqual({ anfahrtMin: 25, arbeitMin: 65, pauseMin: 0 });
  });

  it('nimmt «jetzt» als Ende, solange der Einsatz läuft', () => {
    let e = mitStatuswechsel(einsatz(), 'unterwegs', `${DATUM}T08:45`, 'app');
    e = mitStatuswechsel(e, 'vor-ort', `${DATUM}T09:00`, 'app');
    expect(zeitenAusVerlauf(e, 9 * 60 + 42).arbeitMin).toBe(40);
  });

  it('fällt ohne Verlauf auf die Planzeit zurück', () => {
    expect(zeitenAusVerlauf(einsatz(), 0)).toEqual({ anfahrtMin: 0, arbeitMin: 60, pauseMin: 0 });
  });

  it('rundet nie unter null', () => {
    expect(rundeAufRaster(-7)).toBe(0);
    expect(rundeAufRaster(13)).toBe(15);
  });
});

// ── §2 · Nummern, Codes, Vorlagen ────────────────────────────────

describe('nextRapportNummer', () => {
  it('zählt im Kreis R-26 weiter und ignoriert fremde Formate', () => {
    expect(nextRapportNummer([{ nummer: 'R-26-00417' }, { nummer: 'R-25-99999' }, { nummer: 'R-26-00099' }])).toBe('R-26-00418');
    expect(nextRapportNummer([])).toBe('R-26-00001');
  });
});

describe('diagnoseCodeOf', () => {
  it('findet Fehlercodes im Fehlerbild', () => {
    expect(diagnoseCodeOf('Pumpt nicht ab, Fehler F18')).toBe('F18');
    expect(diagnoseCodeOf('Heizpumpe defekt (E09)')).toBe('E09');
    expect(diagnoseCodeOf('Trocknet nicht mehr')).toBeUndefined();
  });
});

describe('arbeitenFor', () => {
  it('liefert pro Geräteart eine unerledigte Checkliste mit eigenen IDs', () => {
    const liste = arbeitenFor('Waschmaschine');
    expect(liste.length).toBeGreaterThan(3);
    expect(liste.every((schritt) => !schritt.erledigt)).toBe(true);
    expect(new Set(liste.map((schritt) => schritt.id)).size).toBe(liste.length);
  });
});

// ── §3 · Übergänge ───────────────────────────────────────────────

describe('Rapport-Übergänge', () => {
  it('erlaubt Freigabe ab erstellt und Verrechnung nur ab freigegeben', () => {
    expect(kannFreigeben({ status: 'erstellt' })).toBe(true);
    expect(kannFreigeben({ status: 'unterschrieben' })).toBe(true);
    expect(kannFreigeben({ status: 'freigegeben' })).toBe(false);
    expect(kannVerrechnen({ status: 'freigegeben' })).toBe(true);
    expect(kannVerrechnen({ status: 'unterschrieben' })).toBe(false);
    expect(istSchreibgeschuetzt({ status: 'verrechnet' })).toBe(true);
    expect(istSchreibgeschuetzt({ status: 'erstellt' })).toBe(false);
  });

  it('leitet den Einsatzstatus aus dem Abschluss ab', () => {
    expect(statusNachAbschluss('teil-bestellt')).toBe('wartet-teil');
    expect(statusNachAbschluss('erledigt')).toBe('erledigt');
    expect(statusNachAbschluss('nicht-angetroffen')).toBe('erledigt');
  });
});

/* ◆ jh · eof */
