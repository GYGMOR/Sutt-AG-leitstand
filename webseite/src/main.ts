/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  webseite/main.ts                                   │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Website: Fonts, Tokens, Jahr im Fuss, Ziele für App und Leitstand     │
   └────────────────────────────────────────────────────────────────────────┘ */

import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@sl/styles/tokens.css';
import '@sl/styles/tokens.dark.css';
import './styles/site.css';

// ── §1 · Kleinigkeiten ───────────────────────────────────────────

const jahr = document.getElementById('jahr');
if (jahr) jahr.textContent = String(new Date().getFullYear());

// jh› Im Dev-Modus laufen Leitstand (5173) und App (/app/ über den Leitstand) auf anderen Ports als die
//     Website (5175); gehostet liegen alle drei unter einer Domain – dann greifen die relativen Pfade.
const ZIELE: Readonly<Record<string, string>> = {
  app: import.meta.env.DEV ? 'http://localhost:5173/app/' : '/app/',
  leitstand: import.meta.env.DEV ? 'http://localhost:5173/' : '/',
};

for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-ziel]')) {
  const ziel = ZIELE[link.dataset.ziel ?? ''];
  if (ziel) link.href = ziel;
}

/* ◆ jh · eof */
