/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/identitaet.test.ts                       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Domain-Prüfung, Gruppen → Rolle, bekanntes Konto, JIT, Sperre         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import type { Benutzer } from './auth.types';
import { kontoAusIdentitaet, kuerzelAus, rolleAusGruppen } from './identitaet';
import type { AnbieterKonfiguration, IdentitaetsClaims } from './identitaet';

// ── §1 · Aufbau ──────────────────────────────────────────────────

const KONFIG: AnbieterKonfiguration = {
  anbieter: 'microsoft',
  aktiv: true,
  mandantId: '7e1c…',
  clientId: 'a4b2…',
  domaene: 'sutt.example',
  gruppenZuordnung: [
    { gruppe: 'SG-Aussendienst', rolle: 'aussendienst' },
    { gruppe: 'SG-Buero', rolle: 'buero' },
    { gruppe: 'SG-Admin', rolle: 'administration' },
  ],
  jitAnlegen: true,
  standardRolle: 'aussendienst',
};

const JETZT = '2026-10-26T08:00' as const;

const RW: Benutzer = { id: 'U-RW', benutzername: 'rw', vorname: 'Regula', nachname: 'Wild', kuerzel: 'RW', rolle: 'buero', aktiv: true, email: 'r.wild@sutt.example', sso: { anbieter: 'microsoft', externeId: 'ms-rw', email: 'r.wild@sutt.example', verknuepftAm: JETZT } };

function claims(teil: Partial<IdentitaetsClaims>): IdentitaetsClaims {
  return { anbieter: 'microsoft', sub: 'ms-neu', email: 'p.meier@sutt.example', name: 'Petra Meier', gruppen: [], ...teil };
}

// ── §2 · Tests ───────────────────────────────────────────────────

describe('Gruppen → Rolle', () => {
  it('nimmt die höchste passende Rolle, sonst null', () => {
    expect(rolleAusGruppen(['SG-Buero', 'SG-Admin'], KONFIG.gruppenZuordnung)).toBe('administration');
    expect(rolleAusGruppen(['sg-aussendienst'], KONFIG.gruppenZuordnung)).toBe('aussendienst');
    expect(rolleAusGruppen(['Alle'], KONFIG.gruppenZuordnung)).toBeNull();
  });

  it('vergibt freie Kürzel', () => {
    expect(kuerzelAus('Petra', 'Meier', new Set(['RW']))).toBe('PM');
    expect(kuerzelAus('Petra', 'Meier', new Set(['PM']))).toBe('PM2');
  });
});

describe('Konto aus Identität', () => {
  it('weist fremde Domains und inaktive Anbieter ab', () => {
    const fremd = kontoAusIdentitaet(claims({ email: 'jemand@fremd.example' }), KONFIG, [RW], JETZT);
    expect(fremd.ok).toBe(false);
    const aus = kontoAusIdentitaet(claims({}), { ...KONFIG, aktiv: false }, [RW], JETZT);
    expect(aus.ok).toBe(false);
  });

  it('findet bekannte Konten über das Subject und zieht die Rolle aus den Gruppen', () => {
    const ergebnis = kontoAusIdentitaet(claims({ sub: 'ms-rw', email: 'r.wild@sutt.example', name: 'Regula Wild', gruppen: ['SG-Admin'] }), KONFIG, [RW], JETZT);
    expect(ergebnis.ok && !ergebnis.neu && ergebnis.benutzer.id === 'U-RW' && ergebnis.benutzer.rolle === 'administration').toBe(true);
  });

  it('sperrt deaktivierte Konten auch über den Anbieter', () => {
    const ergebnis = kontoAusIdentitaet(claims({ sub: 'ms-rw', email: 'r.wild@sutt.example' }), KONFIG, [{ ...RW, aktiv: false }], JETZT);
    expect(ergebnis.ok).toBe(false);
  });

  it('legt neue Konten just-in-time mit Standardrolle an – oder verweigert, wenn JIT aus ist', () => {
    const neu = kontoAusIdentitaet(claims({}), KONFIG, [RW], JETZT);
    expect(neu.ok && neu.neu).toBe(true);
    if (neu.ok) {
      expect(neu.benutzer.benutzername).toBe('p.meier');
      expect(neu.benutzer.kuerzel).toBe('PM');
      expect(neu.benutzer.rolle).toBe('aussendienst');
      expect(neu.benutzer.sso?.externeId).toBe('ms-neu');
    }
    const verweigert = kontoAusIdentitaet(claims({}), { ...KONFIG, jitAnlegen: false }, [RW], JETZT);
    expect(verweigert.ok).toBe(false);
  });
});

/* ◆ jh · eof */
