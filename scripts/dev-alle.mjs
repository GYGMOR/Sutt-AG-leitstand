/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  scripts/dev-alle.mjs                               │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Ein Terminal, drei Dev-Server: Leitstand, Techniker-App, Website      │
   └────────────────────────────────────────────────────────────────────────┘ */

// Aufruf:  npm run dev:alle   → Leitstand (5173), Techniker-App (5174) und Website (5175)
//          Beenden mit Ctrl+C – alle drei Server gehen mit.
// jh› Website über den Leitstand (5173/webseite/) öffnen: nur so teilen Website und Leitstand den
//     Browser-Speicher, und die Anfrage aus dem Formular erscheint im Eingang.

import { spawn } from 'node:child_process';

// ── §1 · Prozesse ────────────────────────────────────────────────

const RESET = '\x1b[0m';
const PROZESSE = [
  { name: 'leitstand', skript: 'dev', url: 'http://localhost:5173/', farbe: '\x1b[33m' },
  { name: 'app', skript: 'dev:app', url: 'http://localhost:5174/app/', farbe: '\x1b[36m' },
  { name: 'website', skript: 'dev:web', url: 'http://localhost:5173/webseite/  (direkt: http://localhost:5175/webseite/)', farbe: '\x1b[35m' },
];
const WINDOWS = process.platform === 'win32';

// jh› Über npm statt direkt über vite: so gelten dieselben Workspace-Skripte wie beim Einzelstart.
//     Windows braucht die Shell für npm.cmd (als ganze Befehlszeile, sonst warnt Node); macOS und
//     Linux starten npm direkt.
function starte(prozess) {
  const optionen = { stdio: ['ignore', 'pipe', 'pipe'] };
  const kind = WINDOWS ? spawn(`npm run ${prozess.skript}`, { ...optionen, shell: true }) : spawn('npm', ['run', prozess.skript], optionen);
  const praefix = `${prozess.farbe}[${prozess.name.padEnd(9)}]${RESET} `;
  const weiterleiten = (ziel) => (stueck) => {
    for (const zeile of stueck.toString().split(/\r?\n/)) {
      if (zeile.trim() !== '') ziel.write(`${praefix}${zeile}\n`);
    }
  };
  kind.stdout.on('data', weiterleiten(process.stdout));
  kind.stderr.on('data', weiterleiten(process.stderr));
  kind.on('exit', (code) => process.stdout.write(`${praefix}beendet${code === null ? '' : ` (Code ${code})`}\n`));
  return kind;
}

// ── §2 · Start und Aufräumen ─────────────────────────────────────

process.stdout.write('◆ SUTT Leitstand · drei Dev-Server\n');
for (const prozess of PROZESSE) process.stdout.write(`  ${prozess.name.padEnd(9)}  ${prozess.url}\n`);
process.stdout.write('  Beenden mit Ctrl+C\n\n');

const kinder = PROZESSE.map(starte);

// jh! Unter Windows beendet kill() nur die Shell, nicht den Vite-Prozess dahinter – taskkill räumt den Baum ab.
function beenden() {
  for (const kind of kinder) {
    if (kind.exitCode !== null || kind.pid === undefined) continue;
    if (WINDOWS) spawn('taskkill', ['/pid', String(kind.pid), '/T', '/F'], { stdio: 'ignore' });
    else kind.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 300);
}

process.on('SIGINT', beenden);
process.on('SIGTERM', beenden);

/* ◆ jh · eof */
