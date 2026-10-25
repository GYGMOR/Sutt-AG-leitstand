/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/cx.test.ts                                 │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  cx() und modulKlasse(): Lücken schlucken, Kebab → camelCase           │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { cx, modulKlasse } from './cx';

// ── §1 · Tests ───────────────────────────────────────────────────

describe('cx', () => {
  it('lässt false, null und undefined weg', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
    expect(cx()).toBe('');
  });
});

describe('modulKlasse', () => {
  const styles = { katReparatur: 'k1', statusVorOrt: 's1', tech1: 't1', regionZuerichNord: 'r1' };

  it('übersetzt Kebab-Namen in die camelCase-Exporte von Vite', () => {
    expect(modulKlasse(styles, 'kat-reparatur')).toBe('k1');
    expect(modulKlasse(styles, 'status-vor-ort')).toBe('s1');
    expect(modulKlasse(styles, 'tech-1')).toBe('t1');
    expect(modulKlasse(styles, 'region-zuerich-nord')).toBe('r1');
  });

  it('gibt undefined für unbekannte Klassen zurück', () => {
    expect(modulKlasse(styles, 'gibt-es-nicht')).toBeUndefined();
  });
});

/* ◆ jh · eof */
