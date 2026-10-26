/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/App.tsx                                        │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Routen der Techniker-App unter /app/: Anmelden, Seiten, Einsatz       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Navigate, RouterProvider, createBrowserRouter } from 'react-router';
import { ArbeitstagProvider } from '@sl/core/arbeitstag';
import { MOCK_HEUTE } from '@sl/mock';
import { Geschuetzt } from './rahmen/Geschuetzt';
import { AbsenzenSeite } from './seiten/AbsenzenSeite';
import { AnmeldenSeite } from './seiten/AnmeldenSeite';
import { EinsatzSeite } from './seiten/EinsatzSeite';
import { FahrzeugSeite } from './seiten/FahrzeugSeite';
import { HeuteSeite } from './seiten/HeuteSeite';
import { KameraSeite } from './seiten/KameraSeite';
import { ProfilSeite } from './seiten/ProfilSeite';
import { RapportSeite } from './seiten/RapportSeite';
import { ScannenSeite } from './seiten/ScannenSeite';
import { TourSeite } from './seiten/TourSeite';
import { WocheSeite } from './seiten/WocheSeite';
import { ZeitSeite } from './seiten/ZeitSeite';

// ── §1 · Routen ──────────────────────────────────────────────────

// jh› Alles unter /app/ (basename): So laufen Links aus dem Leitstand («In der App erfassen»,
//     ?als=T-MB) unverändert, ob die App durchgereicht oder separat gehostet wird.
const router = createBrowserRouter(
  [
    { path: '/anmelden', element: <AnmeldenSeite /> },
    {
      element: <Geschuetzt />,
      children: [
        { path: '/', element: <HeuteSeite /> },
        { path: '/woche', element: <WocheSeite /> },
        { path: '/tour', element: <TourSeite /> },
        { path: '/zeit', element: <ZeitSeite /> },
        { path: '/kamera', element: <KameraSeite /> },
        { path: '/scannen', element: <ScannenSeite /> },
        { path: '/fahrzeug', element: <FahrzeugSeite /> },
        { path: '/absenzen', element: <AbsenzenSeite /> },
        { path: '/profil', element: <ProfilSeite /> },
        { path: '/einsatz/:einsatzId', element: <EinsatzSeite /> },
        { path: '/rapport/:einsatzId', element: <RapportSeite /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: '/app' },
);

// ── §2 · App ─────────────────────────────────────────────────────

export function App() {
  return (
    <ArbeitstagProvider heute={MOCK_HEUTE}>
      <RouterProvider router={router} />
    </ArbeitstagProvider>
  );
}

/* ◆ jh · eof */
