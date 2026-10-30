/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  scripts/basis.ts                                   │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Basis-Pfad des Builds aus SL_BASE – für alle drei vite.config.ts      │
   └────────────────────────────────────────────────────────────────────────┘ */

// ── §1 · Basis ───────────────────────────────────────────────────

// jh› SL_BASE sagt, wo der Leitstand liegt: «/» lokal und gehostet, «/<repo>/» auf GitHub Pages.
//     Die Techniker-App hängt immer unter «<Basis>app/», die Website unter «<Basis>webseite/» – gehostet
//     wird die Website später die Hauptdomain, dann ändert nur diese eine Stelle. Dieselbe Regel in basis.mjs.
export function basisPfad(roh: string | undefined = process.env.SL_BASE): string {
  const kern = (roh ?? '').trim().replace(/^\/+|\/+$/g, '');
  return kern === '' ? '/' : `/${kern}/`;
}

export function appBasis(basis: string = basisPfad()): string {
  return `${basis}app/`;
}

export function webseiteBasis(basis: string = basisPfad()): string {
  return `${basis}webseite/`;
}

/* ◆ jh · eof */
