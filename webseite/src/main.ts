/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  webseite/main.ts                                   │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Website: Fonts, Tokens, Menü, aktive Seite, Ziele Portal und App      │
   └────────────────────────────────────────────────────────────────────────┘ */

import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@sl/styles/tokens.css';
import '@sl/styles/tokens.dark.css';
import './styles/site.css';

// ── §1 · Grundzustand ────────────────────────────────────────────

document.documentElement.dataset.js = '1';

// jh› Dieselben Tokens wie Leitstand und App: dunkel über data-theme, hier nach Systemeinstellung.
const dunkel = window.matchMedia('(prefers-color-scheme: dark)');
const themaSetzen = () => {
  document.documentElement.dataset.theme = dunkel.matches ? 'dark' : 'light';
};
themaSetzen();
dunkel.addEventListener('change', themaSetzen);

for (const jahr of document.querySelectorAll<HTMLElement>('[data-jahr]')) jahr.textContent = String(new Date().getFullYear());
for (const version of document.querySelectorAll<HTMLElement>('[data-version]')) version.textContent = __SL_VERSION__;

// ── §2 · Ziele: Kundenportal (Leitstand) und Techniker-App ───────

// jh› Gehostet liegen alle drei unter einer Domain – die Basis aus dem Build genügt («/», «/<repo>/»).
//     Im Dev-Modus läuft der Leitstand auf 5173; wird die Website direkt (5175) aufgerufen, zeigen die
//     Links dorthin. Über den Leitstand-Proxy (5173/webseite/) stimmt der relative Pfad ohnehin.
const LEITSTAND_PORT = '5173';
function ziel(pfad: string): string {
  if (import.meta.env.DEV && window.location.port !== LEITSTAND_PORT) {
    return `${window.location.protocol}//${window.location.hostname}:${LEITSTAND_PORT}${pfad}`;
  }
  return pfad;
}

const ZIELE: Readonly<Record<string, string>> = {
  leitstand: ziel(__SL_LEITSTAND_URL__),
  app: ziel(__SL_APP_URL__),
};

for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-ziel]')) {
  const adresse = ZIELE[link.dataset.ziel ?? ''];
  if (adresse) link.href = adresse;
}

// ── §3 · Navigation ──────────────────────────────────────────────

const seite = window.location.pathname.split('/').pop() || 'index.html';
for (const link of document.querySelectorAll<HTMLAnchorElement>('.navigation a, .fuss-nav a')) {
  const href = link.getAttribute('href') ?? '';
  const zielSeite = href.replace(/^\.\//, '').split('#')[0] || 'index.html';
  if (!href.startsWith('./')) continue;
  if (zielSeite === seite && !href.includes('#')) link.setAttribute('aria-current', 'page');
}

const kopf = document.querySelector<HTMLElement>('.kopf');
const menue = document.querySelector<HTMLButtonElement>('.menue');
if (kopf && menue) {
  menue.addEventListener('click', () => {
    const offen = kopf.toggleAttribute('data-offen');
    menue.setAttribute('aria-expanded', String(offen));
  });
  kopf.addEventListener('click', (ereignis) => {
    if (ereignis.target instanceof HTMLAnchorElement && kopf.hasAttribute('data-offen')) {
      kopf.removeAttribute('data-offen');
      menue.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ◆ jh · eof */
