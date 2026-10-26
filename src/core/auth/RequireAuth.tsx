/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/RequireAuth.tsx                          │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Geschützte Routen: ohne Sitzung → /login; Abmeldung bei Inaktivität   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { useMandant } from '../mandant/mandantStore';
import { abmelden, useSitzung } from './authStore';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface LoginZustand {
  /** Pfad inkl. Query, zu dem nach der Anmeldung zurückgekehrt wird. */
  von?: string;
}

export interface AbmeldeZustand {
  grund?: 'inaktiv';
}

// ── §2 · Inaktivität ─────────────────────────────────────────────

const PRUEF_TAKT_MS = 30_000;
const EREIGNISSE: readonly (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

// jh› Sitzungen laufen nach Inaktivität ab (Einstellungen › Betrieb): ein offener Leitstand am Schalter
//     bleibt nicht den ganzen Tag angemeldet, wenn niemand davor sitzt (DSG Art. 8 Datensicherheit).
function useInaktivitaet(minuten: number, onAblauf: () => void): void {
  const zuletzt = useRef(Date.now());
  const ablauf = useRef(onAblauf);
  useEffect(() => {
    ablauf.current = onAblauf;
  });

  useEffect(() => {
    if (!(minuten > 0)) return undefined;
    const beruehren = () => {
      zuletzt.current = Date.now();
    };
    for (const name of EREIGNISSE) window.addEventListener(name, beruehren, { passive: true });
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - zuletzt.current >= minuten * 60_000) ablauf.current();
    }, PRUEF_TAKT_MS);
    return () => {
      for (const name of EREIGNISSE) window.removeEventListener(name, beruehren);
      window.clearInterval(timer);
    };
  }, [minuten]);
}

// ── §3 · Komponente ──────────────────────────────────────────────

export function RequireAuth() {
  const sitzung = useSitzung();
  const location = useLocation();
  const navigate = useNavigate();
  const { sitzungMinuten } = useMandant();

  useInaktivitaet(sitzung ? sitzungMinuten : 0, () => {
    abmelden('inaktiv');
    const zustand: AbmeldeZustand = { grund: 'inaktiv' };
    navigate('/abgemeldet', { replace: true, state: zustand });
  });

  if (!sitzung) {
    const zustand: LoginZustand = { von: `${location.pathname}${location.search}` };
    return <Navigate to="/login" replace state={zustand} />;
  }
  return <Outlet />;
}

/* ◆ jh · eof */
