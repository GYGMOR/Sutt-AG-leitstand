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

// jh› Das Video füllt den ganzen Hero hinter dem Text. vite.config.ts meldet, welche Dateien beim Bauen da waren
//     (__SL_HERO_VIDEO__) – nur die werden angehängt, ohne Datei keine Anfrage ins Leere. Es startet stumm, nicht
//     bei «Bewegung reduzieren» oder «Daten sparen» (dann bleibt das Standbild), hält ausserhalb des Bildschirms an
//     und lässt sich mit dem Knopf anhalten und wieder starten (WCAG 2.2.2).
const video = document.querySelector<HTMLVideoElement>('.hero-video');
const knopf = document.querySelector<HTMLButtonElement>('.hero-pause');
const { quellen, poster } = __SL_HERO_VIDEO__;

function heroVideo(film: HTMLVideoElement, schalter: HTMLButtonElement): void {
  const verbindung = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const automatisch = !ruhig.matches && verbindung?.saveData !== true;
  let angehalten = !automatisch;

  if (poster) film.poster = `${import.meta.env.BASE_URL}video/${poster}`;
  for (const datei of quellen) {
    const quelle = document.createElement('source');
    quelle.src = `${import.meta.env.BASE_URL}video/${datei}`;
    quelle.type = datei.endsWith('.webm') ? 'video/webm' : 'video/mp4';
    film.append(quelle);
  }
  film.preload = automatisch ? 'auto' : 'metadata';

  const zeigen = (laeuft: boolean) => {
    const text = laeuft ? 'Hintergrundvideo anhalten' : 'Hintergrundvideo abspielen';
    schalter.dataset.zustand = laeuft ? 'laeuft' : 'steht';
    schalter.setAttribute('aria-label', text);
    schalter.title = text;
  };
  const abspielen = () => {
    film.play().catch(() => zeigen(false));
  };
  film.addEventListener('playing', () => zeigen(true));
  film.addEventListener('pause', () => zeigen(false));
  film.querySelector('source:last-of-type')?.addEventListener('error', () => {
    schalter.hidden = true;
  });

  schalter.hidden = false;
  zeigen(false);
  schalter.addEventListener('click', () => {
    angehalten = !film.paused;
    if (angehalten) film.pause();
    else abspielen();
  });
  ruhig.addEventListener('change', () => {
    if (!ruhig.matches) return;
    angehalten = true;
    film.pause();
  });

  // jh› Sofort starten, nicht erst auf das erste Sichtbarkeits-Signal warten (kommt in gedrosselten Fenstern spät);
  //     der Beobachter hält nur an, solange der Hero ausserhalb des Bildschirms liegt.
  if (!angehalten) abspielen();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([eintrag]) => {
      if (!eintrag || angehalten) return;
      if (eintrag.isIntersecting) abspielen();
      else film.pause();
    }).observe(film);
  }
}

if (video && knopf && quellen.length > 0) heroVideo(video, knopf);

// ── §6 · Marken-Band ─────────────────────────────────────────────

// jh› Jede Kachel zeigt das Logo aus public/logos/, sobald die Datei beim Bauen da war – sonst den Namen in der
//     Markenfarbe. Für die Endlosschleife hängt eine Kopie der Liste dahinter (aria-hidden, Links nicht fokussierbar);
//     Maus darüber, Fokus darin oder der Knopf halten das Band an (WCAG 2.2.2). «Bewegung reduzieren»: stehendes Raster.
function markenBand(band: HTMLElement): void {
  for (const link of band.querySelectorAll<HTMLAnchorElement>('a[data-logo]')) {
    const datei = __SL_LOGOS__[link.dataset.logo ?? ''];
    if (!datei) continue;
    const bild = document.createElement('img');
    bild.src = `${import.meta.env.BASE_URL}logos/${datei}`;
    bild.alt = '';
    bild.width = 184;
    bild.height = 92;
    bild.decoding = 'async';
    link.replaceChildren(bild);
    link.dataset.bild = '1';
  }

  const spur = band.querySelector<HTMLElement>('.marken-spur');
  const liste = band.querySelector<HTMLElement>('.marken-liste');
  const schalter = band.querySelector<HTMLButtonElement>('.marken-pause');
  if (ruhig.matches || !spur || !liste || !schalter) return;

  const kopie = liste.cloneNode(true) as HTMLElement;
  kopie.setAttribute('aria-hidden', 'true');
  kopie.removeAttribute('aria-label');
  for (const link of kopie.querySelectorAll('a')) link.tabIndex = -1;
  spur.append(kopie);

  // jh› Gleiches Tempo auf jedem Bildschirm: rund 40 px pro Sekunde, egal wie breit die Liste ist. Erst messen,
  //     wenn das Band auf eine Zeile umgestellt ist – vorher ist die Liste so breit wie die Seite.
  band.dataset.band = 'laeuft';
  const tempo = () => spur.style.setProperty('--band-dauer', `${Math.max(20, Math.round(liste.offsetWidth / 40))}s`);
  tempo();
  window.addEventListener('resize', tempo, { passive: true });

  const text = schalter.querySelector('span');
  const anhalten = (steht: boolean) => {
    band.toggleAttribute('data-angehalten', steht);
    if (text) text.textContent = steht ? 'Band abspielen' : 'Band anhalten';
  };
  schalter.hidden = false;
  schalter.addEventListener('click', () => anhalten(!band.hasAttribute('data-angehalten')));
  ruhig.addEventListener('change', () => {
    if (ruhig.matches) anhalten(true);
  });
}

const markenBandElement = document.querySelector<HTMLElement>('.marken-band');
if (markenBandElement) markenBand(markenBandElement);

/* ◆ jh · eof */
