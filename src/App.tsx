/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  App.tsx                                            │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Routing: Login, Dispo, Techniker-App, Rapporte, Druck, Folgt          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { lazy, Suspense } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router';
import { ArbeitstagProvider } from './core/arbeitstag';
import { AbgemeldetPage } from './core/auth/AbgemeldetPage';
import { LoginPage } from './core/auth/LoginPage';
import { RequireAuth } from './core/auth/RequireAuth';
import { FolgtPage } from './core/layout/FolgtPage';
import { MOCK_HEUTE } from './mock';
import { DispoPage } from './modules/dispo/DispoPage';

// ── §1 · Routen ──────────────────────────────────────────────────

// jh› Druck, Techniker-App und Rapporte lazy: der Leitstand lädt nur, was er zeigt.
const TechnikerDruck = lazy(() => import('./modules/dispo/druck/TechnikerDruck').then((m) => ({ default: m.TechnikerDruck })));
const AppPage = lazy(() => import('./modules/app/AppPage').then((m) => ({ default: m.AppPage })));
const RapportePage = lazy(() => import('./modules/rapporte/RapportePage').then((m) => ({ default: m.RapportePage })));
const RapportDruck = lazy(() => import('./modules/rapport/RapportDruck').then((m) => ({ default: m.RapportDruck })));

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/abgemeldet', element: <AbgemeldetPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <Navigate to="/dispo/plantafel" replace /> },
      { path: '/dispo', element: <Navigate to="/dispo/plantafel" replace /> },
      { path: '/dispo/druck/:technikerId', element: <Suspense fallback={null}><TechnikerDruck /></Suspense> },
      { path: '/dispo/:ansicht', element: <DispoPage /> },
      { path: '/app/*', element: <Suspense fallback={null}><AppPage /></Suspense> },
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
