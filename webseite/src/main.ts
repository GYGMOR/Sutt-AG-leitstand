/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  webseite/main.ts                                   │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Website: Thema, Kopf, Menü, Ziele, Einblenden, Hero-Video             │
   └────────────────────────────────────────────────────────────────────────┘ */

import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@sl/styles/tokens.css';
import '@sl/styles/tokens.dark.css';
import './styles/site.css';

// ── §1 · Grundzustand ────────────────────────────────────────────

const wurzel = document.documentElement;
wurzel.dataset.js = '1';

// jh› Dieselben Tokens wie Leitstand und App: dunkel über data-theme, hier nach Systemeinstellung.
const dunkel = window.matchMedia('(prefers-color-scheme: dark)');
const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)');
const themaSetzen = () => {
  wurzel.dataset.theme = dunkel.matches ? 'dark' : 'light';
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

// ── §3 · Kopf und Menü ───────────────────────────────────────────

const seite = window.location.pathname.split('/').pop() || 'index.html';
for (const link of document.querySelectorAll<HTMLAnchorElement>('.navigation a, .fuss-nav a, .fuss-rechtlich a')) {
  const href = link.getAttribute('href') ?? '';
  if (!href.startsWith('./') || href.includes('#')) continue;
  const zielSeite = href.slice(2) || 'index.html';
  if (zielSeite === seite) link.setAttribute('aria-current', 'page');
}

const kopf = document.querySelector<HTMLElement>('.kopf');
const menue = document.querySelector<HTMLButtonElement>('.menue');
const navigation = document.querySelector<HTMLElement>('.navigation');

const kompaktSetzen = () => {
  kopf?.toggleAttribute('data-kompakt', window.scrollY > 24);
};
kompaktSetzen();
window.addEventListener('scroll', kompaktSetzen, { passive: true });

// jh› Das Menü ist auf dem Handy eine Vollfläche: Scrollen der Seite aus, Esc schliesst, Fokus wandert
//     auf den ersten Eintrag und zurück zum Knopf.
function menueSetzen(offen: boolean): void {
  if (!kopf || !menue || !navigation) return;
  kopf.toggleAttribute('data-offen', offen);
  menue.setAttribute('aria-expanded', String(offen));
  wurzel.toggleAttribute('data-menue', offen);
  if (offen) navigation.querySelector<HTMLAnchorElement>('a')?.focus();
  else menue.focus({ preventScroll: true });
}

if (kopf && menue && navigation) {
  menue.addEventListener('click', () => menueSetzen(!kopf.hasAttribute('data-offen')));
  navigation.addEventListener('click', (ereignis) => {
    if (ereignis.target instanceof Element && ereignis.target.closest('a') && kopf.hasAttribute('data-offen')) menueSetzen(false);
  });
  document.addEventListener('keydown', (ereignis) => {
    if (ereignis.key === 'Escape' && kopf.hasAttribute('data-offen')) menueSetzen(false);
  });
  window.matchMedia('(min-width: 1000px)').addEventListener('change', (ereignis) => {
    if (ereignis.matches && kopf.hasAttribute('data-offen')) menueSetzen(false);
  });
}

// ── §4 · Einblenden beim Scrollen ────────────────────────────────

const einblender = document.querySelectorAll<HTMLElement>('[data-reveal]');
if (ruhig.matches || !('IntersectionObserver' in window)) {
  for (const element of einblender) element.dataset.reveal = 'sichtbar';
} else {
  const beobachter = new IntersectionObserver(
    (eintraege) => {
      for (const eintrag of eintraege) {
        if (!eintrag.isIntersecting) continue;
        (eintrag.target as HTMLElement).dataset.reveal = 'sichtbar';
        beobachter.unobserve(eintrag.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
  );
  for (const element of einblender) beobachter.observe(element);
}

// ── §5 · Hero-Video ──────────────────────────────────────────────

// jh› Das Video ist ein Platz: Liegt webseite/public/video/einbau.mp4 (und .webm) beim Bauen vor, setzt
//     vite.config.ts __SL_HERO_VIDEO__, die Quellen werden angehängt, das Video spielt und die animierte Szene
//     blendet aus. Fehlt es, bleibt die Szene – ohne Anfragen ins Leere und ohne Fehler in der Konsole.
const video = document.querySelector<HTMLVideoElement>('.hero-video');
const buehne = document.querySelector<HTMLElement>('.hero-buehne');
if (video && buehne && __SL_HERO_VIDEO__.length > 0) {
  video.addEventListener('canplay', () => {
    buehne.dataset.video = 'laeuft';
    if (ruhig.matches) video.pause();
  });
  video.addEventListener('error', () => buehne.removeAttribute('data-video'), true);
  if (ruhig.matches) video.removeAttribute('autoplay');
  for (const datei of __SL_HERO_VIDEO__) {
    const quelle = document.createElement('source');
    quelle.src = `${import.meta.env.BASE_URL}video/${datei}`;
    quelle.type = datei.endsWith('.webm') ? 'video/webm' : 'video/mp4';
    video.append(quelle);
  }
  video.load();
}

/* ◆ jh · eof */
