/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/app/AppPage.tsx                            │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Modulwurzel Techniker-App: Techniker bestimmen, Routen, Kontext       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router';
import { useArbeitstag } from '../../core/arbeitstag';
import { useBenutzer } from '../../core/auth/authStore';
import { minutesOfDay } from '../../core/datum';
import { useNow } from '../../core/hooks/useNow';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '../../mock';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { technikerFuer } from './app.model';
import { AppKontextProvider } from './AppKontext';
import type { AppKontextWert } from './AppKontext';
import { AppLayout, KeinTechniker } from './AppLayout';
import { EinsatzSeite } from './EinsatzSeite';
import { HeuteSeite } from './HeuteSeite';
import { RapportSeite } from './RapportSeite';
import { WocheSeite } from './WocheSeite';

// jh› Gleicher Store wie der Leitstand – die App ist eine zweite Sicht, keine zweite Wahrheit (ADR-002).
initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Wurzel ──────────────────────────────────────────────────

export function AppPage() {
  const state = useDispoState();
  const benutzer = useBenutzer();
  const aktionen = useDispoAktionen();
  const [params] = useSearchParams();
  const { search } = useLocation();
  const { heute } = useArbeitstag();
  const jetztMin = minutesOfDay(useNow());

  const techniker = technikerFuer(benutzer, state.stammdaten, params.get('als'));
  const pfad = useCallback((ziel: string) => `${ziel}${search}`, [search]);

  const wert = useMemo<AppKontextWert | null>(
    () => (techniker ? { techniker, heute, jetztMin, state, aktionen, kuerzel: benutzer?.kuerzel ?? techniker.kuerzel, pfad } : null),
    [techniker, heute, jetztMin, state, aktionen, benutzer?.kuerzel, pfad],
  );

  if (!wert) return <KeinTechniker />;

  return (
    <AppKontextProvider value={wert}>
      <AppLayout>
        <Routes>
          <Route index element={<HeuteSeite />} />
          <Route path="woche" element={<WocheSeite />} />
          <Route path="einsatz/:einsatzId" element={<EinsatzSeite />} />
          <Route path="rapport/:einsatzId" element={<RapportSeite />} />
          <Route path="*" element={<Navigate to={pfad('/app')} replace />} />
        </Routes>
      </AppLayout>
    </AppKontextProvider>
  );
}

/* ◆ jh · eof */
