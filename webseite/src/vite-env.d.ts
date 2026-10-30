/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  webseite/vite-env.d.ts                             │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Build-Konstanten der Website (die geteilten stehen in src/vite-env)   │
   └────────────────────────────────────────────────────────────────────────┘ */

// ── §1 · Build-Konstanten ────────────────────────────────────────

/** Hero-Video: Dateien, die beim Bauen in public/video/ lagen – leere Liste bzw. null, wenn nichts da ist. */
declare const __SL_HERO_VIDEO__: { readonly quellen: readonly string[]; readonly poster: string | null };

/** Logos des Marken-Bands, die beim Bauen in public/logos/ lagen: id (Dateiname ohne Endung) → Dateiname. */
declare const __SL_LOGOS__: Readonly<Record<string, string>>;

/* ◆ jh · eof */
