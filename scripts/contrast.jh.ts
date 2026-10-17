/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  scripts/contrast.jh.ts                             │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  WCAG-Kontrast aller Textpaare aus tokens.css + tokens.dark.css        │
   └────────────────────────────────────────────────────────────────────────┘ */

// Aufruf:  node scripts/contrast.jh.ts        (Node ≥ 23 strippt Typen selbst)
// Exit 1, sobald ein Paar seine Mindestquote verfehlt.

import { readFileSync } from 'node:fs';

// ── §1 · Prüfpaare ───────────────────────────────────────────────

interface Paar {
  text: string;
  flaeche: string;
  zweck: string;
  /** 4.5 für Fliesstext, 3.0 für grosse Schrift (≥ 18.5 px fett) und UI-Grafik. */
  minimum: number;
}

const KATEGORIEN = ['reparatur', 'montage', 'lieferung', 'garantie', 'mietgeraet', 'malerarbeiten', 'offerte', 'notfall'];
const STATUS = ['geplant', 'unterwegs', 'vor-ort', 'wartet-teil', 'erledigt'];
const REGIONEN = ['glattal', 'unterland', 'zuerich-nord'];
const TECHNIKER = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// jh› Blockflächen entstehen zur Laufzeit aus Kante × --sl-tint-mix (color-mix in srgb).
//     Das Script rechnet dieselbe Mischung nach und legt sie als «tint-…» in die Palette.
const PAARE: Paar[] = [
  { text: 'ink', flaeche: 'paper', zweck: 'Text auf Arbeitsfläche', minimum: 4.5 },
  { text: 'ink', flaeche: 'surface', zweck: 'Text auf Panel', minimum: 4.5 },
  { text: 'ink-2', flaeche: 'surface', zweck: 'Sekundärtext', minimum: 4.5 },
  { text: 'mute', flaeche: 'surface', zweck: 'Labels/Metadaten', minimum: 4.5 },
  { text: 'mute', flaeche: 'paper', zweck: 'Labels auf Fläche', minimum: 4.5 },
  { text: 'signal-ink', flaeche: 'surface', zweck: 'Signal als Schrift', minimum: 4.5 },
  { text: 'signal-ink', flaeche: 'paper', zweck: 'Signal als Schrift (Fläche)', minimum: 4.5 },
  { text: 'danger-ink', flaeche: 'surface', zweck: 'Löschen/Fehler als Schrift', minimum: 4.5 },
  { text: 'on-signal', flaeche: 'signal', zweck: 'Primärknopf', minimum: 4.5 },
  { text: 'chrome-ink', flaeche: 'chrome', zweck: 'Topbar-Text', minimum: 4.5 },
  { text: 'chrome-mute', flaeche: 'chrome', zweck: 'Topbar-Nebentext', minimum: 4.5 },
  { text: 'chrome-ink', flaeche: 'chrome-2', zweck: 'Suchfeld in Topbar', minimum: 4.5 },
  { text: 'st-wartet-teil', flaeche: 'surface', zweck: 'Folgetermin-Tag', minimum: 4.5 },
  { text: 'st-vor-ort', flaeche: 'surface', zweck: 'Live-Puls-Text', minimum: 4.5 },
  { text: 'slot-gut-ink', flaeche: 'surface', zweck: 'Smart-Slot Begründung', minimum: 4.5 },
  { text: 'slot-ok-ink', flaeche: 'surface', zweck: 'Smart-Slot Begründung', minimum: 4.5 },
  { text: 'slot-schlecht-ink', flaeche: 'surface', zweck: 'Smart-Slot Begründung', minimum: 4.5 },
  // jh› Sutt-Orange auf Weiss liegt bei 2.94:1 – die Jetzt-Linie ist dekorativ, die Zeit trägt die Pille (signal-ink, 4.5+).
  { text: 'signal', flaeche: 'surface', zweck: 'Jetzt-Linie, Messmarke (dekorativ)', minimum: 2.5 },
  { text: 'line-strong', flaeche: 'surface', zweck: 'Rahmen Typenschild (Grafik)', minimum: 1.4 },
  ...KATEGORIEN.map((kat) => ({ text: `kat-${kat}-ink`, flaeche: `tint-kat-${kat}`, zweck: `Kategorie ${kat} (Blockfläche)`, minimum: 4.5 })),
  ...KATEGORIEN.map((kat) => ({ text: `kat-${kat}-edge`, flaeche: 'surface', zweck: `Kante ${kat} (Grafik)`, minimum: 2.4 })),
  ...TECHNIKER.map((n) => ({ text: `tech-${n}-ink`, flaeche: `tech-${n}`, zweck: `Avatar Techniker ${n}`, minimum: 4.5 })),
  ...TECHNIKER.map((n) => ({ text: 'ink', flaeche: `tint-tech-${n}`, zweck: `Techniker ${n} (Blockfläche)`, minimum: 4.5 })),
  ...STATUS.map((status) => ({ text: 'ink', flaeche: `tint-st-${status}`, zweck: `Status ${status} (Blockfläche)`, minimum: 4.5 })),
  ...REGIONEN.map((region) => ({ text: 'ink', flaeche: `tint-region-${region}`, zweck: `Region ${region} (Blockfläche)`, minimum: 4.5 })),
];

// ── §2 · Tokens lesen ────────────────────────────────────────────

type Palette = Map<string, string>;

function readTokens(pfad: string): Palette {
  const css = readFileSync(pfad, 'utf8');
  const palette: Palette = new Map();
  for (const treffer of css.matchAll(/--sl-([a-z0-9-]+):\s*([^;]+);/g)) {
    const name = treffer[1];
    const wert = treffer[2]?.trim();
    if (name && wert) palette.set(name, wert);
  }
  return palette;
}

function resolve(palette: Palette, name: string, tiefe = 0): string {
  const wert = palette.get(name);
  if (!wert) throw new Error(`Token --sl-${name} fehlt`);
  const verweis = /^var\(--sl-([a-z0-9-]+)\)$/.exec(wert);
  if (!verweis) return wert;
  if (tiefe > 5) throw new Error(`Token --sl-${name}: zirkulärer Verweis`);
  return resolve(palette, verweis[1] ?? '', tiefe + 1);
}

// jh› Dark-Datei überschreibt nur Werte – fehlt ein Token, gilt Light.
function leser(palette: Palette, basis?: Palette): (name: string) => string {
  return (name) => {
    if (palette.has(name)) return resolve(palette, name);
    if (basis?.has(name)) return resolve(basis, name);
    throw new Error(`Token --sl-${name} fehlt`);
  };
}

// ── §3 · Farbe & Kontrast (WCAG 2.1) ─────────────────────────────

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): Rgb {
  const roh = hex.replace('#', '');
  const voll = roh.length === 3 ? roh.split('').map((z) => z + z).join('') : roh;
  const zahl = Number.parseInt(voll, 16);
  if (Number.isNaN(zahl) || voll.length !== 6) throw new Error(`Keine Hex-Farbe: ${hex}`);
  return { r: (zahl >> 16) & 255, g: (zahl >> 8) & 255, b: zahl & 255 };
}

function toHex(farbe: Rgb): string {
  return `#${[farbe.r, farbe.g, farbe.b].map((wert) => Math.round(wert).toString(16).padStart(2, '0')).join('')}`;
}

/** color-mix(in srgb, a anteil, b) – lineare Mischung je Kanal im sRGB-Raum. */
function mischen(a: Rgb, b: Rgb, anteil: number): Rgb {
  return { r: a.r * anteil + b.r * (1 - anteil), g: a.g * anteil + b.g * (1 - anteil), b: a.b * anteil + b.b * (1 - anteil) };
}

function kanal(wert: number): number {
  const s = wert / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminanz(farbe: Rgb): number {
  return 0.2126 * kanal(farbe.r) + 0.7152 * kanal(farbe.g) + 0.0722 * kanal(farbe.b);
}

function kontrast(a: Rgb, b: Rgb): number {
  const la = luminanz(a);
  const lb = luminanz(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ── §4 · Flächen nachrechnen ─────────────────────────────────────

function ergaenzeTints(palette: Palette, basis?: Palette): void {
  const lesen = leser(palette, basis);
  const anteil = Number.parseFloat(lesen('tint-mix')) / 100;
  if (!(anteil > 0 && anteil < 1)) throw new Error(`--sl-tint-mix unbrauchbar: ${lesen('tint-mix')}`);
  const surface = parseHex(lesen('surface'));
  const ablegen = (ziel: string, kante: string) => palette.set(ziel, toHex(mischen(parseHex(lesen(kante)), surface, anteil)));
  for (const kat of KATEGORIEN) ablegen(`tint-kat-${kat}`, `kat-${kat}-edge`);
  for (const n of TECHNIKER) ablegen(`tint-tech-${n}`, `tech-${n}`);
  for (const status of STATUS) ablegen(`tint-st-${status}`, `st-${status}`);
  for (const region of REGIONEN) ablegen(`tint-region-${region}`, `region-${region}`);
}

// ── §5 · Lauf ────────────────────────────────────────────────────

function pruefePalette(titel: string, palette: Palette, basis?: Palette): number {
  ergaenzeTints(palette, basis);
  const lesen = leser(palette, basis);
  let fehler = 0;
  console.log(`\n◆ ${titel} · Fläche = Kante × ${lesen('tint-mix')}`);
  for (const paar of PAARE) {
    const text = lesen(paar.text);
    const flaeche = lesen(paar.flaeche);
    if (text.startsWith('rgb') || flaeche.startsWith('rgb')) continue;
    const quote = kontrast(parseHex(text), parseHex(flaeche));
    const ok = quote >= paar.minimum;
    if (!ok) fehler += 1;
    const marke = ok ? ' ✓' : ' ✕';
    console.log(`${marke} ${quote.toFixed(2).padStart(5)} : 1  (min ${paar.minimum})  ${paar.zweck}  [${paar.text} / ${paar.flaeche}]`);
  }
  return fehler;
}

const light = readTokens('src/styles/tokens.css');
const dark = readTokens('src/styles/tokens.dark.css');

const fehlerLight = pruefePalette('Light', light);
const fehlerDark = pruefePalette('Dark', dark, light);
const fehler = fehlerLight + fehlerDark;

console.log(`\n◆ jh-contrast · ${PAARE.length} Paare × 2 Modi · ${fehler === 0 ? 'alle AA' : `${fehler} verfehlt`}`);
if (fehler > 0) process.exit(1);

/* ◆ jh · eof */
