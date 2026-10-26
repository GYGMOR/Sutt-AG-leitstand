/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  main.tsx                                           │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Einstieg: Fonts, Tokens, Stand, Anmeldung (lokal + Anbieter), Root    │
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
import { registerTopbarExtra } from './core/layout/slots';
import { announceSignature } from './core/signature';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from './mock';
import { MOCK_IDENTITAETEN } from './mock/identitaeten';
import { initDispoStore } from './modules/dispo/store/dispoStore';
import { abmeldungVerbuchen, anmeldenMitClaims, anmeldungVerbuchen, kontenListe, kontoFinden } from './modules/personal/anmeldung';
import { StempeluhrPille } from './modules/personal/Stempeluhr';

// ── §2 · Start ───────────────────────────────────────────────────

// jh› Der Stand wird vor dem ersten Rendern eingehängt (rev 05): Die Anmeldung prüft Konten, Sperren und
//     Rechte gegen den Stand statt gegen eine Kopie. Modulwurzeln rufen initDispoStore weiterhin auf – idempotent.
initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);
configureAuth({
  finden: kontoFinden,
  alle: kontenListe,
  identitaeten: (anbieter) => MOCK_IDENTITAETEN[anbieter],
  mitIdentitaet: anmeldenMitClaims,
  beiAnmeldung: anmeldungVerbuchen,
  beiAbmeldung: abmeldungVerbuchen,
});
// jh› Die Stempeluhr sitzt in jeder Topbar – eingehängt wie das Benutzerverzeichnis, core kennt das Modul nicht.
registerTopbarExtra(StempeluhrPille);
announceSignature();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root fehlt in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/* ◆ jh · eof */
