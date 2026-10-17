/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  vite.config.ts                                     │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Build-Konfiguration: React, CSS Modules, Build-Stempel, Commit        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ── §1 · Build-Stempel ───────────────────────────────────────────

function buildDatum(): string {
  const jetzt = new Date();
  const tag = String(jetzt.getDate()).padStart(2, '0');
  const monat = String(jetzt.getMonth() + 1).padStart(2, '0');
  return `${tag}.${monat}.${jetzt.getFullYear()}`;
}

function commitKuerzel(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    // jh› Ohne Repository (Zip-Weitergabe) bleibt der Footer trotzdem vollständig.
    return 'ohne-git';
  }
}

function paketVersion(): string {
  const paket = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version?: string };
  return paket.version ?? '0.0.0';
}

// ── §2 · CSS-Klassennamen ────────────────────────────────────────

/** «PendenzCard.module.css» + «karte» → «PendenzCard__karte__k3f9» – lesbar im DevTool. */
function scopedName(lokal: string, dateipfad: string): string {
  const datei = (dateipfad.split(/[\\/]/).pop() ?? 'sl').replace(/\.module\.css.*$/, '');
  let hash = 2166136261;
  for (const zeichen of `${dateipfad}:${lokal}`) {
    hash = Math.imul(hash ^ zeichen.charCodeAt(0), 16777619);
  }
  return `${datei}__${lokal}__${(hash >>> 0).toString(36).slice(0, 4)}`;
}

// ── §3 · Konfiguration ───────────────────────────────────────────

export default defineConfig({
  plugins: [react()],
  define: {
    __SL_BUILD_DATUM__: JSON.stringify(buildDatum()),
    __SL_COMMIT__: JSON.stringify(commitKuerzel()),
    __SL_VERSION__: JSON.stringify(paketVersion()),
  },
  css: {
    modules: {
      // jh› kebab-case im CSS, im TSX nur camelCase exportiert (styles.planBereich).
      localsConvention: 'camelCaseOnly',
      generateScopedName: scopedName,
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    // jh! Vorgebündelt verliert maplibre-gl im Dev-Server seinen Worker («Worker failed to load»).
    exclude: ['maplibre-gl'],
  },
  build: {
    // jh› Kartenbibliotheken laden erst, wenn eine Karte sichtbar wird.
    chunkSizeWarningLimit: 900,
  },
});

/* ◆ jh · eof */
