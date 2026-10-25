/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/scoring.test.ts                      │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Smart-Slot-Bewertung: Region, Marke, Fahrzeit, Auslastung, Stufen     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import type { Einsatz } from '../../core/domain/einsatz';
import type { Techniker } from '../../core/domain/stammdaten';
import { SUTT_HQ } from '../../core/geo';
import type { Koordinaten } from '../../core/geo';
import { scoreSlot } from './scoring';
import type { AuftragProfil, SlotUmfeld } from './scoring';

// ── §1 · Fixtures ────────────────────────────────────────────────

const WEIT_WEG: Koordinaten = { lat: 47.52, lng: 8.72 };

function techniker(teil: Partial<Techniker> = {}): Techniker {
  return {
    id: 'T-X', kuerzel: 'TX', vorname: 'Test', nachname: 'Techniker', region: 'glattal', farbe: 1, fahrzeug: 'ZH 1', telefon: '079',
    kompetenzen: ['Miele'], zertifiziert: ['Miele'], sollMinuten: 480, ...teil,
  };
}

function umfeld(teil: Partial<SlotUmfeld> = {}): SlotUmfeld {
  return { techniker: techniker(), tagesEinsaetze: [], koordinatenOf: () => SUTT_HQ, ...teil };
}

const profil: AuftragProfil = { region: 'glattal', marke: 'Miele', koordinaten: SUTT_HQ, dringend: false };

// ── §2 · Tests ───────────────────────────────────────────────────

describe('scoreSlot', () => {
  it('gibt die volle Punktzahl für Region, Zertifikat, kurze Fahrt und freien Tag', () => {
    const bewertung = scoreSlot(profil, umfeld(), 9 * 60, 60);
    expect(bewertung.punkte).toBe(100);
    expect(bewertung.stufe).toBe('gut');
    expect(bewertung.gruende).toContain('Miele-Profi');
  });

  it('wertet Markenkenntnis ohne Zertifikat mit 15 statt 25 Punkten', () => {
    const mitKenntnis = scoreSlot(profil, umfeld({ techniker: techniker({ zertifiziert: [] }) }), 9 * 60, 60);
    const fremd = scoreSlot(profil, umfeld({ techniker: techniker({ zertifiziert: [], kompetenzen: [] }) }), 9 * 60, 60);
    expect(mitKenntnis.punkte).toBe(90);
    expect(fremd.punkte).toBe(75);
    expect(fremd.gruende).toContain('Miele fremd');
  });

  it('zieht 20 Punkte ab, wenn die Fahrzeit nicht in die Lücke passt', () => {
    const vorgaenger: Einsatz = { id: 'E-V', auftragId: 'A-V', technikerId: 'T-X', datum: '2026-10-22', startMin: 8 * 60, dauerMin: 58, status: 'geplant' };
    const bewertung = scoreSlot(profil, umfeld({ tagesEinsaetze: [vorgaenger], koordinatenOf: () => WEIT_WEG }), 9 * 60, 60);
    expect(bewertung.gruende.some((grund) => grund.endsWith('zu knapp'))).toBe(true);
    expect(bewertung.punkte).toBe(55);
    expect(bewertung.stufe).toBe('ok');
  });

  it('stuft einen vollen Tag ausserhalb der Region als schlecht ein', () => {
    const voll: Einsatz[] = Array.from({ length: 4 }, (_, index) => ({ id: `E-${index}`, auftragId: 'A', technikerId: 'T-X', datum: '2026-10-22', startMin: 7 * 60 + index * 120, dauerMin: 110, status: 'geplant' as const }));
    const bewertung = scoreSlot({ ...profil, region: 'unterland' }, umfeld({ tagesEinsaetze: voll, techniker: techniker({ zertifiziert: [], kompetenzen: [] }) }), 15 * 60 + 10, 60);
    expect(bewertung.gruende).toContain('voll');
    expect(bewertung.stufe).toBe('schlecht');
  });
});

/* ◆ jh · eof */
