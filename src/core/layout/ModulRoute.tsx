/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/ModulRoute.tsx                         │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Wächter je Modulroute: Mandant und Rolle – gesperrt → Folgt-Seite     │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { ReactNode } from 'react';
import { useBenutzer } from '../auth/authStore';
import { useMandant } from '../mandant/mandantStore';
import { findModul, pruefeFreigabe } from '../modules.config';
import type { ModulId } from '../modules.config';
import { FolgtPage } from './FolgtPage';

// ── §1 · Komponente ──────────────────────────────────────────────

interface ModulRouteProps {
  id: ModulId;
  children: ReactNode;
}

// jh› Seitenleiste und Palette zeigen das Schloss – die Route muss es ebenso tun,
//     sonst öffnet ein getippter Pfad das Modul an Mandant und Rolle vorbei.
export function ModulRoute({ id, children }: ModulRouteProps) {
  const benutzer = useBenutzer();
  const { modulFreigaben } = useMandant();
  const freigabe = pruefeFreigabe(findModul(id), benutzer?.rolle ?? null, modulFreigaben);
  if (!freigabe.ok) return <FolgtPage />;
  return <>{children}</>;
}

/* ◆ jh · eof */
