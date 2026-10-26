/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/rahmen/AppKontext.tsx                          │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Kontext der App: Techniker, Person, Zonenzeit, Stand, Aktionen, Netz  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { createContext, useContext } from 'react';
import type { IsoDatum, Minuten } from '@sl/core/datum';
import type { Mitarbeiter } from '@sl/core/domain/personal';
import type { Techniker } from '@sl/core/domain/stammdaten';
import type { Mandant } from '@sl/core/mandant/mandant.types';
import type { DispoState } from '@sl/modules/dispo/store/dispo.reducer';
import type { DispoAktionen } from '@sl/modules/dispo/store/useDispoAktionen';
import type { Rechte } from '@sl/modules/personal/rechte';

// ── §1 · Kontext ─────────────────────────────────────────────────

export interface AppKontextWert {
  /** Techniker im Plan – null, wenn das Konto nicht fährt und niemand per ?als= gewählt ist. */
  techniker: Techniker | null;
  /** Personalakte der angemeldeten Person (Stempeluhr, Absenzen). */
  mitarbeiter: Mitarbeiter | null;
  /** «Heute» und «jetzt» in der Zone des Betriebs (Europe/Zurich). */
  heute: IsoDatum;
  jetztMin: Minuten;
  zone: string;
  /** Stand durch die Rechte-Sicht (fremde Gesundheitsdaten nur als «Abwesend»). */
  state: DispoState;
  aktionen: DispoAktionen;
  rechte: Rechte;
  mandant: Mandant;
  /** Kürzel des angemeldeten Kontos (Fotos, Nachrichten). */
  kuerzel: string;
  online: boolean;
  /** Hängt die Demo-Parameter (?als=) an einen App-Pfad. */
  pfad: (ziel: string) => string;
}

const AppKontext = createContext<AppKontextWert | null>(null);

export const AppKontextProvider = AppKontext.Provider;

export function useApp(): AppKontextWert {
  const wert = useContext(AppKontext);
  if (!wert) throw new Error('useApp() ausserhalb der Techniker-App');
  return wert;
}

/* ◆ jh · eof */
