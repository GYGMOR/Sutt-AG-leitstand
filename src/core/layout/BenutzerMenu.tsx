/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/BenutzerMenu.tsx                       │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Benutzermenü: Name, Rolle, Dark Mode, Tastaturkürzel, Abmelden        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useRef, useState } from 'react';
import { Keyboard, LogOut, Moon, Sun } from 'lucide-react';
import { ROLLEN, ROLLE_LABEL } from '../auth/auth.types';
import type { Benutzer, Rolle } from '../auth/auth.types';
import { rolleWechseln } from '../auth/authStore';
import { useTheme } from '../theme';
import { Auswahl } from '../ui/Form';
import { Kbd } from '../ui/Kbd';
import { Popover } from '../ui/Popover';
import { cx } from '../ui/cx';
import styles from './BenutzerMenu.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface BenutzerMenuProps {
  benutzer: Benutzer;
  onHilfe: () => void;
  onAbmelden: () => void;
}

export function BenutzerMenu({ benutzer, onHilfe, onAbmelden }: BenutzerMenuProps) {
  const [offen, setOffen] = useState(false);
  const ankerRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <button
        ref={ankerRef}
        type="button"
        className={cx(styles.kuerzel, offen && styles.offen)}
        onClick={() => setOffen((wert) => !wert)}
        aria-haspopup="menu"
        aria-expanded={offen}
        title={`${benutzer.vorname} ${benutzer.nachname} · ${ROLLE_LABEL[benutzer.rolle]}`}
      >
        {benutzer.kuerzel}
      </button>

      <Popover anchor={ankerRef.current} open={offen} onClose={() => setOffen(false)} placement="bottom-end" breite={264} label="Benutzermenü">
        <div className={styles.menu} role="menu">
          <div className={styles.kopf}>
            <span className={styles.name}>
              {benutzer.vorname} {benutzer.nachname}
            </span>
            <span className={styles.benutzername}>@{benutzer.benutzername}</span>
          </div>

          <label className={styles.rolle}>
            <span className={styles.rolleLabel}>Rolle (Demo)</span>
            {/* jh› Rollenwechsel im Menü, damit die Schlösser live vorgeführt werden können. */}
            <Auswahl value={benutzer.rolle} onChange={(event) => rolleWechseln(event.target.value as Rolle)}>
              {ROLLEN.map((rolle) => (
                <option key={rolle} value={rolle}>
                  {ROLLE_LABEL[rolle]}
                </option>
              ))}
            </Auswahl>
          </label>

          <button type="button" role="menuitem" className={styles.eintrag} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} strokeWidth={1.5} aria-hidden /> : <Moon size={16} strokeWidth={1.5} aria-hidden />}
            <span>{theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.eintrag}
            onClick={() => {
              setOffen(false);
              onHilfe();
            }}
          >
            <Keyboard size={16} strokeWidth={1.5} aria-hidden />
            <span>Tastaturkürzel</span>
            <Kbd keys={['?']} />
          </button>
          <button
            type="button"
            role="menuitem"
            className={cx(styles.eintrag, styles.abmelden)}
            onClick={() => {
              setOffen(false);
              onAbmelden();
            }}
          >
            <LogOut size={16} strokeWidth={1.5} aria-hidden />
            <span>Abmelden</span>
          </button>
        </div>
      </Popover>
    </>
  );
}

/* ◆ jh · eof */
