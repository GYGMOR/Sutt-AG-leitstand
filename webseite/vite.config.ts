/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  webseite/vite.config.ts                            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Website: statisches Gerüst, eigener Port, Tokens aus dem Leitstand    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// ── §1 · Konfiguration ───────────────────────────────────────────

// jh› Die Website ist der dritte Teil der Familie: eigener Build und eigenes Hosting, aber dieselben
//     Tokens (@sl/styles) – wenn Leitstand und App ihr Orange ändern, zieht die Website mit.
export default defineConfig({
  resolve: {
    alias: { '@sl': fileURLToPath(new URL('../src', import.meta.url)) },
  },
  server: {
    port: 5175,
    strictPort: true,
    host: true,
    fs: { allow: ['..'] },
  },
  preview: {
    port: 5175,
    strictPort: true,
  },
});

/* ◆ jh · eof */
