/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  scripts/basis.mjs                                  │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Basis-Pfad des Builds aus SL_BASE – für die Pages-Skripte             │
   └────────────────────────────────────────────────────────────────────────┘ */

// ── §1 · Basis ───────────────────────────────────────────────────

// jh› Dieselbe Regel wie in basis.ts (Vite-Konfigurationen) – hier als .mjs, weil Node die Skripte ohne
//     TypeScript-Lauf starten soll.
export function basisPfad(roh = process.env.SL_BASE) {
  const kern = (roh ?? '').trim().replace(/^\/+|\/+$/g, '');
  return kern === '' ? '/' : `/${kern}/`;
}

/* ◆ jh · eof */
