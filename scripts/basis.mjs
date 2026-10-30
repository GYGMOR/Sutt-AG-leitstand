/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  scripts/basis.mjs                                  │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Basis-Pfad des Builds aus SL_BASE – für die Pages-Skripte             │
   └────────────────────────────────────────────────────────────────────────┘ */

// ── §1 · Basis ───────────────────────────────────────────────────

// jh› Dieselbe Regel wie in basis.ts (Vite-Konfigurationen) – hier als .mjs, weil Node die Skripte ohne
//     TypeScript-Lauf starten soll.
export function basisPfad(roh = process.env.SL_BASE) {
  const kern = (roh ?? '').trim().replace(/^\/+|\/+$/g, '');
  return kern === '' ? '/' : `/${kern}/`;
}

export function appBasis(basis = basisPfad()) {
  return `${basis}app/`;
}

export function webseiteBasis(basis = basisPfad()) {
  return `${basis}webseite/`;
}

/* ◆ jh · eof */
