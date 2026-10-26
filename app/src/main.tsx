/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/main.tsx                                       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Einstieg der Techniker-App: Fonts, Tokens, Stand, Anmeldung, Root     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// ── §1 · Fonts & Styles ──────────────────────────────────────────

import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@sl/styles/tokens.css';
import '@sl/styles/tokens.dark.css';
import './styles/app.css';

import { configureAuth } from '@sl/core/auth/authStore';
import { announceSignature } from '@sl/core/signature';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '@sl/mock';
import { MOCK_IDENTITAETEN } from '@sl/mock/identitaeten';
import { initDispoStore } from '@sl/modules/dispo/store/dispoStore';
import { abmeldungVerbuchen, anmeldenMitClaims, anmeldungVerbuchen, kontenListe, kontoFinden } from '@sl/modules/personal/anmeldung';
import { App } from './App';

// ── §2 · Start ───────────────────────────────────────────────────

// jh› Dieselbe Einhängung wie im Leitstand (main.tsx dort): gleicher Stand, gleiches Verzeichnis, gleiche
//     Anbieter-Prüfung. Läuft die App unter demselben Ursprung (/app/ durchgereicht), teilen sich beide
//     Fenster den Stand in localStorage – im Produkt übernimmt das die API (ADR-001, ADR-008).
initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);
configureAuth({
  finden: kontoFinden,
  alle: kontenListe,
  identitaeten: (anbieter) => MOCK_IDENTITAETEN[anbieter],
  mitIdentitaet: anmeldenMitClaims,
  beiAnmeldung: anmeldungVerbuchen,
  beiAbmeldung: abmeldungVerbuchen,
});
announceSignature();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root fehlt in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/* ◆ jh · eof */
