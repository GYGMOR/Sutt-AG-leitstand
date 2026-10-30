/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/useDemoReset.tsx               │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  «Demo zurücksetzen» in jedem Büro-Modul: Menü, Befehl, Bestätigung    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import type { Kommando } from '../../../core/kommando';
import type { MenueEintrag } from '../../../core/layout/BenutzerMenu';
import { resetMandant } from '../../../core/mandant/mandantStore';
import { ConfirmDialog } from '../../../core/ui/Dialog';
import { resetAnfragen } from '../../website/anfrageStore';
import { useDispoAktionen } from './useDispoAktionen';

// ── §1 · Hook ────────────────────────────────────────────────────

export interface DemoReset {
  /** Für die Kommandopalette (Gruppe «system»). */
  kommando: Kommando;
  /** Für das Benutzermenü der AppShell. */
  menueEintraege: readonly MenueEintrag[];
  /** Bestätigungsdialog – einmal im Modul rendern. */
  dialog: ReactNode;
}

// jh› Ein Stand, ein Reset (ADR-003): Jedes Büro-Modul bietet denselben Weg zurück zum Ausgangsbestand –
//     im Benutzermenü und in der Palette. Der Reset löscht den gespeicherten Stand, auch im zweiten Fenster.
export function useDemoReset(): DemoReset {
  const aktionen = useDispoAktionen();
  const [offen, setOffen] = useState(false);
  const oeffnen = useCallback(() => setOffen(true), []);

  const kommando = useMemo<Kommando>(
    () => ({ id: 'system:demo-reset', label: 'Demo zurücksetzen (Ausgangsbestand)', gruppe: 'system', icon: RotateCcw, stichworte: 'reset ausgangsbestand testdaten', run: oeffnen }),
    [oeffnen],
  );
  const menueEintraege = useMemo<MenueEintrag[]>(() => [{ id: 'demo-reset', label: 'Demo zurücksetzen', icon: RotateCcw, run: oeffnen, gefaehrlich: true }], [oeffnen]);

  const dialog = (
    <ConfirmDialog
      open={offen}
      titel="Demo zurücksetzen?"
      text="Alle Änderungen dieser Sitzung – Plan, Rapporte, Lager, Stammdaten, Zeiten, Absenzen, Konten, Einstellungen – werden verworfen und der Ausgangsbestand geladen. Ein zweites Fenster folgt automatisch."
      bestaetigen="Zurücksetzen"
      gefaehrlich
      onConfirm={() => {
        setOffen(false);
        resetMandant();
        resetAnfragen();
        aktionen.resetDemo();
      }}
      onClose={() => setOffen(false)}
    />
  );

  return { kommando, menueEintraege, dialog };
}

/* ◆ jh · eof */
