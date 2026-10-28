/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  scripts/basis.ts                                   │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Basis-Pfad des Builds aus SL_BASE – für beide vite.config.ts          │
   └────────────────────────────────────────────────────────────────────────┘ */

// ── §1 · Basis ───────────────────────────────────────────────────

// jh› SL_BASE sagt, wo der Leitstand liegt: «/» lokal und gehostet, «/<repo>/» auf GitHub Pages.
//     Die Techniker-App hängt immer unter «<Basis>app/». Dieselbe Regel steht für die Skripte in basis.mjs.
export function basisPfad(roh: string | undefined = process.env.SL_BASE): string {
  const kern = (roh ?? '').trim().replace(/^\/+|\/+$/g, '');
  return kern === '' ? '/' : `/${kern}/`;
}

export function appBasis(basis: string = basisPfad()): string {
  return `${basis}app/`;
}

/* ◆ jh · eof */
