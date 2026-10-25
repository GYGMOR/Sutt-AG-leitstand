/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  App.tsx                                            │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Routing: Login, Dashboard, Dispo, Module, App, Druck, Folgt           │
   └────────────────────────────────────────────────────────────────────────┘ */

import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router';
import { ArbeitstagProvider } from './core/arbeitstag';
import { AbgemeldetPage } from './core/auth/AbgemeldetPage';
import { LoginPage } from './core/auth/LoginPage';
import { RequireAuth } from './core/auth/RequireAuth';
import { FolgtPage } from './core/layout/FolgtPage';
import { ModulRoute } from './core/layout/ModulRoute';
import type { ModulId } from './core/modules.config';
import { MOCK_HEUTE } from './mock';
import { DispoPage } from './modules/dispo/DispoPage';

// ── §1 · Routen ──────────────────────────────────────────────────

// jh› Alles ausser der Disposition lazy: der Leitstand lädt nur, was er zeigt.
const TechnikerDruck = lazy(() => import('./modules/dispo/druck/TechnikerDruck').then((m) => ({ default: m.TechnikerDruck })));
const AppPage = lazy(() => import('./modules/app/AppPage').then((m) => ({ default: m.AppPage })));
const RapportePage = lazy(() => import('./modules/rapporte/RapportePage').then((m) => ({ default: m.RapportePage })));
const RapportDruck = lazy(() => import('./modules/rapport/RapportDruck').then((m) => ({ default: m.RapportDruck })));
const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AuftraegePage = lazy(() => import('./modules/auftraege/AuftraegePage').then((m) => ({ default: m.AuftraegePage })));
const KundenPage = lazy(() => import('./modules/kunden/KundenPage').then((m) => ({ default: m.KundenPage })));
const GeraetePage = lazy(() => import('./modules/geraete/GeraetePage').then((m) => ({ default: m.GeraetePage })));
const BilderPage = lazy(() => import('./modules/bilder/BilderPage').then((m) => ({ default: m.BilderPage })));
const LagerPage = lazy(() => import('./modules/lager/LagerPage').then((m) => ({ default: m.LagerPage })));

function modul(id: ModulId, element: ReactNode): ReactNode {
  return (
    <ModulRoute id={id}>
      <Suspense fallback={null}>{element}</Suspense>
    </ModulRoute>
  );
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/abgemeldet', element: <AbgemeldetPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: modul('dashboard', <DashboardPage />) },
      { path: '/dispo', element: <Navigate to="/dispo/plantafel" replace /> },
      { path: '/dispo/druck/:technikerId', element: <Suspense fallback={null}><TechnikerDruck /></Suspense> },
      { path: '/dispo/:ansicht', element: <DispoPage /> },
      { path: '/app/*', element: <Suspense fallback={null}><AppPage /></Suspense> },
      { path: '/auftraege/:auftragId?', element: modul('auftraege', <AuftraegePage />) },
      { path: '/kunden/:kundeId?', element: modul('kunden', <KundenPage />) },
      { path: '/geraete/:geraetId?', element: modul('geraete', <GeraetePage />) },
      { path: '/bilder', element: modul('bilder', <BilderPage />) },
      { path: '/lager/:bereich?', element: modul('lager', <LagerPage />) },
      { path: '/rapporte/:rapportId/druck', element: <Suspense fallback={null}><RapportDruck /></Suspense> },
      { path: '/rapporte/:rapportId?', element: <Suspense fallback={null}><RapportePage /></Suspense> },
      { path: '*', element: <FolgtPage /> },
    ],
  },
]);

// ── §2 · App ─────────────────────────────────────────────────────

export function App() {
  return (
    <ArbeitstagProvider heute={MOCK_HEUTE}>
      <RouterProvider router={router} />
    </ArbeitstagProvider>
  );
}

/* ◆ jh · eof */
