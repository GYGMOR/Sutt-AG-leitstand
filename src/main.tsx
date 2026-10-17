/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  main.tsx                                           │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Einstieg: Fonts, Tokens (hell/dunkel), Mock-Auth, Signatur, Root      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// ── §1 · Fonts & Styles ──────────────────────────────────────────

// jh› Fonts lokal via Fontsource – kein Google-CDN, offline- und DSG-tauglich.
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/tokens.css';
import './styles/tokens.dark.css';
import './styles/global.css';

import { App } from './App';
import { configureAuth } from './core/auth/authStore';
import { announceSignature } from './core/signature';
import { BENUTZER, findBenutzer } from './mock/benutzer';

// ── §2 · Start ───────────────────────────────────────────────────

configureAuth({ finden: findBenutzer, alle: () => BENUTZER });
announceSignature();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root fehlt in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/* ◆ jh · eof */
