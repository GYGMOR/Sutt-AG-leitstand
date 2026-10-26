/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/berechtigung/rechte.test.ts                   │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Rollenprofile, Zusatz und Entzug, Umfang, Personen-Sicht              │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { ALLE_RECHTE, PROFILE, RECHTE_KATALOG, darfPerson, hatRecht, herkunftVon, rechteVon, umfangVon } from './rechte';

// ── §1 · Profile ─────────────────────────────────────────────────

describe('Rollenprofile', () => {
  it('staffelt die Rollen von Aussendienst bis Administration', () => {
    expect(hatRecht({ rolle: 'aussendienst' }, 'zeit:erfassen')).toBe(true);
    expect(hatRecht({ rolle: 'aussendienst' }, 'zeit:genehmigen')).toBe(false);
    expect(hatRecht({ rolle: 'disposition' }, 'zeit:genehmigen')).toBe(true);
    expect(hatRecht({ rolle: 'disposition' }, 'rapporte:freigeben')).toBe(false);
    expect(hatRecht({ rolle: 'buero' }, 'rapporte:freigeben')).toBe(true);
    expect(hatRecht({ rolle: 'buero' }, 'benutzer:verwalten')).toBe(false);
    expect(hatRecht({ rolle: 'administration' }, 'benutzer:verwalten')).toBe(true);
  });

  it('gibt der Administration alles ausser Gesundheitsdaten', () => {
    const admin = rechteVon({ rolle: 'administration' });
    expect(admin.has('personal:gesundheit')).toBe(false);
    expect(admin.size).toBe(ALLE_RECHTE.length - 1);
    expect(hatRecht({ rolle: 'buero' }, 'personal:gesundheit')).toBe(true);
  });

  it('kennt nur Rechte aus dem Katalog', () => {
    const katalog = new Set(RECHTE_KATALOG.map((info) => info.recht));
    for (const profil of Object.values(PROFILE)) {
      for (const recht of profil.rechte) expect(katalog.has(recht)).toBe(true);
    }
  });
});

// ── §2 · Individuelle Anpassung ──────────────────────────────────

describe('Zusatz und Entzug', () => {
  it('fügt hinzu, entzieht und nennt die Herkunft', () => {
    const admin = { rolle: 'administration' as const, zusatzRechte: ['personal:gesundheit' as const] };
    expect(hatRecht(admin, 'personal:gesundheit')).toBe(true);
    expect(herkunftVon(admin, 'personal:gesundheit')).toBe('zusatz');

    const buero = { rolle: 'buero' as const, entzogeneRechte: ['personal:gesundheit' as const] };
    expect(hatRecht(buero, 'personal:gesundheit')).toBe(false);
    expect(herkunftVon(buero, 'personal:gesundheit')).toBe('entzogen');
    expect(herkunftVon({ rolle: 'buero' }, 'zeit:lesen')).toBe('rolle');
    expect(herkunftVon({ rolle: 'aussendienst' }, 'benutzer:verwalten')).toBe('keine');
  });

  it('lässt den Entzug über den Zusatz gewinnen', () => {
    const traeger = { rolle: 'aussendienst' as const, zusatzRechte: ['zeit:genehmigen' as const], entzogeneRechte: ['zeit:genehmigen' as const] };
    expect(hatRecht(traeger, 'zeit:genehmigen')).toBe(false);
  });
});

// ── §3 · Umfang ──────────────────────────────────────────────────

describe('Umfang', () => {
  const kontext = { eigeneId: 'M-JH', teamIds: new Set(['M-MB', 'M-SK']) };

  it('leitet den Umfang aus dem Profil ab und lässt ihn überschreiben', () => {
    expect(umfangVon({ rolle: 'aussendienst' }, 'zeit')).toBe('eigene');
    expect(umfangVon({ rolle: 'disposition' }, 'absenzen')).toBe('team');
    expect(umfangVon({ rolle: 'buero' }, 'personal')).toBe('alle');
    expect(umfangVon({ rolle: 'disposition', umfang: { zeit: 'alle' } }, 'zeit')).toBe('alle');
    expect(umfangVon({ rolle: 'aussendienst' }, 'lager')).toBe('eigene');
  });

  it('prüft Personen gegen eigene Daten, Team und alle', () => {
    const dispo = { rolle: 'disposition' as const };
    expect(darfPerson(dispo, 'zeit', 'M-JH', kontext)).toBe(true);
    expect(darfPerson(dispo, 'zeit', 'M-MB', kontext)).toBe(true);
    expect(darfPerson(dispo, 'zeit', 'M-RW', kontext)).toBe(false);
    expect(darfPerson({ rolle: 'aussendienst' }, 'zeit', 'M-MB', kontext)).toBe(false);
    expect(darfPerson({ rolle: 'buero' }, 'zeit', 'M-RW', kontext)).toBe(true);
  });
});

/* ◆ jh · eof */
