/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/RequireAuth.tsx                          │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Geschützte Routen: ohne Sitzung → /login, danach zurück zur Seite     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Navigate, Outlet, useLocation } from 'react-router';
import { useSitzung } from './authStore';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface LoginZustand {
  /** Pfad inkl. Query, zu dem nach der Anmeldung zurückgekehrt wird. */
  von?: string;
}

// ── §2 · Komponente ──────────────────────────────────────────────

export function RequireAuth() {
  const sitzung = useSitzung();
  const location = useLocation();

  if (!sitzung) {
    const zustand: LoginZustand = { von: `${location.pathname}${location.search}` };
    return <Navigate to="/login" replace state={zustand} />;
  }
  return <Outlet />;
}

/* ◆ jh · eof */
