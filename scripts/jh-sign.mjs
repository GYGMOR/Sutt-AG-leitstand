/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  scripts/jh-sign.mjs                                │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Signatur-Prüfung: Kopf, §-Marken, eof, jh#-To-dos – drei Projekte     │
   └────────────────────────────────────────────────────────────────────────┘ */

// Aufruf:  node scripts/jh-sign.mjs           → Köpfe und §-Marken normieren
//          node scripts/jh-sign.mjs --check   → nur prüfen (Exit 1 bei Fehlern)

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';

// ── §1 · Konventionen ────────────────────────────────────────────

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes('--check');

// jh› 72 Zeichen Innenbreite: Platz für Pfade künftiger Module (Lager, Mietgeräte …).
const BOX_INNER = 72;
const MARKER_WIDTH = 68;
const SIG_LINE = /^◆ JH · \d{4}\.\d{2} · rev \d{2}$/;

const STIL = {
  code: { open: '/* ', cont: '   ', close: ' */', eof: '/* ◆ jh · eof */' },
  html: { open: '<!-- ', cont: '     ', close: ' -->', eof: '<!-- ◆ jh · eof -->' },
};

// jh› Drei Projekte, eine Handschrift: Leitstand (src), Techniker-App (app/src), Website (webseite/src).
const QUELLEN = ['src', 'scripts', 'app/src', 'webseite/src'];
const EINZELDATEIEN = [
  'vite.config.ts',
  'index.html',
  'app/vite.config.ts',
  'app/index.html',
  'webseite/vite.config.ts',
  'webseite/index.html',
  'webseite/anfrage.html',
  'webseite/karriere.html',
  'webseite/impressum.html',
  'webseite/datenschutz.html',
];
const ENDUNGEN = new Set(['.ts', '.tsx', '.css', '.mjs', '.html']);

// jh› vite.config.ts verlangt den Default-Export – einzige Ausnahme (je Projekt).
const DEFAULT_EXPORT_ERLAUBT = new Set(['vite.config.ts', 'app/vite.config.ts', 'webseite/vite.config.ts']);

// ── §2 · Dateien sammeln ─────────────────────────────────────────

function sammle(verzeichnis) {
  if (!existsSync(verzeichnis)) return [];
  return readdirSync(verzeichnis).flatMap((name) => {
    const pfad = join(verzeichnis, name);
    if (statSync(pfad).isDirectory()) return sammle(pfad);
    return ENDUNGEN.has(extname(name)) ? [pfad] : [];
  });
}

function kopfPfad(absolut) {
  const rel = relative(ROOT, absolut).split(sep).join('/');
  if (rel.startsWith('src/')) return rel.slice(4);
  // jh› app/src/seiten/HeuteSeite.tsx → app/seiten/HeuteSeite.tsx – das «src» trägt keine Information.
  return rel.replace(/^(app|webseite)\/src\//, '$1/');
}

function stilFuer(pfad) {
  return extname(pfad) === '.html' ? STIL.html : STIL.code;
}

// ── §3 · Kopf normieren ──────────────────────────────────────────

function boxZeile(stil, inhalt) {
  return `${stil.cont}│  ${inhalt.padEnd(BOX_INNER - 2)}│`;
}

function baueKopf(stil, pfad, signatur, beschreibung) {
  const strich = '─'.repeat(BOX_INNER);
  return [
    `${stil.open}┌${strich}┐`,
    boxZeile(stil, `SUTT·LEITSTAND  ·  ${pfad}`),
    boxZeile(stil, signatur),
    ...beschreibung.map((zeile) => boxZeile(stil, zeile)),
    `${stil.cont}└${strich}┘${stil.close}`,
  ];
}

function leseKopf(zeilen, start) {
  if (!zeilen[start]?.includes('┌')) return null;
  const ende = zeilen.findIndex((zeile, index) => index > start && zeile.includes('┘'));
  if (ende < 0) return null;
  const innen = zeilen
    .slice(start + 1, ende)
    .map((zeile) => zeile.replace(/^\s*│\s?/, '').replace(/│\s*$/, '').trim());
  const [titel = '', signatur = '', ...beschreibung] = innen;
  return { ende, titel, signatur, beschreibung };
}

// ── §4 · §-Marken normieren ──────────────────────────────────────

const MARKER_CODE = /^\/\/ ── §(\d+) · (.+?) ─*$/;
const MARKER_CSS = /^\/\* ── §(\d+) · (.+?) ─* \*\/$/;

function normiereMarker(zeile, istCss) {
  const treffer = istCss ? MARKER_CSS.exec(zeile) : MARKER_CODE.exec(zeile);
  if (!treffer) return null;
  const [, nummer, titel] = treffer;
  const kern = `${istCss ? '/*' : '//'} ── §${nummer} · ${titel.trim()} `;
  const rest = MARKER_WIDTH - kern.length - (istCss ? 3 : 0);
  const linie = '─'.repeat(Math.max(4, rest));
  return { nummer: Number(nummer), zeile: istCss ? `${kern}${linie} */` : `${kern}${linie}` };
}

// ── §5 · Prüfung je Datei ────────────────────────────────────────

const fehler = [];
const todoIds = new Map();
let geaendert = 0;

function melde(pfad, text) {
  fehler.push(`  ✕ ${pfad} – ${text}`);
}

function pruefeDatei(absolut) {
  const pfad = kopfPfad(absolut);
  const stil = stilFuer(absolut);
  const istCss = extname(absolut) === '.css';
  const original = readFileSync(absolut, 'utf8');
  const zeilen = original.replace(/\r\n/g, '\n').split('\n');

  const kopfStart = zeilen[0]?.toLowerCase().startsWith('<!doctype') ? 1 : 0;
  const kopf = leseKopf(zeilen, kopfStart);
  if (!kopf) {
    melde(pfad, 'Datei-Kopf fehlt');
    return;
  }
  if (!SIG_LINE.test(kopf.signatur)) melde(pfad, `Signaturzeile ungültig: «${kopf.signatur}»`);
  if (kopf.beschreibung.length === 0) melde(pfad, 'Kopf ohne Beschreibung');
  const zuLang = [kopf.titel, ...kopf.beschreibung].find((zeile) => zeile.length > BOX_INNER - 4);
  if (zuLang) melde(pfad, `Kopfzeile länger als ${BOX_INNER - 4} Zeichen: «${zuLang}»`);

  const neuerKopf = baueKopf(stil, pfad, kopf.signatur, kopf.beschreibung);
  zeilen.splice(kopfStart, kopf.ende - kopfStart + 1, ...neuerKopf);

  let erwartet = 1;
  zeilen.forEach((zeile, index) => {
    const marker = normiereMarker(zeile, istCss);
    if (marker) {
      if (marker.nummer !== erwartet) melde(pfad, `§${marker.nummer} erwartet §${erwartet}`);
      erwartet = marker.nummer + 1;
      zeilen[index] = marker.zeile;
    }
    for (const todo of zeile.matchAll(/jh# (\d{3})\b/g)) {
      const id = todo[1];
      if (todoIds.has(id)) melde(pfad, `jh# ${id} doppelt vergeben (auch ${todoIds.get(id)})`);
      todoIds.set(id, pfad);
    }
  });
  const istHtml = extname(absolut) === '.html';
  if (erwartet === 1 && !istHtml) melde(pfad, 'keine §-Marke');

  const letzte = [...zeilen].reverse().find((zeile) => zeile.trim() !== '');
  if (letzte !== stil.eof) melde(pfad, `eof-Zeile fehlt («${stil.eof}»)`);

  const code = zeilen.join('\n');
  if (!istCss && !DEFAULT_EXPORT_ERLAUBT.has(pfad) && /^export default /m.test(code)) {
    melde(pfad, 'Default-Export – nur benannte Exporte');
  }
  if (/[:<]\s*any\b|\bas any\b/.test(code)) melde(pfad, '`any` verwendet');
  if (istHtml && !code.includes('<meta name="author" content="◆ JH" />')) {
    melde(pfad, 'meta author fehlt');
  }

  const normiert = code.endsWith('\n') ? code : `${code}\n`;
  if (normiert !== original.replace(/\r\n/g, '\n')) {
    if (CHECK_ONLY) {
      melde(pfad, 'Kopf/§-Marken nicht normiert – `npm run jh:sign` ausführen');
      return;
    }
    writeFileSync(absolut, normiert, 'utf8');
    geaendert += 1;
  }
}

// ── §6 · To-do-Abgleich ──────────────────────────────────────────

function pruefeTodos() {
  const todoDatei = join(ROOT, 'TODO.jh.md');
  if (!existsSync(todoDatei)) {
    if (todoIds.size > 0) fehler.push('  ✕ TODO.jh.md fehlt');
    return;
  }
  const liste = readFileSync(todoDatei, 'utf8');
  const gelistet = new Set([...liste.matchAll(/jh# (\d{3})\b/g)].map((treffer) => treffer[1]));
  const erledigt = new Set(
    [...liste.matchAll(/^- \[x\] .*?jh# (\d{3})\b/gm)].map((treffer) => treffer[1]),
  );
  for (const [id, pfad] of todoIds) {
    if (!gelistet.has(id)) melde(pfad, `jh# ${id} fehlt in TODO.jh.md`);
  }
  for (const id of gelistet) {
    if (!todoIds.has(id) && !erledigt.has(id)) {
      fehler.push(`  ✕ TODO.jh.md – jh# ${id} offen, aber im Code nicht mehr vorhanden`);
    }
  }
}

// ── §7 · Lauf ────────────────────────────────────────────────────

const dateien = [
  ...QUELLEN.flatMap((ordner) => sammle(join(ROOT, ordner))),
  ...EINZELDATEIEN.map((name) => join(ROOT, name)).filter((pfad) => existsSync(pfad)),
];

dateien.forEach(pruefeDatei);
pruefeTodos();

const kopfzeile = `◆ jh-sign · ${dateien.length} Dateien · ${todoIds.size} jh#-To-dos`;
if (fehler.length > 0) {
  console.error(`${kopfzeile}\n${fehler.join('\n')}`);
  process.exit(1);
}
const aktion = CHECK_ONLY ? 'geprüft' : `${geaendert} normiert`;
console.log(`${kopfzeile} · ${aktion} · ok`);

/* ◆ jh · eof */
