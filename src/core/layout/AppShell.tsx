/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/AppShell.tsx                           │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Layout-Shell: Topbar, Seitenleiste, Palette, Hilfe, Abmelden          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Keyboard, Lock, LogOut, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useOffeneAenderungen } from '../aenderungen';
import { abmelden, useBenutzer } from '../auth/authStore';
import { useHotkey } from '../hooks/useHotkey';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useRegisterKommandos } from '../kommando';
import type { Kommando } from '../kommando';
import { useMandant } from '../mandant/mandantStore';
import { MODULE, pruefeFreigabe } from '../modules.config';
import type { Modul } from '../modules.config';
import { useTheme } from '../theme';
import { ConfirmDialog } from '../ui/Dialog';
import { cx } from '../ui/cx';
import type { MenueEintrag } from './BenutzerMenu';
import { KommandoPalette } from './KommandoPalette';
import { ShortcutHilfe } from './ShortcutHilfe';
import { Sidebar } from './Sidebar';
import { setSidebarEingeklappt, useSidebarState } from './sidebarStore';
import { Topbar } from './Topbar';
import styles from './AppShell.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface AppShellProps {
  modul?: Modul;
  /** Modulspezifische Topbar-Elemente, z. B. die Konflikt-Badge. */
  topbarExtras?: ReactNode;
  /** Modulspezifische Einträge im Benutzermenü, z. B. «Demo zurücksetzen». */
  menueEintraege?: readonly MenueEintrag[];
  children: ReactNode;
}

export function AppShell({ modul, topbarExtras, menueEintraege, children }: AppShellProps) {
  const navigate = useNavigate();
  const benutzer = useBenutzer();
  const { modulFreigaben } = useMandant();
  const offeneAenderungen = useOffeneAenderungen();
  const { theme, toggleTheme } = useTheme();
  const { eingeklapptManuell } = useSidebarState();
  const schmal = useMediaQuery('(max-width: 1279px)');
  // jh› Unter 1280 px klappt die Leiste von selbst ein, bis der Benutzer entscheidet.
  const eingeklappt = eingeklapptManuell ?? schmal;

  const [paletteOffen, setPaletteOffen] = useState(false);
  const [hilfeOffen, setHilfeOffen] = useState(false);
  const [abmeldenRueckfrage, setAbmeldenRueckfrage] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarEingeklappt(!eingeklappt), [eingeklappt]);
  const openPalette = useCallback(() => setPaletteOffen(true), []);
  const openHilfe = useCallback(() => setHilfeOffen(true), []);

  const abmeldenJetzt = useCallback(() => {
    setAbmeldenRueckfrage(false);
    abmelden();
    navigate('/abgemeldet');
  }, [navigate]);

  const abmeldenAnfragen = useCallback(() => {
    if (offeneAenderungen > 0) {
      setAbmeldenRueckfrage(true);
      return;
    }
    abmeldenJetzt();
  }, [offeneAenderungen, abmeldenJetzt]);

  useHotkey({ key: '[' }, toggleSidebar);
  useHotkey({ key: 'k', mod: true, inInputs: true }, openPalette);
  useHotkey({ key: '?' }, openHilfe);

  // ·· Systembefehle für die Palette
  const kommandos = useMemo<Kommando[]>(() => {
    const module: Kommando[] = MODULE.map((eintrag) => {
      const freigabe = pruefeFreigabe(eintrag, benutzer?.rolle ?? null, modulFreigaben);
      const gesperrt = freigabe.ok
        ? undefined
        : freigabe.grund === 'keine-berechtigung'
          ? 'Für Ihre Rolle nicht freigegeben'
          : `Noch nicht freigeschaltet${eintrag.version ? ` · geplant für ${eintrag.version}` : ''}`;
      return {
        id: `modul:${eintrag.id}`,
        label: eintrag.label,
        gruppe: 'modul',
        icon: gesperrt ? Lock : eintrag.icon,
        stichworte: eintrag.beschreibung,
        run: () => (eintrag.extern ? window.open(eintrag.pfad, '_blank', 'noopener') : navigate(eintrag.pfad)),
        ...(gesperrt ? { gesperrt } : {}),
      };
    });
    return [
      {
        id: 'system:theme',
        label: theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus',
        gruppe: 'system',
        icon: theme === 'dark' ? Sun : Moon,
        stichworte: 'dark mode theme farbschema hell dunkel',
        run: toggleTheme,
      },
      { id: 'system:hilfe', label: 'Tastaturkürzel anzeigen', gruppe: 'system', icon: Keyboard, kuerzel: '?', run: openHilfe },
      { id: 'system:abmelden', label: 'Abmelden', gruppe: 'system', icon: LogOut, stichworte: 'logout ausloggen', run: abmeldenAnfragen },
      ...module,
    ];
  }, [benutzer?.rolle, modulFreigaben, navigate, theme, toggleTheme, openHilfe, abmeldenAnfragen]);
  useRegisterKommandos('system', kommandos);

  return (
    <div className={cx(styles.shell, eingeklappt && styles.schmal)}>
      <Topbar modul={modul} extras={topbarExtras} menueEintraege={menueEintraege} onOpenPalette={openPalette} onHilfe={openHilfe} onAbmelden={abmeldenAnfragen} />
      <Sidebar eingeklappt={eingeklappt} onToggle={toggleSidebar} onHilfe={openHilfe} onAbmelden={abmeldenAnfragen} />
      <main className={styles.flaeche} id="sl-hauptflaeche">
        {children}
      </main>

      <KommandoPalette open={paletteOffen} onClose={() => setPaletteOffen(false)} />
      <ShortcutHilfe open={hilfeOffen} onClose={() => setHilfeOffen(false)} />
      <ConfirmDialog
        open={abmeldenRueckfrage}
        titel="Abmelden?"
        text={`${offeneAenderungen} Planänderung${offeneAenderungen === 1 ? ' ist' : 'en sind'} im Mockup nicht gespeichert und ${offeneAenderungen === 1 ? 'geht' : 'gehen'} beim Abmelden verloren.`}
        bestaetigen="Trotzdem abmelden"
        gefaehrlich
        onConfirm={abmeldenJetzt}
        onClose={() => setAbmeldenRueckfrage(false)}
      />
    </div>
  );
}

/* ◆ jh · eof */
