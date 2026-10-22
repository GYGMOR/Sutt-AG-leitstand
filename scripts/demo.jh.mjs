/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  scripts/demo.jh.mjs                                │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Demo-Tour aufzeichnen: Playwright fährt durch die App → WebM          │
   └────────────────────────────────────────────────────────────────────────┘ */

// Aufruf:  npm run demo:video      (Dev-Server auf http://localhost:5173 muss laufen)
// Ergebnis: docs/demo/sutt-leitstand-demo.webm (+ Kontrollbilder in docs/demo/frames/)
// jh! Nutzt die Playwright-Installation aus einem anderen Projekt (PLAYWRIGHT_CORE),
//     damit hier keine 150-MB-Browser-Abhängigkeit in package.json landet.

import { spawnSync } from 'node:child_process';
import { mkdirSync, renameSync, existsSync, rmSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

// ── §1 · Konfiguration ───────────────────────────────────────────

const require = createRequire(import.meta.url);
const PLAYWRIGHT_DIR = process.env['PLAYWRIGHT_CORE'] ?? 'C:/Users/joel.hediger/OneDrive - SONNENBERG/Dokumente/my_Hockey/node_modules/playwright-core';
const { chromium } = require(PLAYWRIGHT_DIR);

const BASE = process.env['DEMO_BASE'] ?? 'http://localhost:5173';
const WURZEL = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const OUT_DIR = path.join(WURZEL, 'docs', 'demo');
// jh› Rohaufnahme im Temp-Ordner – im Projekt landet nur das fertige, komprimierte Video.
const RAW_DIR = path.join(os.tmpdir(), 'sutt-leitstand-demo', String(process.pid));
const SHOT_DIR = path.join(OUT_DIR, 'frames');
const W = 1440;
const H = 860;

mkdirSync(RAW_DIR, { recursive: true });
mkdirSync(SHOT_DIR, { recursive: true });

// ── §2 · Overlay: Mauszeiger, Klickring, Untertitel ──────────────

// jh› Headless-Chromium zeichnet keinen Zeiger – ein eigener Pfeil folgt den
//     Mausereignissen, der Ring zeigt Klicks, die Untertitel erklären den Schritt.
const OVERLAY = `(() => {
  const css = \`
  #sl-demo-cursor{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}
  #sl-demo-ring{position:fixed;left:0;top:0;width:36px;height:36px;border:3px solid #f86c04;border-radius:50%;z-index:2147483646;pointer-events:none;opacity:0;transform:translate(-50%,-50%) scale(.4)}
  #sl-demo-ring.an{animation:sl-ring .6s ease-out}
  @keyframes sl-ring{0%{opacity:.95;transform:translate(-50%,-50%) scale(.35)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.35)}}
  #sl-demo-caption{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);max-width:72%;padding:11px 20px;border-radius:6px;background:rgba(26,26,26,.93);color:#f4f2ee;font:500 18px/1.35 'IBM Plex Sans',system-ui,sans-serif;z-index:2147483645;pointer-events:none;opacity:0;transition:opacity .25s;box-shadow:0 10px 28px rgba(0,0,0,.4);letter-spacing:.01em;text-align:center}
  #sl-demo-caption.an{opacity:1}
  #sl-demo-caption b{color:#ff9a4d;font-weight:600}
  #sl-demo-caption kbd{display:inline-block;padding:0 6px;border:1px solid #777;border-radius:3px;font:500 15px 'IBM Plex Mono',monospace;background:#2a2a2a;vertical-align:1px}
  \`;
  function ensure() {
    if (document.getElementById('sl-demo-cursor')) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    const cursor = document.createElement('div');
    cursor.id = 'sl-demo-cursor';
    cursor.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 3l14 9-6 1.5L10 20z" fill="#1a1a1a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const ring = document.createElement('div');
    ring.id = 'sl-demo-ring';
    const cap = document.createElement('div');
    cap.id = 'sl-demo-caption';
    document.body.append(cursor, ring, cap);
    try {
      const p = JSON.parse(sessionStorage.getItem('sl-demo-pos') || 'null');
      if (p) { cursor.style.left = p.x + 'px'; cursor.style.top = p.y + 'px'; }
      const c = sessionStorage.getItem('sl-demo-cap');
      if (c) { cap.innerHTML = c; cap.classList.add('an'); }
    } catch {}
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      try { sessionStorage.setItem('sl-demo-pos', JSON.stringify({ x: e.clientX, y: e.clientY })); } catch {}
    }, true);
    document.addEventListener('mousedown', (e) => {
      ring.style.left = e.clientX + 'px';
      ring.style.top = e.clientY + 'px';
      ring.classList.remove('an');
      void ring.offsetWidth;
      ring.classList.add('an');
    }, true);
    window.__slCaption = (html) => {
      if (!html) { cap.classList.remove('an'); try { sessionStorage.removeItem('sl-demo-cap'); } catch {} return; }
      cap.innerHTML = html;
      cap.classList.add('an');
      try { sessionStorage.setItem('sl-demo-cap', html); } catch {}
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure);
  else ensure();
})();`;

// ── §3 · Aufnahme & Helfer ───────────────────────────────────────

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: RAW_DIR, size: { width: W, height: H } },
  locale: 'de-CH',
  timezoneId: 'Europe/Zurich',
  colorScheme: 'light',
});
const page = await context.newPage();
await page.addInitScript(OVERLAY);
page.on('pageerror', (fehler) => console.error('pageerror:', fehler.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.error('console:', msg.text());
});

let cur = { x: W / 2, y: H / 2 };
const sleep = (ms) => page.waitForTimeout(ms);
const schritt = (name) => console.log(`· ${name}`);

// jh› Playwrights mouse.move(steps) feuert alle Schritte sofort – für sichtbare
//     Bewegung braucht es echte Pausen zwischen den Zwischenpunkten.
async function moveTo(x, y, ms = 700) {
  const steps = Math.max(10, Math.round(ms / 16));
  const sx = cur.x;
  const sy = cur.y;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
    await sleep(16);
  }
  cur = { x, y };
}

async function boxOf(locator) {
  await locator.waitFor({ state: 'visible', timeout: 10000 });
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element ohne Box');
  return box;
}

async function hoverLoc(locator, ms = 700) {
  const b = await boxOf(locator);
  await moveTo(b.x + b.width / 2, b.y + b.height / 2, ms);
}

async function klickLoc(locator, ms = 700) {
  await hoverLoc(locator, ms);
  await sleep(140);
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
}

async function caption(html, ms = 0) {
  await page.evaluate((h) => window.__slCaption?.(h), html);
  if (ms) await sleep(ms);
}

async function blur() {
  await page.evaluate(() => {
    const aktiv = document.activeElement;
    if (aktiv && aktiv !== document.body) aktiv.blur();
  });
}

async function taste(key, ms = 600) {
  await blur();
  await page.keyboard.press(key);
  await sleep(ms);
}

async function foto(name) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) });
}

// jh› Beim Weg vom Panel in den Plan scrollt dnd-kit die Spur am Rand automatisch
//     mit – darum erst grob hinein, kurz stehen lassen, dann das Ziel neu messen.
async function ziehen(locator, grob, zielFn, ms = 900) {
  const b = await boxOf(locator);
  const sx = b.x + b.width / 2;
  const sy = b.y + b.height / 2;
  await moveTo(sx, sy, 700);
  await sleep(200);
  await page.mouse.down();
  await sleep(160);
  await moveTo(sx + 14, sy + 10, 220);
  await moveTo(grob.x, grob.y, 420);
  await sleep(800);
  const ziel = await zielFn();
  await moveTo(ziel.x, ziel.y, ms);
  await sleep(1400);
  await page.mouse.up();
}

// jh› Ein gescheiterter Schritt bricht die Tour nicht ab – Bild und Meldung reichen zum Nachbessern.
async function schrittSicher(name, fn) {
  schritt(name);
  try {
    await fn();
  } catch (fehler) {
    console.error(`✕ ${name}: ${fehler.message}`);
    await foto(`fehler-${name.replace(/\W+/g, '-')}`);
  }
}

// ── §4 · Tour ────────────────────────────────────────────────────

const start = Date.now();

await schrittSicher('login', async () => {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await sleep(800);
  await caption('<b>SUTT Leitstand</b> · Disposition – klickbares Mockup mit Testdaten', 2200);
  await klickLoc(page.getByLabel(/Benutzername/i));
  await caption('Anmelden mit Demo-Zugang <b>jh</b> – Rollen steuern, welche Module frei sind');
  await page.keyboard.type('jh', { delay: 140 });
  await sleep(500);
  await klickLoc(page.getByRole('button', { name: /^Anmelden$/ }));
  await page.waitForURL(/\/dispo\/plantafel/, { timeout: 10000 });
  await page.locator('[data-einsatz-id="E-A01"]').waitFor({ timeout: 10000 });
  await sleep(900);
  await foto('01-plantafel');
});

await schrittSicher('plantafel', async () => {
  await caption('<b>Plantafel</b>: ein Techniker pro Zeile, Farben = Kategorien, graue Streifen = Fahrzeit', 3200);
  await taste('[', 900);
  await caption('<kbd>[</kbd> klappt die Seitenleiste ein – mehr Platz für den Plan', 1800);
  const block = page.locator('[data-einsatz-id="E-A01"]');
  await hoverLoc(block, 900);
  await caption('Kurz verweilen: die <b>Hovercard</b> zeigt Auftrag, Gerät und Lage', 2400);
  await klickLoc(block, 300);
  await sleep(900);
  await caption('Klick öffnet die <b>Akte</b>. Die Linien zeigen Zusammenhänge: Mietgerät und Folgetermin', 3400);
  await foto('02-akte-linien');
  const akte = page.locator('[class*="Akte__inhalt"]').first();
  await hoverLoc(akte, 600);
  await page.mouse.wheel(0, 420);
  await sleep(1200);
  await caption('Karte, Fahrzeit vom Vorgänger, Kontakte, Typenschild, Ersatzteile, Verlauf – alles an einem Ort', 2600);
  await page.mouse.wheel(0, 520);
  await sleep(1600);
  await page.mouse.wheel(0, -1200);
  await sleep(500);
});

await schrittSicher('drag', async () => {
  await taste('Escape', 900);
  await caption('<b>Auftragseingang</b> rechts: Notfall ganz oben. Ziehen wir ihn in den Plan …', 1800);
  const karte = page.getByRole('button', { name: /^26-04817/ }).first();
  // jh› Plan so scrollen, dass 16:00 in der Mitte liegt – am Rand scrollt dnd-kit sonst von selbst weiter.
  await page.evaluate(() => {
    const scroller = document.querySelector('[class*="Plantafel__scroller"]');
    if (scroller) scroller.scrollLeft += 300;
  });
  await sleep(500);
  const zeileRH = page.locator('[class*="Plantafel__zeile"]').nth(4);
  const zb = await boxOf(zeileRH);
  const zielMessen = async () => {
    const lb = await boxOf(page.locator('[class*="Plantafel__stunde"]', { hasText: '16:00' }).first());
    return { x: lb.x + 30, y: zb.y + zb.height / 2 };
  };
  await ziehen(karte, { x: 620, y: zb.y + zb.height / 2 }, zielMessen);
  await caption('<b>Smart-Slot</b>: freie Fenster färben sich grün/gelb/rot – Region, Marke, Fahrzeit, Auslastung', 2800);
  await foto('03-drop');
  await taste('Control+z', 900);
  await caption('<kbd>Strg</kbd>+<kbd>Z</kbd> nimmt es zurück – jede Änderung steht im Protokoll', 2000);
});

await schrittSicher('konflikte', async () => {
  await klickLoc(page.getByRole('button', { name: /Konflikt/ }).first(), 800);
  await sleep(1200);
  await caption('<b>Konflikt-Wächter</b>: Überschneidungen, fehlende Teile, knappe Fahrten – ein Klick springt hin', 2800);
  await foto('04-konflikt');
  await taste('t', 800);
});

await schrittSicher('kalender', async () => {
  await taste('2', 1200);
  await caption('<b>Kalender</b> wie in Outlook: jeder Techniker ein farbiger Kalender, im Tag nebeneinander', 3000);
  await foto('05-kalender-tag');
  await klickLoc(page.getByRole('radio', { name: 'Arbeitswoche' }), 700);
  await sleep(1200);
  await caption('Arbeitswoche mit allen Kalendern überlagert …', 2000);
  await hoverLoc(page.getByRole('button', { name: /^MB Brunner/ }).first(), 700);
  await page.mouse.dblclick(cur.x, cur.y);
  await sleep(900);
  await klickLoc(page.getByRole('button', { name: /^SK Keller/ }).first(), 500);
  await klickLoc(page.getByRole('button', { name: /^DM Marković/ }).first(), 500);
  await caption('… oder nur drei Kollegen vergleichen – Chips wie Outlooks Kalenderliste', 1800);
  await klickLoc(page.getByRole('radio', { name: 'Nebeneinander' }), 600);
  await sleep(1600);
  await caption('<b>Nebeneinander</b>: Spalten pro Techniker und Tag', 2200);
  await foto('06-kalender-split');
  await klickLoc(page.getByRole('button', { name: 'Alle', exact: true }), 600);
  await sleep(800);
});

await schrittSicher('liste-karte', async () => {
  await taste('3', 1200);
  await caption('<b>Liste</b>: sortieren, gruppieren, mehrere Einsätze auf einmal umplanen', 2600);
  await foto('07-liste');
  await taste('4', 1200);
  await caption('<b>Karte</b>: Touren pro Techniker ab Werkhof, Pins in Tagesreihenfolge', 3200);
  await foto('08-karte');
});

await schrittSicher('palette', async () => {
  await blur();
  await page.keyboard.press('Control+k');
  await sleep(700);
  await caption('<kbd>Strg</kbd>+<kbd>K</kbd>: Auftrag, Kunde, Seriennummer oder Befehl – am Telefon zählt jede Sekunde');
  await page.keyboard.type('Hofstetter', { delay: 110 });
  await sleep(1400);
  await foto('09-palette');
  await page.keyboard.press('Enter');
  await sleep(1500);
  await caption('Treffer öffnet direkt die Akte', 1600);
});

await schrittSicher('schnellerfassung', async () => {
  await taste('1', 900);
  await taste('n', 900);
  await caption('<kbd>N</kbd> – <b>Telefon-Schnellerfassung</b>: Nummer eingeben …');
  await klickLoc(page.getByLabel(/Telefonnummer/i), 500);
  await page.keyboard.type('079 381 22 64', { delay: 95 });
  await sleep(1300);
  await caption('… Anruferin, Liegenschaft und Gerät sind erkannt, der Termin wird vorgeschlagen', 3000);
  await foto('10-schnellerfassung');
  await taste('Escape', 700);
});

await schrittSicher('druck', async () => {
  await klickLoc(page.getByTitle('Tagesplan drucken / teilen').first(), 800);
  await page.waitForURL(/\/dispo\/druck\//, { timeout: 8000 });
  await sleep(1400);
  await caption('<b>Tagesplan</b> pro Techniker als A4 – mit QR-Code zur Route fürs Telefon', 3000);
  await foto('11-druck');
  await page.goBack();
  await page.locator('[data-einsatz-id="E-A01"]').waitFor({ timeout: 10000 });
  await sleep(600);
});

await schrittSicher('dark', async () => {
  await klickLoc(page.getByTitle(/Joel Hediger/).first(), 800);
  await sleep(600);
  await klickLoc(page.locator('[role="menuitem"]', { hasText: 'Dunkler Modus' }).first(), 600);
  await sleep(1400);
  await caption('<b>Dark Mode</b> für die Spätschicht – der Kopf bleibt Anthrazit', 2800);
  await foto('12-dark');
  // jh› Das Menü bleibt nach dem Umschalten offen – erst schliessen, dann neu öffnen.
  await taste('Escape', 500);
  await klickLoc(page.getByTitle(/Joel Hediger/).first(), 700);
  await sleep(600);
  await klickLoc(page.locator('[role="menuitem"]', { hasText: 'Heller Modus' }).first(), 500);
  await sleep(300);
  await taste('Escape', 600);
});

await schrittSicher('abspann', async () => {
  await taste('[', 600);
  await moveTo(W / 2, H / 2, 600);
  await caption('<b>SUTT Leitstand</b> · Disposition v0.2 · klickbares Mockup – kein Backend, alle Daten erfunden', 3800);
  await caption('', 400);
});

console.log(`Tour ${Math.round((Date.now() - start) / 1000)} s`);

// ── §5 · Video ablegen ───────────────────────────────────────────

const video = page.video();
await context.close();
await browser.close();
const rohPfad = await video.path();
const zielPfad = path.join(OUT_DIR, 'sutt-leitstand-demo.webm');
if (existsSync(zielPfad)) rmSync(zielPfad);

// jh› Playwright schreibt VP8 mit hoher Bitrate (~40 MB); VP9 mit fester Qualität
//     bringt dieselbe Tour auf rund 8 MB – mailbar. ffmpeg kommt aus Playwrights Cache.
const FFMPEG = process.env['PLAYWRIGHT_FFMPEG'] ?? path.join(process.env['LOCALAPPDATA'] ?? '', 'ms-playwright', 'ffmpeg-1013', 'ffmpeg-win64.exe');
if (existsSync(FFMPEG)) {
  console.log('Komprimiere (VP9) …');
  const ergebnis = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-i', rohPfad, '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-an', zielPfad], { stdio: 'inherit' });
  if (ergebnis.status !== 0 || !existsSync(zielPfad)) {
    console.error('ffmpeg fehlgeschlagen – Rohaufnahme bleibt erhalten');
    renameSync(rohPfad, zielPfad);
  }
} else {
  console.log(`Kein ffmpeg unter ${FFMPEG} – Rohaufnahme wird unkomprimiert abgelegt`);
  renameSync(rohPfad, zielPfad);
}
for (const rest of readdirSync(RAW_DIR)) rmSync(path.join(RAW_DIR, rest));
rmSync(RAW_DIR, { recursive: true, force: true });
console.log(`Video: ${zielPfad} (${Math.round(statSync(zielPfad).size / 1024)} kB)`);

/* ◆ jh · eof */
