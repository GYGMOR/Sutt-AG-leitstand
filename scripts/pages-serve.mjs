/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  scripts/pages-serve.mjs                            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  site/ lokal wie GitHub Pages ausliefern: Basis-Pfad, 404.html, Port   │
   └────────────────────────────────────────────────────────────────────────┘ */

// Aufruf:  SL_BASE=/<repo>/ npm run pages:serve   → http://localhost:4175/<repo>/
//          Verhält sich wie Pages: unbekannter Pfad → 404.html (Status 404), Ordner ohne «/» → Umleitung.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { basisPfad } from './basis.mjs';

// ── §1 · Einstellungen ───────────────────────────────────────────

const basis = basisPfad();
const PORT = Number(process.env.PORT ?? 4175);
const WURZEL = 'site';
const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

// ── §2 · Server ──────────────────────────────────────────────────

async function datei(pfad) {
  try {
    const info = await stat(pfad);
    return info.isDirectory() ? 'ordner' : await readFile(pfad);
  } catch {
    return null;
  }
}

createServer(async (anfrage, antwort) => {
  const url = new URL(anfrage.url ?? '/', `http://localhost:${PORT}`);
  const pfad = decodeURIComponent(url.pathname);
  if (!pfad.startsWith(basis)) {
    antwort.writeHead(302, { Location: basis });
    antwort.end();
    return;
  }
  const relativ = normalize(pfad.slice(basis.length)).replace(/^(\.\.[/\\])+/, '');
  let ziel = join(WURZEL, relativ === '' || relativ === '.' ? 'index.html' : relativ);
  let inhalt = await datei(ziel);
  if (inhalt === 'ordner') {
    if (!pfad.endsWith('/')) {
      antwort.writeHead(301, { Location: `${pfad}/${url.search}` });
      antwort.end();
      return;
    }
    ziel = join(ziel, 'index.html');
    inhalt = await datei(ziel);
  }
  let status = 200;
  if (inhalt === null || inhalt === 'ordner') {
    status = 404;
    ziel = join(WURZEL, '404.html');
    inhalt = await datei(ziel);
  }
  if (inhalt === null || inhalt === 'ordner') {
    antwort.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    antwort.end('404');
    return;
  }
  antwort.writeHead(status, { 'Content-Type': TYPEN[extname(ziel)] ?? 'application/octet-stream' });
  antwort.end(inhalt);
}).listen(PORT, () => {
  console.log(`◆ pages-serve · http://localhost:${PORT}${basis}  (App: http://localhost:${PORT}${basis}app/)`);
});

/* ◆ jh · eof */
