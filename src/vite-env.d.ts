/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  vite-env.d.ts                                      │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Umgebungs-Typen: Vite-Client, Build-Konstanten, .env-Schlüssel        │
   └────────────────────────────────────────────────────────────────────────┘ */

/// <reference types="vite/client" />

// ── §1 · Build-Konstanten ────────────────────────────────────────

// jh› Werden in vite.config.ts per `define` gesetzt.
declare const __SL_BUILD_DATUM__: string;
declare const __SL_COMMIT__: string;
declare const __SL_VERSION__: string;

// ── §2 · Umgebung ────────────────────────────────────────────────

interface ImportMetaEnv {
  /** Google-Maps-Schlüssel – leer lassen, dann greift die MapLibre-/Schemakarte. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** Optionale Map-ID für einen eigenen Kartenstil in der Cloud-Konsole. */
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/* ◆ jh · eof */
