/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/rahmen/Geschuetzt.tsx                          │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Angemeldet? Kontext aufbauen (Techniker, Zonenzeit, Sicht), Rahmen    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { useBenutzer } from '@sl/core/auth/authStore';
import { useNow } from '@sl/core/hooks/useNow';
import { useMandant } from '@sl/core/mandant/mandantStore';
import { jetztInZone } from '@sl/core/zeitzone';
import { technikerFuer } from '@sl/modules/app/app.model';
import { useDispoAktionen } from '@sl/modules/dispo/store/useDispoAktionen';
import { useRechte, useStandFuerSicht } from '@sl/modules/personal/rechte';
import { AppKontextProvider } from './AppKontext';
import type { AppKontextWert } from './AppKontext';
import { AppRahmen } from './AppRahmen';

// ── §1 · Online-Zustand ──────────────────────────────────────────

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const an = () => setOnline(true);
    const aus = () => setOnline(false);
    window.addEventListener('online', an);
    window.addEventListener('offline', aus);
    return () => {
      window.removeEventListener('online', an);
      window.removeEventListener('offline', aus);
    };
  }, []);
  return online;
}

// ── §2 · Komponente ──────────────────────────────────────────────

export interface AnmeldeZustand {
  von?: string;
}

export function Geschuetzt() {
  const benutzer = useBenutzer();
  const location = useLocation();
  const [params] = useSearchParams();
  const state = useStandFuerSicht();
  const rechte = useRechte();
  const mandant = useMandant();
  const aktionen = useDispoAktionen();
  const online = useOnline();
  const uhr = jetztInZone(mandant.zeitzone, useNow());

  const als = params.get('als');
  const techniker = useMemo(() => technikerFuer(benutzer, state.stammdaten, als), [benutzer, state.stammdaten, als]);
  const pfad = useCallback((ziel: string) => (als ? `${ziel}${ziel.includes('?') ? '&' : '?'}als=${encodeURIComponent(als)}` : ziel), [als]);

  const wert = useMemo<AppKontextWert | null>(
    () =>
      benutzer
        ? { techniker, mitarbeiter: rechte.mitarbeiter, heute: uhr.datum, jetztMin: uhr.minuten, zone: mandant.zeitzone, state, aktionen, rechte, mandant, kuerzel: benutzer.kuerzel, online, pfad }
        : null,
    [benutzer, techniker, rechte, uhr.datum, uhr.minuten, mandant, state, aktionen, online, pfad],
  );

  if (!wert) {
    const zustand: AnmeldeZustand = { von: `${location.pathname}${location.search}` };
    return <Navigate to="/anmelden" state={zustand} replace />;
  }

  return (
    <AppKontextProvider value={wert}>
      <AppRahmen>
        <Outlet />
      </AppRahmen>
    </AppKontextProvider>
  );
}

/* ◆ jh · eof */
