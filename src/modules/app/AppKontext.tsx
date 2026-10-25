/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/app/AppKontext.tsx                         │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Kontext der Techniker-App: Techniker, heute, jetzt, Stand, Aktionen   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { createContext, useContext } from 'react';
import type { IsoDatum, Minuten } from '../../core/datum';
import type { Techniker } from '../../core/domain/stammdaten';
import type { DispoState } from '../dispo/store/dispo.reducer';
import type { DispoAktionen } from '../dispo/store/useDispoAktionen';

// ── §1 · Kontext ─────────────────────────────────────────────────

export interface AppKontextWert {
  techniker: Techniker;
  heute: IsoDatum;
  jetztMin: Minuten;
  state: DispoState;
  aktionen: DispoAktionen;
  /** Kürzel des angemeldeten Benutzers (Fotos, Nachrichten). */
  kuerzel: string;
  /** Hängt die Demo-Parameter (?als=, ?rahmen=) an einen App-Pfad. */
  pfad: (pfad: string) => string;
}

const AppKontext = createContext<AppKontextWert | null>(null);

export const AppKontextProvider = AppKontext.Provider;

export function useApp(): AppKontextWert {
  const wert = useContext(AppKontext);
  if (!wert) throw new Error('useApp() ausserhalb der Techniker-App');
  return wert;
}

/* ◆ jh · eof */
