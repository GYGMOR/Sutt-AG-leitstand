/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/auftraege/auftraege.model.test.ts          │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Aufträge: Phasenregeln, Sichten auf dem Mock, Filter und Suche        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import type { Auftrag } from '../../core/domain/auftrag';
import type { Einsatz, Pendenz } from '../../core/domain/einsatz';
import { HEUTE, einsatzMitId, testState } from '../../test/testdaten';
import { LEERER_AUFTRAG_FILTER, PHASEN, buildAuftragViews, filterAuftraege, phaseVon, terminVon, zaehlePhasen } from './auftraege.model';

// ── §1 · Phasen ──────────────────────────────────────────────────

function auftrag(teil: Partial<Auftrag> = {}): Auftrag {
  const basis = testState().stammdaten.auftraege.get('A01');
  if (!basis) throw new Error('A01 fehlt');
  return { ...basis, rapport: 'offen', rechnungStatus: 'offen', ...teil };
}

function einsatz(status: Einsatz['status']): Einsatz {
  return { id: `E-${status}`, auftragId: 'A01', technikerId: 'T-MB', datum: HEUTE, startMin: 9 * 60, dauerMin: 60, status };
}

const PENDENZ: Pendenz = { id: 'P-T', auftragId: 'A01', anlass: 'neu', dauerMin: 60, erstelltAm: `${HEUTE}T08:00` };

describe('phaseVon', () => {
  it('lässt Rechnung vor Rapport vor Einsatz vor Pendenz gelten', () => {
    expect(phaseVon(auftrag({ rechnungStatus: 'bezahlt' }), [einsatz('geplant')], PENDENZ)).toBe('bezahlt');
    expect(phaseVon(auftrag({ rechnungStatus: 'gestellt' }), [einsatz('vor-ort')], null)).toBe('verrechnet');
    expect(phaseVon(auftrag({ rapport: 'freigegeben' }), [einsatz('erledigt')], null)).toBe('verrechnen');
    expect(phaseVon(auftrag(), [einsatz('erledigt'), einsatz('unterwegs')], null)).toBe('in-arbeit');
    expect(phaseVon(auftrag(), [einsatz('wartet-teil'), einsatz('geplant')], PENDENZ)).toBe('disponiert');
    expect(phaseVon(auftrag(), [einsatz('wartet-teil')], PENDENZ)).toBe('wartet-teil');
    expect(phaseVon(auftrag(), [], PENDENZ)).toBe('eingang');
    expect(phaseVon(auftrag(), [], null)).toBe('ohne-termin');
    expect(phaseVon(auftrag({ rapport: 'erstellt' }), [einsatz('erledigt')], null)).toBe('rapport');
  });
});

// ── §2 · Sichten ─────────────────────────────────────────────────

describe('buildAuftragViews', () => {
  it('baut eine Sicht je Auftrag und zählt alle Phasen zusammen', () => {
    const state = testState();
    const views = buildAuftragViews(state.stammdaten, state.einsaetze, state.pendenzen, state.rapporte, HEUTE);
    expect(views).toHaveLength(state.stammdaten.auftraege.size);
    const zaehler = zaehlePhasen(views);
    expect(PHASEN.reduce((summe, phase) => summe + zaehler[phase], 0)).toBe(views.length);
  });

  it('kennt Ersttermin, Folgetermin und Techniker von A01', () => {
    const state = testState();
    const views = buildAuftragViews(state.stammdaten, state.einsaetze, state.pendenzen, state.rapporte, HEUTE);
    const a01 = views.find((view) => view.auftrag.id === 'A01');
    expect(a01?.einsaetze.map((eintrag) => eintrag.id)).toEqual(['E-A01', 'E-A01-F']);
    expect(a01?.naechster?.id).toBe('E-A01-F');
    expect(a01?.phase).toBe('disponiert');
    expect(a01?.techniker?.id).toBe(einsatzMitId(state, 'E-A01-F').technikerId);
    expect(terminVon(a01!)?.id).toBe('E-A01-F');
    expect(a01?.betrag?.totalChf ?? 0).toBeGreaterThan(0);
  });
});

// ── §3 · Filter ──────────────────────────────────────────────────

describe('filterAuftraege', () => {
  it('filtert nach Phase, Region und Suchbegriff', () => {
    const state = testState();
    const views = buildAuftragViews(state.stammdaten, state.einsaetze, state.pendenzen, state.rapporte, HEUTE);
    const disponiert = filterAuftraege(views, { ...LEERER_AUFTRAG_FILTER, phase: 'disponiert' });
    expect(disponiert.every((view) => view.phase === 'disponiert')).toBe(true);
    const unterland = filterAuftraege(views, { ...LEERER_AUFTRAG_FILTER, region: 'unterland' });
    expect(unterland.every((view) => view.region === 'unterland')).toBe(true);
    // jh› Das Mietgerät A39 nennt die Nummer von A01 im Fehlerbild – beide sind Treffer, A01 der direkte.
    const suche = filterAuftraege(views, { ...LEERER_AUFTRAG_FILTER, suche: '26-04788 glattal' });
    expect(suche.map((view) => view.auftrag.id)).toContain('A01');
    expect(suche.every((view) => view.auftrag.nummer === '26-04788' || view.auftrag.fehlerbild.includes('26-04788') || view.auftrag.bezugAuftragId === 'A01')).toBe(true);
  });
});

/* ◆ jh · eof */
