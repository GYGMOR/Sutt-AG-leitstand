/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/vite.config.ts                                 │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Techniker-App: eigenes Projekt unter /app/, teilt src/ mit Leitstand  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
    return 'ohne-git';
  }
}

function paketVersion(): string {
  const paket = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version?: string };
  return paket.version ?? '0.0.0';
}

// ── §2 · CSS-Klassennamen (wie im Leitstand) ─────────────────────

function scopedName(lokal: string, dateipfad: string): string {
  const datei = (dateipfad.split(/[\\/]/).pop() ?? 'sl').replace(/\.module\.css.*$/, '');
  let hash = 2166136261;
  for (const zeichen of `${dateipfad}:${lokal}`) {
    hash = Math.imul(hash ^ zeichen.charCodeAt(0), 16777619);
  }
  return `${datei}__${lokal}__${(hash >>> 0).toString(36).slice(0, 4)}`;
}

// ── §3 · Konfiguration ───────────────────────────────────────────

// jh› Die App ist ein eigenes Projekt (eigener Build, eigenes Hosting), aber keine zweite Wahrheit: Domäne,
//     Store, Mock und geteilte Bausteine kommen über den Alias @sl aus ../src (ADR-008). Unter /app/ gebaut,
//     damit der Leitstand sie im Dev-Modus durchreicht (gleicher Ursprung = geteilter Stand).
const leitstandSrc = fileURLToPath(new URL('../src', import.meta.url));

export default defineConfig({
  base: '/app/',
  plugins: [react()],
  resolve: {
    alias: { '@sl': leitstandSrc },
    // jh! Geteilte Dateien liegen ausserhalb von app/ – React darf nur einmal geladen werden.
    dedupe: ['react', 'react-dom', 'react-router'],
  },
  define: {
    __SL_BUILD_DATUM__: JSON.stringify(buildDatum()),
    __SL_COMMIT__: JSON.stringify(commitKuerzel()),
    __SL_VERSION__: JSON.stringify(paketVersion()),
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: scopedName,
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    host: true,
    fs: { allow: ['..'] },
    // jh› Auch hinter dem Leitstand-Proxy (5173/app/) spricht der HMR-Client direkt mit 5174 – der Proxy
    //     reicht nur HTTP durch; Host bleibt der der Seite (localhost oder Laptop-IP fürs Handy).
    hmr: { clientPort: 5174 },
  },
  preview: {
    port: 5174,
    strictPort: true,
    host: true,
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
});

/* ◆ jh · eof */
