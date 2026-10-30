/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  webseite/vite.config.ts                            │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Website: fünf Seiten, Kopf/Fuss als Teile, Basis wie die App          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { appBasis, basisPfad, webseiteBasis } from '../scripts/basis';

// ── §1 · Teile (Kopf, Fuss) ──────────────────────────────────────

// jh› Kein Framework für fünf Seiten: Kopf und Fuss liegen einmal in teile/ und werden beim Bauen (und im
//     Dev-Modus bei jedem Aufruf) an der Marke <!-- @teil kopf --> eingesetzt. Kommentare der Teile bleiben
//     in der Quelle, nicht in der Seite.
function teile(): Plugin {
  return {
    name: 'sl-teile',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/<!-- @teil ([a-z]+) -->/g, (_treffer, name: string) => {
          const quelle = readFileSync(new URL(`./teile/${name}.html`, import.meta.url), 'utf8');
          return quelle.replace(/<!--[\s\S]*?-->/g, '').trim();
        });
      },
    },
  };
}

// ── §2 · Konfiguration ───────────────────────────────────────────

function paketVersion(): string {
  const paket = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version?: string };
  return paket.version ?? '0.0.0';
}

const seite = (name: string): string => fileURLToPath(new URL(`./${name}.html`, import.meta.url));
// jh› Dieselbe Basis wie Leitstand und App (SL_BASE): lokal «/webseite/», auf Pages «/<repo>/webseite/».
//     Der Leitstand reicht /webseite im Dev-Modus an diesen Server durch – nur über 5173 teilen Website und
//     Leitstand den Browser-Speicher, und die Anfrage aus dem Formular landet im Eingang.
const basis = basisPfad();

export default defineConfig({
  base: webseiteBasis(basis),
  appType: 'mpa',
  plugins: [teile()],
  resolve: {
    alias: { '@sl': fileURLToPath(new URL('../src', import.meta.url)) },
  },
  define: {
    __SL_VERSION__: JSON.stringify(paketVersion()),
    __SL_LEITSTAND_URL__: JSON.stringify(basis),
    __SL_APP_URL__: JSON.stringify(appBasis(basis)),
  },
  server: {
    port: 5175,
    strictPort: true,
    host: true,
    fs: { allow: ['..'] },
    hmr: { clientPort: 5175 },
  },
  preview: {
    port: 5175,
    strictPort: true,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        index: seite('index'),
        anfrage: seite('anfrage'),
        karriere: seite('karriere'),
        impressum: seite('impressum'),
        datenschutz: seite('datenschutz'),
      },
    },
  },
});

/* ◆ jh · eof */
