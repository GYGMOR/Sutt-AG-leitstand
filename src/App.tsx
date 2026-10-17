/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  App.tsx                                            │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Routing: Login, geschützte Module, Dispo-Ansichten, Druck, Folgt      │
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

// jh› Druckansicht lazy: QR-Bibliothek lädt nur, wenn wirklich gedruckt wird.
const TechnikerDruck = lazy(() => import('./modules/dispo/druck/TechnikerDruck').then((m) => ({ default: m.TechnikerDruck })));

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
