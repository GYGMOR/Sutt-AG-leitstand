/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/urls.ts                                       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Adressen von Leitstand und App aus dem Build – nichts hart codiert    │
   └────────────────────────────────────────────────────────────────────────┘ */

// ── §1 · Basis ───────────────────────────────────────────────────

// jh› Beide Projekte kennen beide Adressen (vite.config «define» aus SL_BASE): lokal «/» und «/app/»,
//     auf GitHub Pages «/<repo>/» und «/<repo>/app/», gehostet «/» und «/app/». Links zwischen Leitstand
//     und App laufen nur über diese Helfer.
export const LEITSTAND_URL: string = __SL_LEITSTAND_URL__;
export const APP_URL: string = __SL_APP_URL__;
/** Die Website liegt neben der App: «<Basis>webseite/» – gehostet später die Hauptdomain. */
export const WEBSITE_URL: string = `${LEITSTAND_URL}webseite/`;

export function leitstandPfad(pfad: string): string {
  return LEITSTAND_URL + pfad.replace(/^\/+/, '');
}

export function appPfad(pfad: string): string {
  return APP_URL + pfad.replace(/^\/+/, '');
}

/** Basename für react-router: ohne Schluss-Schrägstrich, die Wurzel bleibt «/». */
export function routerBasename(url: string): string {
  const ohne = url.replace(/\/+$/, '');
  return ohne === '' ? '/' : ohne;
}

/* ◆ jh · eof */
